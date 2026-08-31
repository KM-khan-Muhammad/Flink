using System.Collections.Generic;
using System.Threading.Tasks;
using Flink.Application.DTOs;
using Flink.Application.Interfaces;

namespace Flink.Infrastructure.Services
{
    public class CallService : ICallService
    {
        private readonly ICallRepository _callRepository;
        private readonly IChatRepository _chatRepository;

        public CallService(ICallRepository callRepository, IChatRepository chatRepository)
        {
            _callRepository = callRepository;
            _chatRepository = chatRepository;
        }

        public async Task<CallDto?> InitiateCallAsync(int userId, InitiateCallRequest request)
        {
            var isMember = await _chatRepository.IsUserInChatAsync(userId, request.ChatId);
            if (!isMember) return null;

            var chat = await _chatRepository.GetChatByIdAsync(request.ChatId, userId);
            if (chat == null) return null;

            var receiverId = chat.OtherUserId;
            var callId = await _callRepository.CreateCallAsync(request.ChatId, userId, receiverId, request.CallType);
            return await _callRepository.GetCallByIdAsync(callId);
        }

        public async Task<bool> AcceptCallAsync(int userId, int callId)
        {
            var call = await _callRepository.GetCallByIdAsync(callId);
            if (call == null || call.ReceiverId != userId || call.Status != "ringing") return false;
            return await _callRepository.SetCallAnsweredAsync(callId);
        }

        public async Task<bool> DeclineCallAsync(int userId, int callId)
        {
            var call = await _callRepository.GetCallByIdAsync(callId);
            if (call == null) return false;
            if (call.CallerId != userId && call.ReceiverId != userId) return false;
            if (call.Status != "ringing") return false;
            return await _callRepository.UpdateCallStatusAsync(callId, "declined");
        }

        public async Task<bool> EndCallAsync(int userId, int callId)
        {
            var call = await _callRepository.GetCallByIdAsync(callId);
            if (call == null) return false;
            if (call.CallerId != userId && call.ReceiverId != userId) return false;
            return await _callRepository.SetCallEndedAsync(callId);
        }

        public async Task<CallDto?> GetIncomingCallAsync(int userId)
        {
            return await _callRepository.GetIncomingCallForUserAsync(userId);
        }

        public async Task<CallDto?> GetActiveCallAsync(int userId)
        {
            return await _callRepository.GetActiveCallForUserAsync(userId);
        }

        public async Task<List<CallDto>> GetCallHistoryAsync(int userId, int limit = 50)
        {
            return await _callRepository.GetCallHistoryAsync(userId, limit);
        }
    }
}
