using Microsoft.EntityFrameworkCore;
using LifeTracker.Domain.Habits;
using LifeTracker.Domain.Health;
using LifeTracker.Domain.Notes;
using LifeTracker.Domain.Timeline;

namespace LifeTracker.Application.Common.Interfaces;

public interface ILifeTrackerDbContext
{
    DbSet<HealthStudy> HealthStudies { get; }
    DbSet<HealthClinicalValue> HealthClinicalValues { get; }
    DbSet<DailyLog> DailyLogs { get; }
    DbSet<TimelineItem> TimelineItems { get; }
    DbSet<HabitDefinition> HabitDefinitions { get; }
    DbSet<HabitLog> HabitLogs { get; }
    DbSet<Note> Notes { get; }
    DbSet<NoteLink> NoteLinks { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
