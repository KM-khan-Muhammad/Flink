using System;

namespace Flink.Application.DTOs
{
    public class RegisterRequest
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public DateTime DateOfBirth { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }
        public string WhatsAppNumber { get; set; }
        public string Username { get; set; }
    }
    
    public class LoginRequest
    {
        public string Email { get; set; }
        public string Password { get; set; }
    }
    
    public class AuthResponse
    {
        public string Token { get; set; }
        public string Message { get; set; }
        public bool Success { get; set; }
    }

    public class SendOtpRequest
    {
        public string Target { get; set; } // Email or Phone number
    }

    public class VerifyOtpRequest
    {
        public string Target { get; set; }
        public string Otp { get; set; }
    }

    public class UpdateProfileRequest
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }
    }
}
