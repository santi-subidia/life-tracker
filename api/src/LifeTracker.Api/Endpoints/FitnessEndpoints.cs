using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using LifeTracker.Application.Fitness.Dtos;
using LifeTracker.Application.Fitness.Services;

namespace LifeTracker.Api.Endpoints;

public static class FitnessEndpoints
{
    public static RouteGroupBuilder MapFitnessEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/fitness")
            .WithTags("Entrenamientos y Actividad Física");

        #region Ejercicios

        group.MapGet("/exercises", async (
            [FromQuery] string? search,
            [FromQuery] string? muscle,
            [FromQuery] string? discipline,
            [FromQuery] string? equipment,
            [FromServices] IFitnessService fitnessService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var exercises = await fitnessService.GetExercisesAsync(userId, search, muscle, discipline, equipment, ct);
            return Results.Ok(exercises);
        });

        group.MapGet("/exercises/{id:guid}", async (
            Guid id,
            [FromServices] IFitnessService fitnessService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var exercise = await fitnessService.GetExerciseByIdAsync(userId, id, ct);
            return exercise != null ? Results.Ok(exercise) : Results.NotFound(new { error = "Ejercicio no encontrado." });
        });

        group.MapPost("/exercises", async (
            [FromBody] CreateCustomExerciseRequest request,
            [FromServices] IFitnessService fitnessService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            try
            {
                var userId = GetUserId(httpContext);
                var created = await fitnessService.CreateCustomExerciseAsync(userId, request, ct);
                return Results.Created($"/api/fitness/exercises/{created.Id}", created);
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapPut("/exercises/{id:guid}", async (
            Guid id,
            [FromBody] UpdateCustomExerciseRequest request,
            [FromServices] IFitnessService fitnessService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            try
            {
                var userId = GetUserId(httpContext);
                var updated = await fitnessService.UpdateCustomExerciseAsync(userId, id, request, ct);
                return Results.Ok(updated);
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound(new { error = "Ejercicio no encontrado." });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapDelete("/exercises/{id:guid}", async (
            Guid id,
            [FromServices] IFitnessService fitnessService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            try
            {
                var userId = GetUserId(httpContext);
                await fitnessService.DeleteCustomExerciseAsync(userId, id, ct);
                return Results.NoContent();
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound(new { error = "Ejercicio no encontrado." });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapGet("/exercises/{exerciseNameOrId}/history", async (
            string exerciseNameOrId,
            [FromQuery] int? limit,
            [FromServices] IFitnessService fitnessService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var history = await fitnessService.GetExerciseHistoryAsync(userId, exerciseNameOrId, limit ?? 10, ct);
            return Results.Ok(history);
        });

        #endregion

        #region Rutinas

        group.MapGet("/routines", async (
            [FromServices] IFitnessService fitnessService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var routines = await fitnessService.GetRoutinesAsync(userId, ct);
            return Results.Ok(routines);
        });

        group.MapGet("/routines/{id:guid}", async (
            Guid id,
            [FromServices] IFitnessService fitnessService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var routine = await fitnessService.GetRoutineByIdAsync(userId, id, ct);
            return routine != null ? Results.Ok(routine) : Results.NotFound(new { error = "Rutina no encontrada." });
        });

        group.MapPost("/routines", async (
            [FromBody] CreateRoutineRequest request,
            [FromServices] IFitnessService fitnessService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            try
            {
                var userId = GetUserId(httpContext);
                var created = await fitnessService.CreateRoutineAsync(userId, request, ct);
                return Results.Created($"/api/fitness/routines/{created.Id}", created);
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapPut("/routines/{id:guid}", async (
            Guid id,
            [FromBody] UpdateRoutineRequest request,
            [FromServices] IFitnessService fitnessService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            try
            {
                var userId = GetUserId(httpContext);
                var updated = await fitnessService.UpdateRoutineAsync(userId, id, request, ct);
                return Results.Ok(updated);
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound(new { error = "Rutina no encontrada." });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapDelete("/routines/{id:guid}", async (
            Guid id,
            [FromServices] IFitnessService fitnessService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            try
            {
                var userId = GetUserId(httpContext);
                await fitnessService.ArchiveRoutineAsync(userId, id, ct);
                return Results.NoContent();
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound(new { error = "Rutina no encontrada." });
            }
        });

        #endregion

        #region Sesiones de Entrenamiento

        group.MapGet("/sessions/active", async (
            [FromServices] IFitnessService fitnessService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var activeSession = await fitnessService.GetActiveSessionAsync(userId, ct);
            return activeSession != null ? Results.Ok(activeSession) : Results.NotFound(new { error = "No hay sesión activa." });
        });

        group.MapPost("/sessions/start", async (
            [FromBody] StartWorkoutSessionRequest request,
            [FromServices] IFitnessService fitnessService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            try
            {
                var userId = GetUserId(httpContext);
                var session = await fitnessService.StartWorkoutSessionAsync(userId, request, ct);
                return Results.Created($"/api/fitness/sessions/{session.Id}", session);
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapPost("/sessions/{sessionId:guid}/sets", async (
            Guid sessionId,
            [FromBody] LogWorkoutSetRequest request,
            [FromServices] IFitnessService fitnessService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            try
            {
                var userId = GetUserId(httpContext);
                var set = await fitnessService.LogWorkoutSetAsync(userId, sessionId, request, ct);
                return Results.Ok(set);
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound(new { error = "Sesión no encontrada." });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapPut("/sessions/{sessionId:guid}/sets/{setId:guid}", async (
            Guid sessionId,
            Guid setId,
            [FromBody] UpdateWorkoutSetRequest request,
            [FromServices] IFitnessService fitnessService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            try
            {
                var userId = GetUserId(httpContext);
                var set = await fitnessService.UpdateWorkoutSetAsync(userId, sessionId, setId, request, ct);
                return Results.Ok(set);
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound(new { error = "Sesión o serie no encontrada." });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapDelete("/sessions/{sessionId:guid}/sets/{setId:guid}", async (
            Guid sessionId,
            Guid setId,
            [FromServices] IFitnessService fitnessService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            try
            {
                var userId = GetUserId(httpContext);
                await fitnessService.DeleteWorkoutSetAsync(userId, sessionId, setId, ct);
                return Results.NoContent();
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound(new { error = "Sesión o serie no encontrada." });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapPost("/sessions/{sessionId:guid}/complete", async (
            Guid sessionId,
            [FromBody] CompleteWorkoutSessionRequest request,
            [FromServices] IFitnessService fitnessService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            try
            {
                var userId = GetUserId(httpContext);
                var completed = await fitnessService.CompleteWorkoutSessionAsync(userId, sessionId, request, ct);
                return Results.Ok(completed);
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound(new { error = "Sesión no encontrada." });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapPost("/sessions/{sessionId:guid}/discard", async (
            Guid sessionId,
            [FromServices] IFitnessService fitnessService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            try
            {
                var userId = GetUserId(httpContext);
                await fitnessService.DiscardWorkoutSessionAsync(userId, sessionId, ct);
                return Results.NoContent();
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound(new { error = "Sesión no encontrada." });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapGet("/sessions/history", async (
            [FromQuery] int? limit,
            [FromServices] IFitnessService fitnessService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var history = await fitnessService.GetWorkoutSessionsHistoryAsync(userId, limit ?? 20, ct);
            return Results.Ok(history);
        });

        group.MapGet("/sessions/{sessionId:guid}", async (
            Guid sessionId,
            [FromServices] IFitnessService fitnessService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var session = await fitnessService.GetWorkoutSessionByIdAsync(userId, sessionId, ct);
            return session != null ? Results.Ok(session) : Results.NotFound(new { error = "Sesión no encontrada." });
        });

        #endregion

        return group;
    }

    private static Guid GetUserId(HttpContext context) => EndpointAuthHelper.GetUserId(context);
}
