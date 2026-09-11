using Microsoft.EntityFrameworkCore;
using LifeTracker.Application.Common.Interfaces;
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

namespace LifeTracker.Infrastructure.Persistence;

public class LifeTrackerDbContext : DbContext, ILifeTrackerDbContext
{
    public LifeTrackerDbContext(DbContextOptions<LifeTrackerDbContext> options)
        : base(options)
    {
    }

    public DbSet<HealthStudy> HealthStudies => Set<HealthStudy>();
    public DbSet<HealthClinicalValue> HealthClinicalValues => Set<HealthClinicalValue>();
    public DbSet<DailyLog> DailyLogs => Set<DailyLog>();
    public DbSet<TimelineItem> TimelineItems => Set<TimelineItem>();
    public DbSet<HabitDefinition> HabitDefinitions => Set<HabitDefinition>();
    public DbSet<HabitLog> HabitLogs => Set<HabitLog>();
    public DbSet<Note> Notes => Set<Note>();
    public DbSet<NoteLink> NoteLinks => Set<NoteLink>();
    public DbSet<WorkProject> WorkProjects => Set<WorkProject>();
    public DbSet<WorkTask> WorkTasks => Set<WorkTask>();
    public DbSet<WorkSession> WorkSessions => Set<WorkSession>();
    public DbSet<AcademicSubject> AcademicSubjects => Set<AcademicSubject>();
    public DbSet<AcademicMilestone> AcademicMilestones => Set<AcademicMilestone>();
    public DbSet<CareerPlan> CareerPlans => Set<CareerPlan>();
    public DbSet<CurriculumSubject> CurriculumSubjects => Set<CurriculumSubject>();
    public DbSet<CurriculumPrerequisite> CurriculumPrerequisites => Set<CurriculumPrerequisite>();
    public DbSet<AiConversation> AiConversations => Set<AiConversation>();
    public DbSet<AiMessage> AiMessages => Set<AiMessage>();
    public DbSet<FinancialAccount> FinancialAccounts => Set<FinancialAccount>();
    public DbSet<TransactionCategory> TransactionCategories => Set<TransactionCategory>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<Budget> Budgets => Set<Budget>();
    public DbSet<Exercise> Exercises => Set<Exercise>();
    public DbSet<Routine> Routines => Set<Routine>();
    public DbSet<RoutineExercise> RoutineExercises => Set<RoutineExercise>();
    public DbSet<WorkoutSession> WorkoutSessions => Set<WorkoutSession>();
    public DbSet<WorkoutSet> WorkoutSets => Set<WorkoutSet>();
    public DbSet<UserProfile> Profiles => Set<UserProfile>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(LifeTrackerDbContext).Assembly);
    }
}
