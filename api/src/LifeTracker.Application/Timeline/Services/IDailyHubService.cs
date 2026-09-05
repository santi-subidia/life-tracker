using LifeTracker.Application.Timeline.Dtos;

namespace LifeTracker.Application.Timeline.Services;

public interface IDailyHubService
{
    Task<DailyHubDto> GetTodayHubAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<DailyLogDto> UpdateDailyLogTodayAsync(
        Guid userId,
        UpdateDailyLogRequest request,
        CancellationToken cancellationToken = default);
}
