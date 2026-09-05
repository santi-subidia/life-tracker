using LifeTracker.Domain.Common;

namespace LifeTracker.Domain.Habits;

public class HabitDefinition : BaseEntity
{
    public Guid UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public string Category { get; private set; } = "general";
    public HabitFrequency Frequency { get; private set; } = HabitFrequency.Daily();
    public string? Color { get; private set; }
    public string? Icon { get; private set; }
    public bool IsArchived { get; private set; }

    private readonly List<HabitLog> _logs = [];
    public IReadOnlyCollection<HabitLog> Logs => _logs.AsReadOnly();

    private HabitDefinition() { }

    public HabitDefinition(
        Guid userId,
        string name,
        string? description = null,
        string category = "general",
        HabitFrequency? frequency = null,
        string? color = null,
        string? icon = null)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("El ID de usuario no puede estar vacío.", nameof(userId));

        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("El nombre del hábito no puede estar vacío.", nameof(name));

        UserId = userId;
        Name = name.Trim();
        Description = description?.Trim();
        Category = string.IsNullOrWhiteSpace(category) ? "general" : category.Trim().ToLowerInvariant();
        Frequency = frequency ?? HabitFrequency.Daily();
        Color = color?.Trim();
        Icon = icon?.Trim();
        IsArchived = false;
    }

    public void UpdateDetails(
        string name,
        string? description,
        string category,
        HabitFrequency frequency,
        string? color,
        string? icon)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("El nombre del hábito no puede estar vacío.", nameof(name));

        Name = name.Trim();
        Description = description?.Trim();
        Category = string.IsNullOrWhiteSpace(category) ? "general" : category.Trim().ToLowerInvariant();
        Frequency = frequency;
        Color = color?.Trim();
        Icon = icon?.Trim();
    }

    public void Archive() => IsArchived = true;
    public void Restore() => IsArchived = false;

    public bool IsScheduledFor(DateOnly date) => Frequency.IsScheduledFor(date);
}
