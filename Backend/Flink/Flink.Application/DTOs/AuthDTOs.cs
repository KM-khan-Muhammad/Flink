using System;
using System.ComponentModel.DataAnnotations;

namespace Flink.Application.DTOs
{
    public class RegisterRequest
    {
        [Required(ErrorMessage = "First name is required.")]
        [StringLength(50, MinimumLength = 1, ErrorMessage = "First name must be between 1 and 50 characters.")]
        public string FirstName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Last name is required.")]
        [StringLength(50, MinimumLength = 1, ErrorMessage = "Last name must be between 1 and 50 characters.")]
        public string LastName { get; set; } = string.Empty;

        public DateTime DateOfBirth { get; set; }

        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress(ErrorMessage = "Invalid email address.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required.")]
        [StringLength(100, MinimumLength = 6, ErrorMessage = "Password must be at least 6 characters.")]
        public string Password { get; set; } = string.Empty;

        public string WhatsAppNumber { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
    }
    
    public class LoginRequest
    {
        [Required(ErrorMessage = "Email, phone number, or username is required.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required.")]
        public string Password { get; set; } = string.Empty;
    }
    
    public class AuthResponse
    {
        public string? Token { get; set; }
        public string Message { get; set; } = string.Empty;
        public bool Success { get; set; }
    }

    public class SendOtpRequest
    {
        [Required(ErrorMessage = "Target is required.")]
        public string Target { get; set; } = string.Empty;
    }

    public class VerifyOtpRequest
    {
        [Required(ErrorMessage = "Target is required.")]
        public string Target { get; set; } = string.Empty;

        [Required(ErrorMessage = "OTP is required.")]
        [StringLength(6, MinimumLength = 6, ErrorMessage = "OTP must be 6 digits.")]
        public string Otp { get; set; } = string.Empty;
    }

    public class UpdateProfileRequest
    {
        [Required(ErrorMessage = "First name is required.")]
        [StringLength(50, MinimumLength = 1, ErrorMessage = "First name must be between 1 and 50 characters.")]
        public string FirstName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Last name is required.")]
        [StringLength(50, MinimumLength = 1, ErrorMessage = "Last name must be between 1 and 50 characters.")]
        public string LastName { get; set; } = string.Empty;
    }
}
