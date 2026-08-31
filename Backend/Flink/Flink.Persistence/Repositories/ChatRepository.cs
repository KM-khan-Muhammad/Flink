using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using Flink.Application.DTOs;
using Flink.Application.Interfaces;

namespace Flink.Persistence.Repositories
{
    public class ChatRepository : IChatRepository
    {
        private readonly IDbConnectionFactory _connectionFactory;

        public ChatRepository(IDbConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory;
        }

        public async Task<List<ChatDto>> GetChatsForUserAsync(int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = @"
                SELECT DISTINCT c.Id, c.Name, c.IsGroup,
                    (SELECT TOP 1 u.Id FROM Users u 
                     INNER JOIN ChatMembers cm2 ON cm2.UserId = u.Id 
                     WHERE cm2.ChatId = c.Id AND cm2.UserId <> @UserId) AS OtherUserId,
                    (SELECT TOP 1 CASE WHEN c.IsGroup = 0 THEN CONCAT(u.FirstName, ' ', u.LastName) ELSE c.Name END
                     FROM Users u 
                     INNER JOIN ChatMembers cm2 ON cm2.UserId = u.Id 
                     WHERE cm2.ChatId = c.Id AND cm2.UserId <> @UserId) AS OtherUserName,
                    (SELECT TOP 1 u.Email FROM Users u 
                     INNER JOIN ChatMembers cm2 ON cm2.UserId = u.Id 
                     WHERE cm2.ChatId = c.Id AND cm2.UserId <> @UserId) AS OtherUserEmail,
                    CASE WHEN EXISTS (
                        SELECT 1 FROM Users u2 
                        INNER JOIN ChatMembers cm3 ON cm3.UserId = u2.Id 
                        WHERE cm3.ChatId = c.Id AND cm3.UserId <> @UserId 
                        AND u2.LastActiveAt IS NOT NULL 
                        AND DATEDIFF(SECOND, u2.LastActiveAt, GETUTCDATE()) < 30
                    ) THEN 1 ELSE 0 END AS OtherUserOnline,
                    ISNULL((SELECT TOP 1 m.Content FROM Messages m WHERE m.ChatId = c.Id AND m.IsDeleted = 0 ORDER BY m.SentAt DESC), '') AS LastMessage,
                    ISNULL((SELECT TOP 1 m.SentAt FROM Messages m WHERE m.ChatId = c.Id ORDER BY m.SentAt DESC), c.CreatedAt) AS LastMessageTime,
                    ISNULL((SELECT COUNT(*) FROM Messages m WHERE m.ChatId = c.Id AND m.SenderId <> @UserId AND m.IsRead = 0 AND m.IsDeleted = 0), 0) AS UnreadCount
                FROM Chats c
                INNER JOIN ChatMembers cm ON cm.ChatId = c.Id
                WHERE cm.UserId = @UserId
                ORDER BY LastMessageTime DESC";

            var result = await connection.QueryAsync<ChatDto>(sql, new { UserId = userId });
            return result.ToList();
        }

        public async Task<ChatDto?> GetChatByIdAsync(int chatId, int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = @"
                SELECT c.Id, c.Name, c.IsGroup,
                    CASE WHEN c.IsGroup = 0 THEN 
                        (SELECT TOP 1 u.Id FROM Users u 
                         INNER JOIN ChatMembers cm ON cm.UserId = u.Id 
                         WHERE cm.ChatId = c.Id AND cm.UserId <> @UserId) 
                    ELSE 0 END AS OtherUserId,
                    CASE WHEN c.IsGroup = 0 THEN 
                        (SELECT TOP 1 CONCAT(u.FirstName, ' ', u.LastName) FROM Users u 
                         INNER JOIN ChatMembers cm ON cm.UserId = u.Id 
                         WHERE cm.ChatId = c.Id AND cm.UserId <> @UserId) 
                    ELSE c.Name END AS OtherUserName,
                    CASE WHEN c.IsGroup = 0 THEN 
                        (SELECT TOP 1 u.Email FROM Users u 
                         INNER JOIN ChatMembers cm ON cm.UserId = u.Id 
                         WHERE cm.ChatId = c.Id AND cm.UserId <> @UserId) 
                    ELSE NULL END AS OtherUserEmail,
                    CASE WHEN c.IsGroup = 0 THEN (
                        SELECT TOP 1 CASE WHEN u2.LastActiveAt IS NOT NULL AND DATEDIFF(SECOND, u2.LastActiveAt, GETUTCDATE()) < 30 THEN 1 ELSE 0 END
                        FROM Users u2 INNER JOIN ChatMembers cm3 ON cm3.UserId = u2.Id 
                        WHERE cm3.ChatId = c.Id AND cm3.UserId <> @UserId
                    ) ELSE 0 END AS OtherUserOnline,
                    ISNULL((SELECT TOP 1 m.Content FROM Messages m WHERE m.ChatId = c.Id AND m.IsDeleted = 0 ORDER BY m.SentAt DESC), '') AS LastMessage,
                    ISNULL((SELECT TOP 1 m.SentAt FROM Messages m WHERE m.ChatId = c.Id ORDER BY m.SentAt DESC), c.CreatedAt) AS LastMessageTime,
                    ISNULL((SELECT COUNT(*) FROM Messages m WHERE m.ChatId = c.Id AND m.SenderId <> @UserId AND m.IsRead = 0 AND m.IsDeleted = 0), 0) AS UnreadCount
                FROM Chats c
                INNER JOIN ChatMembers cm ON cm.ChatId = c.Id
                WHERE c.Id = @ChatId AND cm.UserId = @UserId";

            return await connection.QuerySingleOrDefaultAsync<ChatDto>(sql, new { ChatId = chatId, UserId = userId });
        }

