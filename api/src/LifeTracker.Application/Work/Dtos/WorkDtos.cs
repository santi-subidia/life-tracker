namespace LifeTracker.Application.Work.Dtos;

public record WorkProjectDto(
    Guid Id,
    string Name,
    string? Description,
    string Status,
    string? Color,
    int ActiveTasksCount,
    int CompletedTasksCount,
    DateTime CreatedAt
);

public record CreateWorkProjectRequest(
    string Name,
    string? Description,
    string Status = "active",
    string? Color = null
);

public record UpdateWorkProjectRequest(
    string Name,
    string? Description,
    string Status,
    string? Color
);

public record WorkTaskDto(
    Guid Id,
    Guid? ProjectId,
    string? ProjectName,
    string? ProjectColor,
    string Title,
    string? Description,
    string Status,
    string Priority,
    DateOnly? DueDate,
    int Position,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateWorkTaskRequest(
    Guid? ProjectId,
    string Title,
    string? Description,
    string Status = "todo",
    string Priority = "medium",
    DateOnly? DueDate = null
);

public record UpdateWorkTaskRequest(
    Guid? ProjectId,
    string Title,
    string? Description,
    string Priority,
    DateOnly? DueDate
);

public record MoveWorkTaskRequest(
    string NewStatus,
    int NewPosition
);

public record WorkSessionDto(
    Guid Id,
    Guid? ProjectId,
    string? ProjectName,
    Guid? TaskId,
    string? TaskTitle,
    DateTime StartedAt,
    DateTime? EndedAt,
    int DurationMinutes,
    string? Notes,
    DateTime CreatedAt
);

public record RecordWorkSessionRequest(
    Guid? ProjectId,
    Guid? TaskId,
    DateTime StartedAt,
    DateTime EndedAt,
    string? Notes
);

public record WorkMetricsDto(
    int FocusMinutesThisWeek,
    int FocusMinutesToday,
    int CompletedTasksThisWeek,
    int CompletedTasksToday,
    int SessionsCountThisWeek
);
