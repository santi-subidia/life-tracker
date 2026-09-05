using Microsoft.EntityFrameworkCore;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Domain.Habits;
using LifeTracker.Domain.Timeline;

namespace LifeTracker.Application.Habits.Services;

public interface IHabitTimelineProjector
{
    Task ProjectHabitCompletedAsync(
        Guid userId,
        HabitDefinition habit,
        HabitLog log,
        int currentStreak,
        CancellationToken cancellationToken = default);

    Task RemoveHabitProjectionAsync(
        Guid userId,
        Guid habitLogId,
        CancellationToken cancellationToken = default);
}

public class HabitTimelineProjector : IHabitTimelineProjector
{
    private readonly ILifeTrackerDbContext _dbContext;

    public HabitTimelineProjector(ILifeTrackerDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task ProjectHabitCompletedAsync(
        Guid userId,
        HabitDefinition habit,
        HabitLog log,
        int currentStreak,
        CancellationToken cancellationToken = default)
    {
        var existing = await _dbContext.TimelineItems
            .FirstOrDefaultAsync(t => t.UserId == userId && t.SourceModule == "habits" && t.SourceId == log.Id, cancellationToken);

        if (existing == null)
        {
            var summary = currentStreak > 1 
                ? $"Racha de {currentStreak} días consecutivos" 
                : "Hábito cumplido hoy";

            var timelineItem = new TimelineItem(
                userId,
                log.Date,
                "habits",
                log.Id,
                "habit_completed",
                $"Hábito: {habit.Name}",
                summary
            );

            _dbContext.TimelineItems.Add(timelineItem);
        }
    }

    public async Task RemoveHabitProjectionAsync(
        Guid userId,
        Guid habitLogId,
        CancellationToken cancellationToken = default)
    {
        var items = await _dbContext.TimelineItems
            .Where(t => t.UserId == userId && t.SourceModule == "habits" && t.SourceId == habitLogId)
            .ToListAsync(cancellationToken);

        if (items.Count > 0)
        {
            _dbContext.TimelineItems.RemoveRange(items);
        }
    }
}
