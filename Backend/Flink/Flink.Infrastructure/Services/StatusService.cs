using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Flink.Application.DTOs;
using Flink.Application.Interfaces;
using Flink.Domain.Entities;

namespace Flink.Infrastructure.Services
{
    public class StatusService : IStatusService
    {
        private readonly IStatusRepository _statusRepository;
        private readonly IUserRepository _userRepository;

        public StatusService(IStatusRepository statusRepository, IUserRepository userRepository)
        {
            _statusRepository = statusRepository;
            _userRepository = userRepository;
        }

        public async Task<StatusDto?> CreateStatusAsync(int userId, CreateStatusRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Text) && string.IsNullOrWhiteSpace(request.ImageUrl))
                return null;

            var status = new Status
            {
                UserId = userId,
                Text = request.Text,
                ImageUrl = request.ImageUrl,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddHours(24)
            };

            await _statusRepository.AddAsync(status);

            var user = await _userRepository.GetByIdAsync(userId);
            return new StatusDto
            {
                Id = status.Id,
                UserId = userId,
                UserName = user != null ? $"{user.FirstName} {user.LastName}".Trim() : "Unknown",
                Text = status.Text,
                ImageUrl = status.ImageUrl,
                CreatedAt = status.CreatedAt,
                ExpiresAt = status.ExpiresAt,
                IsOwn = true
            };
        }

        public async Task<List<StatusDto>> GetAllStatusesAsync(int userId)
        {
            var statuses = await _statusRepository.GetAllVisibleStatusesAsync(userId);
            var dtos = new List<StatusDto>();
            foreach (var s in statuses)
            {
                var user = await _userRepository.GetByIdAsync(s.UserId);
                dtos.Add(new StatusDto
                {
                    Id = s.Id,
                    UserId = s.UserId,
                    UserName = user != null ? $"{user.FirstName} {user.LastName}".Trim() : "Unknown",
                    Text = s.Text,
                    ImageUrl = s.ImageUrl,
                    CreatedAt = s.CreatedAt,
                    ExpiresAt = s.ExpiresAt,
                    IsOwn = s.UserId == userId
                });
            }
            return dtos;
        }

        public async Task<List<StatusDto>> GetUserStatusesAsync(int userId, int targetUserId)
        {
            var statuses = await _statusRepository.GetUserStatusesAsync(targetUserId);
            var user = await _userRepository.GetByIdAsync(targetUserId);
            return statuses.Select(s => new StatusDto
            {
                Id = s.Id,
                UserId = s.UserId,
                UserName = user != null ? $"{user.FirstName} {user.LastName}".Trim() : "Unknown",
                Text = s.Text,
                ImageUrl = s.ImageUrl,
                CreatedAt = s.CreatedAt,
                ExpiresAt = s.ExpiresAt,
                IsOwn = s.UserId == userId
            }).ToList();
        }

        public async Task<bool> DeleteStatusAsync(int userId, int statusId)
        {
            return await _statusRepository.DeleteAsync(statusId, userId);
        }
    }
}
