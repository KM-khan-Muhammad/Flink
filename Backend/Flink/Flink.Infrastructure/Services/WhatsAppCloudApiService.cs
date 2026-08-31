using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Flink.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace Flink.Infrastructure.Services
{
    public class WhatsAppCloudApiService : ISmsService
    {
        private readonly HttpClient _httpClient;
        private readonly string? _accessToken;
        private readonly string? _phoneNumberId;
        private readonly string _version;
        private readonly string _defaultCountryCode;
        private readonly bool _isConfigured;

        public WhatsAppCloudApiService(HttpClient httpClient, IConfiguration config)
        {
            _httpClient = httpClient;
            _accessToken = config["WhatsAppCloudApi:AccessToken"] ?? config["WhatsApp:AccessToken"];
            _phoneNumberId = config["WhatsAppCloudApi:PhoneNumberId"] ?? config["WhatsApp:PhoneNumberId"];
            _version = config["WhatsAppCloudApi:Version"] ?? config["WhatsApp:Version"] ?? "v23.0";
            _defaultCountryCode = config["WhatsAppCloudApi:DefaultCountryCode"] ?? config["WhatsApp:DefaultCountryCode"] ?? "92";

            _isConfigured = !string.IsNullOrWhiteSpace(_accessToken)
                && !string.IsNullOrWhiteSpace(_phoneNumberId)
                && !_accessToken.StartsWith("YOUR_")
                && !_phoneNumberId.StartsWith("YOUR_");
        }

        public async Task SendSmsAsync(string toPhoneNumber, string message)
        {
            // SMS fallback to WhatsApp Cloud API
            await SendWhatsAppAsync(toPhoneNumber, message);
        }

        public async Task SendWhatsAppAsync(string toPhoneNumber, string message)
        {
            var recipient = NormalizePhoneNumber(toPhoneNumber);

            if (!_isConfigured)
            {
                Console.WriteLine($"[WHATSAPP CLOUD API LOCAL OUTBOX] To {recipient}: {message}");
                Console.WriteLine("[WHATSAPP CLOUD API NOTE] AccessToken or PhoneNumberId not set in appsettings.json.");
                await Task.CompletedTask;
                return;
            }

            var requestUrl = $"https://graph.facebook.com/{_version}/{_phoneNumberId}/messages";

            var payload = new
            {
                messaging_product = "whatsapp",
                to = recipient,
                type = "text",
                text = new
                {
                    body = message
                }
            };

            var jsonContent = JsonSerializer.Serialize(payload);
            Console.WriteLine($"[WHATSAPP CLOUD API] Sending OTP to {recipient} | PhoneId: {_phoneNumberId} | Token Length: {_accessToken?.Length ?? 0} chars");
            if (_accessToken != null && _accessToken.Length < 150)
            {
                Console.WriteLine($"[WHATSAPP CLOUD API WARNING] AccessToken length is only {_accessToken.Length} chars! Meta WhatsApp tokens are typically 200-280 chars long. Ensure the token in appsettings.json is not truncated.");
            }

            using var request = new HttpRequestMessage(HttpMethod.Post, requestUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);
            request.Content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                Console.WriteLine($"[WHATSAPP CLOUD API ERROR] Status: {response.StatusCode}, Body: {responseBody}");
                throw new Exception($"WhatsApp Cloud API error ({response.StatusCode}): {responseBody}");
            }

            Console.WriteLine($"[WHATSAPP CLOUD API SUCCESS] OTP sent to {recipient}");
        }

        private string NormalizePhoneNumber(string phoneNumber)
        {
            if (string.IsNullOrWhiteSpace(phoneNumber))
                return string.Empty;

            var normalized = phoneNumber.Trim()
                .Replace(" ", string.Empty)
                .Replace("-", string.Empty)
                .Replace("(", string.Empty)
                .Replace(")", string.Empty);

            if (normalized.StartsWith("whatsapp:", StringComparison.OrdinalIgnoreCase))
                normalized = normalized["whatsapp:".Length..];

            if (normalized.StartsWith("+"))
                normalized = normalized[1..];

            if (normalized.StartsWith("00"))
                normalized = normalized[2..];

            if (normalized.StartsWith("0"))
                normalized = _defaultCountryCode + normalized[1..];
            else if (!normalized.StartsWith(_defaultCountryCode) && normalized.Length == 10 && normalized.StartsWith("3"))
                normalized = _defaultCountryCode + normalized;

            return normalized;
        }
    }
}
