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
    public class CallController : ControllerBase
    {
        private readonly ICallService _callService;
        private int UserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        public CallController(ICallService callService)
        {
            _callService = callService;
        }

        [HttpPost("initiate")]
        public async Task<IActionResult> InitiateCall([FromBody] InitiateCallRequest request)
        {
            var call = await _callService.InitiateCallAsync(UserId, request);
            if (call == null) return BadRequest(new { success = false, message = "Failed to initiate call." });
            return Ok(call);
        }

        [HttpPost("{callId}/accept")]
        public async Task<IActionResult> AcceptCall(int callId)
        {
            var result = await _callService.AcceptCallAsync(UserId, callId);
            if (!result) return BadRequest(new { success = false, message = "Cannot accept this call." });
            return Ok(new { success = true });
        }

        [HttpPost("{callId}/decline")]
        public async Task<IActionResult> DeclineCall(int callId)
        {
            var result = await _callService.DeclineCallAsync(UserId, callId);
            if (!result) return BadRequest(new { success = false, message = "Cannot decline this call." });
            return Ok(new { success = true });
        }

        [HttpPost("{callId}/end")]
        public async Task<IActionResult> EndCall(int callId)
        {
            var result = await _callService.EndCallAsync(UserId, callId);
            if (!result) return BadRequest(new { success = false, message = "Cannot end this call." });
            return Ok(new { success = true });
        }

        [HttpGet("incoming")]
        public async Task<IActionResult> GetIncomingCall()
        {
            var call = await _callService.GetIncomingCallAsync(UserId);
            return Ok(call);
        }

        [HttpGet("active")]
        public async Task<IActionResult> GetActiveCall()
        {
            var call = await _callService.GetActiveCallAsync(UserId);
            return Ok(call);
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetCallHistory([FromQuery] int limit = 50)
        {
            var calls = await _callService.GetCallHistoryAsync(UserId, limit);
            return Ok(calls);
        }
    }
}
