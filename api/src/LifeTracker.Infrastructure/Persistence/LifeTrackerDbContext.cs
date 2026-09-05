using Microsoft.EntityFrameworkCore;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Domain.Health;
using LifeTracker.Domain.Timeline;

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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(LifeTrackerDbContext).Assembly);
    }
}
