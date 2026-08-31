using System.Collections.Concurrent;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Flink.web.Hubs
{
    [Authorize]
    public class CallHub : Hub
    {
        private static readonly ConcurrentDictionary<int, List<string>> _userConnections = new();
        private static readonly ConcurrentDictionary<string, int> _connectionUsers = new();
        private readonly ILogger<CallHub> _logger;

        public CallHub(ILogger<CallHub> logger)
        {
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = GetUserId();
            if (userId.HasValue)
            {
                var connections = _userConnections.GetOrAdd(userId.Value, _ => new List<string>());
                lock (connections)
                {
                    connections.Add(Context.ConnectionId);
                }
                _connectionUsers[Context.ConnectionId] = userId.Value;
                _logger.LogInformation("CallHub: User {UserId} connected with connection {ConnectionId}", userId.Value, Context.ConnectionId);
            }
            else
            {
                _logger.LogWarning("CallHub: Connected user has no valid userId. Connection: {ConnectionId}", Context.ConnectionId);
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            if (_connectionUsers.TryRemove(Context.ConnectionId, out var userId))
            {
                if (_userConnections.TryGetValue(userId, out var connections))
                {
                    lock (connections)
                    {
                        connections.Remove(Context.ConnectionId);
                        if (connections.Count == 0)
                        {
                            _userConnections.TryRemove(userId, out _);
                        }
                    }
                }
                _logger.LogInformation("CallHub: User {UserId} disconnected from connection {ConnectionId}", userId, Context.ConnectionId);
            }
            if (exception != null)
            {
                _logger.LogError(exception, "CallHub: Connection {ConnectionId} disconnected with error", Context.ConnectionId);
            }
            await base.OnDisconnectedAsync(exception);
        }

        public async Task SendOffer(int targetUserId, object offer)
        {
            var callerId = GetUserId();
            _logger.LogInformation("User {CallerId} sending offer to user {TargetUserId}", callerId, targetUserId);
            if (_userConnections.TryGetValue(targetUserId, out var connections))
            {
                List<string> targets;
                lock (connections) { targets = new List<string>(connections); }
                foreach (var connectionId in targets)
                {
                    await Clients.Client(connectionId).SendAsync("ReceiveOffer", new
                    {
                        CallerId = callerId,
                        Offer = offer
                    });
                }
                _logger.LogInformation("Offer delivered to user {TargetUserId} on {Count} connections", targetUserId, targets.Count);
            }
            else
            {
                _logger.LogWarning("User {TargetUserId} not connected. Cannot deliver offer from {CallerId}", targetUserId, callerId);
            }
        }

        public async Task SendAnswer(int targetUserId, object answer)
        {
            var callerId = GetUserId();
            _logger.LogInformation("User {CallerId} sending answer to user {TargetUserId}", callerId, targetUserId);
            if (_userConnections.TryGetValue(targetUserId, out var connections))
            {
                List<string> targets;
                lock (connections) { targets = new List<string>(connections); }
                foreach (var connectionId in targets)
                {
                    await Clients.Client(connectionId).SendAsync("ReceiveAnswer", new
                    {
                        CallerId = callerId,
                        Answer = answer
                    });
                }
                _logger.LogInformation("Answer delivered to user {TargetUserId} on {Count} connections", targetUserId, targets.Count);
            }
            else
            {
                _logger.LogWarning("User {TargetUserId} not connected. Cannot deliver answer from {CallerId}", targetUserId, callerId);
            }
        }

        public async Task SendIceCandidate(int targetUserId, object candidate)
        {
            var callerId = GetUserId();
            if (_userConnections.TryGetValue(targetUserId, out var connections))
            {
                List<string> targets;
                lock (connections) { targets = new List<string>(connections); }
                foreach (var connectionId in targets)
                {
                    await Clients.Client(connectionId).SendAsync("ReceiveIceCandidate", new
                    {
                        CallerId = callerId,
                        Candidate = candidate
                    });
                }
            }
            else
            {
                _logger.LogWarning("User {TargetUserId} not connected. Cannot deliver ICE candidate from {CallerId}", targetUserId, callerId);
            }
        }

        public async Task SendCallSignal(int targetUserId, string signal, object? data = null)
        {
            var callerId = GetUserId();
            _logger.LogInformation("User {CallerId} sending signal '{Signal}' to user {TargetUserId}", callerId, signal, targetUserId);
            if (_userConnections.TryGetValue(targetUserId, out var connections))
            {
                List<string> targets;
                lock (connections) { targets = new List<string>(connections); }
                foreach (var connectionId in targets)
                {
                    await Clients.Client(connectionId).SendAsync("ReceiveCallSignal", new
                    {
                        CallerId = callerId,
                        Signal = signal,
                        Data = data
                    });
                }
                _logger.LogInformation("Signal '{Signal}' delivered to user {TargetUserId} on {Count} connections", signal, targetUserId, targets.Count);
            }
            else
            {
                _logger.LogWarning("User {TargetUserId} not connected. Cannot deliver signal '{Signal}' from {CallerId}", targetUserId, signal, callerId);
            }
        }

        public async Task JoinCall(int callId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"call_{callId}");
        }

        public async Task LeaveCall(int callId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"call_{callId}");
        }

        private int? GetUserId()
        {
            var claim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)
                        ?? Context.User?.FindFirst("sub")
                        ?? Context.User?.FindFirst("nameid");
            if (claim != null && int.TryParse(claim.Value, out var userId))
                return userId;
            return null;
        }
    }
}