        public async Task<int> CreateChatAsync(int userId, int otherUserId)
        {
            using var connection = _connectionFactory.CreateConnection();
            connection.Open();
            using var transaction = connection.BeginTransaction();
            try
            {
                var sql = @"INSERT INTO Chats (IsGroup, CreatedByUserId, CreatedAt) VALUES (0, @UserId, GETUTCDATE());
                            SELECT CAST(SCOPE_IDENTITY() as int);";
                var chatId = await connection.QuerySingleAsync<int>(sql, new { UserId = userId }, transaction);

                await connection.ExecuteAsync("INSERT INTO ChatMembers (ChatId, UserId, JoinedAt) VALUES (@ChatId, @UserId, GETUTCDATE())", new { ChatId = chatId, UserId = userId }, transaction);
                await connection.ExecuteAsync("INSERT INTO ChatMembers (ChatId, UserId, JoinedAt) VALUES (@ChatId, @UserId, GETUTCDATE())", new { ChatId = chatId, UserId = otherUserId }, transaction);

                transaction.Commit();
                return chatId;
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }

        public async Task<int> CreateGroupChatAsync(string name, int creatorUserId, List<int> memberIds)
        {
            using var connection = _connectionFactory.CreateConnection();
            connection.Open();
            using var transaction = connection.BeginTransaction();
            try
            {
                var sql = @"INSERT INTO Chats (Name, IsGroup, CreatedByUserId, CreatedAt) VALUES (@Name, 1, @UserId, GETUTCDATE());
                            SELECT CAST(SCOPE_IDENTITY() as int);";
                var chatId = await connection.QuerySingleAsync<int>(sql, new { Name = name, UserId = creatorUserId }, transaction);

                var allMembers = new List<int> { creatorUserId };
                allMembers.AddRange(memberIds.Where(m => m != creatorUserId).Distinct());

                foreach (var memberId in allMembers)
                {
                    await connection.ExecuteAsync("INSERT INTO ChatMembers (ChatId, UserId, JoinedAt) VALUES (@ChatId, @UserId, GETUTCDATE())", new { ChatId = chatId, UserId = memberId }, transaction);
                }

                transaction.Commit();
                return chatId;
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }

        public async Task<List<MessageDto>> GetMessagesAsync(int chatId, int userId, int page = 1, int pageSize = 50)
        {
            using var connection = _connectionFactory.CreateConnection();
            var offset = (page - 1) * pageSize;
            var sql = @"
                SELECT m.Id, m.ChatId, m.SenderId, 
                    CONCAT(u.FirstName, ' ', u.LastName) AS SenderName,
                    m.Content, m.MessageType, m.IsRead, m.IsDeleted, m.SentAt, m.EditedAt,
                    m.ReplyToMessageId,
                    CASE WHEN m.ReplyToMessageId IS NOT NULL THEN (
                        SELECT TOP 1 rm.Content FROM Messages rm WHERE rm.Id = m.ReplyToMessageId
                    ) ELSE NULL END AS ReplyToMessageContent,
                    CASE WHEN m.ReplyToMessageId IS NOT NULL THEN (
                        SELECT TOP 1 CONCAT(ru.FirstName, ' ', ru.LastName) FROM Messages rm2 
                        INNER JOIN Users ru ON ru.Id = rm2.SenderId WHERE rm2.Id = m.ReplyToMessageId
                    ) ELSE NULL END AS ReplyToMessageSenderName
                FROM Messages m
                INNER JOIN Users u ON u.Id = m.SenderId
                WHERE m.ChatId = @ChatId
                ORDER BY m.SentAt DESC
                OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY";

            var result = await connection.QueryAsync<MessageDto>(sql, new { ChatId = chatId, Offset = offset, PageSize = pageSize });
            return result.Reverse().ToList();
        }

        public async Task<int> SendMessageAsync(int chatId, int senderId, string content, string messageType, int? replyToMessageId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = @"INSERT INTO Messages (ChatId, SenderId, Content, MessageType, IsRead, IsDeleted, ReplyToMessageId, SentAt) 
                        VALUES (@ChatId, @SenderId, @Content, @MessageType, 0, 0, @ReplyToMessageId, GETUTCDATE());
                        SELECT CAST(SCOPE_IDENTITY() as int);";
            return await connection.QuerySingleAsync<int>(sql, new { ChatId = chatId, SenderId = senderId, Content = content, MessageType = messageType, ReplyToMessageId = replyToMessageId });
        }

        public async Task MarkMessagesAsReadAsync(int chatId, int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            await connection.ExecuteAsync(
                "UPDATE Messages SET IsRead = 1 WHERE ChatId = @ChatId AND SenderId <> @UserId AND IsRead = 0",
                new { ChatId = chatId, UserId = userId });
        }

        public async Task<int?> FindChatBetweenUsersAsync(int user1Id, int user2Id)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = @"
                SELECT TOP 1 c.Id FROM Chats c
                WHERE c.IsGroup = 0
                AND EXISTS (SELECT 1 FROM ChatMembers cm WHERE cm.ChatId = c.Id AND cm.UserId = @User1Id)
                AND EXISTS (SELECT 1 FROM ChatMembers cm WHERE cm.ChatId = c.Id AND cm.UserId = @User2Id)";
            return await connection.QuerySingleOrDefaultAsync<int?>(sql, new { User1Id = user1Id, User2Id = user2Id });
        }

        public async Task<List<UserDto>> SearchUsersAsync(string query, int excludeUserId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = @"
                SELECT Id, FirstName, LastName, Email, Username,
                    ISNULL(NULLIF(WhatsAppNumber, ''), Username) AS PhoneNumber
                FROM Users 
                WHERE Id <> @UserId 
                AND (FirstName LIKE @Query OR LastName LIKE @Query OR Email LIKE @Query 
                     OR Username LIKE @Query OR WhatsAppNumber LIKE @Query)
                ORDER BY FirstName";
            var result = await connection.QueryAsync<UserDto>(sql, new { UserId = excludeUserId, Query = $"%{query}%" });
            return result.ToList();
        }

        public async Task<List<UserDto>> GetAllUsersAsync(int excludeUserId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = @"SELECT Id, FirstName, LastName, Email, Username, 
                        ISNULL(NULLIF(WhatsAppNumber, ''), Username) AS PhoneNumber 
                        FROM Users WHERE Id <> @UserId ORDER BY FirstName";
            var result = await connection.QueryAsync<UserDto>(sql, new { UserId = excludeUserId });
            return result.ToList();
        }

        public async Task<UserDto?> GetUserByIdAsync(int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = @"SELECT Id, FirstName, LastName, Email, Username, 
                        ISNULL(NULLIF(WhatsAppNumber, ''), Username) AS PhoneNumber 
                        FROM Users WHERE Id = @UserId";
            return await connection.QuerySingleOrDefaultAsync<UserDto>(sql, new { UserId = userId });
        }

        public async Task<List<UserDto>> GetWhatsAppRecipientsAsync(int chatId, int senderId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = @"
                SELECT u.Id, u.FirstName, u.LastName, u.Email, u.Username,
                    u.WhatsAppNumber AS PhoneNumber
                FROM Users u
                INNER JOIN ChatMembers cm ON cm.UserId = u.Id
                WHERE cm.ChatId = @ChatId
                  AND u.Id <> @SenderId
                  AND u.WhatsAppNumber IS NOT NULL
                  AND LTRIM(RTRIM(u.WhatsAppNumber)) <> ''";

            var result = await connection.QueryAsync<UserDto>(sql, new { ChatId = chatId, SenderId = senderId });
            return result.ToList();
        }

        public async Task<bool> IsUserInChatAsync(int userId, int chatId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var count = await connection.QuerySingleOrDefaultAsync<int>(
                "SELECT COUNT(*) FROM ChatMembers WHERE UserId = @UserId AND ChatId = @ChatId",
                new { UserId = userId, ChatId = chatId });
            return count > 0;
        }

        public async Task<int> GetUnreadCountAsync(int chatId, int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QuerySingleOrDefaultAsync<int>(
                "SELECT COUNT(*) FROM Messages WHERE ChatId = @ChatId AND SenderId <> @UserId AND IsRead = 0",
                new { ChatId = chatId, UserId = userId });
        }

        public async Task<MessageDto?> GetMessageByIdAsync(int messageId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = @"
                SELECT m.Id, m.ChatId, m.SenderId,
                    CONCAT(u.FirstName, ' ', u.LastName) AS SenderName,
                    m.Content, m.MessageType, m.IsRead, m.IsDeleted, m.SentAt, m.EditedAt,
                    m.ReplyToMessageId,
                    CASE WHEN m.ReplyToMessageId IS NOT NULL THEN (
                        SELECT TOP 1 rm.Content FROM Messages rm WHERE rm.Id = m.ReplyToMessageId
                    ) ELSE NULL END AS ReplyToMessageContent,
                    CASE WHEN m.ReplyToMessageId IS NOT NULL THEN (
                        SELECT TOP 1 CONCAT(ru.FirstName, ' ', ru.LastName) FROM Messages rm2 
                        INNER JOIN Users ru ON ru.Id = rm2.SenderId WHERE rm2.Id = m.ReplyToMessageId
                    ) ELSE NULL END AS ReplyToMessageSenderName
                FROM Messages m
                INNER JOIN Users u ON u.Id = m.SenderId
                WHERE m.Id = @MessageId";
            return await connection.QuerySingleOrDefaultAsync<MessageDto>(sql, new { MessageId = messageId });
        }

        public async Task<bool> EditMessageAsync(int messageId, int userId, string content)
        {
            using var connection = _connectionFactory.CreateConnection();
            var affected = await connection.ExecuteAsync(
                "UPDATE Messages SET Content = @Content, EditedAt = GETUTCDATE() WHERE Id = @MessageId AND SenderId = @UserId",
                new { MessageId = messageId, UserId = userId, Content = content });
            return affected > 0;
        }

        public async Task<bool> DeleteMessageAsync(int messageId, int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var affected = await connection.ExecuteAsync(
                "UPDATE Messages SET IsDeleted = 1, Content = '' WHERE Id = @MessageId AND SenderId = @UserId",
                new { MessageId = messageId, UserId = userId });
            return affected > 0;
        }

        public async Task UpdateUserLastActiveAsync(int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            await connection.ExecuteAsync(
                "UPDATE Users SET LastActiveAt = GETUTCDATE() WHERE Id = @UserId",
                new { UserId = userId });
        }

        public async Task<bool> IsUserOnlineAsync(int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var result = await connection.QuerySingleOrDefaultAsync<DateTime?>(
                "SELECT LastActiveAt FROM Users WHERE Id = @UserId",
                new { UserId = userId });
            return result.HasValue && (DateTime.UtcNow - result.Value).TotalSeconds < 30;
        }

        public async Task UpdateTypingStatusAsync(int chatId, int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = @"
                IF EXISTS (SELECT 1 FROM TypingStatus WHERE ChatId = @ChatId AND UserId = @UserId)
                    UPDATE TypingStatus SET LastTypedAt = GETUTCDATE() WHERE ChatId = @ChatId AND UserId = @UserId
                ELSE
                    INSERT INTO TypingStatus (ChatId, UserId, LastTypedAt) VALUES (@ChatId, @UserId, GETUTCDATE())";
            await connection.ExecuteAsync(sql, new { ChatId = chatId, UserId = userId });
        }

        public async Task<DateTime?> GetOtherUserTypingAsync(int chatId, int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = @"
                SELECT TOP 1 ts.LastTypedAt FROM TypingStatus ts
                INNER JOIN ChatMembers cm ON cm.ChatId = ts.ChatId
                WHERE ts.ChatId = @ChatId AND ts.UserId <> @UserId
                AND DATEDIFF(SECOND, ts.LastTypedAt, GETUTCDATE()) < 5";
            return await connection.QuerySingleOrDefaultAsync<DateTime?>(sql, new { ChatId = chatId, UserId = userId });
        }

        public async Task<List<int>> GetChatIdsForUserAsync(int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = "SELECT ChatId FROM ChatMembers WHERE UserId = @UserId";
            var result = await connection.QueryAsync<int>(sql, new { UserId = userId });
            return result.ToList();
        }
    }
}
