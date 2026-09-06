using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using LifeTracker.Domain.Work;

namespace LifeTracker.Infrastructure.Persistence.Configurations;

public class WorkProjectConfiguration : IEntityTypeConfiguration<WorkProject>
{
    public void Configure(EntityTypeBuilder<WorkProject> builder)
    {
        builder.ToTable("work_projects");

        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasColumnName("id");
        builder.Property(p => p.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(p => p.Name).HasColumnName("name").IsRequired();
        builder.Property(p => p.Description).HasColumnName("description");
        builder.Property(p => p.Color).HasColumnName("color");
        builder.Property(p => p.CreatedAt).HasColumnName("created_at");
        builder.Property(p => p.UpdatedAt).HasColumnName("updated_at");

        builder.Property(p => p.Status)
            .HasColumnName("status")
            .HasConversion(
                v => FormatProjectStatus(v),
                v => ParseProjectStatus(v))
            .IsRequired();

        builder.HasIndex(p => p.UserId);
    }

    private static string FormatProjectStatus(WorkProjectStatus status) => status switch
    {
        WorkProjectStatus.Paused => "paused",
        WorkProjectStatus.Completed => "completed",
        _ => "active"
    };

    private static WorkProjectStatus ParseProjectStatus(string status) => status switch
    {
        "paused" => WorkProjectStatus.Paused,
        "completed" => WorkProjectStatus.Completed,
        _ => WorkProjectStatus.Active
    };
}

public class WorkTaskConfiguration : IEntityTypeConfiguration<WorkTask>
{
    public void Configure(EntityTypeBuilder<WorkTask> builder)
    {
        builder.ToTable("work_tasks");

        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).HasColumnName("id");
        builder.Property(t => t.ProjectId).HasColumnName("project_id");
        builder.Property(t => t.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(t => t.Title).HasColumnName("title").IsRequired();
        builder.Property(t => t.Description).HasColumnName("description");
        builder.Property(t => t.DueDate).HasColumnName("due_date");
        builder.Property(t => t.Position).HasColumnName("position").IsRequired();
        builder.Property(t => t.CreatedAt).HasColumnName("created_at");
        builder.Property(t => t.UpdatedAt).HasColumnName("updated_at");

        builder.Property(t => t.Status)
            .HasColumnName("status")
            .HasConversion(
                v => FormatTaskStatus(v),
                v => ParseTaskStatus(v))
            .IsRequired();

        builder.Property(t => t.Priority)
            .HasColumnName("priority")
            .HasConversion(
                v => FormatTaskPriority(v),
                v => ParseTaskPriority(v))
            .IsRequired();

        builder.HasOne<WorkProject>()
            .WithMany()
            .HasForeignKey(t => t.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(t => new { t.UserId, t.Status });
        builder.HasIndex(t => new { t.ProjectId, t.Status, t.Position });
        builder.HasIndex(t => new { t.UserId, t.Status, t.Position });
    }

    private static string FormatTaskStatus(WorkTaskStatus status) => status switch
    {
        WorkTaskStatus.Backlog => "backlog",
        WorkTaskStatus.InProgress => "in_progress",
        WorkTaskStatus.Done => "done",
        _ => "todo"
    };

    private static WorkTaskStatus ParseTaskStatus(string status) => status switch
    {
        "backlog" => WorkTaskStatus.Backlog,
        "in_progress" => WorkTaskStatus.InProgress,
        "done" => WorkTaskStatus.Done,
        _ => WorkTaskStatus.Todo
    };

    private static string FormatTaskPriority(WorkTaskPriority priority) => priority switch
    {
        WorkTaskPriority.Low => "low",
        WorkTaskPriority.High => "high",
        WorkTaskPriority.Urgent => "urgent",
        _ => "medium"
    };

    private static WorkTaskPriority ParseTaskPriority(string priority) => priority switch
    {
        "low" => WorkTaskPriority.Low,
        "high" => WorkTaskPriority.High,
        "urgent" => WorkTaskPriority.Urgent,
        _ => WorkTaskPriority.Medium
    };
}

public class WorkSessionConfiguration : IEntityTypeConfiguration<WorkSession>
{
    public void Configure(EntityTypeBuilder<WorkSession> builder)
    {
        builder.ToTable("work_sessions");

        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasColumnName("id");
        builder.Property(s => s.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(s => s.ProjectId).HasColumnName("project_id");
        builder.Property(s => s.TaskId).HasColumnName("task_id");
        builder.Property(s => s.StartedAt).HasColumnName("started_at").IsRequired();
        builder.Property(s => s.EndedAt).HasColumnName("ended_at");
        builder.Property(s => s.DurationMinutes).HasColumnName("duration_minutes").IsRequired();
        builder.Property(s => s.Notes).HasColumnName("notes");
        builder.Property(s => s.CreatedAt).HasColumnName("created_at");

        builder.HasOne<WorkProject>()
            .WithMany()
            .HasForeignKey(s => s.ProjectId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne<WorkTask>()
            .WithMany()
            .HasForeignKey(s => s.TaskId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(s => new { s.UserId, s.StartedAt });
    }
}
