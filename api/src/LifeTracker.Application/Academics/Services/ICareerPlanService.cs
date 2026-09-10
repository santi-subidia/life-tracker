using LifeTracker.Application.Academics.Dtos;
using LifeTracker.Domain.Academics;

namespace LifeTracker.Application.Academics.Services;

public interface ICareerPlanService
{
    Task<CareerPlanDraftDto> ExtractDraftFromDocumentAsync(
        Stream stream,
        string mimeType,
        CancellationToken cancellationToken = default);

    Task<CareerPlanSummaryDto> CreatePlanAsync(
        Guid userId,
        CreateCareerPlanRequest request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CareerPlanSummaryDto>> GetUserPlansAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<CareerPlanDetailDto?> GetPlanDetailAsync(
        Guid userId,
        Guid planId,
        CancellationToken cancellationToken = default);

    Task<CareerPlanDetailDto?> GetActivePlanAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<bool> SetActivePlanAsync(
        Guid userId,
        Guid planId,
        CancellationToken cancellationToken = default);

    Task<CareerRecommendationResult> GetRecommendationsAsync(
        Guid userId,
        Guid planId,
        int quota = 4,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AcademicSubjectDto>> EnrollSuggestedSubjectsAsync(
        Guid userId,
        Guid planId,
        EnrollSuggestedSubjectsRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> DeletePlanAsync(
        Guid userId,
        Guid planId,
        CancellationToken cancellationToken = default);
}
