using System.Collections.Generic;
using System.Threading.Tasks;
using Flink.Domain.Entities;

namespace Flink.Application.Interfaces
{
    public interface IStatusRepository
    {
        Task<int> AddAsync(Status status);
        Task<List<Status>> GetAllVisibleStatusesAsync(int userId);
        Task<List<Status>> GetUserStatusesAsync(int userId);
        Task<bool> DeleteAsync(int statusId, int userId);
        Task DeleteExpiredAsync();
    }
}
