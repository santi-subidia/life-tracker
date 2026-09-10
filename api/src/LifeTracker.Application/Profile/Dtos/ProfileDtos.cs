namespace LifeTracker.Application.Profile.Dtos;

public record ProfileActivityPointDto(
    string Date,
    int FocusMinutes,
    int CompletedHabits,
    int CompletedTasks,
    int EventsCount
);

public record ProfileSummaryDto(
    string Period,
    string StartDate,
    string EndDate,
    int TotalFocusMinutes,
    int TotalFocusSessions,
    int CompletedHabits,
    int LongestStreak,
    int CompletedTasks,
    int NotesCreated,
    int ApprovedMilestones,
    int HealthStudiesCount,
    List<ProfileActivityPointDto> ActivityTimeline
);
