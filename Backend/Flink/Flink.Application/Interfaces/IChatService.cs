using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Flink.Application.DTOs;

namespace Flink.Application.Interfaces
{
    public interface IChatService
    {
        Task<List<ChatDto>> GetUserChatsAsync(int userId);
        Task<ChatDto?> GetChatAsync(int chatId, int userId);
        Task<ChatDto> StartChatAsync(int userId, int otherUserId);
        Task<List<MessageDto>> GetMessagesAsync(int chatId, int userId, int page);
        Task<MessageDto> SendMessageAsync(int userId, SendMessageRequest request);
        Task MarkAsReadAsync(int chatId, int userId);
        Task<List<UserDto>> SearchUsersAsync(string query, int userId);
        Task<List<UserDto>> GetAllUsersAsync(int userId);
        Task<UserDto?> GetUserByIdAsync(int userId);
        Task<MessageDto?> GetMessageByIdAsync(int messageId);
        Task<bool> EditMessageAsync(int userId, EditMessageRequest request);
        Task<bool> DeleteMessageAsync(int userId, int messageId);
        Task UpdateHeartbeatAsync(int userId);
        Task<bool> IsUserOnlineAsync(int userId);
        Task UpdateTypingAsync(int chatId, int userId);
        Task<DateTime?> GetOtherUserTypingAsync(int chatId, int userId);
        Task<ChatDto> CreateGroupChatAsync(int userId, CreateGroupChatRequest request);
    }
}
