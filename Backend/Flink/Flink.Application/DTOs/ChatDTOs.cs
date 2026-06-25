using System;

namespace Flink.Application.DTOs
{
    public class ChatDto
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public bool IsGroup { get; set; }
        public int OtherUserId { get; set; }
        public string OtherUserName { get; set; } = string.Empty;
        public string? OtherUserEmail { get; set; }
        public bool OtherUserOnline { get; set; }
        public string LastMessage { get; set; } = string.Empty;
        public string LastMessageTime { get; set; } = string.Empty;
        public int UnreadCount { get; set; }
    }

    public class MessageDto
    {
        public int Id { get; set; }
        public int ChatId { get; set; }
        public int SenderId { get; set; }
        public string SenderName { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string MessageType { get; set; } = "text";
        public bool IsRead { get; set; }
        public bool IsDeleted { get; set; }
        public int? ReplyToMessageId { get; set; }
        public string? ReplyToMessageContent { get; set; }
        public string? ReplyToMessageSenderName { get; set; }
        public DateTime SentAt { get; set; }
        public DateTime? EditedAt { get; set; }
    }

    public class SendMessageRequest
    {
        public int ChatId { get; set; }
        public string Content { get; set; } = string.Empty;
        public string MessageType { get; set; } = "text";
        public int? ReplyToMessageId { get; set; }
    }

    public class EditMessageRequest
    {
        public int MessageId { get; set; }
        public string Content { get; set; } = string.Empty;
    }

    public class DeleteMessageRequest
    {
        public int MessageId { get; set; }
    }

    public class TypingRequest
    {
        public int ChatId { get; set; }
    }

    public class CreateChatRequest
    {
        public int OtherUserId { get; set; }
        public string? Message { get; set; }
    }

    public class UserDto
    {
        public int Id { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string FullName => $"{FirstName} {LastName}".Trim();
    }
}
