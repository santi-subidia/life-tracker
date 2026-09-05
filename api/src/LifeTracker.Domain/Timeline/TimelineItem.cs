using LifeTracker.Domain.Common;

namespace LifeTracker.Domain.Timeline;

public class TimelineItem : BaseEntity
{
    public Guid UserId { get; private set; }
    public DateOnly Date { get; private set; }
    public DateTime Timestamp { get; private set; } = DateTime.UtcNow;
    public string SourceModule { get; private set; } = string.Empty; // health, habits, academics, work, notes, system
    public Guid SourceId { get; private set; }
    public string EventType { get; private set; } = string.Empty;
    public string Title { get; private set; } = string.Empty;
    public string? Summary { get; private set; }
    public string MetadataJson { get; private set; } = "{}";
    public bool Pinned { get; private set; }

    private TimelineItem() { }

    public TimelineItem(
        Guid userId,
        DateOnly date,
        string sourceModule,
        Guid sourceId,
        string eventType,
        string title,
        string? summary = null,
        string metadataJson = "{}",
        bool pinned = false)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("El ID de usuario no puede estar vacío.", nameof(userId));

        if (string.IsNullOrWhiteSpace(sourceModule))
            throw new ArgumentException("El módulo de origen no puede estar vacío.", nameof(sourceModule));

        if (sourceId == Guid.Empty)
            throw new ArgumentException("El ID de origen no puede estar vacío.", nameof(sourceId));

        if (string.IsNullOrWhiteSpace(eventType))
            throw new ArgumentException("El tipo de evento no puede estar vacío.", nameof(eventType));

        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("El título del evento no puede estar vacío.", nameof(title));

        UserId = userId;
        Date = date;
        Timestamp = DateTime.UtcNow;
        SourceModule = sourceModule.Trim().ToLowerInvariant();
        SourceId = sourceId;
        EventType = eventType.Trim().ToLowerInvariant();
        Title = title.Trim();
        Summary = summary?.Trim();
        MetadataJson = string.IsNullOrWhiteSpace(metadataJson) ? "{}" : metadataJson;
        Pinned = pinned;
    }

    public void TogglePin()
    {
        Pinned = !Pinned;
    }
}
