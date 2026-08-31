using System;

namespace Flink.Application.DTOs
{
    public class StatusDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string? UserName { get; set; }
        public string? Text { get; set; }
        public string? ImageUrl { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public bool IsOwn { get; set; }
    }

    public class CreateStatusRequest
    {
        public string? Text { get; set; }
        public string? ImageUrl { get; set; }
    }
}
