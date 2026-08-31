using System.Collections.Generic;
using System.Threading.Tasks;
using Flink.Application.DTOs;

namespace Flink.Application.Interfaces
{
    public interface ICallRepository
    {
        Task<int> CreateCallAsync(int chatId, int callerId, int receiverId, string callType);
        Task<CallDto?> GetCallByIdAsync(int callId);
        Task<bool> UpdateCallStatusAsync(int callId, string status);
        Task<bool> SetCallAnsweredAsync(int callId);
        Task<bool> SetCallEndedAsync(int callId);
        Task<CallDto?> GetIncomingCallForUserAsync(int userId);
        Task<CallDto?> GetActiveCallForUserAsync(int userId);
        Task<int?> GetReceiverIdForCallAsync(int callId);
        Task<List<CallDto>> GetCallHistoryAsync(int userId, int limit = 50);
    }
}
