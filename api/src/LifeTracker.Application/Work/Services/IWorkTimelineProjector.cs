using LifeTracker.Domain.Work;

namespace LifeTracker.Application.Work.Services;

public interface IWorkTimelineProjector
{
    Task ProjectTaskCompletedAsync(Guid userId, WorkTask task, CancellationToken ct = default);
    Task RemoveTaskProjectionAsync(Guid userId, Guid taskId, CancellationToken ct = default);
    Task ProjectFocusSessionAsync(Guid userId, WorkSession session, string? projectName, string? taskTitle, CancellationToken ct = default);
}
