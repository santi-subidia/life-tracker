using Microsoft.EntityFrameworkCore;
using LifeTracker.Domain.Academics;
using LifeTracker.Domain.Ai;
using LifeTracker.Domain.Finances;
using LifeTracker.Domain.Fitness;
using LifeTracker.Domain.Habits;
using LifeTracker.Domain.Health;
using LifeTracker.Domain.Notes;
using LifeTracker.Domain.Profiles;
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
    DbSet<CareerPlan> CareerPlans { get; }
    DbSet<CurriculumSubject> CurriculumSubjects { get; }
    DbSet<CurriculumPrerequisite> CurriculumPrerequisites { get; }
    DbSet<AiConversation> AiConversations { get; }
    DbSet<AiMessage> AiMessages { get; }
    DbSet<FinancialAccount> FinancialAccounts { get; }
    DbSet<TransactionCategory> TransactionCategories { get; }
    DbSet<Transaction> Transactions { get; }
    DbSet<Budget> Budgets { get; }
    DbSet<Exercise> Exercises { get; }
    DbSet<Routine> Routines { get; }
    DbSet<RoutineExercise> RoutineExercises { get; }
    DbSet<WorkoutSession> WorkoutSessions { get; }
    DbSet<WorkoutSet> WorkoutSets { get; }
    DbSet<UserProfile> Profiles { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
