using System.Collections.Generic;
using System.Threading.Tasks;
using Flink.Application.DTOs;

namespace Flink.Application.Interfaces
{
    public interface IStatusService
    {
        Task<StatusDto?> CreateStatusAsync(int userId, CreateStatusRequest request);
        Task<List<StatusDto>> GetAllStatusesAsync(int userId);
        Task<List<StatusDto>> GetUserStatusesAsync(int userId, int targetUserId);
        Task<bool> DeleteStatusAsync(int userId, int statusId);
    }
}
