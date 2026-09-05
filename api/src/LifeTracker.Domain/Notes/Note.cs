using LifeTracker.Domain.Common;

namespace LifeTracker.Domain.Notes;

public class Note : BaseEntity
{
    public Guid UserId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string Slug { get; private set; } = string.Empty;
    public string Content { get; private set; } = string.Empty;
    public List<string> Tags { get; private set; } = [];
    public bool Pinned { get; private set; }
    public bool IsStub { get; private set; }
    public bool IsArchived { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    private Note() { }

    public Note(
        Guid userId,
        string title,
        string slug,
        string content,
        List<string>? tags = null,
        bool pinned = false)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("El ID de usuario no puede estar vacío.", nameof(userId));

        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("El título de la nota no puede estar vacío.", nameof(title));

        if (string.IsNullOrWhiteSpace(slug))
            throw new ArgumentException("El slug de la nota no puede estar vacío.", nameof(slug));

        UserId = userId;
        Title = title.Trim();
        Slug = slug.Trim();
        Content = content ?? string.Empty;
        Tags = tags != null ? [.. tags] : [];
        Pinned = pinned;
        IsStub = false;
        IsArchived = false;
        UpdatedAt = DateTime.UtcNow;
    }

    public static Note CreateStub(Guid userId, string title, string slug)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("El ID de usuario no puede estar vacío.", nameof(userId));

        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("El título de la nota no puede estar vacío.", nameof(title));

        if (string.IsNullOrWhiteSpace(slug))
            throw new ArgumentException("El slug de la nota no puede estar vacío.", nameof(slug));

        var note = new Note
        {
            UserId = userId,
            Title = title.Trim(),
            Slug = slug.Trim(),
            Content = string.Empty,
            Tags = [],
            Pinned = false,
            IsStub = true,
            IsArchived = false,
            UpdatedAt = DateTime.UtcNow
        };

        return note;
    }

    public void UpdateContent(string title, string slug, string content, List<string>? tags, bool pinned)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("El título de la nota no puede estar vacío.", nameof(title));

        if (string.IsNullOrWhiteSpace(slug))
            throw new ArgumentException("El slug de la nota no puede estar vacío.", nameof(slug));

        Title = title.Trim();
        Slug = slug.Trim();
        Content = content ?? string.Empty;
        Tags = tags != null ? [.. tags] : [];
        Pinned = pinned;
        IsStub = false;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Archive()
    {
        IsArchived = true;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Unarchive()
    {
        IsArchived = false;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetPinned(bool pinned)
    {
        Pinned = pinned;
        UpdatedAt = DateTime.UtcNow;
    }
}
