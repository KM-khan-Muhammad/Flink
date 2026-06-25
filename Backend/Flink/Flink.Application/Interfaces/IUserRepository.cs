using System.Threading.Tasks;
using Flink.Domain.Entities;

namespace Flink.Application.Interfaces
{
    public interface IUserRepository
    {
        Task<User> GetByIdAsync(int id);
        Task<User> GetByEmailAsync(string email);
        Task<User> GetByUsernameAsync(string username);
        Task<User> GetByVerificationTokenAsync(string token);
        Task<User> GetByPhoneNumberAsync(string phoneNumber);
        Task<int> AddAsync(User user);
        Task UpdateAsync(User user);
    }
}
