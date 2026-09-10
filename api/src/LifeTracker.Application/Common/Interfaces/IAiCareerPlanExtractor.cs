using LifeTracker.Application.Academics.Dtos;

namespace LifeTracker.Application.Common.Interfaces;

public interface IAiCareerPlanExtractor
{
    Task<CareerPlanDraftDto> ExtractCurriculumPlanAsync(
        Stream fileStream,
        string mimeType,
        CancellationToken ct = default);

    Task<CareerPlanDraftDto> ExtractDraftFromDocumentAsync(
        Stream documentStream,
        string mimeType,
        CancellationToken cancellationToken = default)
        => ExtractCurriculumPlanAsync(documentStream, mimeType, cancellationToken);
}
