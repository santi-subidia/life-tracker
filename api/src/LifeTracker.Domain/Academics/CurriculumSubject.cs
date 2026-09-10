using LifeTracker.Domain.Common;

namespace LifeTracker.Domain.Academics;

public class CurriculumSubject : BaseEntity
{
    public Guid CareerPlanId { get; private set; }
    public Guid UserId { get; private set; }
    public string? Code { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public int YearLevel { get; private set; }
    public int PeriodNumber { get; private set; }
    public int? Credits { get; private set; }
    public bool IsOptional { get; private set; }
    public int OrderIndex { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    private readonly List<CurriculumPrerequisite> _prerequisites = new();
    public IReadOnlyCollection<CurriculumPrerequisite> Prerequisites => _prerequisites.AsReadOnly();

    private CurriculumSubject() { }

    public CurriculumSubject(
        Guid careerPlanId,
        Guid userId,
        string name,
        int yearLevel,
        int periodNumber,
        string? code = null,
        int? credits = null,
        bool isOptional = false,
        int orderIndex = 0)
    {
        if (careerPlanId == Guid.Empty) 
            throw new ArgumentException("El plan de carrera es requerido.", nameof(careerPlanId));
        if (userId == Guid.Empty) 
            throw new ArgumentException("El usuario es requerido.", nameof(userId));
        if (string.IsNullOrWhiteSpace(name)) 
            throw new ArgumentException("El nombre de la materia es requerido.", nameof(name));
        if (yearLevel < 1 || yearLevel > 10) 
            throw new ArgumentOutOfRangeException(nameof(yearLevel), "El nivel del año debe situarse entre 1 y 10.");
        if (periodNumber < 1 || periodNumber > 4) 
            throw new ArgumentOutOfRangeException(nameof(periodNumber), "El período cuatrimestral debe situarse entre 1 y 4.");

        CareerPlanId = careerPlanId;
        UserId = userId;
        Name = name.Trim();
        Code = code?.Trim();
        YearLevel = yearLevel;
        PeriodNumber = periodNumber;
        Credits = credits;
        IsOptional = isOptional;
        OrderIndex = orderIndex;
        CreatedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Update(
        string name, 
        string? code, 
        int yearLevel, 
        int periodNumber, 
        int? credits, 
        bool isOptional, 
        int orderIndex)
    {
        if (string.IsNullOrWhiteSpace(name)) 
            throw new ArgumentException("El nombre de la materia es requerido.", nameof(name));
        if (yearLevel < 1 || yearLevel > 10) 
            throw new ArgumentOutOfRangeException(nameof(yearLevel), "El año debe estar entre 1 y 10.");
        if (periodNumber < 1 || periodNumber > 4) 
            throw new ArgumentOutOfRangeException(nameof(periodNumber), "El período debe estar entre 1 y 4.");

        Name = name.Trim();
        Code = code?.Trim();
        YearLevel = yearLevel;
        PeriodNumber = periodNumber;
        Credits = credits;
        IsOptional = isOptional;
        OrderIndex = orderIndex;
        UpdatedAt = DateTime.UtcNow;
    }

    public void AddPrerequisite(CurriculumPrerequisite prerequisite)
    {
        ArgumentNullException.ThrowIfNull(prerequisite);
        _prerequisites.Add(prerequisite);
    }
}
