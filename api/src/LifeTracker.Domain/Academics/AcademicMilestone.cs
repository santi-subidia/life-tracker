using LifeTracker.Domain.Common;

namespace LifeTracker.Domain.Academics;

public class AcademicMilestone : BaseEntity
{
    public Guid SubjectId { get; private set; }
    public Guid UserId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public MilestoneType MilestoneType { get; private set; } = MilestoneType.Parcial;
    public DateOnly DueDate { get; private set; }
    public decimal? Grade { get; private set; }
    public decimal? WeightPercentage { get; private set; }
    public MilestoneStatus Status { get; private set; } = MilestoneStatus.Pendiente;
    public Guid? ReplacesMilestoneId { get; private set; }
    public string? Notes { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    private AcademicMilestone() { }

    public AcademicMilestone(
        Guid userId,
        Guid subjectId,
        string title,
        MilestoneType milestoneType,
        DateOnly dueDate,
        decimal? weightPercentage = null,
        Guid? replacesMilestoneId = null,
        string? notes = null)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("El ID de usuario no puede estar vacío.", nameof(userId));

        if (subjectId == Guid.Empty)
            throw new ArgumentException("El ID de materia no puede estar vacío.", nameof(subjectId));

        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("El título del hito no puede estar vacío.", nameof(title));

        if (weightPercentage.HasValue && (weightPercentage.Value < 0 || weightPercentage.Value > 100))
            throw new ArgumentOutOfRangeException(nameof(weightPercentage), "El porcentaje debe estar entre 0 y 100.");

        UserId = userId;
        SubjectId = subjectId;
        Title = title.Trim();
        MilestoneType = milestoneType;
        DueDate = dueDate;
        WeightPercentage = weightPercentage;
        ReplacesMilestoneId = replacesMilestoneId;
        Notes = notes?.Trim();
        Status = MilestoneStatus.Pendiente;
        UpdatedAt = DateTime.UtcNow;
    }

    public void AssignGrade(decimal grade, string? notes = null)
    {
        if (grade < 0 || grade > 10)
            throw new ArgumentOutOfRangeException(nameof(grade), "La calificación debe estar entre 0 y 10.");

        Grade = grade;
        Status = grade >= 4.0m ? MilestoneStatus.Aprobado : MilestoneStatus.Reprobado;
        if (notes != null)
            Notes = notes.Trim();

        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateDetails(
        string title,
        MilestoneType milestoneType,
        DateOnly dueDate,
        decimal? weightPercentage,
        Guid? replacesMilestoneId,
        string? notes)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("El título del hito no puede estar vacío.", nameof(title));

        if (weightPercentage.HasValue && (weightPercentage.Value < 0 || weightPercentage.Value > 100))
            throw new ArgumentOutOfRangeException(nameof(weightPercentage), "El porcentaje debe estar entre 0 y 100.");

        Title = title.Trim();
        MilestoneType = milestoneType;
        DueDate = dueDate;
        WeightPercentage = weightPercentage;
        ReplacesMilestoneId = replacesMilestoneId;
        Notes = notes?.Trim();
        UpdatedAt = DateTime.UtcNow;
    }
}
