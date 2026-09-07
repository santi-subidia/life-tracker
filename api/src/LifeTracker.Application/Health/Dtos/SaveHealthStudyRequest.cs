namespace LifeTracker.Application.Health.Dtos;

public record SaveClinicalValueItem(
    string MetricName,
    string Value,
    string? Unit = null,
    string? Category = null,
    bool IsAbnormal = false
);

public record SaveHealthStudyRequest(
    string StudyType,
    DateOnly StudyDate,
    string FileUrl,
    string? Institution,
    string? Summary,
    List<SaveClinicalValueItem> ClinicalValues,
    string? FileHash = null,
    Guid? ReplaceStudyId = null
);
