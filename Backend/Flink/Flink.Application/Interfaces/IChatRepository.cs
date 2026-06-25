using System.Collections.Generic;
using System.Threading.Tasks;
using Flink.Application.DTOs;

namespace Flink.Application.Interfaces
{
    public interface IChatRepository
    {
        Task<List<ChatDto>> GetChatsForUserAsync(int userId);
        Task<ChatDto?> GetChatByIdAsync(int chatId, int userId);
        Task<int> CreateChatAsync(int userId, int otherUserId);
        Task<int> CreateGroupChatAsync(string name, int creatorUserId, List<int> memberIds);
        Task<List<MessageDto>> GetMessagesAsync(int chatId, int userId, int page = 1, int pageSize = 50);
        Task<int> SendMessageAsync(int chatId, int senderId, string content, string messageType, int? replyToMessageId);
        Task MarkMessagesAsReadAsync(int chatId, int userId);
        Task<int?> FindChatBetweenUsersAsync(int user1Id, int user2Id);
        Task<List<UserDto>> SearchUsersAsync(string query, int excludeUserId);
        Task<List<UserDto>> GetAllUsersAsync(int excludeUserId);
        Task<UserDto?> GetUserByIdAsync(int userId);
        Task<bool> IsUserInChatAsync(int userId, int chatId);
        Task<int> GetUnreadCountAsync(int chatId, int userId);
        Task<MessageDto?> GetMessageByIdAsync(int messageId);
        Task<bool> EditMessageAsync(int messageId, int userId, string content);
        Task<bool> DeleteMessageAsync(int messageId, int userId);
        Task UpdateUserLastActiveAsync(int userId);
        Task<bool> IsUserOnlineAsync(int userId);
        Task UpdateTypingStatusAsync(int chatId, int userId);
        Task<DateTime?> GetOtherUserTypingAsync(int chatId, int userId);
    }
}
