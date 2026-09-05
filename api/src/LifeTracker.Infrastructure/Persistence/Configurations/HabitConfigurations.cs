using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using LifeTracker.Domain.Habits;

namespace LifeTracker.Infrastructure.Persistence.Configurations;

public class HabitDefinitionConfiguration : IEntityTypeConfiguration<HabitDefinition>
{
    public void Configure(EntityTypeBuilder<HabitDefinition> builder)
    {
        builder.ToTable("habit_definitions");

        builder.HasKey(h => h.Id);
        builder.Property(h => h.Id).HasColumnName("id");
        builder.Property(h => h.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(h => h.Name).HasColumnName("name").IsRequired();
        builder.Property(h => h.Description).HasColumnName("description");
        builder.Property(h => h.Category).HasColumnName("category").IsRequired();
        builder.Property(h => h.Color).HasColumnName("color");
        builder.Property(h => h.Icon).HasColumnName("icon");
        builder.Property(h => h.IsArchived).HasColumnName("is_archived");
        builder.Property(h => h.CreatedAt).HasColumnName("created_at");

        // Mapear HabitFrequency como Value Object
        builder.OwnsOne(h => h.Frequency, fb =>
        {
            fb.Property(f => f.Type)
                .HasColumnName("frequency_type")
                .HasConversion(
                    v => v.ToString().ToLowerInvariant(),
                    v => ParseFrequencyType(v))
                .IsRequired();

            fb.Property(f => f.TargetDaysPerWeek)
                .HasColumnName("target_days_per_week");

            fb.Property(f => f.SpecificDays)
                .HasColumnName("specific_days")
                .HasConversion(
                    v => v == null ? null : JsonSerializer.Serialize(v.Select(d => (int)d), (JsonSerializerOptions?)null),
                    v => string.IsNullOrEmpty(v) ? null : JsonSerializer.Deserialize<List<int>>(v, (JsonSerializerOptions?)null)!.Select(d => (DayOfWeek)d).ToList());
        });

        builder.HasMany(h => h.Logs)
            .WithOne(l => l.Habit)
            .HasForeignKey(l => l.HabitId)
            .OnDelete(DeleteBehavior.Cascade);
    }

    private static FrequencyType ParseFrequencyType(string value) => value?.ToLowerInvariant() switch
    {
        "specific_days" => FrequencyType.SpecificDays,
        "times_per_week" => FrequencyType.TimesPerWeek,
        _ => FrequencyType.Daily
    };
}

public class HabitLogConfiguration : IEntityTypeConfiguration<HabitLog>
{
    public void Configure(EntityTypeBuilder<HabitLog> builder)
    {
        builder.ToTable("habit_logs");

        builder.HasKey(l => l.Id);
        builder.Property(l => l.Id).HasColumnName("id");
        builder.Property(l => l.HabitId).HasColumnName("habit_id").IsRequired();
        builder.Property(l => l.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(l => l.Date).HasColumnName("date").IsRequired();
        builder.Property(l => l.Notes).HasColumnName("notes");
        builder.Property(l => l.CreatedAt).HasColumnName("created_at");

        builder.Property(l => l.Status)
            .HasColumnName("status")
            .HasConversion(
                v => v == HabitLogStatus.Completed ? "completed" : "skipped",
                v => v == "skipped" ? HabitLogStatus.Skipped : HabitLogStatus.Completed)
            .IsRequired();

        builder.HasIndex(l => new { l.HabitId, l.Date }).IsUnique();
        builder.HasIndex(l => new { l.UserId, l.Date });
    }
}
