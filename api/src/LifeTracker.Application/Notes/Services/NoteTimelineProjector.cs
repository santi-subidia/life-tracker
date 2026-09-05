using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Domain.Notes;
using LifeTracker.Domain.Timeline;

namespace LifeTracker.Application.Notes.Services;

public class NoteTimelineProjector : INoteTimelineProjector
{
    private readonly ILifeTrackerDbContext _context;

    public NoteTimelineProjector(ILifeTrackerDbContext context)
    {
        _context = context;
    }

    public async Task ProjectNoteCreatedAsync(Guid userId, Note note, CancellationToken cancellationToken = default)
    {
        // Regla 1: Nunca proyectar stubs al timeline
        if (note.IsStub)
            return;

        // Regla 2: Idempotencia - verificar si ya existe un item de timeline para esta nota
        var exists = await _context.TimelineItems
            .AnyAsync(t => t.UserId == userId && t.SourceModule == "notes" && t.SourceId == note.Id, cancellationToken);

        if (exists)
            return;

        // Resumen de hasta 140 caracteres
        var summary = string.IsNullOrWhiteSpace(note.Content)
            ? null
            : (note.Content.Length <= 140 ? note.Content : note.Content[..140] + "...");

        summary = summary?.Replace("\r", " ").Replace("\n", " ").Trim();

        var metadata = JsonSerializer.Serialize(new
        {
            slug = note.Slug,
            tags = note.Tags
        });

        var timelineItem = new TimelineItem(
            userId: userId,
            date: DateOnly.FromDateTime(note.CreatedAt),
            sourceModule: "notes",
            sourceId: note.Id,
            eventType: "note_created",
            title: $"Nota creada: {note.Title}",
            summary: summary,
            metadataJson: metadata,
            pinned: note.Pinned);

        _context.TimelineItems.Add(timelineItem);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task RemoveNoteProjectionAsync(Guid userId, Guid noteId, CancellationToken cancellationToken = default)
    {
        var items = await _context.TimelineItems
            .Where(t => t.UserId == userId && t.SourceModule == "notes" && t.SourceId == noteId)
            .ToListAsync(cancellationToken);

        if (items.Count > 0)
        {
            _context.TimelineItems.RemoveRange(items);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
