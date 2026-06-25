using System.Security.Claims;
using System.Threading.Tasks;
using Flink.Application.DTOs;
using Flink.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Flink.web.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ChatController : ControllerBase
    {
        private readonly IChatService _chatService;
        private int UserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        public ChatController(IChatService chatService)
        {
            _chatService = chatService;
        }

        [HttpGet]
        public async Task<IActionResult> GetChats()
        {
            var chats = await _chatService.GetUserChatsAsync(UserId);
            return Ok(chats);
        }

        [HttpGet("{chatId}")]
        public async Task<IActionResult> GetChat(int chatId)
        {
            var chat = await _chatService.GetChatAsync(chatId, UserId);
            if (chat == null) return NotFound("Chat not found.");
            return Ok(chat);
        }

        [HttpPost("start")]
        public async Task<IActionResult> StartChat([FromBody] CreateChatRequest request)
        {
            var chat = await _chatService.StartChatAsync(UserId, request.OtherUserId);
            return Ok(chat);
        }

        [HttpGet("{chatId}/messages")]
        public async Task<IActionResult> GetMessages(int chatId, [FromQuery] int page = 1)
        {
            var messages = await _chatService.GetMessagesAsync(chatId, UserId, page);
            return Ok(messages);
        }

        [HttpPost("send")]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request)
        {
            try
            {
                var message = await _chatService.SendMessageAsync(UserId, request);
                return Ok(message);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
        }

        [HttpPost("{chatId}/read")]
        public async Task<IActionResult> MarkAsRead(int chatId)
        {
            await _chatService.MarkAsReadAsync(chatId, UserId);
            return Ok();
        }

        [HttpPut("edit")]
        public async Task<IActionResult> EditMessage([FromBody] EditMessageRequest request)
        {
            var result = await _chatService.EditMessageAsync(UserId, request);
            if (!result) return NotFound("Message not found or not authorized.");
            var msg = await _chatService.GetMessageByIdAsync(request.MessageId);
            return Ok(msg);
        }

        [HttpDelete("{messageId}")]
        public async Task<IActionResult> DeleteMessage(int messageId)
        {
            var result = await _chatService.DeleteMessageAsync(UserId, messageId);
            if (!result) return NotFound("Message not found or not authorized.");
            return Ok(new { success = true });
        }

        [HttpPost("heartbeat")]
        public async Task<IActionResult> Heartbeat()
        {
            await _chatService.UpdateHeartbeatAsync(UserId);
            return Ok(new { online = true });
        }

        [HttpPost("typing")]
        public async Task<IActionResult> UpdateTyping([FromBody] TypingRequest request)
        {
            await _chatService.UpdateTypingAsync(request.ChatId, UserId);
            return Ok();
        }

        [HttpGet("{chatId}/typing")]
        public async Task<IActionResult> GetTypingStatus(int chatId)
        {
            var typingAt = await _chatService.GetOtherUserTypingAsync(chatId, UserId);
            return Ok(new { isTyping = typingAt.HasValue });
        }

        [HttpGet("users/search")]
        public async Task<IActionResult> SearchUsers([FromQuery] string q)
        {
            var users = await _chatService.SearchUsersAsync(q, UserId);
            return Ok(users);
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _chatService.GetAllUsersAsync(UserId);
            return Ok(users);
        }

        [HttpGet("users/{userId}")]
        public async Task<IActionResult> GetUserById(int userId)
        {
            var user = await _chatService.GetUserByIdAsync(userId);
            if (user == null) return NotFound("User not found.");
            return Ok(user);
        }
    }
}
