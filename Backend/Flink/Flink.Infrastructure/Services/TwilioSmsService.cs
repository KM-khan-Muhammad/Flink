using System.Threading.Tasks;
using Flink.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Twilio;
using Twilio.Rest.Api.V2010.Account;

namespace Flink.Infrastructure.Services
{
    public class TwilioSmsService : ISmsService
    {
        private readonly string? _accountSid;
        private readonly string? _authToken;
        private readonly string? _fromNumber;
        private readonly string? _whatsAppFromNumber;
        private readonly string _defaultCountryCode;
        private bool _isConfigured;
        private bool _isWhatsAppConfigured;

        public TwilioSmsService(IConfiguration config)
        {
            _accountSid = config["Twilio:AccountSid"];
            _authToken = config["Twilio:AuthToken"];
            _fromNumber = config["Twilio:FromNumber"];
            _whatsAppFromNumber = config["Twilio:WhatsAppFromNumber"];
            _defaultCountryCode = config["Twilio:DefaultCountryCode"] ?? "+92";

            _isConfigured = !string.IsNullOrWhiteSpace(_accountSid)
                && !string.IsNullOrWhiteSpace(_authToken)
                && !string.IsNullOrWhiteSpace(_fromNumber)
                && !_accountSid.StartsWith("YOUR_");

            _isWhatsAppConfigured = !string.IsNullOrWhiteSpace(_accountSid)
                && !string.IsNullOrWhiteSpace(_authToken)
                && !string.IsNullOrWhiteSpace(_whatsAppFromNumber)
                && !_accountSid.StartsWith("YOUR_");

            if (_isConfigured || _isWhatsAppConfigured)
            {
                TwilioClient.Init(_accountSid!, _authToken!);
            }
        }

        public async Task SendSmsAsync(string toPhoneNumber, string message)
        {
            if (!_isConfigured)
            {
                Console.WriteLine($"[LOCAL SMS OUTBOX] To {toPhoneNumber}: {message}");
                await Task.CompletedTask;
                return;
            }

            var resource = await MessageResource.CreateAsync(
                body: message,
                from: new Twilio.Types.PhoneNumber(_fromNumber!),
                to: new Twilio.Types.PhoneNumber(toPhoneNumber)
            );

            if (resource.Status == MessageResource.StatusEnum.Failed ||
                resource.Status == MessageResource.StatusEnum.Undelivered)
            {
                throw new System.Exception($"SMS failed: {resource.ErrorMessage}");
            }
        }

        public async Task SendWhatsAppAsync(string toPhoneNumber, string message)
        {
            if (!_isWhatsAppConfigured)
            {
                throw new System.Exception("WhatsApp sending is not configured. Add Twilio AccountSid, AuthToken, and WhatsAppFromNumber to appsettings.json.");
            }

            var resource = await MessageResource.CreateAsync(
                body: message,
                from: new Twilio.Types.PhoneNumber(FormatWhatsAppAddress(_whatsAppFromNumber!)),
                to: new Twilio.Types.PhoneNumber(FormatWhatsAppAddress(NormalizePhoneNumber(toPhoneNumber)))
            );

            if (resource.Status == MessageResource.StatusEnum.Failed ||
                resource.Status == MessageResource.StatusEnum.Undelivered)
            {
                throw new System.Exception($"WhatsApp failed: {resource.ErrorMessage}");
            }
        }

        private string NormalizePhoneNumber(string phoneNumber)
        {
            var normalized = phoneNumber.Trim()
                .Replace(" ", string.Empty)
                .Replace("-", string.Empty)
                .Replace("(", string.Empty)
                .Replace(")", string.Empty);

            if (normalized.StartsWith("whatsapp:", System.StringComparison.OrdinalIgnoreCase))
                normalized = normalized["whatsapp:".Length..];

            if (normalized.StartsWith("00"))
                return "+" + normalized[2..];

            if (normalized.StartsWith("+"))
                return normalized;

            if (normalized.StartsWith("0"))
                return _defaultCountryCode + normalized[1..];

            return _defaultCountryCode + normalized;
        }

        private static string FormatWhatsAppAddress(string phoneNumber)
        {
            return phoneNumber.StartsWith("whatsapp:", System.StringComparison.OrdinalIgnoreCase)
                ? phoneNumber
                : $"whatsapp:{phoneNumber}";
        }
    }
}
