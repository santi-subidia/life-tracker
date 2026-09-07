using LifeTracker.Domain.Common;

namespace LifeTracker.Domain.Health;

public class HealthStudy : BaseEntity
{
    public Guid UserId { get; private set; }
    public string StudyType { get; private set; } = string.Empty;
    public DateOnly StudyDate { get; private set; }
    public string FileUrl { get; private set; } = string.Empty;
    public string? Institution { get; private set; }
    public string? Summary { get; private set; }
    public string? FileHash { get; private set; }

    private readonly List<HealthClinicalValue> _clinicalValues = [];
    public IReadOnlyCollection<HealthClinicalValue> ClinicalValues => _clinicalValues.AsReadOnly();

    // EF Core Constructor
    private HealthStudy() { }

    public HealthStudy(
        Guid userId,
        string studyType,
        DateOnly studyDate,
        string fileUrl,
        string? institution = null,
        string? summary = null,
        string? fileHash = null)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("El ID de usuario no puede ser vacío.", nameof(userId));

        if (string.IsNullOrWhiteSpace(studyType))
            throw new ArgumentException("El tipo de estudio no puede estar vacío.", nameof(studyType));

        if (string.IsNullOrWhiteSpace(fileUrl))
            throw new ArgumentException("La URL del archivo no puede estar vacía.", nameof(fileUrl));

        UserId = userId;
        StudyType = studyType.Trim();
        StudyDate = studyDate;
        FileUrl = fileUrl.Trim();
        Institution = string.IsNullOrWhiteSpace(institution) ? null : institution.Trim();
        Summary = string.IsNullOrWhiteSpace(summary) ? null : summary.Trim();
        FileHash = string.IsNullOrWhiteSpace(fileHash) ? null : fileHash.Trim().ToLowerInvariant();
    }

    public HealthClinicalValue AddClinicalValue(
        string metricName,
        string value,
        string? unit = null,
        string? category = null,
        bool isAbnormal = false)
    {
        var clinicalValue = new HealthClinicalValue(Id, metricName, value, unit, category, isAbnormal);
        _clinicalValues.Add(clinicalValue);
        return clinicalValue;
    }

    public void UpdateMetadata(string studyType, DateOnly studyDate, string? institution, string? summary)
    {
        if (string.IsNullOrWhiteSpace(studyType))
            throw new ArgumentException("El tipo de estudio no puede estar vacío.", nameof(studyType));

        StudyType = studyType.Trim();
        StudyDate = studyDate;
        Institution = string.IsNullOrWhiteSpace(institution) ? null : institution.Trim();
        Summary = string.IsNullOrWhiteSpace(summary) ? null : summary.Trim();
    }

    public void UpdateFileHash(string fileHash)
    {
        FileHash = string.IsNullOrWhiteSpace(fileHash) ? null : fileHash.Trim().ToLowerInvariant();
    }
}
