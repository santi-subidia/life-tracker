using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Application.Health.Dtos;
using LifeTracker.Domain.Health;
using LifeTracker.Domain.Timeline;

namespace LifeTracker.Application.Health.Services;

public class HealthService : IHealthService
{
    private readonly ILifeTrackerDbContext _dbContext;
    private readonly IAiExtractorService _aiExtractor;
    private readonly IStorageService _storageService;
    private readonly ILogger<HealthService> _logger;

    public HealthService(
        ILifeTrackerDbContext dbContext,
        IAiExtractorService aiExtractor,
        IStorageService storageService,
        ILogger<HealthService> logger)
    {
        _dbContext = dbContext;
        _aiExtractor = aiExtractor;
        _storageService = storageService;
        _logger = logger;
    }

    public async Task<ExtractedStudyDto> ExtractStudyDataAsync(
        Stream fileStream,
        string mimeType,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Iniciando extracción inteligente con IA para archivo tipo {MimeType}", mimeType);
        return await _aiExtractor.ExtractDataAsync(fileStream, mimeType, cancellationToken);
    }

    public async Task<HealthStudyDto> SaveStudyAsync(
        Guid userId,
        SaveHealthStudyRequest request,
        CancellationToken cancellationToken = default)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("El ID de usuario no puede ser vacío.", nameof(userId));

        // Si se solicitó reemplazar un estudio previo
        if (request.ReplaceStudyId.HasValue && request.ReplaceStudyId.Value != Guid.Empty)
        {
            var existingToReplace = await _dbContext.HealthStudies
                .Include(s => s.ClinicalValues)
                .FirstOrDefaultAsync(s => s.Id == request.ReplaceStudyId.Value && s.UserId == userId, cancellationToken);

            if (existingToReplace != null)
            {
                _dbContext.HealthStudies.Remove(existingToReplace);
                var oldTimeline = await _dbContext.TimelineItems
                    .Where(t => t.UserId == userId && t.SourceId == existingToReplace.Id)
                    .ToListAsync(cancellationToken);
                _dbContext.TimelineItems.RemoveRange(oldTimeline);
                _logger.LogInformation("Reemplazando estudio previo ID {OldStudyId} con nueva versión", existingToReplace.Id);
            }
        }

        var study = new HealthStudy(
            userId,
            request.StudyType,
            request.StudyDate,
            request.FileUrl,
            request.Institution,
            request.Summary,
            request.FileHash
        );

        foreach (var val in request.ClinicalValues)
        {
            study.AddClinicalValue(
                val.MetricName,
                val.Value,
                val.Unit,
                val.Category,
                val.IsAbnormal
            );
        }

        _dbContext.HealthStudies.Add(study);

        // Proyectar automáticamente evento al Spine del Timeline
        var summary = request.Summary ?? $"{request.ClinicalValues.Count} valores clínicos registrados";
        var timelineItem = new TimelineItem(
            userId,
            study.StudyDate,
            "health",
            study.Id,
            "study_saved",
            $"{study.StudyType} ({study.Institution ?? "Laboratorio"})",
            summary
        );
        _dbContext.TimelineItems.Add(timelineItem);

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Estudio médico guardado exitosamente con ID {StudyId} para el usuario {UserId}", study.Id, userId);

