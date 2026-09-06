using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Domain.Academics;
using LifeTracker.Domain.Timeline;

namespace LifeTracker.Application.Academics.Services;

public class AcademicTimelineProjector : IAcademicTimelineProjector
{
    private readonly ILifeTrackerDbContext _context;

    public AcademicTimelineProjector(ILifeTrackerDbContext context)
    {
        _context = context;
    }

    public async Task ProjectMilestoneGradedAsync(Guid userId, AcademicSubject subject, AcademicMilestone milestone, CancellationToken ct = default)
    {
        if (!milestone.Grade.HasValue)
            return;

        var existingItem = await _context.TimelineItems
            .FirstOrDefaultAsync(t => t.UserId == userId && t.SourceModule == "academics" && t.SourceId == milestone.Id && t.EventType == "milestone_graded", ct);

        var date = milestone.DueDate;
        var gradeFormatted = milestone.Grade.Value.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture);
        var title = $"Nota en {subject.Name}: {milestone.Title} ({gradeFormatted})";
        var summary = string.IsNullOrWhiteSpace(milestone.Notes) ? null : milestone.Notes.Trim();

        var metadata = JsonSerializer.Serialize(new
        {
            subjectId = subject.Id,
            subjectName = subject.Name,
            milestoneId = milestone.Id,
            grade = milestone.Grade.Value,
            status = milestone.Status.ToString().ToLowerInvariant()
        });

        if (existingItem != null)
        {
            _context.TimelineItems.Remove(existingItem);
        }

        var timelineItem = new TimelineItem(
            userId: userId,
            date: date,
            sourceModule: "academics",
            sourceId: milestone.Id,
            eventType: "milestone_graded",
            title: title,
            summary: summary,
            metadataJson: metadata
        );

        _context.TimelineItems.Add(timelineItem);
        await _context.SaveChangesAsync(ct);
    }

    public async Task RemoveMilestoneProjectionAsync(Guid userId, Guid milestoneId, CancellationToken ct = default)
    {
        var items = await _context.TimelineItems
            .Where(t => t.UserId == userId && t.SourceModule == "academics" && t.SourceId == milestoneId)
            .ToListAsync(ct);

        if (items.Count > 0)
        {
            _context.TimelineItems.RemoveRange(items);
            await _context.SaveChangesAsync(ct);
        }
    }
}
