using Microsoft.EntityFrameworkCore;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Application.Notes.Dtos;
using LifeTracker.Domain.Notes;

namespace LifeTracker.Application.Notes.Services;

public class NoteService : INoteService
{
    private readonly ILifeTrackerDbContext _context;
    private readonly IWikilinkParser _wikilinkParser;
    private readonly INoteTimelineProjector _timelineProjector;

    public NoteService(
        ILifeTrackerDbContext context,
        IWikilinkParser wikilinkParser,
        INoteTimelineProjector timelineProjector)
    {
        _context = context;
        _wikilinkParser = wikilinkParser;
        _timelineProjector = timelineProjector;
    }

    public async Task<List<NoteListItemDto>> GetNotesAsync(
        Guid userId,
        string? search,
        string? tag,
        bool includeArchived,
        bool includeStubs,
        CancellationToken ct = default)
    {
        var query = _context.Notes.AsNoTracking().Where(n => n.UserId == userId);

        if (!includeArchived)
            query = query.Where(n => !n.IsArchived);

        if (!includeStubs)
            query = query.Where(n => !n.IsStub);

        if (!string.IsNullOrWhiteSpace(tag))
        {
            var cleanTag = tag.Trim().ToLowerInvariant();
            query = query.Where(n => n.Tags.Contains(cleanTag));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLowerInvariant();
            query = query.Where(n =>
                n.Title.ToLower().Contains(s) ||
                n.Content.ToLower().Contains(s) ||
                n.Slug.ToLower().Contains(s));
        }

        var notes = await query
            .OrderByDescending(n => n.Pinned)
            .ThenByDescending(n => n.UpdatedAt)
            .ToListAsync(ct);

        var outgoingCounts = await _context.NoteLinks.AsNoTracking()
            .Where(nl => nl.UserId == userId)
            .GroupBy(nl => nl.SourceNoteId)
            .Select(g => new { NoteId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.NoteId, x => x.Count, ct);

        var backlinkCounts = await _context.NoteLinks.AsNoTracking()
            .Where(nl => nl.UserId == userId)
            .GroupBy(nl => nl.TargetNoteId)
            .Select(g => new { NoteId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.NoteId, x => x.Count, ct);

        return notes.Select(n =>
        {
            var snippet = string.IsNullOrWhiteSpace(n.Content)
                ? string.Empty
                : (n.Content.Length <= 120 ? n.Content : n.Content[..120] + "...");
            snippet = snippet.Replace("\r", " ").Replace("\n", " ").Trim();

            return new NoteListItemDto(
                n.Id,
                n.Slug,
                n.Title,
                snippet,
                n.Tags,
                n.Pinned,
                n.IsStub,
                outgoingCounts.GetValueOrDefault(n.Id, 0),
                backlinkCounts.GetValueOrDefault(n.Id, 0),
                n.UpdatedAt);
        }).ToList();
    }

    public async Task<NoteDetailDto?> GetNoteByIdOrSlugAsync(Guid userId, string idOrSlug, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(idOrSlug))
            return null;

        var isGuid = Guid.TryParse(idOrSlug, out var noteId);
        var cleanSlug = idOrSlug.Trim().ToLowerInvariant();

        var note = await _context.Notes.AsNoTracking()
            .FirstOrDefaultAsync(n => n.UserId == userId && (isGuid && n.Id == noteId || n.Slug == cleanSlug), ct);

        if (note == null)
            return null;

        // 1. Enlaces salientes (Outgoing Links)
        var outgoingLinks = await _context.NoteLinks.AsNoTracking()
            .Where(nl => nl.SourceNoteId == note.Id)
            .ToListAsync(ct);

        var targetIds = outgoingLinks.Select(l => l.TargetNoteId).Distinct().ToList();
        var targetNotes = await _context.Notes.AsNoTracking()
            .Where(n => targetIds.Contains(n.Id))
            .ToDictionaryAsync(n => n.Id, ct);

        var outgoingDtos = outgoingLinks
            .Where(l => targetNotes.ContainsKey(l.TargetNoteId))
            .Select(l =>
            {
                var target = targetNotes[l.TargetNoteId];
                return new OutgoingLinkDto(target.Id, target.Slug, target.Title, l.LinkText, target.IsStub);
            })
            .ToList();

        // 2. Enlaces entrantes (Backlinks)
        var backlinkEntities = await _context.NoteLinks.AsNoTracking()
            .Where(nl => nl.TargetNoteId == note.Id)
            .ToListAsync(ct);

        var sourceIds = backlinkEntities.Select(l => l.SourceNoteId).Distinct().ToList();
        var sourceNotes = await _context.Notes.AsNoTracking()
            .Where(n => sourceIds.Contains(n.Id))
            .ToDictionaryAsync(n => n.Id, ct);

        var backlinkDtos = backlinkEntities
            .Where(l => sourceNotes.ContainsKey(l.SourceNoteId))
            .Select(l =>
            {
                var source = sourceNotes[l.SourceNoteId];
                var snippet = ExtractContextSnippet(source.Content, note.Title, l.LinkText);
                return new BacklinkDto(source.Id, source.Slug, source.Title, l.LinkText, snippet);
            })
            .ToList();

        return new NoteDetailDto(
            note.Id,
            note.Slug,
            note.Title,
            note.Content,
            note.Tags,
            note.Pinned,
            note.IsStub,
            note.CreatedAt,
            note.UpdatedAt,
            outgoingDtos,
            backlinkDtos);
    }

    public async Task<NoteDetailDto> CreateNoteAsync(Guid userId, CreateNoteRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ArgumentException("El título de la nota no puede estar vacío.", nameof(request.Title));

        var baseSlug = SlugGenerator.Generate(request.Title);
        var extractedLinks = _wikilinkParser.ExtractLinks(request.Content ?? string.Empty);
        var extractedTags = _wikilinkParser.ExtractTags(request.Content ?? string.Empty);

        // Buscar si existe un stub con el mismo slug para este usuario
        var existingStub = await _context.Notes
            .FirstOrDefaultAsync(n => n.UserId == userId && n.Slug == baseSlug && n.IsStub, ct);

        Note noteToSave;
        if (existingStub != null)
        {
            // Materializar el stub preexistente conservando su Id
            existingStub.UpdateContent(request.Title, baseSlug, request.Content ?? string.Empty, extractedTags.ToList(), request.Pinned);
            noteToSave = existingStub;
        }
        else
        {
            // Asegurar slug único si no era stub
            var finalSlug = baseSlug;
            var counter = 1;
            while (await _context.Notes.AnyAsync(n => n.UserId == userId && n.Slug == finalSlug, ct))
            {
                finalSlug = $"{baseSlug}-{counter++}";
            }

            noteToSave = new Note(userId, request.Title, finalSlug, request.Content ?? string.Empty, extractedTags.ToList(), request.Pinned);
            _context.Notes.Add(noteToSave);
        }

        await _context.SaveChangesAsync(ct);

        // Sincronizar enlaces salientes y crear stubs automáticos para los no existentes
        await SyncLinksAsync(userId, noteToSave, extractedLinks, ct);

        // Proyectar selectivamente al timeline
        await _timelineProjector.ProjectNoteCreatedAsync(userId, noteToSave, ct);

        var result = await GetNoteByIdOrSlugAsync(userId, noteToSave.Id.ToString(), ct);
        return result!;
    }

    public async Task<NoteDetailDto?> UpdateNoteAsync(Guid userId, Guid noteId, UpdateNoteRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ArgumentException("El título de la nota no puede estar vacío.", nameof(request.Title));

        var note = await _context.Notes.FirstOrDefaultAsync(n => n.UserId == userId && n.Id == noteId, ct);
        if (note == null)
            return null;

        var baseSlug = SlugGenerator.Generate(request.Title);
        var newSlug = baseSlug;

        if (newSlug != note.Slug)
        {
            var conflict = await _context.Notes.AnyAsync(n => n.UserId == userId && n.Id != noteId && n.Slug == newSlug, ct);
            if (conflict)
            {
                var counter = 1;
                while (await _context.Notes.AnyAsync(n => n.UserId == userId && n.Id != noteId && n.Slug == $"{baseSlug}-{counter}", ct))
                {
                    counter++;
                }
                newSlug = $"{baseSlug}-{counter}";
            }
        }

        var extractedLinks = _wikilinkParser.ExtractLinks(request.Content ?? string.Empty);
        var extractedTags = _wikilinkParser.ExtractTags(request.Content ?? string.Empty);

        note.UpdateContent(request.Title, newSlug, request.Content ?? string.Empty, extractedTags.ToList(), request.Pinned);

        await _context.SaveChangesAsync(ct);
        await SyncLinksAsync(userId, note, extractedLinks, ct);

        return await GetNoteByIdOrSlugAsync(userId, note.Id.ToString(), ct);
    }

    public async Task<bool> DeleteNoteAsync(Guid userId, Guid noteId, bool permanent = false, CancellationToken ct = default)
    {
        var note = await _context.Notes.FirstOrDefaultAsync(n => n.UserId == userId && n.Id == noteId, ct);
        if (note == null)
            return false;

        if (!permanent)
        {
            note.Archive();
            await _context.SaveChangesAsync(ct);
            return true;
        }

        // Eliminación permanente
        var links = await _context.NoteLinks
            .Where(nl => nl.SourceNoteId == noteId || nl.TargetNoteId == noteId)
            .ToListAsync(ct);

        _context.NoteLinks.RemoveRange(links);
        await _timelineProjector.RemoveNoteProjectionAsync(userId, noteId, ct);
        _context.Notes.Remove(note);

        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<GraphDataDto> GetGraphDataAsync(Guid userId, CancellationToken ct = default)
    {
        var notes = await _context.Notes.AsNoTracking()
            .Where(n => n.UserId == userId && !n.IsArchived)
            .ToListAsync(ct);

        var noteIds = notes.Select(n => n.Id).ToHashSet();

        var links = await _context.NoteLinks.AsNoTracking()
            .Where(nl => nl.UserId == userId && noteIds.Contains(nl.SourceNoteId) && noteIds.Contains(nl.TargetNoteId))
            .ToListAsync(ct);

        var connectionCounts = new Dictionary<Guid, int>();
        foreach (var link in links)
        {
            connectionCounts[link.SourceNoteId] = connectionCounts.GetValueOrDefault(link.SourceNoteId) + 1;
            connectionCounts[link.TargetNoteId] = connectionCounts.GetValueOrDefault(link.TargetNoteId) + 1;
        }

        var nodes = notes.Select(n => new GraphNodeDto(
            n.Id,
            n.Slug,
            n.Title,
            n.IsStub,
            n.Tags,
            connectionCounts.GetValueOrDefault(n.Id, 0)
        )).ToList();

        var edges = links.Select(l => new GraphEdgeDto(
            l.Id,
            l.SourceNoteId,
            l.TargetNoteId,
            l.LinkText
        )).ToList();

        return new GraphDataDto(nodes, edges);
    }

    public async Task<List<NoteAutocompleteDto>> AutocompleteAsync(Guid userId, string query, CancellationToken ct = default)
    {
        var baseQuery = _context.Notes.AsNoTracking()
            .Where(n => n.UserId == userId && !n.IsArchived);

        if (!string.IsNullOrWhiteSpace(query))
        {
            var q = query.Trim().ToLowerInvariant();
            baseQuery = baseQuery.Where(n =>
                n.Title.ToLower().Contains(q) ||
                n.Slug.ToLower().Contains(q) ||
                n.Tags.Contains(q));
        }

        var results = await baseQuery
            .OrderByDescending(n => n.UpdatedAt)
            .Take(10)
            .Select(n => new NoteAutocompleteDto(n.Id, n.Slug, n.Title, n.Tags))
            .ToListAsync(ct);

        return results;
    }

    private async Task SyncLinksAsync(
        Guid userId,
        Note note,
        IReadOnlyList<WikilinkMatch> extractedLinks,
        CancellationToken ct)
    {
        var targetsInfo = new List<(Guid TargetId, string? Alias)>();

        foreach (var link in extractedLinks)
        {
            var targetTitle = link.TargetTitle.Trim();
            var targetSlug = SlugGenerator.Generate(targetTitle);

            var existingTarget = await _context.Notes
                .FirstOrDefaultAsync(n => n.UserId == userId &&
                    (n.Slug == targetSlug || n.Title.ToLower() == targetTitle.ToLower()), ct);

            if (existingTarget == null)
            {
                existingTarget = Note.CreateStub(userId, targetTitle, targetSlug);
                _context.Notes.Add(existingTarget);
                await _context.SaveChangesAsync(ct);
            }

            if (existingTarget.Id != note.Id)
            {
                targetsInfo.Add((existingTarget.Id, link.Alias));
            }
        }

        var existingLinks = await _context.NoteLinks
            .Where(nl => nl.SourceNoteId == note.Id)
            .ToListAsync(ct);

        var targetIdsNeeded = targetsInfo.Select(t => t.TargetId).ToHashSet();

        var linksToRemove = existingLinks.Where(nl => !targetIdsNeeded.Contains(nl.TargetNoteId)).ToList();
        if (linksToRemove.Count > 0)
        {
            _context.NoteLinks.RemoveRange(linksToRemove);
        }

        foreach (var (targetId, alias) in targetsInfo)
        {
            var existing = existingLinks.FirstOrDefault(l => l.TargetNoteId == targetId);
            if (existing == null)
            {
                var newLink = new NoteLink(userId, note.Id, targetId, alias);
                _context.NoteLinks.Add(newLink);
            }
            else if (existing.LinkText != alias)
            {
                _context.NoteLinks.Remove(existing);
                _context.NoteLinks.Add(new NoteLink(userId, note.Id, targetId, alias));
            }
        }

        await _context.SaveChangesAsync(ct);
    }

    private static string ExtractContextSnippet(string content, string targetTitle, string? linkText)
    {
        if (string.IsNullOrWhiteSpace(content))
            return string.Empty;

        var searchTerms = new List<string> { targetTitle };
        if (!string.IsNullOrWhiteSpace(linkText))
            searchTerms.Add(linkText);

        var index = -1;
        var matchLength = 0;

        foreach (var term in searchTerms)
        {
            var idx = content.IndexOf(term, StringComparison.OrdinalIgnoreCase);
            if (idx >= 0)
            {
                index = idx;
                matchLength = term.Length;
                break;
            }
        }

        if (index < 0)
        {
            var snippet = content.Length <= 120 ? content : content[..120] + "...";
            return snippet.Replace("\r", " ").Replace("\n", " ").Trim();
        }

        const int window = 50;
        var start = Math.Max(0, index - window);
        var end = Math.Min(content.Length, index + matchLength + window);

        var segment = content[start..end].Replace("\r", " ").Replace("\n", " ").Trim();

        if (start > 0)
            segment = "..." + segment;
        if (end < content.Length)
            segment += "...";

        return segment;
    }
}
