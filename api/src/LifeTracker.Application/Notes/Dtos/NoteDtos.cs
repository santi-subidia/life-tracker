namespace LifeTracker.Application.Notes.Dtos;

public record NoteListItemDto(
    Guid Id,
    string Slug,
    string Title,
    string Snippet,
    List<string> Tags,
    bool Pinned,
    bool IsStub,
    int OutgoingLinksCount,
    int BacklinksCount,
    DateTime UpdatedAt);

public record OutgoingLinkDto(
    Guid TargetNoteId,
    string TargetSlug,
    string TargetTitle,
    string? Alias,
    bool IsStub);

public record BacklinkDto(
    Guid SourceNoteId,
    string SourceSlug,
    string SourceTitle,
    string? LinkText,
    string ContextSnippet);

public record NoteDetailDto(
    Guid Id,
    string Slug,
    string Title,
    string Content,
    List<string> Tags,
    bool Pinned,
    bool IsStub,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<OutgoingLinkDto> OutgoingLinks,
    List<BacklinkDto> Backlinks);

public record CreateNoteRequest(
    string Title,
    string Content,
    bool Pinned = false);

public record UpdateNoteRequest(
    string Title,
    string Content,
    bool Pinned = false);

public record GraphNodeDto(
    Guid Id,
    string Slug,
    string Title,
    bool IsStub,
    List<string> Tags,
    int ConnectionsCount);

public record GraphEdgeDto(
    Guid Id,
    Guid Source,
    Guid Target,
    string? Label);

public record GraphDataDto(
    List<GraphNodeDto> Nodes,
    List<GraphEdgeDto> Edges);

public record NoteAutocompleteDto(
    Guid Id,
    string Slug,
    string Title,
    List<string> Tags);
