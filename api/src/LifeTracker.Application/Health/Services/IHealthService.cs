using LifeTracker.Application.Health.Dtos;

namespace LifeTracker.Application.Health.Services;

public interface IHealthService
{
    Task<ExtractedStudyDto> ExtractStudyDataAsync(
        Stream fileStream,
        string mimeType,
        CancellationToken cancellationToken = default);

    Task<HealthStudyDto> SaveStudyAsync(
        Guid userId,
        SaveHealthStudyRequest request,
        CancellationToken cancellationToken = default);

    Task<List<HealthStudyDto>> GetUserStudiesAsync(
        Guid userId,
        int? year = null,
        CancellationToken cancellationToken = default);

    Task<HealthStudyDto?> GetStudyByIdAsync(
        Guid userId,
        Guid studyId,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteStudyAsync(
        Guid userId,
        Guid studyId,
        CancellationToken cancellationToken = default);

    Task<MetricComparisonDto> CompareMetricHistoryAsync(
        Guid userId,
        string metricName,
        CancellationToken cancellationToken = default);

    Task<DuplicateStudySummaryDto?> FindExactDuplicateByHashAsync(
        Guid userId,
        string fileHash,
        CancellationToken cancellationToken = default);

    Task<DuplicateStudySummaryDto?> FindSemanticDuplicateAsync(
        Guid userId,
        string studyType,
        DateOnly studyDate,
        CancellationToken cancellationToken = default);

    Task<List<string>> GetAvailableMetricsAsync(
        Guid userId,
        CancellationToken cancellationToken = default);
}
