using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using LifeTracker.Domain.Fitness;

namespace LifeTracker.Infrastructure.Persistence.Configurations;

public class ExerciseConfiguration : IEntityTypeConfiguration<Exercise>
{
    public void Configure(EntityTypeBuilder<Exercise> builder)
    {
        builder.ToTable("exercises");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id");
        builder.Property(e => e.UserId).HasColumnName("user_id");
        builder.Property(e => e.Name).HasColumnName("name").IsRequired();
        builder.Property(e => e.Slug).HasColumnName("slug").IsRequired();
        builder.Property(e => e.GifUrl).HasColumnName("gif_url").IsRequired();
        builder.Property(e => e.VideoUrl).HasColumnName("video_url");
        builder.Property(e => e.IsCustom).HasColumnName("is_custom").IsRequired();
        builder.Property(e => e.CreatedAt).HasColumnName("created_at");
        builder.Property(e => e.UpdatedAt).HasColumnName("updated_at");

        builder.Property(e => e.Discipline)
            .HasColumnName("discipline")
            .HasConversion(
                v => v.ToString().ToLowerInvariant(),
                v => Enum.Parse<FitnessDiscipline>(v, true))
            .IsRequired();

        builder.Property(e => e.PrimaryMuscleGroup)
            .HasColumnName("primary_muscle_group")
            .HasConversion(
                v => FormatMuscleGroup(v),
                v => ParseMuscleGroup(v))
            .IsRequired();

        builder.Property(e => e.Equipment)
            .HasColumnName("equipment")
            .HasConversion(
                v => FormatEquipment(v),
                v => ParseEquipment(v))
            .IsRequired();

        builder.Property(e => e.MuscleStimulus)
            .HasColumnName("muscle_stimulus")
            .HasColumnType("jsonb")
            .HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<List<MuscleStimulus>>(v, (JsonSerializerOptions?)null) ?? new List<MuscleStimulus>())
            .IsRequired();

        builder.Property(e => e.Instructions)
            .HasColumnName("instructions")
            .HasColumnType("text[]")
            .IsRequired();

        builder.HasIndex(e => e.UserId);
        builder.HasIndex(e => e.PrimaryMuscleGroup);
        builder.HasIndex(e => e.Discipline);
    }

    private static string FormatMuscleGroup(MuscleGroup mg) => mg switch
    {
        MuscleGroup.UpperChest => "upper_chest",
        MuscleGroup.LowerBack => "lower_back",
        MuscleGroup.AnteriorDeltoid => "anterior_deltoid",
        MuscleGroup.LateralDeltoid => "lateral_deltoid",
        MuscleGroup.PosteriorDeltoid => "posterior_deltoid",
        _ => mg.ToString().ToLowerInvariant()
    };

    private static MuscleGroup ParseMuscleGroup(string val) => val switch
    {
        "upper_chest" => MuscleGroup.UpperChest,
        "lower_back" => MuscleGroup.LowerBack,
        "anterior_deltoid" => MuscleGroup.AnteriorDeltoid,
        "lateral_deltoid" => MuscleGroup.LateralDeltoid,
        "posterior_deltoid" => MuscleGroup.PosteriorDeltoid,
        _ => Enum.Parse<MuscleGroup>(val, true)
    };

    private static string FormatEquipment(EquipmentType eq) => eq switch
    {
        EquipmentType.SmithMachine => "smith_machine",
        _ => eq.ToString().ToLowerInvariant()
    };

    private static EquipmentType ParseEquipment(string val) => val switch
    {
        "smith_machine" => EquipmentType.SmithMachine,
        _ => Enum.Parse<EquipmentType>(val, true)
    };
}

