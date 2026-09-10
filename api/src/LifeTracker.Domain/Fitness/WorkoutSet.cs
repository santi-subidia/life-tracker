using LifeTracker.Domain.Common;

namespace LifeTracker.Domain.Fitness;

public class WorkoutSet : BaseEntity
{
    public Guid SessionId { get; private set; }
    public Guid ExerciseId { get; private set; }
    public int SetOrder { get; private set; }
    public SetType SetType { get; private set; }
    public decimal WeightKg { get; private set; }
    public int Reps { get; private set; }
    public decimal? Rpe { get; private set; }
    public int? Rir { get; private set; }
    public bool IsCompleted { get; private set; }
    public DateTime? CompletedAt { get; private set; }

    // Propiedad de navegación opcional
    public Exercise? Exercise { get; private set; }

    private WorkoutSet() { }

    public WorkoutSet(
        Guid sessionId,
        Guid exerciseId,
        int setOrder,
        SetType setType,
        decimal weightKg,
        int reps,
        decimal? rpe = null,
        int? rir = null)
    {
        if (sessionId == Guid.Empty) throw new ArgumentException("SessionId requerido.", nameof(sessionId));
        if (exerciseId == Guid.Empty) throw new ArgumentException("ExerciseId requerido.", nameof(exerciseId));
        if (setOrder < 0) throw new ArgumentOutOfRangeException(nameof(setOrder), "El orden de serie no puede ser negativo.");
        if (weightKg < 0) throw new ArgumentOutOfRangeException(nameof(weightKg), "El peso no puede ser negativo.");
        if (reps < 0) throw new ArgumentOutOfRangeException(nameof(reps), "Las repeticiones no pueden ser negativas.");

        if (rpe.HasValue && (rpe.Value < 1.0m || rpe.Value > 10.0m))
            throw new ArgumentOutOfRangeException(nameof(rpe), "El RPE debe estar entre 1.0 y 10.0.");

        if (rir.HasValue && (rir.Value < 0 || rir.Value > 10))
            throw new ArgumentOutOfRangeException(nameof(rir), "El RIR debe estar entre 0 y 10.");

        SessionId = sessionId;
        ExerciseId = exerciseId;
        SetOrder = setOrder;
        SetType = setType;
        WeightKg = weightKg;
        Reps = reps;
        Rpe = rpe;
        Rir = rir;
        IsCompleted = false;
        CompletedAt = null;
    }

    public void MarkCompleted(decimal weightKg, int reps, decimal? rpe = null, int? rir = null)
    {
        if (weightKg < 0) throw new ArgumentOutOfRangeException(nameof(weightKg), "El peso no puede ser negativo.");
        if (reps < 0) throw new ArgumentOutOfRangeException(nameof(reps), "Las repeticiones no pueden ser negativas.");

        if (rpe.HasValue && (rpe.Value < 1.0m || rpe.Value > 10.0m))
            throw new ArgumentOutOfRangeException(nameof(rpe), "El RPE debe estar entre 1.0 y 10.0.");

        if (rir.HasValue && (rir.Value < 0 || rir.Value > 10))
            throw new ArgumentOutOfRangeException(nameof(rir), "El RIR debe estar entre 0 y 10.");

        WeightKg = weightKg;
        Reps = reps;
        Rpe = rpe;
        Rir = rir;
        IsCompleted = true;
        CompletedAt = DateTime.UtcNow;
    }

    public void UnmarkCompleted()
    {
        IsCompleted = false;
        CompletedAt = null;
    }

    public void UpdateValues(decimal weightKg, int reps, SetType setType, decimal? rpe = null, int? rir = null)
    {
        if (weightKg < 0) throw new ArgumentOutOfRangeException(nameof(weightKg), "El peso no puede ser negativo.");
        if (reps < 0) throw new ArgumentOutOfRangeException(nameof(reps), "Las repeticiones no pueden ser negativas.");

        WeightKg = weightKg;
        Reps = reps;
        SetType = setType;
        Rpe = rpe;
        Rir = rir;
    }
}
