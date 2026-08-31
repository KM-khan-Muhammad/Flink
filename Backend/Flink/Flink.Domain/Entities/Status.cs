using System;

namespace Flink.Domain.Entities
{
    public class Status
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string? Text { get; set; }
        public string? ImageUrl { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
    }
}
