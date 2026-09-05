namespace LifeTracker.Application.Health.Dtos;

public record ExtractedClinicalValueDto(
    string MetricName,
    string Value,
    string? Unit = null,
    string? Category = null,
    bool IsAbnormal = false
);

public record ExtractedStudyDto(
    string StudyType,
    string StudyDate, // YYYY-MM-DD
    string? Institution,
    List<ExtractedClinicalValueDto> ClinicalValues
);
