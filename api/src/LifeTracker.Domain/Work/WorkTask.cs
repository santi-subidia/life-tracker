using LifeTracker.Domain.Common;

namespace LifeTracker.Domain.Work;

public class WorkTask : BaseEntity
{
    public Guid? ProjectId { get; private set; }
    public Guid UserId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public WorkTaskStatus Status { get; private set; } = WorkTaskStatus.Todo;
    public WorkTaskPriority Priority { get; private set; } = WorkTaskPriority.Medium;
    public DateOnly? DueDate { get; private set; }
    public int Position { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    private WorkTask() { }

    public WorkTask(
        Guid userId,
        string title,
        string? description = null,
        WorkTaskStatus status = WorkTaskStatus.Todo,
        WorkTaskPriority priority = WorkTaskPriority.Medium,
        DateOnly? dueDate = null,
        Guid? projectId = null,
        int position = 0)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("El ID de usuario no puede estar vacío.", nameof(userId));

        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("El título de la tarea no puede estar vacío.", nameof(title));

        if (position < 0)
            throw new ArgumentOutOfRangeException(nameof(position), "La posición no puede ser negativa.");

        UserId = userId;
        ProjectId = projectId;
        Title = title.Trim();
        Description = description?.Trim();
        Status = status;
        Priority = priority;
        DueDate = dueDate;
        Position = position;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MoveTo(WorkTaskStatus newStatus, int newPosition)
    {
        if (newPosition < 0)
            throw new ArgumentOutOfRangeException(nameof(newPosition), "La posición no puede ser negativa.");

        Status = newStatus;
        Position = newPosition;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateDetails(string title, string? description, WorkTaskPriority priority, DateOnly? dueDate, Guid? projectId)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("El título de la tarea no puede estar vacío.", nameof(title));

        Title = title.Trim();
        Description = description?.Trim();
        Priority = priority;
        DueDate = dueDate;
        ProjectId = projectId;
        UpdatedAt = DateTime.UtcNow;
    }
}
