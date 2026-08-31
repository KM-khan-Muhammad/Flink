using System.Collections.Generic;
using System.Threading.Tasks;
using Dapper;
using Flink.Application.DTOs;
using Flink.Application.Interfaces;

namespace Flink.Persistence.Repositories
{
    public class CallRepository : ICallRepository
    {
        private readonly IDbConnectionFactory _connectionFactory;

        public CallRepository(IDbConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory;
        }

        public async Task<int> CreateCallAsync(int chatId, int callerId, int receiverId, string callType)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = @"INSERT INTO Calls (ChatId, CallerId, ReceiverId, CallType, Status, StartedAt) 
                        VALUES (@ChatId, @CallerId, @ReceiverId, @CallType, 'ringing', GETUTCDATE());
                        SELECT CAST(SCOPE_IDENTITY() as int);";
            return await connection.QuerySingleAsync<int>(sql, new { ChatId = chatId, CallerId = callerId, ReceiverId = receiverId, CallType = callType });
        }

        public async Task<CallDto?> GetCallByIdAsync(int callId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = @"SELECT c.Id, c.ChatId, c.CallerId,
                        CONCAT(caller.FirstName, ' ', caller.LastName) AS CallerName,
                        c.ReceiverId,
                        CONCAT(receiver.FirstName, ' ', receiver.LastName) AS ReceiverName,
                        c.CallType, c.Status, c.StartedAt, c.AnsweredAt, c.EndedAt
                        FROM Calls c
                        INNER JOIN Users caller ON caller.Id = c.CallerId
                        INNER JOIN Users receiver ON receiver.Id = c.ReceiverId
                        WHERE c.Id = @CallId";
            return await connection.QuerySingleOrDefaultAsync<CallDto>(sql, new { CallId = callId });
        }

        public async Task<bool> UpdateCallStatusAsync(int callId, string status)
        {
            using var connection = _connectionFactory.CreateConnection();
            var affected = await connection.ExecuteAsync(
                "UPDATE Calls SET Status = @Status WHERE Id = @CallId",
                new { CallId = callId, Status = status });
            return affected > 0;
        }

        public async Task<bool> SetCallAnsweredAsync(int callId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var affected = await connection.ExecuteAsync(
                "UPDATE Calls SET Status = 'connected', AnsweredAt = GETUTCDATE() WHERE Id = @CallId",
                new { CallId = callId });
            return affected > 0;
        }

        public async Task<bool> SetCallEndedAsync(int callId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var affected = await connection.ExecuteAsync(
                "UPDATE Calls SET Status = 'ended', EndedAt = GETUTCDATE() WHERE Id = @CallId AND Status <> 'ended'",
                new { CallId = callId });
            return affected > 0;
        }

        public async Task<CallDto?> GetIncomingCallForUserAsync(int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = @"SELECT TOP 1 c.Id, c.ChatId, c.CallerId,
                        CONCAT(caller.FirstName, ' ', caller.LastName) AS CallerName,
                        c.ReceiverId,
                        CONCAT(receiver.FirstName, ' ', receiver.LastName) AS ReceiverName,
                        c.CallType, c.Status, c.StartedAt, c.AnsweredAt, c.EndedAt
                        FROM Calls c
                        INNER JOIN Users caller ON caller.Id = c.CallerId
                        INNER JOIN Users receiver ON receiver.Id = c.ReceiverId
                        WHERE c.ReceiverId = @UserId AND c.Status = 'ringing'
                        ORDER BY c.StartedAt DESC";
            return await connection.QuerySingleOrDefaultAsync<CallDto>(sql, new { UserId = userId });
        }

        public async Task<CallDto?> GetActiveCallForUserAsync(int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = @"SELECT TOP 1 c.Id, c.ChatId, c.CallerId,
                        CONCAT(caller.FirstName, ' ', caller.LastName) AS CallerName,
                        c.ReceiverId,
                        CONCAT(receiver.FirstName, ' ', receiver.LastName) AS ReceiverName,
                        c.CallType, c.Status, c.StartedAt, c.AnsweredAt, c.EndedAt
                        FROM Calls c
                        INNER JOIN Users caller ON caller.Id = c.CallerId
                        INNER JOIN Users receiver ON receiver.Id = c.ReceiverId
                        WHERE (c.CallerId = @UserId OR c.ReceiverId = @UserId) 
                        AND c.Status IN ('ringing', 'connected')
                        ORDER BY c.StartedAt DESC";
            return await connection.QuerySingleOrDefaultAsync<CallDto>(sql, new { UserId = userId });
        }

        public async Task<int?> GetReceiverIdForCallAsync(int callId)
        {
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QuerySingleOrDefaultAsync<int?>(
                "SELECT ReceiverId FROM Calls WHERE Id = @CallId",
                new { CallId = callId });
        }

        public async Task<List<CallDto>> GetCallHistoryAsync(int userId, int limit = 50)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = @"SELECT TOP (@Limit) c.Id, c.ChatId, c.CallerId,
                        CONCAT(caller.FirstName, ' ', caller.LastName) AS CallerName,
                        c.ReceiverId,
                        CONCAT(receiver.FirstName, ' ', receiver.LastName) AS ReceiverName,
                        c.CallType, c.Status, c.StartedAt, c.AnsweredAt, c.EndedAt
                        FROM Calls c
                        INNER JOIN Users caller ON caller.Id = c.CallerId
                        INNER JOIN Users receiver ON receiver.Id = c.ReceiverId
                        WHERE c.CallerId = @UserId OR c.ReceiverId = @UserId
                        ORDER BY c.StartedAt DESC";
            var calls = await connection.QueryAsync<CallDto>(sql, new { UserId = userId, Limit = limit });
            return calls.AsList();
        }
    }
}
