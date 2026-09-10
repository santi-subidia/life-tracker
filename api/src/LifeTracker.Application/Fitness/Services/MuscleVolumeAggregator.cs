using LifeTracker.Application.Fitness.Dtos;
using LifeTracker.Domain.Fitness;

namespace LifeTracker.Application.Fitness.Services;

public interface IMuscleVolumeAggregator
{
    WorkoutVolumeSummaryDto AggregateSession(
        WorkoutSession session,
        IReadOnlyDictionary<Guid, Exercise> exercisesLookup);
}

public class MuscleVolumeAggregator : IMuscleVolumeAggregator
{
    public WorkoutVolumeSummaryDto AggregateSession(
        WorkoutSession session,
        IReadOnlyDictionary<Guid, Exercise> exercisesLookup)
    {
        decimal totalVolumeKg = 0m;
        var muscleContributions = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);

        var completedSets = session.Sets.Where(s => s.IsCompleted).ToList();

        foreach (var set in completedSets)
        {
            // 1. Acumulador de volumen bruto en kg (peso * reps)
            totalVolumeKg += (set.WeightKg * set.Reps);

            // 2. Acumulador de series efectivas (excluyendo estrictamente Warmup)
            if (set.SetType != SetType.Warmup && exercisesLookup.TryGetValue(set.ExerciseId, out var exercise))
            {
                foreach (var stimulus in exercise.MuscleStimulus)
                {
                    var contribution = 1.0m * (stimulus.StimulusPct / 100.0m);
                    var muscleKey = stimulus.Muscle.ToLowerInvariant();
                    muscleContributions[muscleKey] = muscleContributions.GetValueOrDefault(muscleKey) + contribution;
                }
            }
        }

        var breakdown = muscleContributions
            .Select(kv => new MuscleVolumeBreakdownDto(
                Muscle: kv.Key,
                EffectiveSets: Math.Round(kv.Value, 1, MidpointRounding.AwayFromZero)
            ))
            .OrderByDescending(b => b.EffectiveSets)
            .ToList();

        return new WorkoutVolumeSummaryDto(
            TotalVolumeKg: Math.Round(totalVolumeKg, 2),
            TotalSetsCompleted: completedSets.Count(s => s.SetType != SetType.Warmup),
            DurationSeconds: session.DurationSeconds,
            MuscleBreakdown: breakdown
        );
    }
}
