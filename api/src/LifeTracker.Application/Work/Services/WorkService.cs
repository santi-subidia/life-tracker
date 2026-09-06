using Microsoft.EntityFrameworkCore;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Application.Work.Dtos;
using LifeTracker.Domain.Work;

namespace LifeTracker.Application.Work.Services;

public class WorkService : IWorkService
{
    private readonly ILifeTrackerDbContext _context;
    private readonly IKanbanOrderingService _kanbanOrderingService;
    private readonly IFocusMetricsCalculator _focusMetricsCalculator;
    private readonly IWorkTimelineProjector _timelineProjector;

    public WorkService(
        ILifeTrackerDbContext context,
        IKanbanOrderingService kanbanOrderingService,
        IFocusMetricsCalculator focusMetricsCalculator,
        IWorkTimelineProjector timelineProjector)
    {
        _context = context;
        _kanbanOrderingService = kanbanOrderingService;
        _focusMetricsCalculator = focusMetricsCalculator;
        _timelineProjector = timelineProjector;
    }

    public async Task<List<WorkProjectDto>> GetProjectsAsync(Guid userId, CancellationToken ct = default)
    {
        var projects = await _context.WorkProjects
            .AsNoTracking()
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(ct);

        var taskStats = await _context.WorkTasks
            .AsNoTracking()
            .Where(t => t.UserId == userId && t.ProjectId != null)
            .GroupBy(t => new { t.ProjectId, t.Status })
            .Select(g => new
            {
                ProjectId = g.Key.ProjectId!.Value,
                g.Key.Status,
                Count = g.Count()
            })
            .ToListAsync(ct);

        return projects.Select(p =>
        {
            var pStats = taskStats.Where(s => s.ProjectId == p.Id).ToList();
            int active = pStats.Where(s => s.Status != WorkTaskStatus.Done).Sum(s => s.Count);
            int completed = pStats.Where(s => s.Status == WorkTaskStatus.Done).Sum(s => s.Count);

            return new WorkProjectDto(
                p.Id,
                p.Name,
                p.Description,
                FormatProjectStatus(p.Status),
                p.Color,
                active,
                completed,
                p.CreatedAt
            );
        }).ToList();
    }

    public async Task<WorkProjectDto> CreateProjectAsync(Guid userId, CreateWorkProjectRequest req, CancellationToken ct = default)
    {
        var status = ParseProjectStatus(req.Status);
        var project = new WorkProject(userId, req.Name, req.Description, status, req.Color);

        _context.WorkProjects.Add(project);
        await _context.SaveChangesAsync(ct);

        return new WorkProjectDto(
            project.Id,
            project.Name,
            project.Description,
            FormatProjectStatus(project.Status),
            project.Color,
            0,
            0,
            project.CreatedAt
        );
    }

    public async Task<WorkProjectDto?> UpdateProjectAsync(Guid userId, Guid id, UpdateWorkProjectRequest req, CancellationToken ct = default)
    {
        var project = await _context.WorkProjects.FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId, ct);
        if (project == null)
            return null;

        var status = ParseProjectStatus(req.Status);
        project.Update(req.Name, req.Description, status, req.Color);

        await _context.SaveChangesAsync(ct);

        var activeCount = await _context.WorkTasks
            .CountAsync(t => t.UserId == userId && t.ProjectId == id && t.Status != WorkTaskStatus.Done, ct);
        var completedCount = await _context.WorkTasks
            .CountAsync(t => t.UserId == userId && t.ProjectId == id && t.Status == WorkTaskStatus.Done, ct);

