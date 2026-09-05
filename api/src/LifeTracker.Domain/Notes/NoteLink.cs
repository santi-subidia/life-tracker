using LifeTracker.Domain.Common;

namespace LifeTracker.Domain.Notes;

public class NoteLink : BaseEntity
{
    public Guid UserId { get; private set; }
    public Guid SourceNoteId { get; private set; }
    public Guid TargetNoteId { get; private set; }
    public string? LinkText { get; private set; }

    private NoteLink() { }

    public NoteLink(Guid userId, Guid sourceNoteId, Guid targetNoteId, string? linkText = null)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("El ID de usuario no puede estar vacío.", nameof(userId));

        if (sourceNoteId == Guid.Empty)
            throw new ArgumentException("El ID de nota origen no puede estar vacío.", nameof(sourceNoteId));

        if (targetNoteId == Guid.Empty)
            throw new ArgumentException("El ID de nota destino no puede estar vacío.", nameof(targetNoteId));

        UserId = userId;
        SourceNoteId = sourceNoteId;
        TargetNoteId = targetNoteId;
        LinkText = string.IsNullOrWhiteSpace(linkText) ? null : linkText.Trim();
    }
}
