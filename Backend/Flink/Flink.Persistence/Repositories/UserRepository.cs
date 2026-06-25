using System.Threading.Tasks;
using Dapper;
using Flink.Application.Interfaces;
using Flink.Domain.Entities;

namespace Flink.Persistence.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly IDbConnectionFactory _connectionFactory;

        public UserRepository(IDbConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory;
        }

        public async Task<User> GetByIdAsync(int id)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = "SELECT * FROM Users WHERE Id = @Id";
            return await connection.QuerySingleOrDefaultAsync<User>(sql, new { Id = id });
        }

        public async Task<User> GetByEmailAsync(string email)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = "SELECT * FROM Users WHERE Email = @Email";
            return await connection.QuerySingleOrDefaultAsync<User>(sql, new { Email = email });
        }

        public async Task<User> GetByUsernameAsync(string username)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = "SELECT * FROM Users WHERE Username = @Username";
            return await connection.QuerySingleOrDefaultAsync<User>(sql, new { Username = username });
        }

        public async Task<User> GetByVerificationTokenAsync(string token)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = "SELECT * FROM Users WHERE VerificationToken = @Token";
            return await connection.QuerySingleOrDefaultAsync<User>(sql, new { Token = token });
        }

        public async Task<User> GetByPhoneNumberAsync(string phoneNumber)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = "SELECT * FROM Users WHERE WhatsAppNumber = @PhoneNumber";
            return await connection.QuerySingleOrDefaultAsync<User>(sql, new { PhoneNumber = phoneNumber });
        }

        public async Task<int> AddAsync(User user)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = @"
                INSERT INTO Users (FirstName, LastName, DateOfBirth, WhatsAppNumber, IsWhatsAppVerified, Username, Email, PasswordHash, IsEmailVerified, VerificationToken, VerificationTokenExpires, CreatedAt)
                VALUES (@FirstName, @LastName, @DateOfBirth, @WhatsAppNumber, @IsWhatsAppVerified, @Username, @Email, @PasswordHash, @IsEmailVerified, @VerificationToken, @VerificationTokenExpires, @CreatedAt);
                SELECT CAST(SCOPE_IDENTITY() as int);";
            var id = await connection.QuerySingleAsync<int>(sql, user);
            user.Id = id;
            return id;
        }

        public async Task UpdateAsync(User user)
        {
            using var connection = _connectionFactory.CreateConnection();
            var sql = @"
                UPDATE Users SET 
                    FirstName = @FirstName,
                    LastName = @LastName,
                    DateOfBirth = @DateOfBirth,
                    WhatsAppNumber = @WhatsAppNumber,
                    IsWhatsAppVerified = @IsWhatsAppVerified,
                    Username = @Username,
                    Email = @Email,
                    PasswordHash = @PasswordHash,
                    IsEmailVerified = @IsEmailVerified,
                    VerificationToken = @VerificationToken,
                    VerificationTokenExpires = @VerificationTokenExpires,
                    PasswordResetToken = @PasswordResetToken,
                    PasswordResetTokenExpires = @PasswordResetTokenExpires
                WHERE Id = @Id";
            await connection.ExecuteAsync(sql, user);
        }
    }
}
