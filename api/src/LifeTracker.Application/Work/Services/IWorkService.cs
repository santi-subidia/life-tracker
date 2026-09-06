using LifeTracker.Application.Work.Dtos;

namespace LifeTracker.Application.Work.Services;

public interface IWorkService
{
    Task<List<WorkProjectDto>> GetProjectsAsync(Guid userId, CancellationToken ct = default);
    Task<WorkProjectDto> CreateProjectAsync(Guid userId, CreateWorkProjectRequest req, CancellationToken ct = default);
    Task<WorkProjectDto?> UpdateProjectAsync(Guid userId, Guid id, UpdateWorkProjectRequest req, CancellationToken ct = default);
    Task<bool> DeleteProjectAsync(Guid userId, Guid id, CancellationToken ct = default);

    Task<List<WorkTaskDto>> GetTasksAsync(Guid userId, Guid? projectId, string? status, CancellationToken ct = default);
    Task<WorkTaskDto> CreateTaskAsync(Guid userId, CreateWorkTaskRequest req, CancellationToken ct = default);
    Task<WorkTaskDto?> UpdateTaskAsync(Guid userId, Guid id, UpdateWorkTaskRequest req, CancellationToken ct = default);
    Task<WorkTaskDto?> MoveTaskAsync(Guid userId, Guid id, MoveWorkTaskRequest req, CancellationToken ct = default);
    Task<bool> DeleteTaskAsync(Guid userId, Guid id, CancellationToken ct = default);

    Task<WorkSessionDto> RecordSessionAsync(Guid userId, RecordWorkSessionRequest req, CancellationToken ct = default);
    Task<List<WorkSessionDto>> GetSessionsAsync(Guid userId, int limit = 20, CancellationToken ct = default);
    Task<WorkMetricsDto> GetMetricsAsync(Guid userId, CancellationToken ct = default);
}
