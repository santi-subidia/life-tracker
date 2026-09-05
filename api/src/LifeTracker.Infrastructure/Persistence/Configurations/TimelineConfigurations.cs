using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using LifeTracker.Domain.Timeline;

namespace LifeTracker.Infrastructure.Persistence.Configurations;

public class DailyLogConfiguration : IEntityTypeConfiguration<DailyLog>
{
    public void Configure(EntityTypeBuilder<DailyLog> builder)
    {
        builder.ToTable("daily_logs");

        builder.HasKey(d => d.Id);
        builder.Property(d => d.Id).HasColumnName("id");
        builder.Property(d => d.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(d => d.Date).HasColumnName("date").IsRequired();
        builder.Property(d => d.MoodScore).HasColumnName("mood_score");
        builder.Property(d => d.EnergyScore).HasColumnName("energy_score");
        builder.Property(d => d.SummaryText).HasColumnName("summary_text");
        builder.Property(d => d.CreatedAt).HasColumnName("created_at");
        builder.Property(d => d.UpdatedAt).HasColumnName("updated_at");

        builder.HasIndex(d => new { d.UserId, d.Date }).IsUnique();
    }
}

public class TimelineItemConfiguration : IEntityTypeConfiguration<TimelineItem>
{
    public void Configure(EntityTypeBuilder<TimelineItem> builder)
    {
        builder.ToTable("timeline_items");

        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).HasColumnName("id");
        builder.Property(t => t.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(t => t.Date).HasColumnName("date").IsRequired();
        builder.Property(t => t.Timestamp).HasColumnName("timestamp").IsRequired();
        builder.Property(t => t.SourceModule).HasColumnName("source_module").IsRequired();
        builder.Property(t => t.SourceId).HasColumnName("source_id").IsRequired();
        builder.Property(t => t.EventType).HasColumnName("event_type").IsRequired();
        builder.Property(t => t.Title).HasColumnName("title").IsRequired();
        builder.Property(t => t.Summary).HasColumnName("summary");
        builder.Property(t => t.MetadataJson).HasColumnName("metadata").HasColumnType("jsonb");
        builder.Property(t => t.Pinned).HasColumnName("pinned");
        builder.Property(t => t.CreatedAt).HasColumnName("created_at");

        builder.HasIndex(t => new { t.UserId, t.Date });
        builder.HasIndex(t => new { t.SourceModule, t.SourceId });
    }
}
