using LifeTracker.Application.Notes.Dtos;

namespace LifeTracker.Application.Notes.Services;

public interface INoteService
{
    Task<List<NoteListItemDto>> GetNotesAsync(Guid userId, string? search, string? tag, bool includeArchived, bool includeStubs, CancellationToken ct = default);
    Task<NoteDetailDto?> GetNoteByIdOrSlugAsync(Guid userId, string idOrSlug, CancellationToken ct = default);
    Task<NoteDetailDto> CreateNoteAsync(Guid userId, CreateNoteRequest request, CancellationToken ct = default);
    Task<NoteDetailDto?> UpdateNoteAsync(Guid userId, Guid noteId, UpdateNoteRequest request, CancellationToken ct = default);
    Task<bool> DeleteNoteAsync(Guid userId, Guid noteId, bool permanent = false, CancellationToken ct = default);
    Task<GraphDataDto> GetGraphDataAsync(Guid userId, CancellationToken ct = default);
    Task<List<NoteAutocompleteDto>> AutocompleteAsync(Guid userId, string query, CancellationToken ct = default);
}
