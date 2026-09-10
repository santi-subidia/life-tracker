using LifeTracker.Domain.Common;

namespace LifeTracker.Domain.Fitness;

public class WorkoutSession : BaseEntity
{
    public Guid UserId { get; private set; }
    public Guid? RoutineId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public WorkoutStatus Status { get; private set; } = WorkoutStatus.Active;
    public DateTime StartedAt { get; private set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; private set; }
    public int DurationSeconds { get; private set; }
    public decimal TotalVolumeKg { get; private set; }
    public int TotalSetsCompleted { get; private set; }
    public string? Notes { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    private readonly List<WorkoutSet> _sets = [];
    public IReadOnlyCollection<WorkoutSet> Sets => _sets.AsReadOnly();

    private WorkoutSession() { }

    public WorkoutSession(Guid userId, string name, Guid? routineId = null, DateTime? startedAt = null)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("El UserId no puede estar vacío.", nameof(userId));

        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("El nombre de la sesión no puede estar vacío.", nameof(name));

        UserId = userId;
        Name = name.Trim();
        RoutineId = routineId;
        Status = WorkoutStatus.Active;
        StartedAt = startedAt ?? DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public WorkoutSet AddSet(
        Guid exerciseId,
        int setOrder,
        SetType type,
        decimal weightKg,
        int reps,
        decimal? rpe = null,
        int? rir = null)
    {
        EnsureActive();
        var set = new WorkoutSet(Id, exerciseId, setOrder, type, weightKg, reps, rpe, rir);
        _sets.Add(set);
        UpdatedAt = DateTime.UtcNow;
        return set;
    }

    public void Complete(DateTime completedAt, decimal calculatedVolumeKg, int effectiveSetsCompleted)
    {
        EnsureActive();

        if (completedAt < StartedAt)
            throw new ArgumentException("La fecha de finalización no puede ser anterior al inicio.", nameof(completedAt));

        Status = WorkoutStatus.Completed;
        CompletedAt = completedAt;
        DurationSeconds = Math.Max(0, (int)(completedAt - StartedAt).TotalSeconds);
        TotalVolumeKg = Math.Max(0m, calculatedVolumeKg);
        TotalSetsCompleted = Math.Max(0, effectiveSetsCompleted);
        UpdatedAt = DateTime.UtcNow;
    }

    public void Discard()
    {
        EnsureActive();
        Status = WorkoutStatus.Discarded;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateNotes(string? notes)
    {
        Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateCalculatedMetrics(decimal volumeKg, int setsCompleted)
    {
        TotalVolumeKg = Math.Max(0m, volumeKg);
        TotalSetsCompleted = Math.Max(0, setsCompleted);
        UpdatedAt = DateTime.UtcNow;
    }

    private void EnsureActive()
    {
        if (Status != WorkoutStatus.Active)
            throw new InvalidOperationException($"No se puede mutar una sesión de entrenamiento en estado {Status}.");
    }
}
