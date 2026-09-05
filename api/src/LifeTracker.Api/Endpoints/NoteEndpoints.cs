using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using LifeTracker.Application.Notes.Dtos;
using LifeTracker.Application.Notes.Services;

namespace LifeTracker.Api.Endpoints;

public static class NoteEndpoints
{
    public static RouteGroupBuilder MapNoteEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/notes")
            .WithTags("Notas & Segundo Cerebro");

        // 1. Listar notas con filtros de búsqueda, tags, archivadas y stubs
        group.MapGet("/", async (
            [FromQuery] string? search,
            [FromQuery] string? tag,
            [FromQuery] bool? includeArchived,
            [FromQuery] bool? includeStubs,
            [FromServices] INoteService noteService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var notes = await noteService.GetNotesAsync(
                userId,
                search,
                tag,
                includeArchived ?? false,
                includeStubs ?? false,
                ct);

            return Results.Ok(notes);
        });

        // 2. Topología de red para vista de Grafo (debe mapearse antes de /{idOrSlug})
        group.MapGet("/graph", async (
            [FromServices] INoteService noteService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var graphData = await noteService.GetGraphDataAsync(userId, ct);
            return Results.Ok(graphData);
        });

        // 3. Autocompletado reactivo de notas para [[ (debe mapearse antes de /{idOrSlug})
        group.MapGet("/autocomplete", async (
            [FromQuery] string? query,
            [FromServices] INoteService noteService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var suggestions = await noteService.AutocompleteAsync(userId, query ?? string.Empty, ct);
            return Results.Ok(suggestions);
        });

        // 4. Crear nueva nota y sincronizar wikilinks
        group.MapPost("/", async (
            [FromBody] CreateNoteRequest request,
            [FromServices] INoteService noteService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            try
            {
                var created = await noteService.CreateNoteAsync(userId, request, ct);
                return Results.Created($"/api/notes/{created.Id}", created);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // 5. Obtener detalle de nota por UUID o Slug (incluye OutgoingLinks y Backlinks contextuales)
        group.MapGet("/{idOrSlug}", async (
            string idOrSlug,
            [FromServices] INoteService noteService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var note = await noteService.GetNoteByIdOrSlugAsync(userId, idOrSlug, ct);
            return note is null ? Results.NotFound(new { error = "Nota no encontrada." }) : Results.Ok(note);
        });

        // 6. Actualizar contenido de nota y resincronizar enlaces
        group.MapPut("/{id:guid}", async (
            Guid id,
            [FromBody] UpdateNoteRequest request,
            [FromServices] INoteService noteService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            try
            {
                var updated = await noteService.UpdateNoteAsync(userId, id, request, ct);
                return updated is null ? Results.NotFound(new { error = "Nota no encontrada." }) : Results.Ok(updated);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // 7. Archivar (soft delete) o eliminar permanentemente una nota
        group.MapDelete("/{id:guid}", async (
            Guid id,
            [FromQuery] bool? permanent,
            [FromServices] INoteService noteService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var success = await noteService.DeleteNoteAsync(userId, id, permanent ?? false, ct);
            return success ? Results.NoContent() : Results.NotFound(new { error = "Nota no encontrada." });
        });

        return group;
    }

    private static Guid GetUserId(HttpContext context)
    {
        var claim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? context.User.FindFirst("sub")?.Value;

        if (Guid.TryParse(claim, out var jwtUserId))
            return jwtUserId;

        if (context.Request.Headers.TryGetValue("X-User-Id", out var headerValue)
            && Guid.TryParse(headerValue, out var headerUserId))
        {
            return headerUserId;
        }

        return Guid.Parse("00000000-0000-0000-0000-000000000001");
    }
}
