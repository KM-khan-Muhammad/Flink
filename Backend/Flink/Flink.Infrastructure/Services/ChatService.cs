using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Flink.Application.DTOs;
using Flink.Application.Interfaces;

namespace Flink.Infrastructure.Services
{
    public class ChatService : IChatService
    {
        private readonly IChatRepository _chatRepository;
        private readonly ISmsService _smsService;

        public ChatService(IChatRepository chatRepository, ISmsService smsService)
        {
            _chatRepository = chatRepository;
            _smsService = smsService;
        }

        public async Task<List<ChatDto>> GetUserChatsAsync(int userId)
        {
            return await _chatRepository.GetChatsForUserAsync(userId);
        }

        public async Task<ChatDto?> GetChatAsync(int chatId, int userId)
        {
            return await _chatRepository.GetChatByIdAsync(chatId, userId);
        }

        public async Task<ChatDto> StartChatAsync(int userId, int otherUserId)
        {
            var existingChatId = await _chatRepository.FindChatBetweenUsersAsync(userId, otherUserId);
            if (existingChatId.HasValue)
            {
                var existing = await _chatRepository.GetChatByIdAsync(existingChatId.Value, userId);
                if (existing != null) return existing;
            }

            var chatId = await _chatRepository.CreateChatAsync(userId, otherUserId);
            var chat = await _chatRepository.GetChatByIdAsync(chatId, userId);
            return chat!;
        }

        public async Task<List<MessageDto>> GetMessagesAsync(int chatId, int userId, int page = 1)
        {
            return await _chatRepository.GetMessagesAsync(chatId, userId, page);
        }

        public async Task<MessageDto> SendMessageAsync(int userId, SendMessageRequest request)
        {
            var isMember = await _chatRepository.IsUserInChatAsync(userId, request.ChatId);
            if (!isMember)
                throw new UnauthorizedAccessException("You are not a member of this chat.");

            var messageId = await _chatRepository.SendMessageAsync(request.ChatId, userId, request.Content, request.MessageType, request.ReplyToMessageId);

            var fullMessage = await _chatRepository.GetMessageByIdAsync(messageId);
            if (fullMessage != null)
            {
                _ = SendWhatsAppNotificationsAsync(userId, fullMessage);
                return fullMessage;
            }

            var fallbackMessage = new MessageDto
            {
                Id = messageId,
                ChatId = request.ChatId,
                SenderId = userId,
                Content = request.Content,
                MessageType = request.MessageType ?? "text",
                IsRead = false,
                IsDeleted = false,
                ReplyToMessageId = request.ReplyToMessageId,
                SentAt = DateTime.UtcNow
            };
            _ = SendWhatsAppNotificationsAsync(userId, fallbackMessage);
            return fallbackMessage;
        }

        private async Task SendWhatsAppNotificationsAsync(int senderId, MessageDto message)
        {
            if (!string.Equals(message.MessageType, "text", StringComparison.OrdinalIgnoreCase))
                return;

            try
            {
                var recipients = await _chatRepository.GetWhatsAppRecipientsAsync(message.ChatId, senderId);
                if (recipients.Count == 0) return;

                var senderName = string.IsNullOrWhiteSpace(message.SenderName) ? "Flink" : message.SenderName;
                var body = $"{senderName} on Flink: {message.Content}";

                foreach (var recipient in recipients)
                {
                    if (string.IsNullOrWhiteSpace(recipient.PhoneNumber)) continue;
                    try
                    {
                        await _smsService.SendWhatsAppAsync(recipient.PhoneNumber, body);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Failed to send WhatsApp message to user {recipient.Id}: {ex.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to send WhatsApp notifications for message {message.Id}: {ex.Message}");
            }
        }

        public async Task MarkAsReadAsync(int chatId, int userId)
        {
            await _chatRepository.MarkMessagesAsReadAsync(chatId, userId);
        }

        public async Task<List<UserDto>> SearchUsersAsync(string query, int userId)
        {
            return await _chatRepository.SearchUsersAsync(query, userId);
        }

        public async Task<List<UserDto>> GetAllUsersAsync(int userId)
        {
            return await _chatRepository.GetAllUsersAsync(userId);
        }

        public async Task<UserDto?> GetUserByIdAsync(int userId)
        {
            return await _chatRepository.GetUserByIdAsync(userId);
        }

        public async Task<MessageDto?> GetMessageByIdAsync(int messageId)
        {
            return await _chatRepository.GetMessageByIdAsync(messageId);
        }

        public async Task<bool> EditMessageAsync(int userId, EditMessageRequest request)
        {
            var msg = await _chatRepository.GetMessageByIdAsync(request.MessageId);
            if (msg == null || msg.SenderId != userId) return false;
            return await _chatRepository.EditMessageAsync(request.MessageId, userId, request.Content);
        }

        public async Task<bool> DeleteMessageAsync(int userId, int messageId)
        {
            var msg = await _chatRepository.GetMessageByIdAsync(messageId);
            if (msg == null || msg.SenderId != userId) return false;
            return await _chatRepository.DeleteMessageAsync(messageId, userId);
        }

        public async Task UpdateHeartbeatAsync(int userId)
        {
            await _chatRepository.UpdateUserLastActiveAsync(userId);
        }

        public async Task<bool> IsUserOnlineAsync(int userId)
        {
            return await _chatRepository.IsUserOnlineAsync(userId);
        }

        public async Task UpdateTypingAsync(int chatId, int userId)
        {
            await _chatRepository.UpdateTypingStatusAsync(chatId, userId);
        }

        public async Task<DateTime?> GetOtherUserTypingAsync(int chatId, int userId)
        {
            return await _chatRepository.GetOtherUserTypingAsync(chatId, userId);
        }

        public async Task<ChatDto> CreateGroupChatAsync(int userId, CreateGroupChatRequest request)
        {
            var allMemberIds = new List<int> { userId };
            allMemberIds.AddRange(request.MemberIds.Where(id => id != userId));
            
            var chatId = await _chatRepository.CreateGroupChatAsync(request.Name, userId, allMemberIds);
            var chat = await _chatRepository.GetChatByIdAsync(chatId, userId);
            return chat!;
        }
    }
}
