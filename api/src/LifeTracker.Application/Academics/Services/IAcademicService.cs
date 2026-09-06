using LifeTracker.Application.Academics.Dtos;

namespace LifeTracker.Application.Academics.Services;

public interface IAcademicService
{
    Task<List<AcademicSubjectDto>> GetSubjectsAsync(Guid userId, string? term, CancellationToken ct = default);
    Task<AcademicSubjectDetailDto?> GetSubjectDetailAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task<AcademicSubjectDto> CreateSubjectAsync(Guid userId, CreateAcademicSubjectRequest req, CancellationToken ct = default);
    Task<AcademicSubjectDto?> UpdateSubjectAsync(Guid userId, Guid id, UpdateAcademicSubjectRequest req, CancellationToken ct = default);
    Task<bool> DeleteSubjectAsync(Guid userId, Guid id, CancellationToken ct = default);

    Task<AcademicMilestoneDto> CreateMilestoneAsync(Guid userId, CreateAcademicMilestoneRequest req, CancellationToken ct = default);
    Task<AcademicMilestoneDto?> UpdateMilestoneAsync(Guid userId, Guid id, UpdateAcademicMilestoneRequest req, CancellationToken ct = default);
    Task<AcademicMilestoneDto?> AssignGradeAsync(Guid userId, Guid id, AssignGradeRequest req, CancellationToken ct = default);
    Task<bool> DeleteMilestoneAsync(Guid userId, Guid id, CancellationToken ct = default);

    Task<AcademicMetricsDto> GetMetricsAsync(Guid userId, CancellationToken ct = default);
}
