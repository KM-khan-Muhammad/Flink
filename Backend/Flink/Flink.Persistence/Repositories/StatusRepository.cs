using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Dapper;
using Flink.Application.Interfaces;
using Flink.Domain.Entities;

namespace Flink.Persistence.Repositories
{
    public class StatusRepository : IStatusRepository
    {
        private readonly IDbConnectionFactory _connectionFactory;

        public StatusRepository(IDbConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory;
        }

        public async Task<int> AddAsync(Status status)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = @"
                INSERT INTO Statuses (UserId, Text, ImageUrl, CreatedAt, ExpiresAt)
                VALUES (@UserId, @Text, @ImageUrl, @CreatedAt, @ExpiresAt);
                SELECT CAST(SCOPE_IDENTITY() as int);";
            status.Id = await connection.QuerySingleAsync<int>(sql, status);
            return status.Id;
        }

        public async Task<List<Status>> GetAllVisibleStatusesAsync(int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = @"
                SELECT s.* FROM Statuses s
                WHERE s.ExpiresAt > GETUTCDATE()
                  AND s.UserId IN (
                      SELECT cm2.UserId FROM ChatMembers cm1
                      JOIN ChatMembers cm2 ON cm1.ChatId = cm2.ChatId AND cm2.UserId != @UserId
                      WHERE cm1.UserId = @UserId
                      UNION SELECT @UserId
                  )
                ORDER BY s.CreatedAt DESC";
            var result = await connection.QueryAsync<Status>(sql, new { UserId = userId });
            return result.AsList();
        }

        public async Task<List<Status>> GetUserStatusesAsync(int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = @"
                SELECT * FROM Statuses
                WHERE UserId = @UserId AND ExpiresAt > GETUTCDATE()
                ORDER BY CreatedAt DESC";
            var result = await connection.QueryAsync<Status>(sql, new { UserId = userId });
            return result.AsList();
        }

        public async Task<bool> DeleteAsync(int statusId, int userId)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = "DELETE FROM Statuses WHERE Id = @Id AND UserId = @UserId";
            var affected = await connection.ExecuteAsync(sql, new { Id = statusId, UserId = userId });
            return affected > 0;
        }

        public async Task DeleteExpiredAsync()
        {
            using var connection = _connectionFactory.CreateConnection();
            await connection.ExecuteAsync("DELETE FROM Statuses WHERE ExpiresAt <= GETUTCDATE()");
        }
    }
}
