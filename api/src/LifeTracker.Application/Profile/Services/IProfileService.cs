using LifeTracker.Application.Profile.Dtos;

namespace LifeTracker.Application.Profile.Services;

public interface IProfileService
{
    Task<ProfileSummaryDto> GetSummaryAsync(Guid userId, string? period, CancellationToken ct = default);
}
