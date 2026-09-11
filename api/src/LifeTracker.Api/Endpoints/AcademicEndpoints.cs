using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using LifeTracker.Application.Academics.Dtos;
using LifeTracker.Application.Academics.Services;

namespace LifeTracker.Api.Endpoints;

public static class AcademicEndpoints
{
    public static RouteGroupBuilder MapAcademicEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/academics")
            .WithTags("Academia & Materias");

        // --- Materias ---
        group.MapGet("/subjects", async (
            [FromQuery] string? term,
            [FromServices] IAcademicService academicService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var subjects = await academicService.GetSubjectsAsync(userId, term, ct);
            return Results.Ok(subjects);
        });

        group.MapGet("/subjects/{id:guid}", async (
            Guid id,
            [FromServices] IAcademicService academicService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var subject = await academicService.GetSubjectDetailAsync(userId, id, ct);
            return subject != null ? Results.Ok(subject) : Results.NotFound(new { error = "Materia no encontrada." });
        });

        group.MapPost("/subjects", async (
            [FromBody] CreateAcademicSubjectRequest request,
            [FromServices] IAcademicService academicService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var subject = await academicService.CreateSubjectAsync(userId, request, ct);
            return Results.Created($"/api/academics/subjects/{subject.Id}", subject);
        });

        group.MapPut("/subjects/{id:guid}", async (
            Guid id,
            [FromBody] UpdateAcademicSubjectRequest request,
            [FromServices] IAcademicService academicService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var updated = await academicService.UpdateSubjectAsync(userId, id, request, ct);
            return updated != null ? Results.Ok(updated) : Results.NotFound(new { error = "Materia no encontrada." });
        });

        group.MapDelete("/subjects/{id:guid}", async (
            Guid id,
            [FromServices] IAcademicService academicService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var success = await academicService.DeleteSubjectAsync(userId, id, ct);
            return success ? Results.NoContent() : Results.NotFound(new { error = "Materia no encontrada." });
        });

        // --- Hitos Evaluativos ---
        group.MapPost("/milestones", async (
            [FromBody] CreateAcademicMilestoneRequest request,
            [FromServices] IAcademicService academicService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            try
            {
                var userId = GetUserId(httpContext);
                var milestone = await academicService.CreateMilestoneAsync(userId, request, ct);
                return Results.Created($"/api/academics/milestones/{milestone.Id}", milestone);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapPut("/milestones/{id:guid}", async (
            Guid id,
            [FromBody] UpdateAcademicMilestoneRequest request,
            [FromServices] IAcademicService academicService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            try
            {
                var userId = GetUserId(httpContext);
                var updated = await academicService.UpdateMilestoneAsync(userId, id, request, ct);
                return updated != null ? Results.Ok(updated) : Results.NotFound(new { error = "Hito no encontrado." });
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapPatch("/milestones/{id:guid}/grade", async (
            Guid id,
            [FromBody] AssignGradeRequest request,
            [FromServices] IAcademicService academicService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            try
            {
                var userId = GetUserId(httpContext);
                var updated = await academicService.AssignGradeAsync(userId, id, request, ct);
                return updated != null ? Results.Ok(updated) : Results.NotFound(new { error = "Hito no encontrado." });
            }
            catch (ArgumentOutOfRangeException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapDelete("/milestones/{id:guid}", async (
            Guid id,
            [FromServices] IAcademicService academicService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var success = await academicService.DeleteMilestoneAsync(userId, id, ct);
            return success ? Results.NoContent() : Results.NotFound(new { error = "Hito no encontrado." });
        });

        // --- Métricas Académicas ---
        group.MapGet("/metrics", async (
            [FromServices] IAcademicService academicService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var metrics = await academicService.GetMetricsAsync(userId, ct);
            return Results.Ok(metrics);
        });

        return group;
    }

    private static Guid GetUserId(HttpContext context) => EndpointAuthHelper.GetUserId(context);
}
