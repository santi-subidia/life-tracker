namespace LifeTracker.Application.Fitness.Dtos;

public record ExerciseDto(
    Guid Id,
    Guid? UserId,
    string Name,
    string Slug,
    string Discipline,
    string PrimaryMuscleGroup,
    IReadOnlyList<MuscleStimulusDto> MuscleStimulus,
    string Equipment,
    IReadOnlyList<string> Instructions,
    string GifUrl,
    string? VideoUrl,
    bool IsCustom,
    DateTime CreatedAt
);

public record MuscleStimulusDto(
    string Muscle,
    int StimulusPct
);

public record CreateCustomExerciseRequest(
    string Name,
    string Discipline,
    string PrimaryMuscleGroup,
    IReadOnlyList<MuscleStimulusDto> MuscleStimulus,
    string Equipment,
    IReadOnlyList<string>? Instructions,
    string? GifUrl,
    string? VideoUrl
);

public record UpdateCustomExerciseRequest(
    string Name,
    string Discipline,
    string PrimaryMuscleGroup,
    IReadOnlyList<MuscleStimulusDto> MuscleStimulus,
    string Equipment,
    IReadOnlyList<string>? Instructions,
    string? GifUrl,
    string? VideoUrl
);

public record RoutineDto(
    Guid Id,
    Guid UserId,
    string Name,
    string? Description,
    int EstimatedDurationMinutes,
    bool IsArchived,
    IReadOnlyList<RoutineExerciseDto> Exercises,
    DateTime CreatedAt
);

public record RoutineExerciseDto(
    Guid Id,
    Guid RoutineId,
    Guid ExerciseId,
    string ExerciseName,
    string PrimaryMuscleGroup,
    string Equipment,
    string GifUrl,
    int OrderIndex,
    int TargetSets,
    int TargetRepsMin,
    int TargetRepsMax,
    int RestTimerSeconds,
    string? Notes
);

public record CreateRoutineRequest(
    string Name,
    string? Description,
    int EstimatedDurationMinutes,
    IReadOnlyList<CreateRoutineExerciseRequest> Exercises
);

public record CreateRoutineExerciseRequest(
    Guid ExerciseId,
    int OrderIndex,
    int TargetSets,
    int TargetRepsMin,
    int TargetRepsMax,
    int RestTimerSeconds,
    string? Notes
);

public record UpdateRoutineRequest(
    string Name,
    string? Description,
    int EstimatedDurationMinutes,
    IReadOnlyList<CreateRoutineExerciseRequest> Exercises
);

public record WorkoutSessionDto(
    Guid Id,
    Guid UserId,
    Guid? RoutineId,
    string? RoutineName,
    string Name,
    string Status,
    DateTime StartedAt,
    DateTime? CompletedAt,
    int DurationSeconds,
    decimal TotalVolumeKg,
    int TotalSetsCompleted,
    string? Notes,
    IReadOnlyList<WorkoutSetDto> Sets
);

public record WorkoutSetDto(
    Guid Id,
    Guid SessionId,
    Guid ExerciseId,
    string ExerciseName,
    string PrimaryMuscleGroup,
    string Equipment,
    string GifUrl,
    int SetOrder,
    string SetType,
    decimal WeightKg,
    int Reps,
    decimal? Rpe,
    int? Rir,
    bool IsCompleted,
    DateTime? CompletedAt,
    GhostSetReferenceDto? GhostReference
);

public record StartWorkoutSessionRequest(
    string Name,
    Guid? RoutineId
);

public record LogWorkoutSetRequest(
    Guid ExerciseId,
    int SetOrder,
    string SetType,
    decimal WeightKg,
    int Reps,
    decimal? Rpe,
    int? Rir,
    bool IsCompleted
);

public record UpdateWorkoutSetRequest(
    string SetType,
    decimal WeightKg,
    int Reps,
    decimal? Rpe,
    int? Rir,
    bool IsCompleted
);

public record CompleteWorkoutSessionRequest(
    string? Notes
);

public record GhostSetReferenceDto(
    Guid CurrentSetId,
    int SetOrder,
    decimal PreviousWeightKg,
    int PreviousReps,
    decimal? PreviousRpe,
    DateTime PreviousDate
);

public record MuscleVolumeBreakdownDto(
    string Muscle,
    decimal EffectiveSets
);

public record WorkoutVolumeSummaryDto(
    decimal TotalVolumeKg,
    int TotalSetsCompleted,
    int DurationSeconds,
    IReadOnlyList<MuscleVolumeBreakdownDto> MuscleBreakdown
);

public record RestTimerSnapshot(
    Guid SessionId,
    Guid SetId,
    int DurationSeconds,
    DateTimeOffset TargetEndUtc,
    bool IsRunning,
    int RemainingSeconds
);
