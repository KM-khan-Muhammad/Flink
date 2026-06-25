using System.Security.Claims;
using Flink.Application.DTOs;
using Flink.Application.Interfaces;
using Flink.web.Controllers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace Flink.Tests;

public class AuthControllerTests
{
    private readonly Mock<IAuthService> _authServiceMock;
    private readonly AuthController _controller;

    public AuthControllerTests()
    {
        _authServiceMock = new Mock<IAuthService>();
        _controller = new AuthController(_authServiceMock.Object);
    }

    [Fact]
    public async Task Register_Success_ReturnsOk()
    {
        var request = new RegisterRequest
        {
            FirstName = "John",
            LastName = "Doe",
            Email = "john@test.com",
            Password = "Password123"
        };

        _authServiceMock.Setup(x => x.RegisterAsync(request))
            .ReturnsAsync(new AuthResponse { Success = true, Message = "Registration successful." });

        var result = await _controller.Register(request);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<AuthResponse>(okResult.Value);
        Assert.True(response.Success);
    }

    [Fact]
    public async Task Register_Failure_ReturnsBadRequest()
    {
        var request = new RegisterRequest { Email = "existing@test.com", Password = "Password123" };
        _authServiceMock.Setup(x => x.RegisterAsync(request))
            .ReturnsAsync(new AuthResponse { Success = false, Message = "Email already in use." });

        var result = await _controller.Register(request);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        var response = Assert.IsType<AuthResponse>(badRequest.Value);
        Assert.False(response.Success);
    }

    [Fact]
    public async Task Login_Success_ReturnsOkWithToken()
    {
        var request = new LoginRequest { Email = "test@test.com", Password = "password" };
        _authServiceMock.Setup(x => x.LoginAsync(request))
            .ReturnsAsync(new AuthResponse { Success = true, Token = "jwt-token", Message = "Login successful." });

        var result = await _controller.Login(request);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<AuthResponse>(okResult.Value);
        Assert.True(response.Success);
        Assert.NotNull(response.Token);
    }

    [Fact]
    public async Task Login_Failure_ReturnsBadRequest()
    {
        var request = new LoginRequest { Email = "wrong@test.com", Password = "wrong" };
        _authServiceMock.Setup(x => x.LoginAsync(request))
            .ReturnsAsync(new AuthResponse { Success = false, Message = "Invalid email or password." });

        var result = await _controller.Login(request);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task SendOtp_Success_ReturnsOk()
    {
        var request = new SendOtpRequest { Target = "user@test.com" };
        _authServiceMock.Setup(x => x.SendOtpAsync(request))
            .ReturnsAsync(new AuthResponse { Success = true, Message = "OTP sent to user@test.com" });

        var result = await _controller.SendOtp(request);

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task VerifyOtp_Success_ReturnsOk()
    {
        var request = new VerifyOtpRequest { Target = "user@test.com", Otp = "123456" };
        _authServiceMock.Setup(x => x.VerifyOtpAsync(request))
            .ReturnsAsync(new AuthResponse { Success = true, Message = "OTP verified successfully." });

        var result = await _controller.VerifyOtp(request);

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task VerifyEmail_Success_ReturnsOk()
    {
        _authServiceMock.Setup(x => x.VerifyEmailAsync("valid-token")).ReturnsAsync(true);

        var result = await _controller.VerifyEmail("valid-token");

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal("Email verified successfully. You can now login.", okResult.Value);
    }

    [Fact]
    public async Task VerifyEmail_Failure_ReturnsBadRequest()
    {
        _authServiceMock.Setup(x => x.VerifyEmailAsync("invalid-token")).ReturnsAsync(false);

        var result = await _controller.VerifyEmail("invalid-token");

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Invalid or expired verification token.", badRequest.Value);
    }

    [Fact]
    public void GetCurrentUser_Authorized_ReturnsClaims()
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, "1"),
            new(ClaimTypes.Name, "testuser"),
            new(ClaimTypes.Email, "test@test.com")
        };

        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };

        var result = _controller.GetCurrentUser();

        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = okResult.Value!;
        var props = response.GetType().GetProperties().ToDictionary(p => p.Name, p => p.GetValue(response));
        Assert.Equal("1", props["Id"]!.ToString());
        Assert.Equal("testuser", props["Username"]!.ToString());
        Assert.Equal("test@test.com", props["Email"]!.ToString());
    }
}
