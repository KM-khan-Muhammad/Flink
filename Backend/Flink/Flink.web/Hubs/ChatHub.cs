using System.Collections.Concurrent;
using System.Security.Claims;
using Flink.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Flink.web.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private static readonly ConcurrentDictionary<int, List<string>> _userConnections = new();
        private static readonly ConcurrentDictionary<string, int> _connectionUsers = new();
        private readonly IChatRepository _chatRepository;
        private readonly ILogger<ChatHub> _logger;

        public ChatHub(IChatRepository chatRepository, ILogger<ChatHub> logger)
        {
            _chatRepository = chatRepository;
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

                await _chatRepository.UpdateUserLastActiveAsync(userId.Value);
                await NotifyOnlineStatus(userId.Value, true);

                _logger.LogInformation("ChatHub: User {UserId} connected with connection {ConnectionId}", userId.Value, Context.ConnectionId);
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
                            _ = NotifyOnlineStatus(userId, false);
                        }
                    }
                }
                _logger.LogInformation("ChatHub: User {UserId} disconnected from connection {ConnectionId}", userId, Context.ConnectionId);
            }
            if (exception != null)
            {
                _logger.LogError(exception, "ChatHub: Connection {ConnectionId} disconnected with error", Context.ConnectionId);
            }
            await base.OnDisconnectedAsync(exception);
        }

        public async Task SendMessage(int chatId, string content, string messageType = "text", int? replyToMessageId = null)
        {
            var userId = GetUserId();
            if (!userId.HasValue) return;

            var isMember = await _chatRepository.IsUserInChatAsync(userId.Value, chatId);
            if (!isMember) return;

            var messageId = await _chatRepository.SendMessageAsync(chatId, userId.Value, content, messageType, replyToMessageId);
            var message = await _chatRepository.GetMessageByIdAsync(messageId);
            if (message == null) return;

            await Clients.Group($"chat_{chatId}").SendAsync("ReceiveMessage", message);
        }

        public async Task JoinChat(int chatId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"chat_{chatId}");
        }

        public async Task LeaveChat(int chatId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"chat_{chatId}");
        }

        public async Task Typing(int chatId)
        {
            var userId = GetUserId();
            if (!userId.HasValue) return;

            await _chatRepository.UpdateTypingStatusAsync(chatId, userId.Value);
            await Clients.Group($"chat_{chatId}").SendAsync("UserTyping", new { ChatId = chatId, UserId = userId.Value });
        }

        public async Task StopTyping(int chatId)
        {
            var userId = GetUserId();
            if (!userId.HasValue) return;

            await Clients.Group($"chat_{chatId}").SendAsync("UserStopTyping", new { ChatId = chatId, UserId = userId.Value });
        }

        public async Task MarkAsRead(int chatId)
        {
            var userId = GetUserId();
            if (!userId.HasValue) return;

            await _chatRepository.MarkMessagesAsReadAsync(chatId, userId.Value);
            await Clients.Group($"chat_{chatId}").SendAsync("MessagesRead", new { ChatId = chatId, UserId = userId.Value });
        }

        public async Task SendCursorPosition(int chatId, int messageId)
        {
            var userId = GetUserId();
            if (!userId.HasValue) return;

            await Clients.OthersInGroup($"chat_{chatId}").SendAsync("ReceiveCursorPosition", new
            {
                ChatId = chatId,
                UserId = userId.Value,
                MessageId = messageId
            });
        }

        private async Task NotifyOnlineStatus(int userId, bool isOnline)
        {
            var chatIds = await _chatRepository.GetChatIdsForUserAsync(userId);
            foreach (var chatId in chatIds)
            {
                await Clients.Group($"chat_{chatId}").SendAsync("UserOnlineStatus", new { UserId = userId, IsOnline = isOnline });
            }
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
