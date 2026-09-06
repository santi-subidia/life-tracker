namespace LifeTracker.Application.Academics.Dtos;

public record AcademicSubjectDto(
    Guid Id,
    string Name,
    string? Code,
    string Term,
    string? Professor,
    string Status,
    string? Color,
    decimal? Average,
    int TotalMilestones,
    int CompletedMilestones
);

public record AcademicMilestoneDto(
    Guid Id,
    Guid SubjectId,
    string Title,
    string MilestoneType,
    DateOnly DueDate,
    decimal? Grade,
    decimal? WeightPercentage,
    string Status,
    Guid? ReplacesMilestoneId,
    string? Notes
);

public record AcademicSubjectDetailDto(
    Guid Id,
    string Name,
    string? Code,
    string Term,
    string? Professor,
    string Status,
    string? Color,
    decimal? Average,
    List<AcademicMilestoneDto> Milestones
);

public record CreateAcademicSubjectRequest(
    string Name,
    string? Code,
    string Term,
    string? Professor,
    string Status = "en_curso",
    string? Color = null
);

public record UpdateAcademicSubjectRequest(
    string Name,
    string? Code,
    string Term,
    string? Professor,
    string Status,
    string? Color
);

public record CreateAcademicMilestoneRequest(
    Guid SubjectId,
    string Title,
    string MilestoneType,
    DateOnly DueDate,
    decimal? WeightPercentage,
    Guid? ReplacesMilestoneId,
    string? Notes
);

public record UpdateAcademicMilestoneRequest(
    string Title,
    string MilestoneType,
    DateOnly DueDate,
    decimal? WeightPercentage,
    Guid? ReplacesMilestoneId,
    string? Notes
);

public record AssignGradeRequest(
    decimal Grade,
    string? Notes
);

public record AcademicMetricsDto(
    decimal? CareerAverage,
    int ApprovedSubjectsCount,
    int InProgressSubjectsCount,
    int UpcomingExamsCount
);
