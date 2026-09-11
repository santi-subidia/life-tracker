using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using LifeTracker.Application.Habits.Dtos;
using LifeTracker.Application.Habits.Services;

namespace LifeTracker.Api.Endpoints;

public static class HabitEndpoints
{
    public static RouteGroupBuilder MapHabitEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/habits")
            .WithTags("Hábitos & Rutinas");

        // 1. Listar hábitos del usuario
        group.MapGet("/", async (
            [FromQuery] bool? includeArchived,
            [FromServices] IHabitService habitService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var habits = await habitService.GetHabitsAsync(userId, includeArchived ?? false, ct);
            return Results.Ok(habits);
        });

        // 2. Crear nuevo hábito
        group.MapPost("/", async (
            [FromBody] CreateHabitRequest request,
            [FromServices] IHabitService habitService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var created = await habitService.CreateHabitAsync(userId, request, ct);
            return Results.Created($"/api/habits/{created.Id}", created);
        });

        // 3. Modificar hábito existente
        group.MapPut("/{id:guid}", async (
            Guid id,
            [FromBody] UpdateHabitRequest request,
            [FromServices] IHabitService habitService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var updated = await habitService.UpdateHabitAsync(userId, id, request, ct);
            return updated is null ? Results.NotFound() : Results.Ok(updated);
        });

        // 4. Archivar hábito
        group.MapDelete("/{id:guid}", async (
            Guid id,
            [FromServices] IHabitService habitService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var success = await habitService.ArchiveHabitAsync(userId, id, ct);
            return success ? Results.NoContent() : Results.NotFound();
        });

        // 5. Toggle de 1 toque de completado/pendiente
        group.MapPost("/{id:guid}/toggle", async (
            Guid id,
            [FromBody] ToggleHabitRequest? request,
            [FromServices] IHabitService habitService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            try
            {
                var result = await habitService.ToggleHabitCompletionAsync(
                    userId, 
                    id, 
                    request ?? new ToggleHabitRequest(null, null), 
                    ct);

                return Results.Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound(new { error = "Hábito no encontrado." });
            }
        });

        return group;
    }

    private static Guid GetUserId(HttpContext context) => EndpointAuthHelper.GetUserId(context);
}
