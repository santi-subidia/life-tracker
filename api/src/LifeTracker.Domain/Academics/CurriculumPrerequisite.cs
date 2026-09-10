using LifeTracker.Domain.Common;

namespace LifeTracker.Domain.Academics;

public class CurriculumPrerequisite : BaseEntity
{
    public Guid CareerPlanId { get; private set; }
    public Guid UserId { get; private set; }
    public Guid SubjectId { get; private set; }
    public Guid RequiredSubjectId { get; private set; }
    public PrerequisiteRequirementType RequirementType { get; private set; }

    private CurriculumPrerequisite() { }

    public CurriculumPrerequisite(
        Guid careerPlanId,
        Guid userId,
        Guid subjectId,
        Guid requiredSubjectId,
        PrerequisiteRequirementType requirementType)
    {
        if (careerPlanId == Guid.Empty) 
            throw new ArgumentException("El ID del plan no puede estar vacío.", nameof(careerPlanId));
        if (userId == Guid.Empty) 
            throw new ArgumentException("El ID de usuario no puede estar vacío.", nameof(userId));
        if (subjectId == Guid.Empty) 
            throw new ArgumentException("El ID de la materia no puede estar vacío.", nameof(subjectId));
        if (requiredSubjectId == Guid.Empty) 
            throw new ArgumentException("El ID de la correlativa no puede estar vacío.", nameof(requiredSubjectId));
        if (subjectId == requiredSubjectId) 
            throw new InvalidOperationException("Una materia no puede tenerse a sí misma como correlativa.");

        CareerPlanId = careerPlanId;
        UserId = userId;
        SubjectId = subjectId;
        RequiredSubjectId = requiredSubjectId;
        RequirementType = requirementType;
        CreatedAt = DateTime.UtcNow;
    }
}
