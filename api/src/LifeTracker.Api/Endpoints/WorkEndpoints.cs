using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using LifeTracker.Application.Work.Dtos;
using LifeTracker.Application.Work.Services;

namespace LifeTracker.Api.Endpoints;

public static class WorkEndpoints
{
    public static RouteGroupBuilder MapWorkEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/work")
            .WithTags("Trabajo & Deep Work");

        // --- Proyectos ---
        group.MapGet("/projects", async (
            [FromServices] IWorkService workService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var projects = await workService.GetProjectsAsync(userId, ct);
            return Results.Ok(projects);
        });

        group.MapPost("/projects", async (
            [FromBody] CreateWorkProjectRequest request,
            [FromServices] IWorkService workService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var project = await workService.CreateProjectAsync(userId, request, ct);
            return Results.Created($"/api/work/projects/{project.Id}", project);
        });

        group.MapPut("/projects/{id:guid}", async (
            Guid id,
            [FromBody] UpdateWorkProjectRequest request,
            [FromServices] IWorkService workService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var updated = await workService.UpdateProjectAsync(userId, id, request, ct);
            return updated != null ? Results.Ok(updated) : Results.NotFound(new { error = "Proyecto no encontrado." });
        });

        group.MapDelete("/projects/{id:guid}", async (
            Guid id,
            [FromServices] IWorkService workService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var success = await workService.DeleteProjectAsync(userId, id, ct);
            return success ? Results.NoContent() : Results.NotFound(new { error = "Proyecto no encontrado." });
        });

        // --- Tareas ---
        group.MapGet("/tasks", async (
            [FromQuery] Guid? projectId,
            [FromQuery] string? status,
            [FromServices] IWorkService workService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var tasks = await workService.GetTasksAsync(userId, projectId, status, ct);
            return Results.Ok(tasks);
        });

        group.MapPost("/tasks", async (
            [FromBody] CreateWorkTaskRequest request,
            [FromServices] IWorkService workService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var task = await workService.CreateTaskAsync(userId, request, ct);
            return Results.Created($"/api/work/tasks/{task.Id}", task);
        });

        group.MapPut("/tasks/{id:guid}", async (
            Guid id,
            [FromBody] UpdateWorkTaskRequest request,
            [FromServices] IWorkService workService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var updated = await workService.UpdateTaskAsync(userId, id, request, ct);
            return updated != null ? Results.Ok(updated) : Results.NotFound(new { error = "Tarea no encontrada." });
        });

        group.MapPatch("/tasks/{id:guid}/move", async (
            Guid id,
            [FromBody] MoveWorkTaskRequest request,
            [FromServices] IWorkService workService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var moved = await workService.MoveTaskAsync(userId, id, request, ct);
            return moved != null ? Results.Ok(moved) : Results.NotFound(new { error = "Tarea no encontrada." });
        });

        group.MapDelete("/tasks/{id:guid}", async (
            Guid id,
            [FromServices] IWorkService workService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var success = await workService.DeleteTaskAsync(userId, id, ct);
            return success ? Results.NoContent() : Results.NotFound(new { error = "Tarea no encontrada." });
        });

        // --- Sesiones de Deep Work ---
        group.MapPost("/sessions", async (
            [FromBody] RecordWorkSessionRequest request,
            [FromServices] IWorkService workService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var session = await workService.RecordSessionAsync(userId, request, ct);
            return Results.Created($"/api/work/sessions/{session.Id}", session);
        });

        group.MapGet("/sessions", async (
            [FromQuery] int? limit,
            [FromServices] IWorkService workService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var sessions = await workService.GetSessionsAsync(userId, limit ?? 20, ct);
            return Results.Ok(sessions);
        });

        // --- Métricas Semanales ---
        group.MapGet("/metrics", async (
            [FromServices] IWorkService workService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var metrics = await workService.GetMetricsAsync(userId, ct);
            return Results.Ok(metrics);
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
