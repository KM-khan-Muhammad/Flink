using Moq;
using Flink.Application.DTOs;
using Flink.Application.Interfaces;
using Flink.Domain.Entities;
using Flink.Infrastructure.Services;
using Microsoft.Extensions.Configuration;

namespace Flink.Tests;

public class AuthServiceTests
{
    private readonly Mock<IUserRepository> _userRepoMock;
    private readonly Mock<IEmailService> _emailServiceMock;
    private readonly Mock<IConfiguration> _configMock;
    private readonly AuthService _authService;

    public AuthServiceTests()
    {
        _userRepoMock = new Mock<IUserRepository>();
        _emailServiceMock = new Mock<IEmailService>();
        _configMock = new Mock<IConfiguration>();

        var jwtSectionMock = new Mock<IConfigurationSection>();
        jwtSectionMock.Setup(x => x.Value).Returns("c2VjdXJlLXNlY3JldC1rZXktZm9yLWZsaW5rLWFwcC0yMDI0");
        _configMock.Setup(x => x.GetSection("JwtSettings")).Returns(jwtSectionMock.Object);
        _configMock.Setup(x => x["JwtSettings:Secret"]).Returns("c2VjdXJlLXNlY3JldC1rZXktZm9yLWZsaW5rLWFwcC0yMDI0");
        _configMock.Setup(x => x["JwtSettings:Issuer"]).Returns("FlinkIssuer");
        _configMock.Setup(x => x["JwtSettings:Audience"]).Returns("FlinkAudience");
        _configMock.Setup(x => x["AppSettings:ClientUrl"]).Returns("http://localhost:4200");

        _authService = new AuthService(_userRepoMock.Object, _emailServiceMock.Object, _configMock.Object);
    }

    [Fact]
    public async Task RegisterAsync_EmailAlreadyExists_ReturnsFailure()
    {
        _userRepoMock.Setup(x => x.GetByEmailAsync("test@test.com")).ReturnsAsync(new User());

        var request = new RegisterRequest
        {
            FirstName = "John",
            LastName = "Doe",
            Email = "test@test.com",
            Password = "Password123!"
        };

        var result = await _authService.RegisterAsync(request);

        Assert.False(result.Success);
        Assert.Equal("Email already in use.", result.Message);
    }

