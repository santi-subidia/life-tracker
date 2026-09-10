using LifeTracker.Application.Fitness.Dtos;
using LifeTracker.Domain.Fitness;

namespace LifeTracker.Application.Fitness.Services;

public interface IProgressiveOverloadCalculator
{
    IReadOnlyList<GhostSetReferenceDto> ResolveGhostSets(
        Guid exerciseId,
        IReadOnlyList<WorkoutSet> currentSets,
        IReadOnlyList<WorkoutSession> pastCompletedSessions);
}

public class ProgressiveOverloadCalculator : IProgressiveOverloadCalculator
{
    public IReadOnlyList<GhostSetReferenceDto> ResolveGhostSets(
        Guid exerciseId,
        IReadOnlyList<WorkoutSet> currentSets,
        IReadOnlyList<WorkoutSession> pastCompletedSessions)
    {
        if (currentSets.Count == 0 || pastCompletedSessions.Count == 0)
            return [];

        // Sesión más reciente completada que contenga series completadas para este ejercicio
        var targetPastSession = pastCompletedSessions
            .Where(s => s.Status == WorkoutStatus.Completed && s.Sets.Any(set => set.ExerciseId == exerciseId && set.IsCompleted))
            .OrderByDescending(s => s.CompletedAt ?? s.StartedAt)
            .FirstOrDefault();

        if (targetPastSession == null)
            return [];

        var pastSets = targetPastSession.Sets
            .Where(s => s.ExerciseId == exerciseId && s.IsCompleted)
            .OrderBy(s => s.SetOrder)
            .ToList();

        if (pastSets.Count == 0)
            return [];

        var ghostList = new List<GhostSetReferenceDto>();

        for (int i = 0; i < currentSets.Count; i++)
        {
            var currentSet = currentSets[i];
            var matchedPastSet = pastSets.FirstOrDefault(p => p.SetOrder == currentSet.SetOrder)
                                 ?? pastSets.LastOrDefault();

            if (matchedPastSet != null)
            {
                ghostList.Add(new GhostSetReferenceDto(
                    CurrentSetId: currentSet.Id,
                    SetOrder: currentSet.SetOrder,
                    PreviousWeightKg: matchedPastSet.WeightKg,
                    PreviousReps: matchedPastSet.Reps,
                    PreviousRpe: matchedPastSet.Rpe,
                    PreviousDate: targetPastSession.CompletedAt ?? targetPastSession.StartedAt
                ));
            }
        }

        return ghostList;
    }
}
