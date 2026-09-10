namespace LifeTracker.Application.Academics.Dtos;

public record ExtractedPrerequisiteDraftDto(
    string RequiredSubjectCode,
    string RequirementType // "requiere_regularizada" | "requiere_aprobada"
);

public record ExtractedSubjectDraftDto(
    string TempId,
    string? Code,
    string Name,
    int YearLevel,
    int PeriodNumber,
    int? Credits,
    bool IsOptional,
    List<ExtractedPrerequisiteDraftDto> Prerequisites
);

public record CareerPlanDraftDto(
    string SuggestedPlanName,
    string? SuggestedUniversity,
    int? TotalCredits,
    List<ExtractedSubjectDraftDto> Subjects,
    double ExtractionConfidence,
    List<string> Warnings
);

public record CareerPlanSummaryDto(
    Guid Id,
    string Name,
    string? University,
    int TotalSubjects,
    int? TotalCredits,
    bool IsActive,
    int ApprovedSubjectsCount,
    int RegularizedSubjectsCount,
    int InProgressSubjectsCount,
    double ProgressPercentage,
    DateTime CreatedAt
);

public record CurriculumPrerequisiteItemDto(
    Guid PrerequisiteId,
    Guid RequiredSubjectId,
    string? RequiredSubjectCode,
    string RequiredSubjectName,
    string RequirementType,
    bool IsSatisfied
);

public record CurriculumSubjectItemDto(
    Guid Id,
    string? Code,
    string Name,
    int YearLevel,
    int PeriodNumber,
    int? Credits,
    bool IsOptional,
    int OrderIndex,
    string Status, // "bloqueada" | "habilitada" | "en_curso" | "regularizada" | "aprobada"
    Guid? LinkedAcademicSubjectId,
    List<CurriculumPrerequisiteItemDto> Prerequisites
);

public record CareerPlanDetailDto(
    Guid Id,
    string Name,
    string? University,
    int TotalSubjects,
    int? TotalCredits,
    bool IsActive,
    double ProgressPercentage,
    List<CurriculumSubjectItemDto> Subjects
);

public record CreateCurriculumPrerequisiteRequest(
    string RequiredCodeOrTempId,
    string RequirementType
);

public record CreateCurriculumSubjectRequest(
    string? TempId,
    string? Code,
    string Name,
    int YearLevel,
    int PeriodNumber,
    int? Credits,
    bool IsOptional,
    int OrderIndex,
    List<CreateCurriculumPrerequisiteRequest> Prerequisites
);

public record CreateCareerPlanRequest(
    string Name,
    string? University,
    int? TotalCredits,
    bool IsActive,
    List<CreateCurriculumSubjectRequest> Subjects
);

public record EnrollSuggestedSubjectsRequest(
    string Term,
    List<Guid> CurriculumSubjectIds
);
