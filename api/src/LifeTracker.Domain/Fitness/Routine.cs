using LifeTracker.Domain.Common;

namespace LifeTracker.Domain.Fitness;

public class Routine : BaseEntity
{
    public Guid UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public int EstimatedDurationMinutes { get; private set; } = 60;
    public bool IsArchived { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    private readonly List<RoutineExercise> _exercises = [];
    public IReadOnlyCollection<RoutineExercise> Exercises => _exercises.AsReadOnly();

    private Routine() { }

    public Routine(
        Guid userId,
        string name,
        string? description = null,
        int estimatedDurationMinutes = 60)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("El UserId no puede estar vacío.", nameof(userId));

        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("El nombre de la rutina no puede estar vacío.", nameof(name));

        if (estimatedDurationMinutes <= 0)
            throw new ArgumentOutOfRangeException(nameof(estimatedDurationMinutes), "La duración estimada debe ser mayor a 0.");

        UserId = userId;
        Name = name.Trim();
        Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        EstimatedDurationMinutes = estimatedDurationMinutes;
        IsArchived = false;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Update(string name, string? description, int estimatedDurationMinutes)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("El nombre de la rutina no puede estar vacío.", nameof(name));

        if (estimatedDurationMinutes <= 0)
            throw new ArgumentOutOfRangeException(nameof(estimatedDurationMinutes), "La duración estimada debe ser mayor a 0.");

        Name = name.Trim();
        Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        EstimatedDurationMinutes = estimatedDurationMinutes;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Archive()
    {
        IsArchived = true;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Restore()
    {
        IsArchived = false;
        UpdatedAt = DateTime.UtcNow;
    }

    public RoutineExercise AddExercise(
        Guid exerciseId,
        int orderIndex,
        int targetSets,
        int targetRepsMin,
        int targetRepsMax,
        int restTimerSeconds = 90,
        string? notes = null)
    {
        var item = new RoutineExercise(
            Id,
            exerciseId,
            orderIndex,
            targetSets,
            targetRepsMin,
            targetRepsMax,
            restTimerSeconds,
            notes);

        _exercises.Add(item);
        UpdatedAt = DateTime.UtcNow;
        return item;
    }

    public void ClearExercises()
    {
        _exercises.Clear();
        UpdatedAt = DateTime.UtcNow;
    }
}
