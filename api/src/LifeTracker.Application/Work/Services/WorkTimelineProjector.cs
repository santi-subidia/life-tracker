using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Domain.Timeline;
using LifeTracker.Domain.Work;

namespace LifeTracker.Application.Work.Services;

public class WorkTimelineProjector : IWorkTimelineProjector
{
    private readonly ILifeTrackerDbContext _context;

    public WorkTimelineProjector(ILifeTrackerDbContext context)
    {
        _context = context;
    }

    public async Task ProjectTaskCompletedAsync(Guid userId, WorkTask task, CancellationToken ct = default)
    {
        var exists = await _context.TimelineItems
            .AnyAsync(t => t.UserId == userId && t.SourceModule == "work" && t.SourceId == task.Id && t.EventType == "work_task_completed", ct);

        if (exists)
            return;

        var date = DateOnly.FromDateTime(task.UpdatedAt);
        var title = $"Tarea completada: {task.Title}";
        var summary = string.IsNullOrWhiteSpace(task.Description) ? null : task.Description.Trim();

        var metadata = JsonSerializer.Serialize(new
        {
            taskId = task.Id,
            projectId = task.ProjectId,
            priority = task.Priority.ToString().ToLowerInvariant()
        });

        var timelineItem = new TimelineItem(
            userId: userId,
            date: date,
            sourceModule: "work",
            sourceId: task.Id,
            eventType: "work_task_completed",
            title: title,
            summary: summary,
            metadataJson: metadata
        );

        _context.TimelineItems.Add(timelineItem);
        await _context.SaveChangesAsync(ct);
    }

    public async Task RemoveTaskProjectionAsync(Guid userId, Guid taskId, CancellationToken ct = default)
    {
        var items = await _context.TimelineItems
            .Where(t => t.UserId == userId && t.SourceModule == "work" && t.SourceId == taskId && t.EventType == "work_task_completed")
            .ToListAsync(ct);

        if (items.Count > 0)
        {
            _context.TimelineItems.RemoveRange(items);
            await _context.SaveChangesAsync(ct);
        }
    }

    public async Task ProjectFocusSessionAsync(Guid userId, WorkSession session, string? projectName, string? taskTitle, CancellationToken ct = default)
    {
        var date = DateOnly.FromDateTime(session.StartedAt);
        var title = $"Sesión de Foco: {session.DurationMinutes} min";
        var summary = !string.IsNullOrWhiteSpace(session.Notes)
            ? session.Notes
            : (!string.IsNullOrWhiteSpace(taskTitle)
                ? $"Tarea: {taskTitle}"
                : (!string.IsNullOrWhiteSpace(projectName) ? $"Proyecto: {projectName}" : null));

        var metadata = JsonSerializer.Serialize(new
        {
            sessionId = session.Id,
            durationMinutes = session.DurationMinutes,
            projectId = session.ProjectId,
            projectName,
            taskId = session.TaskId,
            taskTitle
        });

        var timelineItem = new TimelineItem(
            userId: userId,
            date: date,
            sourceModule: "work",
            sourceId: session.Id,
            eventType: "deep_work_session",
            title: title,
            summary: summary,
            metadataJson: metadata
        );

        _context.TimelineItems.Add(timelineItem);
        await _context.SaveChangesAsync(ct);
    }
}
