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
    public class StatusController : ControllerBase
    {
        private readonly IStatusService _statusService;
        private int UserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        public StatusController(IStatusService statusService)
        {
            _statusService = statusService;
        }

        [HttpPost]
        public async Task<IActionResult> CreateStatus([FromBody] CreateStatusRequest request)
        {
            var status = await _statusService.CreateStatusAsync(UserId, request);
            if (status == null) return BadRequest(new { success = false, message = "Status must have text or image." });
            return Ok(status);
        }

        [HttpGet]
        public async Task<IActionResult> GetAllStatuses()
        {
            var statuses = await _statusService.GetAllStatusesAsync(UserId);
            return Ok(statuses);
        }

        [HttpGet("user/{targetUserId}")]
        public async Task<IActionResult> GetUserStatuses(int targetUserId)
        {
            var statuses = await _statusService.GetUserStatusesAsync(UserId, targetUserId);
            return Ok(statuses);
        }

        [HttpDelete("{statusId}")]
        public async Task<IActionResult> DeleteStatus(int statusId)
        {
            var result = await _statusService.DeleteStatusAsync(UserId, statusId);
            if (!result) return NotFound(new { success = false, message = "Status not found." });
            return Ok(new { success = true });
        }
    }
}
