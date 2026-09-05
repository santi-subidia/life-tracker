using LifeTracker.Application.Health.Dtos;

namespace LifeTracker.Application.Common.Interfaces;

public interface IAiExtractorService
{
    Task<ExtractedStudyDto> ExtractDataAsync(
        Stream documentStream,
        string mimeType,
        CancellationToken cancellationToken = default);
}