        return MapToDto(study);
    }

    public async Task<List<HealthStudyDto>> GetUserStudiesAsync(
        Guid userId,
        int? year = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.HealthStudies
            .Include(s => s.ClinicalValues)
            .Where(s => s.UserId == userId);

        if (year.HasValue)
        {
            query = query.Where(s => s.StudyDate.Year == year.Value);
        }

        var studies = await query
            .OrderByDescending(s => s.StudyDate)
            .ToListAsync(cancellationToken);

        return studies.Select(MapToDto).ToList();
    }

    public async Task<HealthStudyDto?> GetStudyByIdAsync(
        Guid userId,
        Guid studyId,
        CancellationToken cancellationToken = default)
    {
        var study = await _dbContext.HealthStudies
            .Include(s => s.ClinicalValues)
            .FirstOrDefaultAsync(s => s.Id == studyId && s.UserId == userId, cancellationToken);

        return study is null ? null : MapToDto(study);
    }

    public async Task<bool> DeleteStudyAsync(
        Guid userId,
        Guid studyId,
        CancellationToken cancellationToken = default)
    {
        var study = await _dbContext.HealthStudies
            .FirstOrDefaultAsync(s => s.Id == studyId && s.UserId == userId, cancellationToken);

        if (study is null)
            return false;

        _dbContext.HealthStudies.Remove(study);

        // Remover también el timeline item asociado
        var timelineItems = await _dbContext.TimelineItems
            .Where(t => t.UserId == userId && t.SourceModule == "health" && t.SourceId == studyId)
            .ToListAsync(cancellationToken);

        _dbContext.TimelineItems.RemoveRange(timelineItems);

        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<MetricComparisonDto> CompareMetricHistoryAsync(
        Guid userId,
        string metricName,
        CancellationToken cancellationToken = default)
    {
        var normalizedMetric = metricName.Trim().ToLowerInvariant();

        var records = await _dbContext.HealthClinicalValues
            .Include(v => v.Study)
            .Where(v => v.Study.UserId == userId && v.MetricName.ToLower() == normalizedMetric)
            .OrderBy(v => v.Study.StudyDate)
            .ToListAsync(cancellationToken);

        var dataPoints = records.Select(v =>
        {
            double? numeric = null;
            // Intentar parsear número limpio (soporta puntos y comas)
            var cleanValue = v.Value.Replace(',', '.');
            if (double.TryParse(cleanValue, NumberStyles.Any, CultureInfo.InvariantCulture, out var parsed))
            {
                numeric = parsed;
            }

            return new MetricDataPointDto(
                v.StudyId,
                v.Study.StudyDate,
                v.Study.StudyDate.Year,
                v.Study.StudyType,
                v.Study.Institution,
                v.Value,
                numeric,
                v.Unit,
                v.IsAbnormal
            );
        }).ToList();

        var unit = records.FirstOrDefault(r => !string.IsNullOrEmpty(r.Unit))?.Unit;

        return new MetricComparisonDto(
            metricName,
            unit,
            dataPoints
        );
    }

    public async Task<List<string>> GetAvailableMetricsAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.HealthClinicalValues
            .Where(v => v.Study.UserId == userId)
            .Select(v => v.MetricName)
            .Distinct()
            .OrderBy(m => m)
            .ToListAsync(cancellationToken);
    }

    public async Task<DuplicateStudySummaryDto?> FindExactDuplicateByHashAsync(
        Guid userId,
        string fileHash,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(fileHash))
            return null;

        var normalizedHash = fileHash.Trim().ToLowerInvariant();

        return await _dbContext.HealthStudies
            .AsNoTracking()
            .Where(s => s.UserId == userId && s.FileHash == normalizedHash)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new DuplicateStudySummaryDto(
                s.Id,
                s.StudyType,
                s.StudyDate,
                s.Institution,
                s.FileUrl,
                s.CreatedAt
            ))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<DuplicateStudySummaryDto?> FindSemanticDuplicateAsync(
        Guid userId,
        string studyType,
        DateOnly studyDate,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(studyType))
            return null;

        var normalizedType = studyType.Trim().ToLowerInvariant();

        // Rango de coincidencia de fecha: +/- 1 día
        var fromDate = studyDate.AddDays(-1);
        var toDate = studyDate.AddDays(1);

        var candidates = await _dbContext.HealthStudies
            .AsNoTracking()
            .Where(s => s.UserId == userId && s.StudyDate >= fromDate && s.StudyDate <= toDate)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync(cancellationToken);

        var match = candidates.FirstOrDefault(s => 
            s.StudyType.Trim().Equals(studyType.Trim(), StringComparison.OrdinalIgnoreCase) ||
            s.StudyType.ToLowerInvariant().Contains(normalizedType) ||
            normalizedType.Contains(s.StudyType.ToLowerInvariant())
        );

        if (match == null)
            return null;

        return new DuplicateStudySummaryDto(
            match.Id,
            match.StudyType,
            match.StudyDate,
            match.Institution,
            match.FileUrl,
            match.CreatedAt
        );
    }

    private static HealthStudyDto MapToDto(HealthStudy study)
    {
        return new HealthStudyDto(
            study.Id,
            study.UserId,
            study.StudyType,
            study.StudyDate,
            study.FileUrl,
            study.Institution,
            study.Summary,
            study.FileHash,
            study.CreatedAt,
            study.ClinicalValues.Select(v => new HealthClinicalValueDto(
                v.Id,
                v.StudyId,
                v.MetricName,
                v.Value,
                v.Unit,
                v.Category,
                v.IsAbnormal
            )).ToList()
        );
    }
}
