namespace LifeTracker.Domain.Academics;

public record GraphValidationResult(
    bool IsValid, 
    string? ErrorMessage = null, 
    IReadOnlyList<string>? CyclePath = null);

public record MissingPrerequisiteInfo(
    Guid RequiredSubjectId,
    string RequiredSubjectCode,
    string RequiredSubjectName,
    PrerequisiteRequirementType RequirementType,
    SubjectStatus? CurrentStatus = null);

public record SubjectEligibilityResult(
    Guid SubjectId,
    string SubjectCode,
    string SubjectName,
    int YearLevel,
    int PeriodNumber,
    CurriculumSubjectStatus Status,
    IReadOnlyList<MissingPrerequisiteInfo> MissingPrerequisites);

public record SubjectRecommendation(
    Guid SubjectId,
    string Code,
    string Name,
    int YearLevel,
    int PeriodNumber,
    double PriorityScore,
    int CriticalPathDepth,
    int UnlockedFutureSubjectsCount,
    string RecommendationBadge,
    string Justification);

public record CareerRecommendationResult(
    Guid CareerPlanId,
    int TotalEligibleSubjects,
    int SuggestedQuota,
    IReadOnlyList<SubjectRecommendation> Recommendations,
    IReadOnlyList<SubjectRecommendation> OtherEligibleSubjects,
    IReadOnlyList<SubjectEligibilityResult> BlockedSubjects);

public interface ICareerPrerequisiteEngine
{
    GraphValidationResult ValidateAcyclicGraph(
        IReadOnlyCollection<CurriculumSubject> subjects,
        IReadOnlyCollection<CurriculumPrerequisite> prerequisites);

    IReadOnlyList<SubjectEligibilityResult> EvaluateEligibility(
        IReadOnlyCollection<CurriculumSubject> subjects,
        IReadOnlyCollection<CurriculumPrerequisite> prerequisites,
        IReadOnlyDictionary<Guid, SubjectStatus> studentSubjectStatuses);

    CareerRecommendationResult GenerateNextTermRecommendations(
        CareerPlan plan,
        IReadOnlyCollection<CurriculumPrerequisite> prerequisites,
        IReadOnlyDictionary<Guid, SubjectStatus> studentSubjectStatuses,
        int quotaLimit = 4);
}
