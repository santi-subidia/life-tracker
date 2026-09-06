using LifeTracker.Domain.Common;

namespace LifeTracker.Domain.Work;

public class WorkProject : BaseEntity
{
    public Guid UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public WorkProjectStatus Status { get; private set; } = WorkProjectStatus.Active;
    public string? Color { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    private WorkProject() { }

    public WorkProject(
        Guid userId,
        string name,
        string? description = null,
        WorkProjectStatus status = WorkProjectStatus.Active,
        string? color = null)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("El ID de usuario no puede estar vacío.", nameof(userId));

        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("El nombre del proyecto no puede estar vacío.", nameof(name));

        UserId = userId;
        Name = name.Trim();
        Description = description?.Trim();
        Status = status;
        Color = color?.Trim();
        UpdatedAt = DateTime.UtcNow;
    }

    public void Update(string name, string? description, WorkProjectStatus status, string? color)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("El nombre del proyecto no puede estar vacío.", nameof(name));

        Name = name.Trim();
        Description = description?.Trim();
        Status = status;
        Color = color?.Trim();
        UpdatedAt = DateTime.UtcNow;
    }
}
