using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
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
        private readonly IUserRepository _userRepository;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _config;

        public AuthService(IUserRepository userRepository, IEmailService emailService, IConfiguration config)
        {
            _userRepository = userRepository;
            _emailService = emailService;
            _config = config;
        }

        public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
        {
            var existingUser = await _userRepository.GetByEmailAsync(request.Email);
            if (existingUser != null)
                return new AuthResponse { Success = false, Message = "Email already in use." };

            // Generate unique phone number: 09XXXXXXXXX (11 digits)
            string phoneNumber;
            var random = new Random();
            while (true)
            {
                var digits = random.Next(100000000, 999999999).ToString(); // 9 random digits
                phoneNumber = "09" + digits; // "09" + 9 digits = 11 digits starting with 09
                
                var existingByPhone = await _userRepository.GetByPhoneNumberAsync(phoneNumber);
                if (existingByPhone == null)
                    break;
            }

            // Generate unique username
            string generatedUsername;
            while (true)
            {
                var randomPart = random.Next(100000000, 1000000000).ToString();
                generatedUsername = "09" + randomPart;
                
                var existingUserWithUsername = await _userRepository.GetByUsernameAsync(generatedUsername);
                if (existingUserWithUsername == null)
                    break;
            }

            var verificationToken = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(64));

            var user = new User
            {
                FirstName = request.FirstName,
                LastName = request.LastName,
                DateOfBirth = request.DateOfBirth,
                WhatsAppNumber = phoneNumber,
                IsWhatsAppVerified = false,
                Username = generatedUsername,
                Email = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                IsEmailVerified = true,
                VerificationToken = verificationToken,
                VerificationTokenExpires = DateTime.UtcNow.AddDays(1)
            };

            await _userRepository.AddAsync(user);

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
            var user = await _userRepository.GetByEmailAsync(request.Email);
            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                return new AuthResponse { Success = false, Message = "Invalid email or password." };

            //if (!user.IsEmailVerified)
            //    return new AuthResponse { Success = false, Message = "Please verify your email address before logging in." };

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
            // Generate OTP
            var otp = new Random().Next(100000, 999999).ToString();
            
            // Store in in-memory cache with 1 minute expiry
            _otpCache[request.Target] = (otp, DateTime.UtcNow.AddMinutes(2));
            
            if (request.Target.Contains("@"))
            {
                try
                {
                    var clientUrl = _config["AppSettings:ClientUrl"] ?? "https://localhost:4200";
                    var emailBody = EmailTemplates.GetOtpEmailHtml(otp, request.Target, clientUrl);
                    await _emailService.SendEmailAsync(request.Target, "Flink - Email Verification Code", emailBody);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Failed to send email: {ex.Message}");
                    return new AuthResponse { Success = false, Message = "Failed to send email. Check your SMTP settings." };
                }
            }
            else
            {
                // WhatsApp Simulation
                Console.WriteLine($"[SIMULATED WHATSAPP OTP] Sent to {request.Target}: {otp}");
            }

            return await Task.FromResult(new AuthResponse { Success = true, Message = $"OTP sent to {request.Target}" });
        }

        public async Task<AuthResponse> VerifyOtpAsync(VerifyOtpRequest request)
        {
            if (_otpCache.TryGetValue(request.Target, out var stored))
            {
                // Check if OTP expired (1 minute)
                if (DateTime.UtcNow > stored.ExpiresAt)
                {
                    _otpCache.TryRemove(request.Target, out _);
                    return await Task.FromResult(new AuthResponse { Success = false, Message = "OTP has expired. Please request a new one." });
                }

                if (stored.Otp == request.Otp)
                {
                    _otpCache.TryRemove(request.Target, out _);
                    return await Task.FromResult(new AuthResponse { Success = true, Message = "OTP verified successfully." });
                }
            }

            return await Task.FromResult(new AuthResponse { Success = false, Message = "Invalid OTP." });
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
    }
}
