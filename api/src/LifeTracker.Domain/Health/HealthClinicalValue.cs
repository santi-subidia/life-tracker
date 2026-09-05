using LifeTracker.Domain.Common;

namespace LifeTracker.Domain.Health;

public class HealthClinicalValue : BaseEntity
{
    public Guid StudyId { get; private set; }
    public string MetricName { get; private set; } = string.Empty;
    public string Value { get; private set; } = string.Empty;
    public string? Unit { get; private set; }
    public string? Category { get; private set; }
    public bool IsAbnormal { get; private set; }

    // Navigation property
    public HealthStudy Study { get; private set; } = null!;

    // EF Core Constructor
    private HealthClinicalValue() { }

    public HealthClinicalValue(
        Guid studyId,
        string metricName,
        string value,
        string? unit = null,
        string? category = null,
        bool isAbnormal = false)
    {
        if (string.IsNullOrWhiteSpace(metricName))
            throw new ArgumentException("El nombre de la métrica clínica no puede estar vacío.", nameof(metricName));

        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("El valor clínico no puede estar vacío.", nameof(value));

        StudyId = studyId;
        MetricName = metricName.Trim();
        Value = value.Trim();
        Unit = string.IsNullOrWhiteSpace(unit) ? null : unit.Trim();
        Category = string.IsNullOrWhiteSpace(category) ? null : category.Trim();
        IsAbnormal = isAbnormal;
    }

    public void MarkAsAbnormal(bool isAbnormal)
    {
        IsAbnormal = isAbnormal;
    }
}
