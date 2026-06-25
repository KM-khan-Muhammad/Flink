using System.Threading.Tasks;
using Flink.Application.DTOs;
using Flink.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Flink.web.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterRequest request)
        {
            var response = await _authService.RegisterAsync(request);
            if (!response.Success)
                return BadRequest(response);

            return Ok(response);
        }

        [HttpPost("send-otp")]
        public async Task<IActionResult> SendOtp(SendOtpRequest request)
        {
            var response = await _authService.SendOtpAsync(request);
            if (!response.Success)
                return BadRequest(response);

            return Ok(response);
        }

        [HttpPost("verify-otp")]
        public async Task<IActionResult> VerifyOtp(VerifyOtpRequest request)
        {
            var response = await _authService.VerifyOtpAsync(request);
            if (!response.Success)
                return BadRequest(response);

            return Ok(response);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginRequest request)
        {
            var response = await _authService.LoginAsync(request);
            if (!response.Success)
                return BadRequest(response);

            return Ok(response);
        }

        [HttpGet("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromQuery] string token)
        {
            var result = await _authService.VerifyEmailAsync(token);
            if (!result)
                return BadRequest("Invalid or expired verification token.");

            return Ok("Email verified successfully. You can now login.");
        }

        [Authorize]
        [HttpGet("me")]
        public IActionResult GetCurrentUser()
        {
            var user = HttpContext.User;
            return Ok(new
            {
                Id = user.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
                Username = user.Identity?.Name,
                Email = user.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value,
                FirstName = user.FindFirst(System.Security.Claims.ClaimTypes.GivenName)?.Value,
                LastName = user.FindFirst(System.Security.Claims.ClaimTypes.Surname)?.Value,
                PhoneNumber = user.FindFirst("PhoneNumber")?.Value
            });
        }

        [Authorize]
        [HttpPut("update-profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
            var response = await _authService.UpdateProfileAsync(userId, request);
            if (!response.Success)
                return BadRequest(response);

            return Ok(response);
        }
    }
}
