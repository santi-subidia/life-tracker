using LifeTracker.Domain.Common;

namespace LifeTracker.Domain.Academics;

public class CareerPlan : BaseEntity
{
    public Guid UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? University { get; private set; }
    public int TotalSubjects { get; private set; }
    public int? TotalCredits { get; private set; }
    public bool IsActive { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    private readonly List<CurriculumSubject> _subjects = new();
    public IReadOnlyCollection<CurriculumSubject> Subjects => _subjects.AsReadOnly();

    private CareerPlan() { }

    public CareerPlan(
        Guid userId, 
        string name, 
        string? university = null, 
        int? totalCredits = null, 
        bool isActive = false)
    {
        if (userId == Guid.Empty) 
            throw new ArgumentException("El ID de usuario no puede estar vacío.", nameof(userId));
        if (string.IsNullOrWhiteSpace(name)) 
            throw new ArgumentException("El nombre del plan no puede estar vacío.", nameof(name));

        UserId = userId;
        Name = name.Trim();
        University = university?.Trim();
        TotalCredits = totalCredits;
        IsActive = isActive;
        TotalSubjects = 0;
        CreatedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateDetails(string name, string? university, int? totalCredits)
    {
        if (string.IsNullOrWhiteSpace(name)) 
            throw new ArgumentException("El nombre del plan no puede estar vacío.", nameof(name));

        Name = name.Trim();
        University = university?.Trim();
        TotalCredits = totalCredits;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetActive(bool isActive)
    {
        IsActive = isActive;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateTotalSubjectsCount(int count)
    {
        TotalSubjects = Math.Max(0, count);
        UpdatedAt = DateTime.UtcNow;
    }

    public void AddSubject(CurriculumSubject subject)
    {
        ArgumentNullException.ThrowIfNull(subject);
        _subjects.Add(subject);
    }
}
