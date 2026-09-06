using LifeTracker.Domain.Common;

namespace LifeTracker.Domain.Work;

public class WorkSession : BaseEntity
{
    public Guid UserId { get; private set; }
    public Guid? ProjectId { get; private set; }
    public Guid? TaskId { get; private set; }
    public DateTime StartedAt { get; private set; }
    public DateTime? EndedAt { get; private set; }
    public int DurationMinutes { get; private set; }
    public string? Notes { get; private set; }

    private WorkSession() { }

    public WorkSession(
        Guid userId,
        Guid? projectId,
        Guid? taskId,
        DateTime startedAt,
        DateTime endedAt,
        string? notes = null)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("El ID de usuario no puede estar vacío.", nameof(userId));

        if (endedAt < startedAt)
            throw new ArgumentException("La fecha de fin no puede ser anterior a la de inicio.", nameof(endedAt));

        UserId = userId;
        ProjectId = projectId;
        TaskId = taskId;
        StartedAt = startedAt;
        EndedAt = endedAt;
        DurationMinutes = Math.Max(1, (int)(endedAt - startedAt).TotalMinutes);
        Notes = notes?.Trim();
    }
}
