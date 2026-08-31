using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using System.Collections.Concurrent;
using BCrypt.Net;
using Flink.Application.DTOs;
using Flink.Application.Interfaces;
using Flink.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Flink.Infrastructure.Services
{
    public class AuthService : IAuthService
    {
        private static readonly ConcurrentDictionary<string, (string Otp, DateTime ExpiresAt)> _otpCache = new ConcurrentDictionary<string, (string, DateTime)>();
        private static readonly ConcurrentDictionary<string, DateTime> _verifiedOtpTargets = new ConcurrentDictionary<string, DateTime>();
        private readonly IUserRepository _userRepository;
        private readonly IEmailService _emailService;
        private readonly ISmsService _smsService;
        private readonly IConfiguration _config;

        public AuthService(IUserRepository userRepository, IEmailService emailService, ISmsService smsService, IConfiguration config)
        {
            _userRepository = userRepository;
            _emailService = emailService;
            _smsService = smsService;
            _config = config;
        }

        public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
        {
            var email = NormalizeEmail(request.Email);
            var existingUser = await _userRepository.GetByEmailAsync(email);
            if (existingUser != null && existingUser.IsEmailVerified)
                return new AuthResponse { Success = false, Message = "Email already in use." };

            if (existingUser != null)
            {
                if (IsOtpTargetVerified(email))
                {
                    existingUser.IsEmailVerified = true;
                    existingUser.VerificationToken = null;
                    existingUser.VerificationTokenExpires = null;
                    await _userRepository.UpdateAsync(existingUser);
                    return new AuthResponse { Success = true, Message = "Email verified successfully. You can now login." };
                }

                return new AuthResponse { Success = false, Message = "Email already registered. Please verify your email before logging in." };
            }

            var phoneNumber = NormalizePhoneNumber(request.WhatsAppNumber);
            if (!string.IsNullOrWhiteSpace(phoneNumber))
            {
                var existingByPhone = await _userRepository.GetByPhoneNumberAsync(phoneNumber);
                if (existingByPhone != null)
                    return new AuthResponse { Success = false, Message = "WhatsApp number already in use." };
            }

            // Generate unique username
            string generatedUsername = string.Empty;
            const int maxUsernameRetries = 50;
            for (int i = 0; i < maxUsernameRetries; i++)
            {
                var randomPart = RandomNumberGenerator.GetInt32(100000000, 1000000000).ToString();
                generatedUsername = "09" + randomPart;
                
                var existingUserWithUsername = await _userRepository.GetByUsernameAsync(generatedUsername);
                if (existingUserWithUsername == null)
                    break;
                
                if (i == maxUsernameRetries - 1)
                    return new AuthResponse { Success = false, Message = "Failed to generate unique username. Please try again." };
            }

            var isEmailOtpVerified = IsOtpTargetVerified(request.Email);
            var verificationToken = isEmailOtpVerified
                ? null
                : Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(64));

            var user = new User
            {
                FirstName = request.FirstName,
                LastName = request.LastName,
                DateOfBirth = request.DateOfBirth,
                WhatsAppNumber = phoneNumber,
                IsWhatsAppVerified = !string.IsNullOrWhiteSpace(phoneNumber),
                Username = generatedUsername,
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                IsEmailVerified = isEmailOtpVerified,
                VerificationToken = verificationToken,
                VerificationTokenExpires = isEmailOtpVerified ? null : DateTime.UtcNow.AddDays(1)
            };

            await _userRepository.AddAsync(user);

            if (isEmailOtpVerified)
                return new AuthResponse { Success = true, Message = "Registration successful. You can now login." };

            // Send Verification Email
            try
            {
                var clientUrl = _config["AppSettings:ClientUrl"] ?? "https://localhost:4200";
                var verifyUrl = $"{clientUrl}/verify-email?token={verificationToken}";
                var emailBody = EmailTemplates.GetVerificationEmailHtml(verifyUrl, user.Email, clientUrl);
                await _emailService.SendEmailAsync(user.Email, "Flink - Verify Your Email", emailBody);
                
                return new AuthResponse { Success = true, Message = "Registration successful. Please check your email to verify your account." };
            }
            catch (Exception ex)
            {
                // Fallback if email fails (e.g. bad credentials)
                return new AuthResponse 
                { 
                    Success = true, 
                    Message = $"Registration successful, but we couldn't send the verification email due to an SMTP error. Please check your EmailSettings in appsettings.json. Error: {ex.Message}" 
                };
            }
        }

        public async Task<AuthResponse> LoginAsync(LoginRequest request)
        {
            var loginTarget = request.Email.Trim();
            // Support login by email, phone number, or username
            var user = await _userRepository.GetByEmailAsync(NormalizeEmail(loginTarget));
            if (user == null)
                user = await _userRepository.GetByPhoneNumberAsync(NormalizePhoneNumber(loginTarget));
            if (user == null)
                user = await _userRepository.GetByUsernameAsync(loginTarget);

            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                return new AuthResponse { Success = false, Message = "Invalid email or password." };

            if (!user.IsEmailVerified && IsOtpTargetVerified(user.Email))
            {
                user.IsEmailVerified = true;
                user.VerificationToken = null;
                user.VerificationTokenExpires = null;
                await _userRepository.UpdateAsync(user);
            }

            if (!user.IsEmailVerified && !RequireEmailVerification())
            {
                user.IsEmailVerified = true;
                user.VerificationToken = null;
                user.VerificationTokenExpires = null;
                await _userRepository.UpdateAsync(user);
            }

            if (!user.IsEmailVerified)
                return new AuthResponse { Success = false, Message = "Please verify your email address before logging in." };

            var token = GenerateJwtToken(user);
            return new AuthResponse { Success = true, Token = token, Message = "Login successful." };
        }

        public async Task<bool> VerifyEmailAsync(string token)
        {
            var user = await _userRepository.GetByVerificationTokenAsync(token);
            if (user == null || user.VerificationTokenExpires < DateTime.UtcNow)
                return false;

            user.IsEmailVerified = true;
            user.VerificationToken = null;
            user.VerificationTokenExpires = null;
            await _userRepository.UpdateAsync(user);

            return true;
        }

        public async Task<AuthResponse> SendOtpAsync(SendOtpRequest request)
        {
            var target = NormalizeOtpTarget(request.Target);
            // Generate OTP
            var otp = RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
            
            // Store in in-memory cache with 1 minute expiry
            _otpCache[target] = (otp, DateTime.UtcNow.AddMinutes(2));
            
            if (target.Contains("@"))
            {
                try
                {
                    Console.WriteLine($"[OTP] Sending email OTP to: {target}");
                    var clientUrl = _config["AppSettings:ClientUrl"] ?? "https://localhost:4200";
                    var emailBody = EmailTemplates.GetOtpEmailHtml(otp, target, clientUrl);
                    await _emailService.SendEmailAsync(target, "Flink - Email Verification Code", emailBody);
                    Console.WriteLine($"[OTP] Email OTP sent successfully to: {target}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Failed to send email: {ex.Message}");
                    return new AuthResponse { Success = false, Message = "Failed to send email. Check your SMTP settings." };
                }
            }
            else
            {
                // Send real SMS via Twilio
                try
                {
                    var otpMessage = $"Your Flink verification code is: {otp}. Valid for 2 minutes.";
                    await _smsService.SendWhatsAppAsync(target, otpMessage);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Failed to send WhatsApp OTP: {ex.Message}");
                    return new AuthResponse { Success = false, Message = $"Failed to send WhatsApp OTP. Check WhatsApp configuration. Error: {ex.Message}" };
                }
            }

            return new AuthResponse { Success = true, Message = $"OTP sent to {target}" };
        }

        public async Task<AuthResponse> VerifyOtpAsync(VerifyOtpRequest request)
        {
            var target = NormalizeOtpTarget(request.Target);
            if (_otpCache.TryGetValue(target, out var stored))
            {
                // Check if OTP expired (1 minute)
                if (DateTime.UtcNow > stored.ExpiresAt)
                {
                    _otpCache.TryRemove(target, out _);
                    return new AuthResponse { Success = false, Message = "OTP has expired. Please request a new one." };
                }

                if (stored.Otp == request.Otp)
                {
                    _otpCache.TryRemove(target, out _);
                    MarkOtpTargetVerified(target);

                    if (target.Contains("@"))
                    {
                        var user = await _userRepository.GetByEmailAsync(target);
                        if (user != null && !user.IsEmailVerified)
                        {
                            user.IsEmailVerified = true;
                            user.VerificationToken = null;
                            user.VerificationTokenExpires = null;
                            await _userRepository.UpdateAsync(user);
                        }
                    }

                    return new AuthResponse { Success = true, Message = "OTP verified successfully." };
                }
            }

            return new AuthResponse { Success = false, Message = "Invalid OTP." };
        }

        public async Task<AuthResponse> UpdateProfileAsync(int userId, UpdateProfileRequest request)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                return new AuthResponse { Success = false, Message = "User not found." };

            user.FirstName = request.FirstName;
            user.LastName = request.LastName;
            await _userRepository.UpdateAsync(user);

            var newToken = GenerateJwtToken(user);
            return new AuthResponse { Success = true, Token = newToken, Message = "Profile updated successfully." };
        }

        private string GenerateJwtToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_config["JwtSettings:Secret"]);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim(ClaimTypes.Name, user.Username),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.GivenName, user.FirstName ?? string.Empty),
                    new Claim(ClaimTypes.Surname, user.LastName ?? string.Empty),
                    new Claim("PhoneNumber", user.WhatsAppNumber ?? string.Empty)
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature),
                Issuer = _config["JwtSettings:Issuer"],
                Audience = _config["JwtSettings:Audience"]
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        private static string NormalizePhoneNumber(string? phoneNumber)
        {
            return string.IsNullOrWhiteSpace(phoneNumber)
                ? string.Empty
                : phoneNumber.Trim().Replace(" ", string.Empty).Replace("-", string.Empty);
        }

        private static string NormalizeEmail(string email)
        {
            return email.Trim().ToLowerInvariant();
        }

        private static string NormalizeOtpTarget(string target)
        {
            return target.Trim().ToLowerInvariant();
        }

        private static void MarkOtpTargetVerified(string target)
        {
            _verifiedOtpTargets[NormalizeOtpTarget(target)] = DateTime.UtcNow.AddMinutes(15);
        }

        private static bool IsOtpTargetVerified(string target)
        {
            var key = NormalizeOtpTarget(target);
            if (!_verifiedOtpTargets.TryGetValue(key, out var expiresAt))
                return false;

            if (DateTime.UtcNow <= expiresAt)
                return true;

            _verifiedOtpTargets.TryRemove(key, out _);
            return false;
        }

        private bool RequireEmailVerification()
        {
            return bool.TryParse(_config["Auth:RequireEmailVerification"], out var requireEmailVerification)
                && requireEmailVerification;
        }
    }
}
