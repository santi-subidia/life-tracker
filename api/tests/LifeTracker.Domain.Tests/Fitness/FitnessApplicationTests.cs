using LifeTracker.Application.Fitness.Services;
using LifeTracker.Domain.Fitness;
using Xunit;

namespace LifeTracker.Domain.Tests.Fitness;

public class FitnessApplicationTests
{
    private readonly Guid _userId = Guid.NewGuid();

    [Fact]
    public void MuscleVolumeAggregator_CalculatesWeightedVolume_AndExcludesWarmup()
    {
        // Arrange: Banco plano (Pecho 100%, Triceps 60%, Deltoides Anterior 40%)
        var benchPressId = Guid.NewGuid();
        var benchPress = new Exercise(
            userId: null,
            name: "Press de Banca Plano",
            slug: "press-banca-plano",
            discipline: FitnessDiscipline.Strength,
            primaryMuscleGroup: MuscleGroup.Chest,
            stimulusList:
            [
                new("pecho", 100),
                new("triceps", 60),
                new("deltoides_anterior", 40)
            ],
            equipment: EquipmentType.Barbell,
            isCustom: false
        );

        var exercisesLookup = new Dictionary<Guid, Exercise>
        {
            [benchPressId] = benchPress
        };

        var session = new WorkoutSession(_userId, "Push Day", null);

        // Warmup: 50kg x 10 (500kg brutas) -> debe contar en totalVolumeKg pero NO en series efectivas
        var warmupSet = session.AddSet(benchPressId, 1, SetType.Warmup, 50m, 10);
        warmupSet.MarkCompleted(50m, 10);

        // Serie efectiva 1: 100kg x 8 (800kg)
        var set1 = session.AddSet(benchPressId, 2, SetType.Normal, 100m, 8);
        set1.MarkCompleted(100m, 8);

        // Serie efectiva 2: 100kg x 6 (600kg)
        var set2 = session.AddSet(benchPressId, 3, SetType.Normal, 100m, 6);
        set2.MarkCompleted(100m, 6);

        var aggregator = new MuscleVolumeAggregator();

        // Act
        var summary = aggregator.AggregateSession(session, exercisesLookup);

        // Assert
        // Total volume = 50*10 (500) + 100*8 (800) + 100*6 (600) = 1900 kg
        Assert.Equal(1900m, summary.TotalVolumeKg);

        // Total effective sets = 2 (Warmup excluded!)
        Assert.Equal(2, summary.TotalSetsCompleted);

        // Muscle contributions:
        // Pecho: 2 sets * 1.0 = 2.0 series
        // Triceps: 2 sets * 0.6 = 1.2 series
        // Deltoides anterior: 2 sets * 0.4 = 0.8 series
        var pecho = summary.MuscleBreakdown.FirstOrDefault(m => m.Muscle.Equals("pecho", StringComparison.OrdinalIgnoreCase));
        Assert.NotNull(pecho);
        Assert.Equal(2.0m, pecho.EffectiveSets);

        var triceps = summary.MuscleBreakdown.FirstOrDefault(m => m.Muscle.Equals("triceps", StringComparison.OrdinalIgnoreCase));
        Assert.NotNull(triceps);
        Assert.Equal(1.2m, triceps.EffectiveSets);

        var deltoides = summary.MuscleBreakdown.FirstOrDefault(m => m.Muscle.Equals("deltoides_anterior", StringComparison.OrdinalIgnoreCase));
        Assert.NotNull(deltoides);
        Assert.Equal(0.8m, deltoides.EffectiveSets);
    }

    [Fact]
    public void ProgressiveOverloadCalculator_ResolvesPastGhostSetsCorrectly()
    {
        // Arrange
        var exerciseId = Guid.NewGuid();
        var calculator = new ProgressiveOverloadCalculator();

        // Past session with 2 completed sets for exerciseId
        var pastStarted = DateTime.UtcNow.AddDays(-3).AddMinutes(-60);
        var pastSession = new WorkoutSession(_userId, "Rutina Anterior", null, startedAt: pastStarted);
        var pastSet1 = pastSession.AddSet(exerciseId, 1, SetType.Normal, 80m, 10);
        pastSet1.MarkCompleted(80m, 10);
        var pastSet2 = pastSession.AddSet(exerciseId, 2, SetType.Normal, 85m, 8);
        pastSet2.MarkCompleted(85m, 8);
        pastSession.Complete(pastStarted.AddMinutes(50), calculatedVolumeKg: 1480m, effectiveSetsCompleted: 2);

        // Current session with 2 sets
        var currentSession = new WorkoutSession(_userId, "Rutina de Hoy", null);
        currentSession.AddSet(exerciseId, 1, SetType.Normal, 0m, 0);
        currentSession.AddSet(exerciseId, 2, SetType.Normal, 0m, 0);

        // Act
        var ghostSets = calculator.ResolveGhostSets(
            exerciseId,
            currentSession.Sets.ToList(),
            [pastSession]
        );

        // Assert
        Assert.Equal(2, ghostSets.Count);

        // Set 1 should reference past Set 1 (80kg x 10)
        var ghost1 = ghostSets.FirstOrDefault(g => g.SetOrder == 1);
        Assert.NotNull(ghost1);
        Assert.Equal(80m, ghost1.PreviousWeightKg);
        Assert.Equal(10, ghost1.PreviousReps);

        // Set 2 should reference past Set 2 (85kg x 8)
        var ghost2 = ghostSets.FirstOrDefault(g => g.SetOrder == 2);
        Assert.NotNull(ghost2);
        Assert.Equal(85m, ghost2.PreviousWeightKg);
        Assert.Equal(8, ghost2.PreviousReps);
    }

    [Fact]
    public void RestTimerController_CalculatesUtcTarget_AndHandlesAddSeconds()
    {
        // Arrange
        var controller = new RestTimerController();
        var sessionId = Guid.NewGuid();
        var setId = Guid.NewGuid();
        var baseTime = new DateTimeOffset(2026, 9, 10, 15, 0, 0, TimeSpan.Zero);

        // Act 1: Start timer for 90 seconds
        var timer = controller.Start(sessionId, setId, 90, baseTime);

        // Assert 1
        Assert.True(timer.IsRunning);
        Assert.Equal(90, timer.DurationSeconds);
        Assert.Equal(90, timer.RemainingSeconds);
        Assert.Equal(baseTime.AddSeconds(90), timer.TargetEndUtc);

        // Act 2: Check snapshot after 30 seconds have elapsed
        var thirtySecsLater = baseTime.AddSeconds(30);
        var snapshot = controller.GetSnapshot(timer, thirtySecsLater);

        // Assert 2: 60 seconds remaining
        Assert.True(snapshot.IsRunning);
        Assert.Equal(60, snapshot.RemainingSeconds);

        // Act 3: Add +30 seconds
        var extended = controller.AddSeconds(snapshot, 30, thirtySecsLater);

        // Assert 3: Duration becomes 120, remaining becomes 90
        Assert.Equal(120, extended.DurationSeconds);
        Assert.Equal(90, extended.RemainingSeconds);
        Assert.Equal(baseTime.AddSeconds(120), extended.TargetEndUtc);

        // Act 4: Time elapses past target
        var twoMinutesLater = baseTime.AddSeconds(125);
        var expired = controller.GetSnapshot(extended, twoMinutesLater);

        // Assert 4: Timer stops automatically
        Assert.False(expired.IsRunning);
        Assert.Equal(0, expired.RemainingSeconds);
    }
}