        return new WorkProjectDto(
            project.Id,
            project.Name,
            project.Description,
            FormatProjectStatus(project.Status),
            project.Color,
            activeCount,
            completedCount,
            project.CreatedAt
        );
    }

    public async Task<bool> DeleteProjectAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var project = await _context.WorkProjects.FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId, ct);
        if (project == null)
            return false;

        _context.WorkProjects.Remove(project);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<List<WorkTaskDto>> GetTasksAsync(Guid userId, Guid? projectId, string? status, CancellationToken ct = default)
    {
        var query = _context.WorkTasks
            .AsNoTracking()
            .Where(t => t.UserId == userId);

        if (projectId.HasValue)
        {
            query = query.Where(t => t.ProjectId == projectId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var taskStatus = ParseTaskStatus(status);
            query = query.Where(t => t.Status == taskStatus);
        }

        var tasks = await query
            .OrderBy(t => t.Position)
            .ThenByDescending(t => t.CreatedAt)
            .ToListAsync(ct);

        var projectIds = tasks.Where(t => t.ProjectId.HasValue).Select(t => t.ProjectId!.Value).Distinct().ToList();
        var projects = await _context.WorkProjects
            .AsNoTracking()
            .Where(p => projectIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, ct);

        return tasks.Select(t =>
        {
            projects.TryGetValue(t.ProjectId ?? Guid.Empty, out var proj);
            return new WorkTaskDto(
                t.Id,
                t.ProjectId,
                proj?.Name,
                proj?.Color,
                t.Title,
                t.Description,
                FormatTaskStatus(t.Status),
                FormatTaskPriority(t.Priority),
                t.DueDate,
                t.Position,
                t.CreatedAt,
                t.UpdatedAt
            );
        }).ToList();
    }

    public async Task<WorkTaskDto> CreateTaskAsync(Guid userId, CreateWorkTaskRequest req, CancellationToken ct = default)
    {
        var status = ParseTaskStatus(req.Status);
        var priority = ParseTaskPriority(req.Priority);

        var maxPosition = await _context.WorkTasks
            .Where(t => t.UserId == userId && t.ProjectId == req.ProjectId && t.Status == status)
            .MaxAsync(t => (int?)t.Position, ct) ?? -1;

        var task = new WorkTask(
            userId: userId,
            title: req.Title,
            description: req.Description,
            status: status,
            priority: priority,
            dueDate: req.DueDate,
            projectId: req.ProjectId,
            position: maxPosition + 1
        );

        _context.WorkTasks.Add(task);
        await _context.SaveChangesAsync(ct);

        if (status == WorkTaskStatus.Done)
        {
            await _timelineProjector.ProjectTaskCompletedAsync(userId, task, ct);
        }

        string? projName = null;
        string? projColor = null;
        if (req.ProjectId.HasValue)
        {
            var proj = await _context.WorkProjects.AsNoTracking().FirstOrDefaultAsync(p => p.Id == req.ProjectId.Value, ct);
            projName = proj?.Name;
            projColor = proj?.Color;
        }

        return new WorkTaskDto(
            task.Id,
            task.ProjectId,
            projName,
            projColor,
            task.Title,
            task.Description,
            FormatTaskStatus(task.Status),
            FormatTaskPriority(task.Priority),
            task.DueDate,
            task.Position,
            task.CreatedAt,
            task.UpdatedAt
        );
    }

    public async Task<WorkTaskDto?> UpdateTaskAsync(Guid userId, Guid id, UpdateWorkTaskRequest req, CancellationToken ct = default)
    {
        var task = await _context.WorkTasks.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId, ct);
        if (task == null)
            return null;

        var priority = ParseTaskPriority(req.Priority);
        task.UpdateDetails(req.Title, req.Description, priority, req.DueDate, req.ProjectId);

        await _context.SaveChangesAsync(ct);

        string? projName = null;
        string? projColor = null;
        if (task.ProjectId.HasValue)
        {
            var proj = await _context.WorkProjects.AsNoTracking().FirstOrDefaultAsync(p => p.Id == task.ProjectId.Value, ct);
            projName = proj?.Name;
            projColor = proj?.Color;
        }

        return new WorkTaskDto(
            task.Id,
            task.ProjectId,
            projName,
            projColor,
            task.Title,
            task.Description,
            FormatTaskStatus(task.Status),
            FormatTaskPriority(task.Priority),
            task.DueDate,
            task.Position,
            task.CreatedAt,
            task.UpdatedAt
        );
    }

    public async Task<WorkTaskDto?> MoveTaskAsync(Guid userId, Guid id, MoveWorkTaskRequest req, CancellationToken ct = default)
    {
        var task = await _context.WorkTasks.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId, ct);
        if (task == null)
            return null;

        var oldStatus = task.Status;
        var targetStatus = ParseTaskStatus(req.NewStatus);

        if (oldStatus == targetStatus)
        {
            var columnTasks = await _context.WorkTasks
                .Where(t => t.UserId == userId && t.ProjectId == task.ProjectId && t.Status == oldStatus)
                .OrderBy(t => t.Position)
                .ToListAsync(ct);

            _kanbanOrderingService.ReorderWithinColumn(columnTasks, id, req.NewPosition);
        }
        else
        {
            var sourceTasks = await _context.WorkTasks
                .Where(t => t.UserId == userId && t.ProjectId == task.ProjectId && t.Status == oldStatus)
                .OrderBy(t => t.Position)
                .ToListAsync(ct);

            var targetTasks = await _context.WorkTasks
                .Where(t => t.UserId == userId && t.ProjectId == task.ProjectId && t.Status == targetStatus)
                .OrderBy(t => t.Position)
                .ToListAsync(ct);

            _kanbanOrderingService.MoveAcrossColumns(sourceTasks, targetTasks, id, targetStatus, req.NewPosition);

            if (targetStatus == WorkTaskStatus.Done && oldStatus != WorkTaskStatus.Done)
            {
                await _timelineProjector.ProjectTaskCompletedAsync(userId, task, ct);
            }
            else if (oldStatus == WorkTaskStatus.Done && targetStatus != WorkTaskStatus.Done)
            {
                await _timelineProjector.RemoveTaskProjectionAsync(userId, id, ct);
            }
        }

        await _context.SaveChangesAsync(ct);

        string? projName = null;
        string? projColor = null;
        if (task.ProjectId.HasValue)
        {
            var proj = await _context.WorkProjects.AsNoTracking().FirstOrDefaultAsync(p => p.Id == task.ProjectId.Value, ct);
            projName = proj?.Name;
            projColor = proj?.Color;
        }

        return new WorkTaskDto(
            task.Id,
            task.ProjectId,
            projName,
            projColor,
            task.Title,
            task.Description,
            FormatTaskStatus(task.Status),
            FormatTaskPriority(task.Priority),
            task.DueDate,
            task.Position,
            task.CreatedAt,
            task.UpdatedAt
        );
    }

    public async Task<bool> DeleteTaskAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var task = await _context.WorkTasks.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId, ct);
        if (task == null)
            return false;

        if (task.Status == WorkTaskStatus.Done)
        {
            await _timelineProjector.RemoveTaskProjectionAsync(userId, id, ct);
        }

        _context.WorkTasks.Remove(task);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<WorkSessionDto> RecordSessionAsync(Guid userId, RecordWorkSessionRequest req, CancellationToken ct = default)
    {
        var session = new WorkSession(
            userId: userId,
            projectId: req.ProjectId,
            taskId: req.TaskId,
            startedAt: req.StartedAt,
            endedAt: req.EndedAt,
            notes: req.Notes
        );

        _context.WorkSessions.Add(session);
        await _context.SaveChangesAsync(ct);

        string? projectName = null;
        if (req.ProjectId.HasValue)
        {
            var proj = await _context.WorkProjects.AsNoTracking().FirstOrDefaultAsync(p => p.Id == req.ProjectId.Value, ct);
            projectName = proj?.Name;
        }

        string? taskTitle = null;
        if (req.TaskId.HasValue)
        {
            var task = await _context.WorkTasks.AsNoTracking().FirstOrDefaultAsync(t => t.Id == req.TaskId.Value, ct);
            taskTitle = task?.Title;
        }

        await _timelineProjector.ProjectFocusSessionAsync(userId, session, projectName, taskTitle, ct);

        return new WorkSessionDto(
            session.Id,
            session.ProjectId,
            projectName,
            session.TaskId,
            taskTitle,
            session.StartedAt,
            session.EndedAt,
            session.DurationMinutes,
            session.Notes,
            session.CreatedAt
        );
    }

    public async Task<List<WorkSessionDto>> GetSessionsAsync(Guid userId, int limit = 20, CancellationToken ct = default)
    {
        var sessions = await _context.WorkSessions
            .AsNoTracking()
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.StartedAt)
            .Take(limit)
            .ToListAsync(ct);

        var projectIds = sessions.Where(s => s.ProjectId.HasValue).Select(s => s.ProjectId!.Value).Distinct().ToList();
        var taskIds = sessions.Where(s => s.TaskId.HasValue).Select(s => s.TaskId!.Value).Distinct().ToList();

        var projects = await _context.WorkProjects
            .AsNoTracking()
            .Where(p => projectIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, ct);

        var tasks = await _context.WorkTasks
            .AsNoTracking()
            .Where(t => taskIds.Contains(t.Id))
            .ToDictionaryAsync(t => t.Id, ct);

        return sessions.Select(s =>
        {
            projects.TryGetValue(s.ProjectId ?? Guid.Empty, out var proj);
            tasks.TryGetValue(s.TaskId ?? Guid.Empty, out var task);

            return new WorkSessionDto(
                s.Id,
                s.ProjectId,
                proj?.Name,
                s.TaskId,
                task?.Title,
                s.StartedAt,
                s.EndedAt,
                s.DurationMinutes,
                s.Notes,
                s.CreatedAt
            );
        }).ToList();
    }

    public async Task<WorkMetricsDto> GetMetricsAsync(Guid userId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var sessions = await _context.WorkSessions
            .AsNoTracking()
            .Where(s => s.UserId == userId)
            .ToListAsync(ct);

        var tasks = await _context.WorkTasks
            .AsNoTracking()
            .Where(t => t.UserId == userId)
            .ToListAsync(ct);

        var domainMetrics = _focusMetricsCalculator.Calculate(sessions, tasks, now);

        return new WorkMetricsDto(
            domainMetrics.FocusMinutesThisWeek,
            domainMetrics.FocusMinutesToday,
            domainMetrics.CompletedTasksThisWeek,
            domainMetrics.CompletedTasksToday,
            domainMetrics.SessionsCountThisWeek
        );
    }

    private static WorkProjectStatus ParseProjectStatus(string? status) => status?.ToLowerInvariant() switch
    {
        "paused" => WorkProjectStatus.Paused,
        "completed" => WorkProjectStatus.Completed,
        _ => WorkProjectStatus.Active
    };

    private static string FormatProjectStatus(WorkProjectStatus status) => status switch
    {
        WorkProjectStatus.Paused => "paused",
        WorkProjectStatus.Completed => "completed",
        _ => "active"
    };

    private static WorkTaskStatus ParseTaskStatus(string? status) => status?.ToLowerInvariant() switch
    {
        "backlog" => WorkTaskStatus.Backlog,
        "in_progress" => WorkTaskStatus.InProgress,
        "done" => WorkTaskStatus.Done,
        _ => WorkTaskStatus.Todo
    };

    private static string FormatTaskStatus(WorkTaskStatus status) => status switch
    {
        WorkTaskStatus.Backlog => "backlog",
        WorkTaskStatus.InProgress => "in_progress",
        WorkTaskStatus.Done => "done",
        _ => "todo"
    };

    private static WorkTaskPriority ParseTaskPriority(string? priority) => priority?.ToLowerInvariant() switch
    {
        "low" => WorkTaskPriority.Low,
        "high" => WorkTaskPriority.High,
        "urgent" => WorkTaskPriority.Urgent,
        _ => WorkTaskPriority.Medium
    };

    private static string FormatTaskPriority(WorkTaskPriority priority) => priority switch
    {
        WorkTaskPriority.Low => "low",
        WorkTaskPriority.High => "high",
        WorkTaskPriority.Urgent => "urgent",
        _ => "medium"
    };
}
