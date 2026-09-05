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

public record HealthStudyDto(
    Guid Id,
    Guid UserId,
    string StudyType,
    DateOnly StudyDate,
    string FileUrl,
    string? Institution,
    string? Summary,
    DateTime CreatedAt,
    List<HealthClinicalValueDto> ClinicalValues
);
