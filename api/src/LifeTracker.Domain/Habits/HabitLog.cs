using LifeTracker.Domain.Common;

namespace LifeTracker.Domain.Habits;

public enum HabitLogStatus
{
    Completed = 1,
    Skipped = 2
}

public class HabitLog : BaseEntity
{
    public Guid HabitId { get; private set; }
    public Guid UserId { get; private set; }
    public DateOnly Date { get; private set; }
    public HabitLogStatus Status { get; private set; }
    public string? Notes { get; private set; }

    // Navigation property
    public HabitDefinition Habit { get; private set; } = null!;

    private HabitLog() { }

    public HabitLog(
        Guid habitId,
        Guid userId,
        DateOnly date,
        HabitLogStatus status = HabitLogStatus.Completed,
        string? notes = null)
    {
        if (habitId == Guid.Empty)
            throw new ArgumentException("El ID del hábito no puede estar vacío.", nameof(habitId));

        if (userId == Guid.Empty)
            throw new ArgumentException("El ID del usuario no puede estar vacío.", nameof(userId));

        HabitId = habitId;
        UserId = userId;
        Date = date;
        Status = status;
        Notes = notes?.Trim();
    }

    public void UpdateStatus(HabitLogStatus newStatus, string? notes = null)
    {
        Status = newStatus;
        Notes = notes?.Trim();
    }
}
