using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using LifeTracker.Application.Academics.Dtos;
using LifeTracker.Application.Academics.Services;

namespace LifeTracker.Api.Endpoints;

public static class CareerPlanEndpoints
{
    public static RouteGroupBuilder MapCareerPlanEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/academics/career-plans")
            .RequireAuthorization()
            .WithTags("CareerPlans");

        // 1. Extraer borrador efímero con IA (Human-in-the-Loop)
        group.MapPost("/extract", async (
            IFormFile? file,
            [FromServices] ICareerPlanService careerPlanService,
            CancellationToken ct) =>
        {
            if (file == null || file.Length == 0)
            {
                return Results.BadRequest(new { error = "No se ha proporcionado ningún archivo para procesar." });
            }

            if (file.Length > 10 * 1024 * 1024)
            {
                return Results.BadRequest(new { error = "El archivo supera el límite máximo permitido de 10 MB." });
            }

            var allowedMimes = new[] { "application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp" };
            if (!allowedMimes.Contains(file.ContentType.ToLowerInvariant()))
            {
                return Results.BadRequest(new { error = "Formato no compatible. Suba un documento PDF o imagen PNG, JPEG o WebP." });
            }

            using var stream = file.OpenReadStream();
            var draft = await careerPlanService.ExtractDraftFromDocumentAsync(stream, file.ContentType, ct);
            return Results.Ok(draft);
        }).DisableAntiforgery();

        // 2. Crear plan de carrera validado con verificación DAG
        group.MapPost("/", async (
            [FromBody] CreateCareerPlanRequest request,
            [FromServices] ICareerPlanService careerPlanService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            try
            {
                var userId = GetUserId(httpContext);
                var created = await careerPlanService.CreatePlanAsync(userId, request, ct);
                return Results.Created($"/api/academics/career-plans/{created.Id}", created);
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

        // 3. Listar todos los planes del usuario
        group.MapGet("/", async (
            [FromServices] ICareerPlanService careerPlanService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var plans = await careerPlanService.GetUserPlansAsync(userId, ct);
            return Results.Ok(plans);
        });

        // 4. Obtener el plan activo actual
        group.MapGet("/active", async (
            [FromServices] ICareerPlanService careerPlanService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var active = await careerPlanService.GetActivePlanAsync(userId, ct);
            return active != null
                ? Results.Ok(active)
                : Results.NotFound(new { error = "No hay ningún plan de carrera activo." });
        });

        // 5. Detalle de un plan de carrera específico
        group.MapGet("/{id:guid}", async (
            Guid id,
            [FromServices] ICareerPlanService careerPlanService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var plan = await careerPlanService.GetPlanDetailAsync(userId, id, ct);
            return plan != null
                ? Results.Ok(plan)
                : Results.NotFound(new { error = "Plan de carrera no encontrado." });
        });

        // 6. Activar plan exclusivamente
        group.MapPatch("/{id:guid}/set-active", async (
            Guid id,
            [FromServices] ICareerPlanService careerPlanService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var success = await careerPlanService.SetActivePlanAsync(userId, id, ct);
            return success
                ? Results.Ok(new { message = "Plan activado correctamente." })
                : Results.NotFound(new { error = "Plan de carrera no encontrado." });
        });

        // 7. Recomendaciones del siguiente cuatrimestre con cupo
        group.MapGet("/{id:guid}/recommendations", async (
            Guid id,
            [FromQuery] int? quota,
            [FromServices] ICareerPlanService careerPlanService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            try
            {
                var userId = GetUserId(httpContext);
                var recommendations = await careerPlanService.GetRecommendationsAsync(userId, id, quota ?? 4, ct);
                return Results.Ok(recommendations);
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // 8. Inscripción rápida en lote a cuatrimestre
        group.MapPost("/{id:guid}/enroll-suggested", async (
            Guid id,
            [FromBody] EnrollSuggestedSubjectsRequest request,
            [FromServices] ICareerPlanService careerPlanService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            try
            {
                var userId = GetUserId(httpContext);
                var enrolled = await careerPlanService.EnrollSuggestedSubjectsAsync(userId, id, request, ct);
                return Results.Ok(enrolled);
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // 9. Eliminar plan de carrera
        group.MapDelete("/{id:guid}", async (
            Guid id,
            [FromServices] ICareerPlanService careerPlanService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var success = await careerPlanService.DeletePlanAsync(userId, id, ct);
            return success
                ? Results.NoContent()
                : Results.NotFound(new { error = "Plan de carrera no encontrado." });
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
