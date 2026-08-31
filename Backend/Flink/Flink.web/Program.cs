using System.Net;
using System.Text;
using Flink.Application.Interfaces;
using Flink.Infrastructure.Services;
using Flink.Persistence.Factories;
using Flink.Persistence.Repositories;
using Flink.web.Hubs;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel to listen on all network interfaces
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(5223); // HTTP on all interfaces
    options.ListenAnyIP(7030, listenOptions =>
    {
        listenOptions.UseHttps(); // HTTPS on all interfaces
    });
    options.ListenLocalhost(5000); // Additional localhost HTTP
});

// Add services
builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddSignalR().AddJsonProtocol(options =>
{
    options.PayloadSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});

// Configure JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings.GetValue<string>("Secret") ?? throw new InvalidOperationException("JWT Secret not configured");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings.GetValue<string>("Issuer"),
        ValidAudience = jwtSettings.GetValue<string>("Audience"),
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;

            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        },
        OnTokenValidated = context =>
        {
            return Task.CompletedTask;
        }
    };
});

// Register DI Services
builder.Services.AddScoped<IDbConnectionFactory, SqlConnectionFactory>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IChatRepository, ChatRepository>();
builder.Services.AddScoped<ICallRepository, CallRepository>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddHttpClient<ISmsService, WhatsAppCloudApiService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IChatService, ChatService>();
builder.Services.AddScoped<ICallService, CallService>();
builder.Services.AddScoped<IStatusRepository, StatusRepository>();
builder.Services.AddScoped<IStatusService, StatusService>();

// Configure CORS - allow all origins in development for LAN testing
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularDev", policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            policy.SetIsOriginAllowed(_ => true)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
        else
        {
            policy.WithOrigins("https://localhost:4200", "http://localhost:4200")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
    });
});

var app = builder.Build();

app.UseStaticFiles();
app.UseCors("AllowAngularDev");

// Initialize Database
using (var scope = app.Services.CreateScope())
{
    Flink.Persistence.DatabaseInitializer.Initialize(scope.ServiceProvider);
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options =>
    {
        options.WithTitle("Flink API");
    });
}

// Skip HTTPS redirection in development for LAN testing (HTTP)
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<CallHub>("/hubs/call");
app.MapHub<ChatHub>("/hubs/chat");

// Print startup info in development
if (app.Environment.IsDevelopment())
{
    var addresses = app.Services.GetRequiredService<Microsoft.AspNetCore.Hosting.IWebHostEnvironment>();
    Console.WriteLine();
    Console.WriteLine("  ╔══════════════════════════════════════════════════════╗");
    Console.WriteLine("  ║                  FLINK BACKEND                     ║");
    Console.WriteLine("  ╠══════════════════════════════════════════════════════╣");
    Console.WriteLine("  ║  Local URLs:                                       ║");
    Console.WriteLine($"  ║    HTTP:  http://localhost:5223                     ║");
    Console.WriteLine($"  ║    HTTPS: https://localhost:7030                   ║");
    Console.WriteLine("  ║                                                    ║");
    Console.WriteLine("  ║  LAN URLs (from other devices):                    ║");
    foreach (var ip in GetLanIPs())
    {
        Console.WriteLine($"  ║    HTTP:  http://{ip,-30}     ║");
        Console.WriteLine($"  ║    HTTPS: https://{ip,-29}     ║");
    }
    Console.WriteLine("  ║                                                    ║");
    Console.WriteLine($"  ║  SignalR Hub: /hubs/call                           ║");
    Console.WriteLine($"  ║  SignalR Hub: /hubs/chat                           ║");
    Console.WriteLine("  ║  CORS: Allow all origins (development)             ║");
    Console.WriteLine("  ╚══════════════════════════════════════════════════════╝");
    Console.WriteLine();
}

app.Run();

// Helper method to get LAN IP addresses
static IEnumerable<string> GetLanIPs()
{
    var results = new List<string>();
    try
    {
        var host = Dns.GetHostEntry(Dns.GetHostName());
        foreach (var ip in host.AddressList)
        {
            if (ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork
                && !IPAddress.IsLoopback(ip))
            {
                results.Add(ip.ToString());
            }
        }
    }
    catch
    {
        results.Add("unable-to-detect");
    }
    return results;
}
