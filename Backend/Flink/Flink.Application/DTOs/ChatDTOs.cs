using System;
using System.ComponentModel.DataAnnotations;

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
        [Required(ErrorMessage = "Chat ID is required.")]
        public int ChatId { get; set; }

        [Required(ErrorMessage = "Message content is required.")]
        [MaxLength(5000, ErrorMessage = "Message content cannot exceed 5000 characters.")]
        public string Content { get; set; } = string.Empty;

        public string MessageType { get; set; } = "text";
        public int? ReplyToMessageId { get; set; }
    }

    public class EditMessageRequest
    {
        [Required(ErrorMessage = "Message ID is required.")]
        public int MessageId { get; set; }

        [Required(ErrorMessage = "Message content is required.")]
        [MaxLength(5000, ErrorMessage = "Message content cannot exceed 5000 characters.")]
        public string Content { get; set; } = string.Empty;
    }

    public class DeleteMessageRequest
    {
        public int MessageId { get; set; }
    }

    public class TypingRequest
    {
        [Required(ErrorMessage = "Chat ID is required.")]
        public int ChatId { get; set; }
    }

    public class CreateChatRequest
    {
        [Required(ErrorMessage = "Other user ID is required.")]
        public int OtherUserId { get; set; }
        public string? Message { get; set; }
    }

    public class CreateGroupChatRequest
    {
        [Required(ErrorMessage = "Group name is required.")]
        [MaxLength(100, ErrorMessage = "Group name cannot exceed 100 characters.")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Member IDs are required.")]
        public List<int> MemberIds { get; set; } = new();
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

    public class CallDto
    {
        public int Id { get; set; }
        public int ChatId { get; set; }
        public int CallerId { get; set; }
        public string CallerName { get; set; } = string.Empty;
        public int ReceiverId { get; set; }
        public string ReceiverName { get; set; } = string.Empty;
        public string CallType { get; set; } = "voice";
        public string Status { get; set; } = "ringing";
        public DateTime StartedAt { get; set; }
        public DateTime? AnsweredAt { get; set; }
        public DateTime? EndedAt { get; set; }
    }

    public class InitiateCallRequest
    {
        [Required(ErrorMessage = "Chat ID is required.")]
        public int ChatId { get; set; }

        [Required(ErrorMessage = "Call type is required.")]
        public string CallType { get; set; } = "voice";
    }
}