public class RoutineConfiguration : IEntityTypeConfiguration<Routine>
{
    public void Configure(EntityTypeBuilder<Routine> builder)
    {
        builder.ToTable("routines");

        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasColumnName("id");
        builder.Property(r => r.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(r => r.Name).HasColumnName("name").IsRequired();
        builder.Property(r => r.Description).HasColumnName("description");
        builder.Property(r => r.EstimatedDurationMinutes).HasColumnName("estimated_duration_minutes").IsRequired();
        builder.Property(r => r.IsArchived).HasColumnName("is_archived").IsRequired();
        builder.Property(r => r.CreatedAt).HasColumnName("created_at");
        builder.Property(r => r.UpdatedAt).HasColumnName("updated_at");

        builder.HasMany(r => r.Exercises)
            .WithOne()
            .HasForeignKey(re => re.RoutineId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(r => r.Exercises).AutoInclude();
        builder.HasIndex(r => r.UserId);
    }
}

public class RoutineExerciseConfiguration : IEntityTypeConfiguration<RoutineExercise>
{
    public void Configure(EntityTypeBuilder<RoutineExercise> builder)
    {
        builder.ToTable("routine_exercises");

        builder.HasKey(re => re.Id);
        builder.Property(re => re.Id).HasColumnName("id");
        builder.Property(re => re.RoutineId).HasColumnName("routine_id").IsRequired();
        builder.Property(re => re.ExerciseId).HasColumnName("exercise_id").IsRequired();
        builder.Property(re => re.OrderIndex).HasColumnName("order_index").IsRequired();
        builder.Property(re => re.TargetSets).HasColumnName("target_sets").IsRequired();
        builder.Property(re => re.TargetRepsMin).HasColumnName("target_reps_min").IsRequired();
        builder.Property(re => re.TargetRepsMax).HasColumnName("target_reps_max").IsRequired();
        builder.Property(re => re.RestTimerSeconds).HasColumnName("rest_timer_seconds").IsRequired();
        builder.Property(re => re.Notes).HasColumnName("notes");
        builder.Property(re => re.CreatedAt).HasColumnName("created_at");

        builder.HasOne(re => re.Exercise)
            .WithMany()
            .HasForeignKey(re => re.ExerciseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(re => re.RoutineId);
        builder.HasIndex(re => re.ExerciseId);
    }
}

public class WorkoutSessionConfiguration : IEntityTypeConfiguration<WorkoutSession>
{
    public void Configure(EntityTypeBuilder<WorkoutSession> builder)
    {
        builder.ToTable("workout_sessions");

        builder.HasKey(ws => ws.Id);
        builder.Property(ws => ws.Id).HasColumnName("id");
        builder.Property(ws => ws.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(ws => ws.RoutineId).HasColumnName("routine_id");
        builder.Property(ws => ws.Name).HasColumnName("name").IsRequired();
        builder.Property(ws => ws.StartedAt).HasColumnName("started_at").IsRequired();
        builder.Property(ws => ws.CompletedAt).HasColumnName("completed_at");
        builder.Property(ws => ws.DurationSeconds).HasColumnName("duration_seconds").IsRequired();
        builder.Property(ws => ws.TotalVolumeKg).HasColumnName("total_volume_kg").HasPrecision(12, 2).IsRequired();
        builder.Property(ws => ws.TotalSetsCompleted).HasColumnName("total_sets_completed").IsRequired();
        builder.Property(ws => ws.Notes).HasColumnName("notes");
        builder.Property(ws => ws.CreatedAt).HasColumnName("created_at");
        builder.Property(ws => ws.UpdatedAt).HasColumnName("updated_at");

        builder.Property(ws => ws.Status)
            .HasColumnName("status")
            .HasConversion(
                v => v.ToString().ToLowerInvariant(),
                v => Enum.Parse<WorkoutStatus>(v, true))
            .IsRequired();

        builder.HasMany(ws => ws.Sets)
            .WithOne()
            .HasForeignKey(s => s.SessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(ws => ws.Sets).AutoInclude();

        builder.HasIndex(ws => ws.UserId);
        builder.HasIndex(ws => new { ws.UserId, ws.Status });
    }
}

public class WorkoutSetConfiguration : IEntityTypeConfiguration<WorkoutSet>
{
    public void Configure(EntityTypeBuilder<WorkoutSet> builder)
    {
        builder.ToTable("workout_sets");

        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasColumnName("id");
        builder.Property(s => s.SessionId).HasColumnName("session_id").IsRequired();
        builder.Property(s => s.ExerciseId).HasColumnName("exercise_id").IsRequired();
        builder.Property(s => s.SetOrder).HasColumnName("set_order").IsRequired();
        builder.Property(s => s.WeightKg).HasColumnName("weight_kg").HasPrecision(6, 2).IsRequired();
        builder.Property(s => s.Reps).HasColumnName("reps").IsRequired();
        builder.Property(s => s.Rpe).HasColumnName("rpe").HasPrecision(3, 1);
        builder.Property(s => s.Rir).HasColumnName("rir");
        builder.Property(s => s.IsCompleted).HasColumnName("is_completed").IsRequired();
        builder.Property(s => s.CompletedAt).HasColumnName("completed_at");
        builder.Property(s => s.CreatedAt).HasColumnName("created_at");

        builder.Property(s => s.SetType)
            .HasColumnName("set_type")
            .HasConversion(
                v => v == SetType.DropSet ? "drop_set" : v.ToString().ToLowerInvariant(),
                v => v == "drop_set" ? SetType.DropSet : Enum.Parse<SetType>(v, true))
            .IsRequired();

        builder.HasOne(s => s.Exercise)
            .WithMany()
            .HasForeignKey(s => s.ExerciseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(s => s.SessionId);
        builder.HasIndex(s => s.ExerciseId);
    }
}
