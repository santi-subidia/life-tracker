namespace LifeTracker.Application.Health.Dtos;

public record MetricDataPointDto(
    Guid StudyId,
    DateOnly StudyDate,
    int Year,
    string StudyType,
    string? Institution,
    string Value,
    double? NumericValue,
    string? Unit,
    bool IsAbnormal
);

public record MetricComparisonDto(
    string MetricName,
    string? Unit,
    List<MetricDataPointDto> History
);
