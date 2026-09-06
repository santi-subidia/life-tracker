using LifeTracker.Domain.Common;

namespace LifeTracker.Domain.Academics;

public class AcademicSubject : BaseEntity
{
    public Guid UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Code { get; private set; }
    public string Term { get; private set; } = string.Empty;
    public string? Professor { get; private set; }
    public SubjectStatus Status { get; private set; } = SubjectStatus.EnCurso;
    public string? Color { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    private AcademicSubject() { }

    public AcademicSubject(
        Guid userId,
        string name,
        string term,
        string? code = null,
        string? professor = null,
        SubjectStatus status = SubjectStatus.EnCurso,
        string? color = null)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("El ID de usuario no puede estar vacío.", nameof(userId));

        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("El nombre de la materia no puede estar vacío.", nameof(name));

        if (string.IsNullOrWhiteSpace(term))
            throw new ArgumentException("El período lectivo no puede estar vacío.", nameof(term));

        UserId = userId;
        Name = name.Trim();
        Term = term.Trim();
        Code = code?.Trim();
        Professor = professor?.Trim();
        Status = status;
        Color = color?.Trim();
        UpdatedAt = DateTime.UtcNow;
    }

    public void Update(string name, string? code, string term, string? professor, SubjectStatus status, string? color)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("El nombre de la materia no puede estar vacío.", nameof(name));

        if (string.IsNullOrWhiteSpace(term))
            throw new ArgumentException("El período lectivo no puede estar vacío.", nameof(term));

        Name = name.Trim();
        Code = code?.Trim();
        Term = term.Trim();
        Professor = professor?.Trim();
        Status = status;
        Color = color?.Trim();
        UpdatedAt = DateTime.UtcNow;
    }
}
