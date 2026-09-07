namespace LifeTracker.Application.Health.Dtos;

public record HealthClinicalValueDto(
    Guid Id,
    Guid StudyId,
    string MetricName,
    string Value,
    string? Unit,
    string? Category,
    bool IsAbnormal
);

public record DuplicateStudySummaryDto(
    Guid Id,
    string StudyType,
    DateOnly StudyDate,
    string? Institution,
    string FileUrl,
    DateTime CreatedAt
);

public record HealthStudyDto(
    Guid Id,
    Guid UserId,
    string StudyType,
    DateOnly StudyDate,
    string FileUrl,
    string? Institution,
    string? Summary,
    string? FileHash,
    DateTime CreatedAt,
    List<HealthClinicalValueDto> ClinicalValues
);