    [Fact]
    public async Task RegisterAsync_Success_ReturnsSuccess()
    {
        _userRepoMock.Setup(x => x.GetByEmailAsync("new@test.com")).ReturnsAsync((User)null!);
        _userRepoMock.Setup(x => x.GetByUsernameAsync(It.IsAny<string>())).ReturnsAsync((User)null!);
        _userRepoMock.Setup(x => x.AddAsync(It.IsAny<User>())).ReturnsAsync(1);
        _emailServiceMock.Setup(x => x.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        var request = new RegisterRequest
        {
            FirstName = "John",
            LastName = "Doe",
            DateOfBirth = new DateTime(2000, 1, 1),
            Email = "new@test.com",
            Password = "Password123!",
            WhatsAppNumber = ""
        };

        var result = await _authService.RegisterAsync(request);

        Assert.True(result.Success);
        Assert.Contains("Registration successful", result.Message);
    }

    [Fact]
    public async Task LoginAsync_InvalidCredentials_ReturnsFailure()
    {
        _userRepoMock.Setup(x => x.GetByEmailAsync("wrong@test.com")).ReturnsAsync((User)null!);

        var request = new LoginRequest
        {
            Email = "wrong@test.com",
            Password = "wrongpassword"
        };

        var result = await _authService.LoginAsync(request);

        Assert.False(result.Success);
        Assert.Equal("Invalid email or password.", result.Message);
    }

    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsSuccessWithToken()
    {
        var user = new User
        {
            Id = 1,
            Email = "test@test.com",
            Username = "testuser",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("CorrectPassword1"),
            IsEmailVerified = true
        };

        _userRepoMock.Setup(x => x.GetByEmailAsync("test@test.com")).ReturnsAsync(user);

        var request = new LoginRequest
        {
            Email = "test@test.com",
            Password = "CorrectPassword1"
        };

        var result = await _authService.LoginAsync(request);

        Assert.True(result.Success);
        Assert.Equal("Login successful.", result.Message);
        Assert.NotNull(result.Token);
    }

    [Fact]
    public async Task VerifyEmailAsync_InvalidToken_ReturnsFalse()
    {
        _userRepoMock.Setup(x => x.GetByVerificationTokenAsync("invalid-token")).ReturnsAsync((User)null!);

        var result = await _authService.VerifyEmailAsync("invalid-token");

        Assert.False(result);
    }

    [Fact]
    public async Task VerifyEmailAsync_ExpiredToken_ReturnsFalse()
    {
        var user = new User
        {
            VerificationToken = "expired-token",
            VerificationTokenExpires = DateTime.UtcNow.AddDays(-1)
        };

        _userRepoMock.Setup(x => x.GetByVerificationTokenAsync("expired-token")).ReturnsAsync(user);

        var result = await _authService.VerifyEmailAsync("expired-token");

        Assert.False(result);
    }

    [Fact]
    public async Task VerifyEmailAsync_ValidToken_ReturnsTrueAndUpdatesUser()
    {
        var user = new User
        {
            VerificationToken = "valid-token",
            VerificationTokenExpires = DateTime.UtcNow.AddDays(1),
            IsEmailVerified = false
        };

        _userRepoMock.Setup(x => x.GetByVerificationTokenAsync("valid-token")).ReturnsAsync(user);
        _userRepoMock.Setup(x => x.UpdateAsync(It.IsAny<User>())).Returns(Task.CompletedTask);

        var result = await _authService.VerifyEmailAsync("valid-token");

        Assert.True(result);
        Assert.True(user.IsEmailVerified);
        Assert.Null(user.VerificationToken);
        Assert.Null(user.VerificationTokenExpires);
    }

    [Fact]
    public async Task SendOtpAsync_EmailTarget_SendsEmail()
    {
        _emailServiceMock.Setup(x => x.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        var request = new SendOtpRequest { Target = "user@test.com" };

        var result = await _authService.SendOtpAsync(request);

        Assert.True(result.Success);
        Assert.Contains("OTP sent", result.Message);
        _emailServiceMock.Verify(x => x.SendEmailAsync("user@test.com", It.IsAny<string>(), It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task VerifyOtpAsync_OtpNotSent_ReturnsFailure()
    {
        var request = new VerifyOtpRequest { Target = "user@test.com", Otp = "123456" };

        var result = await _authService.VerifyOtpAsync(request);

        Assert.False(result.Success);
        Assert.Equal("Invalid OTP.", result.Message);
    }

    [Fact]
    public async Task VerifyOtpAsync_WrongOtp_ReturnsFailure()
    {
        var request = new VerifyOtpRequest { Target = "user@test.com", Otp = "wrong-otp" };

        var result = await _authService.VerifyOtpAsync(request);

        Assert.False(result.Success);
        Assert.Equal("Invalid OTP.", result.Message);
    }

    [Fact]
    public async Task RegisterAsync_EmailServiceFails_StillReturnsSuccessWithWarning()
    {
        _userRepoMock.Setup(x => x.GetByEmailAsync("new@test.com")).ReturnsAsync((User)null!);
        _userRepoMock.Setup(x => x.GetByUsernameAsync(It.IsAny<string>())).ReturnsAsync((User)null!);
        _userRepoMock.Setup(x => x.AddAsync(It.IsAny<User>())).ReturnsAsync(1);
        _emailServiceMock.Setup(x => x.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ThrowsAsync(new InvalidOperationException("SMTP not configured"));

        var request = new RegisterRequest
        {
            FirstName = "John",
            LastName = "Doe",
            Email = "new@test.com",
            Password = "Password123!"
        };

        var result = await _authService.RegisterAsync(request);

        Assert.True(result.Success);
        Assert.Contains("SMTP error", result.Message);
    }
}
