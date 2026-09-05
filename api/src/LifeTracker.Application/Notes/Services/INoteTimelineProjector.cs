using LifeTracker.Domain.Notes;

namespace LifeTracker.Application.Notes.Services;

public interface INoteTimelineProjector
{
    Task ProjectNoteCreatedAsync(Guid userId, Note note, CancellationToken cancellationToken = default);
    Task RemoveNoteProjectionAsync(Guid userId, Guid noteId, CancellationToken cancellationToken = default);
}
