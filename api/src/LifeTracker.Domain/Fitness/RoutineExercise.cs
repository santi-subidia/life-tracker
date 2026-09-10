using LifeTracker.Domain.Common;

namespace LifeTracker.Domain.Fitness;

public class RoutineExercise : BaseEntity
{
    public Guid RoutineId { get; private set; }
    public Guid ExerciseId { get; private set; }
    public int OrderIndex { get; private set; }
    public int TargetSets { get; private set; }
    public int TargetRepsMin { get; private set; }
    public int TargetRepsMax { get; private set; }
    public int RestTimerSeconds { get; private set; }
    public string? Notes { get; private set; }

    // Propiedad de navegación opcional
    public Exercise? Exercise { get; private set; }

    private RoutineExercise() { }

    public RoutineExercise(
        Guid routineId,
        Guid exerciseId,
        int orderIndex,
        int targetSets,
        int targetRepsMin,
        int targetRepsMax,
        int restTimerSeconds = 90,
        string? notes = null)
    {
        if (routineId == Guid.Empty) throw new ArgumentException("RoutineId requerido.", nameof(routineId));
        if (exerciseId == Guid.Empty) throw new ArgumentException("ExerciseId requerido.", nameof(exerciseId));
        if (orderIndex < 0) throw new ArgumentOutOfRangeException(nameof(orderIndex), "El orden no puede ser negativo.");
        if (targetSets <= 0) throw new ArgumentOutOfRangeException(nameof(targetSets), "Las series objetivo deben ser mayores a 0.");
        if (targetRepsMin <= 0) throw new ArgumentOutOfRangeException(nameof(targetRepsMin), "Las repeticiones mínimas deben ser mayores a 0.");
        if (targetRepsMax < targetRepsMin) throw new ArgumentException("Las repeticiones máximas no pueden ser menores a las mínimas.", nameof(targetRepsMax));
        if (restTimerSeconds < 0) throw new ArgumentOutOfRangeException(nameof(restTimerSeconds), "El descanso no puede ser negativo.");

        RoutineId = routineId;
        ExerciseId = exerciseId;
        OrderIndex = orderIndex;
        TargetSets = targetSets;
        TargetRepsMin = targetRepsMin;
        TargetRepsMax = targetRepsMax;
        RestTimerSeconds = restTimerSeconds;
        Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
    }
}
