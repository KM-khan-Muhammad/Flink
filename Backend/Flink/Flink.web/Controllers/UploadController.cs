using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Flink.web.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UploadController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<UploadController> _logger;
        private int UserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        private static readonly string[] AllowedImageTypes = { "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml" };
        private static readonly string[] AllowedVideoTypes = { "video/mp4", "video/webm", "video/quicktime" };
        private static readonly string[] AllowedAudioTypes = { "audio/mpeg", "audio/wav", "audio/ogg", "audio/webm", "audio/mp4" };
        private static readonly string[] AllowedDocTypes = { "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/plain" };

        private const long MaxImageSize = 10 * 1024 * 1024;   // 10MB
        private const long MaxVideoSize = 100 * 1024 * 1024;  // 100MB
        private const long MaxAudioSize = 20 * 1024 * 1024;   // 20MB
        private const long MaxDocSize = 50 * 1024 * 1024;     // 50MB

        public UploadController(IWebHostEnvironment env, ILogger<UploadController> logger)
        {
            _env = env;
            _logger = logger;
        }

        [HttpPost]
        [RequestSizeLimit(110 * 1024 * 1024)]
        public async Task<IActionResult> Upload(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { success = false, message = "No file uploaded." });

            var rawContentType = file.ContentType?.ToLowerInvariant() ?? string.Empty;
            var contentType = rawContentType.Contains(';') ? rawContentType.Substring(0, rawContentType.IndexOf(';')).Trim() : rawContentType;

            if (string.IsNullOrWhiteSpace(contentType) || contentType == "application/octet-stream")
            {
                var fileExt = Path.GetExtension(file.FileName)?.ToLowerInvariant();
                contentType = fileExt switch
                {
                    ".jpg" or ".jpeg" => "image/jpeg",
                    ".png" => "image/png",
                    ".gif" => "image/gif",
                    ".webp" => "image/webp",
                    ".mp4" => "video/mp4",
                    ".webm" => "video/webm",
                    ".mp3" or ".mpeg" => "audio/mpeg",
                    ".wav" => "audio/wav",
                    ".ogg" => "audio/ogg",
                    ".oga" => "audio/ogg",
                    ".m4a" => "audio/mp4",
                    ".pdf" => "application/pdf",
                    ".txt" => "text/plain",
                    _ => string.Empty
                };
            }

            string category;

            if (AllowedImageTypes.Contains(contentType))
            {
                if (file.Length > MaxImageSize)
                    return BadRequest(new { success = false, message = $"Image size cannot exceed {MaxImageSize / 1024 / 1024}MB." });
                category = "images";
            }
            else if (AllowedVideoTypes.Contains(contentType))
            {
                if (file.Length > MaxVideoSize)
                    return BadRequest(new { success = false, message = $"Video size cannot exceed {MaxVideoSize / 1024 / 1024}MB." });
                category = "videos";
            }
            else if (AllowedAudioTypes.Contains(contentType))
            {
                if (file.Length > MaxAudioSize)
                    return BadRequest(new { success = false, message = $"Audio size cannot exceed {MaxAudioSize / 1024 / 1024}MB." });
                category = "audio";
            }
            else if (AllowedDocTypes.Contains(contentType))
            {
                if (file.Length > MaxDocSize)
                    return BadRequest(new { success = false, message = $"Document size cannot exceed {MaxDocSize / 1024 / 1024}MB." });
                category = "documents";
            }
            else
            {
                return BadRequest(new { success = false, message = $"File type '{contentType}' is not supported." });
            }

            var uploadsPath = Path.Combine(_env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"), "uploads", category);
            Directory.CreateDirectory(uploadsPath);

            var ext = Path.GetExtension(file.FileName);
            var fileName = $"{UserId}_{DateTime.UtcNow:yyyyMMddHHmmssfff}_{Guid.NewGuid():N}{ext}";
            var filePath = Path.Combine(uploadsPath, fileName);

            await using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);

            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var fileUrl = $"{baseUrl}/uploads/{category}/{fileName}";

            _logger.LogInformation("User {UserId} uploaded file: {FileName} ({Size} bytes)", UserId, fileName, file.Length);

            return Ok(new
            {
                success = true,
                fileUrl,
                fileName,
                contentType,
                fileSize = file.Length,
                category
            });
        }
    }
}
