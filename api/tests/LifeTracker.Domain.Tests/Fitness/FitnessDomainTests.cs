using LifeTracker.Domain.Fitness;
using Xunit;

namespace LifeTracker.Domain.Tests.Fitness;

public class FitnessDomainTests
{
    private readonly Guid _userId = Guid.NewGuid();

    [Fact]
    public void Exercise_WithValidStimulus_CreatesSuccessfully()
    {
        // Arrange
        var stimuli = new List<MuscleStimulus>
        {
            new("pecho", 100),
            new("triceps", 60),
            new("deltoides_anterior", 40)
        };

        // Act (Official catalog exercise: UserId = null, IsCustom = false)
        var exercise = new Exercise(
            userId: null,
            name: "Press de Banca Plano",
            slug: "press-banca-plano",
            discipline: FitnessDiscipline.Strength,
            primaryMuscleGroup: MuscleGroup.Chest,
            stimulusList: stimuli,
            equipment: EquipmentType.Barbell,
            instructions: ["Recuéstate en el banco", "Baja la barra al esternón", "Empuja con fuerza"],
            isCustom: false
        );

        // Assert
        Assert.Equal("Press de Banca Plano", exercise.Name);
        Assert.Equal("press-banca-plano", exercise.Slug);
        Assert.Equal(MuscleGroup.Chest, exercise.PrimaryMuscleGroup);
        Assert.Equal(3, exercise.MuscleStimulus.Count);
        Assert.False(exercise.IsCustom);
        Assert.Null(exercise.UserId);
    }

    [Fact]
    public void Exercise_WithoutPrimaryMuscleAt100_ThrowsInvalidOperationException_Invariant8()
    {
        // Arrange: Stimulus where max is 80% (violates Invariant 8: must have at least one 100% muscle)
        var invalidStimuli = new List<MuscleStimulus>
        {
            new("pecho", 80),
            new("triceps", 50)
        };

        // Act & Assert
        var ex = Assert.Throws<InvalidOperationException>(() =>
            new Exercise(
                userId: null,
                name: "Ejercicio Invalido",
                slug: "ejercicio-invalido",
                discipline: FitnessDiscipline.Strength,
                primaryMuscleGroup: MuscleGroup.Chest,
                stimulusList: invalidStimuli,
                equipment: EquipmentType.Dumbbell,
                isCustom: false
            )
        );

        Assert.Contains("Invariante 8", ex.Message);
    }

    [Fact]
    public void Exercise_OfficialCatalogWithUserId_ThrowsInvalidOperationException_Invariant11()
    {
        // Arrange
        var stimuli = new List<MuscleStimulus> { new("dorsal", 100) };

        // Act & Assert (isCustom = false but userId is passed)
        var ex = Assert.Throws<InvalidOperationException>(() =>
            new Exercise(
                userId: _userId,
                name: "Dominadas",
                slug: "dominadas",
                discipline: FitnessDiscipline.Strength,
                primaryMuscleGroup: MuscleGroup.Lats,
                stimulusList: stimuli,
                equipment: EquipmentType.Bodyweight,
                isCustom: false
            )
        );

        Assert.Contains("UserId", ex.Message);
    }

    [Fact]
    public void Exercise_CustomWithoutUserId_ThrowsInvalidOperationException_Invariant11()
    {
        // Arrange
        var stimuli = new List<MuscleStimulus> { new("cuadriceps", 100) };

        // Act & Assert (isCustom = true but userId is null)
        var ex = Assert.Throws<InvalidOperationException>(() =>
            new Exercise(
                userId: null,
                name: "Sentadilla Hack Casera",
                slug: "sentadilla-hack-casera",
                discipline: FitnessDiscipline.Strength,
                primaryMuscleGroup: MuscleGroup.Quadriceps,
                stimulusList: stimuli,
                equipment: EquipmentType.Machine,
                isCustom: true
            )
        );

        Assert.Contains("usuario", ex.Message);
    }

    [Fact]
    public void Exercise_OfficialCatalog_CannotBeUpdated()
    {
        // Arrange
        var stimuli = new List<MuscleStimulus> { new("deltoides_anterior", 100) };
        var officialExercise = new Exercise(
            userId: null,
            name: "Press Militar",
            slug: "press-militar",
            discipline: FitnessDiscipline.Strength,
            primaryMuscleGroup: MuscleGroup.AnteriorDeltoid,
            stimulusList: stimuli,
            equipment: EquipmentType.Barbell,
            isCustom: false
        );

        // Act & Assert
        Assert.Throws<InvalidOperationException>(() =>
            officialExercise.Update(
                "Press Militar Modificado",
                FitnessDiscipline.Strength,
                MuscleGroup.AnteriorDeltoid,
                stimuli,
                EquipmentType.Barbell
            )
        );
    }

    [Fact]
    public void WorkoutSession_LifeCycle_TransitionsAndConsolidatesCorrectly()
    {
        // Arrange
        var session = new WorkoutSession(_userId, "Entrenamiento Torso", null);
        Assert.Equal(WorkoutStatus.Active, session.Status);
        Assert.Equal(0, session.DurationSeconds);
        Assert.Equal(0m, session.TotalVolumeKg);

        var exerciseId = Guid.NewGuid();

        // Add 2 completed sets and 1 warmup set
        var set1 = session.AddSet(exerciseId, 1, SetType.Warmup, 40m, 12);
        set1.MarkCompleted(40m, 12);

        var set2 = session.AddSet(exerciseId, 2, SetType.Normal, 80m, 8);
        set2.MarkCompleted(80m, 8);

        var set3 = session.AddSet(exerciseId, 3, SetType.Normal, 85m, 6);
        set3.MarkCompleted(85m, 6);

        // Act: Complete session with volume = 40*12 (480) + 80*8 (640) + 85*6 (510) = 1630 kg
        session.Complete(DateTime.UtcNow.AddMinutes(45), calculatedVolumeKg: 1630m, effectiveSetsCompleted: 3);
        session.UpdateNotes("Buena congestión y técnica limpia");

        // Assert
        Assert.Equal(WorkoutStatus.Completed, session.Status);
        Assert.NotNull(session.CompletedAt);
        Assert.True(session.DurationSeconds >= 0);
        Assert.Equal(1630m, session.TotalVolumeKg);
        Assert.Equal(3, session.TotalSetsCompleted);
        Assert.Equal("Buena congestión y técnica limpia", session.Notes);

        // Invariant 10: Cannot add sets to a completed session
        Assert.Throws<InvalidOperationException>(() =>
            session.AddSet(exerciseId, 4, SetType.Normal, 90m, 5)
        );
    }

    [Fact]
    public void WorkoutSession_Discard_ChangesStatusToDiscarded()
    {
        // Arrange
        var session = new WorkoutSession(_userId, "Sesión Incompleta", null);

        // Act
        session.Discard();

        // Assert
        Assert.Equal(WorkoutStatus.Discarded, session.Status);
        Assert.Throws<InvalidOperationException>(() =>
            session.Complete(DateTime.UtcNow, 0m, 0)
        );
    }
}
