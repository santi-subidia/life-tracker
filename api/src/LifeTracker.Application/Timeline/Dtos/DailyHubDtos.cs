namespace LifeTracker.Application.Timeline.Dtos;

public record DailyLogDto(
    Guid Id,
    Guid UserId,
    DateOnly Date,
    short? MoodScore,
    short? EnergyScore,
    string? SummaryText,
    DateTime UpdatedAt
);

public record UpdateDailyLogRequest(
    short? MoodScore,
    short? EnergyScore,
    string? SummaryText
);

public record TodayHabitItemDto(
    Guid Id,
    string Name,
    string Category,
    string? Color,
    string? Icon,
    bool IsCompletedToday,
    int CurrentStreak,
    int LongestStreak,
    string FrequencyDescription
);

public record TodayTimelineItemDto(
    Guid Id,
    DateTime Timestamp,
    string SourceModule,
    string EventType,
    string Title,
    string? Summary
);

public record WorkSummaryDto(int CompletedTasksToday, int FocusMinutesToday);

public record UpcomingExamDto(
    Guid MilestoneId,
    Guid SubjectId,
    string SubjectName,
    string? SubjectColor,
    string MilestoneTitle,
    string MilestoneType,
    DateOnly DueDate,
    int DaysRemaining
);

public record DailyHubDto(
    DateOnly Date,
    DailyLogDto? DailyLog,
    List<TodayHabitItemDto> Habits,
    int CompletionPercentage,
    List<TodayTimelineItemDto> TodayTimeline,
    WorkSummaryDto? WorkSummary = null,
    List<UpcomingExamDto>? UpcomingExams = null
);
