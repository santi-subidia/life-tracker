using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Application.Fitness.Dtos;
using LifeTracker.Domain.Fitness;
using LifeTracker.Domain.Timeline;

namespace LifeTracker.Application.Fitness.Services;

public interface IFitnessTimelineProjector
{
    Task ProjectCompletedWorkoutAsync(
        WorkoutSession session,
        WorkoutVolumeSummaryDto volumeSummary,
        CancellationToken ct = default);

    Task RemoveWorkoutProjectionAsync(
        Guid userId,
        Guid sessionId,
        CancellationToken ct = default);
}

public class FitnessTimelineProjector : IFitnessTimelineProjector
{
    private readonly ILifeTrackerDbContext _context;

    public FitnessTimelineProjector(ILifeTrackerDbContext context)
    {
        _context = context;
    }

    public async Task ProjectCompletedWorkoutAsync(
        WorkoutSession session,
        WorkoutVolumeSummaryDto volumeSummary,
        CancellationToken ct = default)
    {
        var existing = await _context.TimelineItems
            .Where(t => t.UserId == session.UserId && t.SourceModule == "fitness" && t.SourceId == session.Id)
            .ToListAsync(ct);

        if (existing.Count > 0)
        {
            _context.TimelineItems.RemoveRange(existing);
        }

        var durationMin = Math.Max(1, session.DurationSeconds / 60);
        var topMuscles = string.Join(", ", volumeSummary.MuscleBreakdown.Take(3).Select(m => m.Muscle));

        var title = $"Entrenamiento completado: {session.Name}";
        var summary = $"{durationMin} min | {volumeSummary.TotalVolumeKg:N0} kg movidos | {volumeSummary.TotalSetsCompleted} series";

        var metadata = JsonSerializer.Serialize(new
        {
            sessionId = session.Id,
            routineId = session.RoutineId,
            durationSeconds = session.DurationSeconds,
            totalVolumeKg = volumeSummary.TotalVolumeKg,
            totalSets = volumeSummary.TotalSetsCompleted,
            topMuscles = topMuscles,
            breakdown = volumeSummary.MuscleBreakdown
        });

        var item = new TimelineItem(
            userId: session.UserId,
            date: DateOnly.FromDateTime(session.StartedAt),
            sourceModule: "fitness",
            sourceId: session.Id,
            eventType: "workout_completed",
            title: title,
            summary: summary,
            metadataJson: metadata
        );

        _context.TimelineItems.Add(item);
        await _context.SaveChangesAsync(ct);
    }

    public async Task RemoveWorkoutProjectionAsync(Guid userId, Guid sessionId, CancellationToken ct = default)
    {
        var existing = await _context.TimelineItems
            .Where(t => t.UserId == userId && t.SourceModule == "fitness" && t.SourceId == sessionId)
            .ToListAsync(ct);

        if (existing.Count > 0)
        {
            _context.TimelineItems.RemoveRange(existing);
            await _context.SaveChangesAsync(ct);
        }
    }
}
