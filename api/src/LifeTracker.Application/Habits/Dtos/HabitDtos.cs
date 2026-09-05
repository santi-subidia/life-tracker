using LifeTracker.Domain.Habits;

namespace LifeTracker.Application.Habits.Dtos;

public record HabitFrequencyDto(
    string Type, // "daily", "specific_days", "times_per_week"
    int? TargetDaysPerWeek,
    List<int>? SpecificDays // 0=Sunday, 1=Monday...
);

public record HabitDto(
    Guid Id,
    Guid UserId,
    string Name,
    string? Description,
    string Category,
    HabitFrequencyDto Frequency,
    string? Color,
    string? Icon,
    bool IsArchived,
    int CurrentStreak,
    int LongestStreak,
    bool IsCompletedToday,
    DateTime CreatedAt
);

public record CreateHabitRequest(
    string Name,
    string? Description,
    string Category,
    string FrequencyType, // "daily", "specific_days", "times_per_week"
    int? TargetDaysPerWeek,
    List<int>? SpecificDays,
    string? Color,
    string? Icon
);

public record UpdateHabitRequest(
    string Name,
    string? Description,
    string Category,
    string FrequencyType,
    int? TargetDaysPerWeek,
    List<int>? SpecificDays,
    string? Color,
    string? Icon
);

public record ToggleHabitRequest(
    DateOnly? Date,
    string? Notes
);

public record ToggleHabitResultDto(
    Guid HabitId,
    DateOnly Date,
    string Status, // "completed", "pending"
    int CurrentStreak,
    int LongestStreak
);
