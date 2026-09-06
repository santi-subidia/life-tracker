using LifeTracker.Domain.Academics;

namespace LifeTracker.Application.Academics.Services;

public interface IAcademicTimelineProjector
{
    Task ProjectMilestoneGradedAsync(Guid userId, AcademicSubject subject, AcademicMilestone milestone, CancellationToken ct = default);
    Task RemoveMilestoneProjectionAsync(Guid userId, Guid milestoneId, CancellationToken ct = default);
}
