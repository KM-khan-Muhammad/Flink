using System.Collections.Generic;
using System.Threading.Tasks;
using Flink.Application.DTOs;

namespace Flink.Application.Interfaces
{
    public interface ICallService
    {
        Task<CallDto?> InitiateCallAsync(int userId, InitiateCallRequest request);
        Task<bool> AcceptCallAsync(int userId, int callId);
        Task<bool> DeclineCallAsync(int userId, int callId);
        Task<bool> EndCallAsync(int userId, int callId);
        Task<CallDto?> GetIncomingCallAsync(int userId);
        Task<CallDto?> GetActiveCallAsync(int userId);
        Task<List<CallDto>> GetCallHistoryAsync(int userId, int limit = 50);
    }
}
