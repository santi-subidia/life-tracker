using Microsoft.EntityFrameworkCore;
using LifeTracker.Domain.Academics;
using LifeTracker.Domain.Ai;
using LifeTracker.Domain.Habits;
using LifeTracker.Domain.Health;
using LifeTracker.Domain.Notes;
using LifeTracker.Domain.Timeline;
using LifeTracker.Domain.Work;

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
    DbSet<WorkProject> WorkProjects { get; }
    DbSet<WorkTask> WorkTasks { get; }
    DbSet<WorkSession> WorkSessions { get; }
    DbSet<AcademicSubject> AcademicSubjects { get; }
    DbSet<AcademicMilestone> AcademicMilestones { get; }
    DbSet<AiConversation> AiConversations { get; }
    DbSet<AiMessage> AiMessages { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
