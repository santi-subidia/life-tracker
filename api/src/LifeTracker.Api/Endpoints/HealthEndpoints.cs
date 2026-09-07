using System.Security.Claims;
using System.Security.Cryptography;
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

        // 1. Extraer datos y subir archivo a R2 para previsualización (con detección de duplicados)
        group.MapPost("/extract", async (
            IFormFile file,
            [FromQuery] bool? force,
            [FromServices] IHealthService healthService,
            [FromServices] IStorageService storageService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            if (file == null || file.Length == 0)
                return Results.BadRequest(new { error = "No se proporcionó ningún archivo o el archivo está vacío." });

            var userId = GetUserId(httpContext);

            try
            {
                // 1. Calcular SHA-256 del archivo
                string fileHash;
                await using (var hashStream = file.OpenReadStream())
                {
                    var hashBytes = await SHA256.HashDataAsync(hashStream, ct);
                    fileHash = Convert.ToHexString(hashBytes).ToLowerInvariant();
                }

                // 2. Comprobar si existe un duplicado físico exacto
                var exactDuplicate = await healthService.FindExactDuplicateByHashAsync(userId, fileHash, ct);
                if (exactDuplicate != null && force != true)
                {
                    var existingDetail = await healthService.GetStudyByIdAsync(userId, exactDuplicate.Id, ct);

                    return Results.Ok(new
                    {
                        fileUrl = exactDuplicate.FileUrl,
                        fileName = file.FileName,
                        fileHash,
                        duplicateStatus = "EXACT_FILE",
                        existingStudy = exactDuplicate,
                        studyType = exactDuplicate.StudyType,
                        studyDate = exactDuplicate.StudyDate,
                        institution = exactDuplicate.Institution,
                        clinicalValues = existingDetail?.ClinicalValues.Select(v => new
                        {
                            metricName = v.MetricName,
                            value = v.Value,
                            unit = v.Unit,
                            category = v.Category,
                            isAbnormal = v.IsAbnormal
                        }) ?? []
                    });
                }

                // 3. Subir a Cloudflare R2
                await using var streamForUpload = file.OpenReadStream();
                var fileUrl = await storageService.UploadFileAsync(
                    userId,
                    streamForUpload,
                    file.FileName,
                    file.ContentType,
                    ct);

                // 4. Extraer con IA Gemini
                await using var streamForAi = file.OpenReadStream();
                var extracted = await healthService.ExtractStudyDataAsync(
                    streamForAi,
                    file.ContentType,
                    ct);

                // 5. Verificar posible duplicado semántico (mismo tipo y fecha +/- 1 día)
                DateOnly.TryParse(extracted.StudyDate, out var parsedStudyDate);
                var studyDateOnly = parsedStudyDate == default ? DateOnly.FromDateTime(DateTime.UtcNow) : parsedStudyDate;

                var semanticDuplicate = await healthService.FindSemanticDuplicateAsync(
                    userId,
                    extracted.StudyType,
                    studyDateOnly,
                    ct);

                var duplicateStatus = semanticDuplicate != null ? "POSSIBLE_DUPLICATE" : "NONE";

                return Results.Ok(new
                {
                    fileUrl,
                    fileName = file.FileName,
                    fileHash,
                    duplicateStatus,
                    existingStudy = semanticDuplicate,
                    studyType = extracted.StudyType,
                    studyDate = extracted.StudyDate,
                    institution = extracted.Institution,
                    clinicalValues = extracted.ClinicalValues
                });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 502);
            }
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

        // 4.1 Descargar o visualizar el archivo físico del estudio (inline PDF)
        group.MapGet("/studies/{id:guid}/file", async (
            Guid id,
            [FromServices] IHealthService healthService,
            [FromServices] IStorageService storageService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var study = await healthService.GetStudyByIdAsync(userId, id, ct);
            if (study is null || string.IsNullOrWhiteSpace(study.FileUrl))
                return Results.NotFound(new { error = "Estudio médico o referencia de archivo no encontrado." });

            var fileResult = await storageService.GetFileStreamAsync(study.FileUrl, ct);
            if (fileResult is null)
            {
                if (httpContext.Request.Headers.Accept.ToString().Contains("text/html"))
                {
                    return Results.Content(
                        "<!DOCTYPE html><html lang='es'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'><title>Archivo No Disponible</title><style>body{background:#0a0a0a;color:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}div{text-align:center;padding:2.5rem;border:1px solid #27272a;border-radius:1.25rem;background:#18181b;max-width:440px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);}h2{color:#f43f5e;font-size:1.25rem;margin:0 0 0.75rem;}p{color:#a1a1aa;font-size:0.875rem;line-height:1.5;margin-bottom:1.5rem;}button{background:#e11d48;color:white;border:none;padding:0.6rem 1.25rem;border-radius:0.75rem;font-size:0.875rem;font-weight:500;cursor:pointer;transition:background 0.2s;}button:hover{background:#be123c;}</style></head><body><div><h2>Archivo Físico No Disponible</h2><p>El PDF de este estudio no se encuentra en el almacenamiento local ni en Cloudflare R2.<br><br>Esto puede suceder si el estudio fue subido antes de habilitar la persistencia local. Los nuevos estudios que subas conservan siempre su copia física.</p><button onclick='window.close()'>Cerrar Ventana</button></div></body></html>",
                        "text/html"
                    );
                }

                return Results.NotFound(new { error = "El archivo físico no se encuentra disponible en almacenamiento local ni en R2." });
            }

            var fileName = Path.GetFileName(study.FileUrl);
            if (string.IsNullOrWhiteSpace(fileName) || !fileName.Contains('.'))
            {
                fileName = $"{study.StudyType.Replace(' ', '_')}_{study.StudyDate:yyyyMMdd}.pdf";
            }

            httpContext.Response.Headers.ContentDisposition = $"inline; filename=\"{fileName}\"";
            return Results.File(fileResult.Value.Stream, fileResult.Value.ContentType, enableRangeProcessing: true);
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
