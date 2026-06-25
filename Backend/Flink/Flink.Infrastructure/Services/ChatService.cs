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

        public ChatService(IChatRepository chatRepository)
        {
            _chatRepository = chatRepository;
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

            return new MessageDto
            {
                Id = messageId,
                ChatId = request.ChatId,
                SenderId = userId,
                Content = request.Content,
                MessageType = request.MessageType,
                IsRead = false,
                IsDeleted = false,
                ReplyToMessageId = request.ReplyToMessageId,
                SentAt = DateTime.UtcNow
            };
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
    }
}
