using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Application.Health.Dtos;
using LifeTracker.Application.Health.Services;

namespace LifeTracker.Api.Endpoints;

public static class HealthEndpoints
{
    public static RouteGroupBuilder MapHealthEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/health")
            .WithTags("Salud & Estudios Médicos");

        // 1. Extraer datos y subir archivo a R2 para previsualización
        group.MapPost("/extract", async (
            IFormFile file,
            [FromServices] IHealthService healthService,
            [FromServices] IStorageService storageService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            if (file == null || file.Length == 0)
                return Results.BadRequest(new { error = "No se proporcionó ningún archivo o el archivo está vacío." });

            var userId = GetUserId(httpContext);

            // Subir a Cloudflare R2
            await using var streamForUpload = file.OpenReadStream();
            var fileUrl = await storageService.UploadFileAsync(
                userId,
                streamForUpload,
                file.FileName,
                file.ContentType,
                ct);

            // Extraer con IA Gemini 2.5 Flash
            await using var streamForAi = file.OpenReadStream();
            var extracted = await healthService.ExtractStudyDataAsync(
                streamForAi,
                file.ContentType,
                ct);

            return Results.Ok(new
            {
                fileUrl,
                fileName = file.FileName,
                studyType = extracted.StudyType,
                studyDate = extracted.StudyDate,
                institution = extracted.Institution,
                clinicalValues = extracted.ClinicalValues
            });
        }).DisableAntiforgery();

        // 2. Guardar estudio confirmado
        group.MapPost("/studies", async (
            [FromBody] SaveHealthStudyRequest request,
            [FromServices] IHealthService healthService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var savedStudy = await healthService.SaveStudyAsync(userId, request, ct);
            return Results.Created($"/api/health/studies/{savedStudy.Id}", savedStudy);
        });

        // 3. Listar estudios del usuario (con filtro opcional por año)
        group.MapGet("/studies", async (
            [FromQuery] int? year,
            [FromServices] IHealthService healthService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var studies = await healthService.GetUserStudiesAsync(userId, year, ct);
            return Results.Ok(studies);
        });

        // 4. Obtener detalle de estudio específico
        group.MapGet("/studies/{id:guid}", async (
            Guid id,
            [FromServices] IHealthService healthService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var study = await healthService.GetStudyByIdAsync(userId, id, ct);
            return study is null ? Results.NotFound(new { error = "Estudio médico no encontrado." }) : Results.Ok(study);
        });

        // 5. Eliminar estudio
        group.MapDelete("/studies/{id:guid}", async (
            Guid id,
            [FromServices] IHealthService healthService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var deleted = await healthService.DeleteStudyAsync(userId, id, ct);
            return deleted ? Results.NoContent() : Results.NotFound(new { error = "Estudio no encontrado." });
        });

        // 6. Obtener lista de métricas disponibles para comparar
        group.MapGet("/metrics", async (
            [FromServices] IHealthService healthService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var metrics = await healthService.GetAvailableMetricsAsync(userId, ct);
            return Results.Ok(metrics);
        });

        // 7. Comparación histórica multianual de una métrica
        group.MapGet("/metrics/compare", async (
            [FromQuery] string name,
            [FromServices] IHealthService healthService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(name))
                return Results.BadRequest(new { error = "Debe proporcionar el parámetro 'name' para comparar la métrica." });

            var userId = GetUserId(httpContext);
            var comparison = await healthService.CompareMetricHistoryAsync(userId, name, ct);
            return Results.Ok(comparison);
        });

        return group;
    }

    private static Guid GetUserId(HttpContext context)
    {
        // 1. Intentar desde JWT claim "sub" (Supabase Auth)
        var claim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? context.User.FindFirst("sub")?.Value;

        if (Guid.TryParse(claim, out var jwtUserId))
            return jwtUserId;

        // 2. Fallback para desarrollo / pruebas locales vía header X-User-Id
        if (context.Request.Headers.TryGetValue("X-User-Id", out var headerValue) 
            && Guid.TryParse(headerValue, out var headerUserId))
        {
            return headerUserId;
        }

        // 3. Demo default user para pruebas iniciales
        return Guid.Parse("00000000-0000-0000-0000-000000000001");
    }
}
