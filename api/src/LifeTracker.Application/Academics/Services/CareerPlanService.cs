using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using LifeTracker.Application.Academics.Dtos;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Domain.Academics;

namespace LifeTracker.Application.Academics.Services;

public class CareerPlanService : ICareerPlanService
{
    private readonly ILifeTrackerDbContext _context;
    private readonly ICareerPrerequisiteEngine _prerequisiteEngine;
    private readonly IAiCareerPlanExtractor _aiExtractor;
    private readonly ILogger<CareerPlanService> _logger;

    public CareerPlanService(
        ILifeTrackerDbContext context,
        ICareerPrerequisiteEngine prerequisiteEngine,
        IAiCareerPlanExtractor aiExtractor,
        ILogger<CareerPlanService> logger)
    {
        _context = context;
        _prerequisiteEngine = prerequisiteEngine;
        _aiExtractor = aiExtractor;
        _logger = logger;
    }

    public async Task<CareerPlanDraftDto> ExtractDraftFromDocumentAsync(
        Stream stream,
        string mimeType,
        CancellationToken cancellationToken = default)
    {
        return await _aiExtractor.ExtractCurriculumPlanAsync(stream, mimeType, cancellationToken);
    }

    public async Task<CareerPlanSummaryDto> CreatePlanAsync(
        Guid userId,
        CreateCareerPlanRequest request,
        CancellationToken cancellationToken = default)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("El ID del usuario es requerido.", nameof(userId));

        if (string.IsNullOrWhiteSpace(request.Name))
            throw new ArgumentException("El nombre del plan no puede estar vacío.", nameof(request.Name));

        if (request.Subjects == null || request.Subjects.Count == 0)
            throw new ArgumentException("El plan debe contener al menos una materia.", nameof(request.Subjects));

        // Determinar activación atómica
        bool isActive = request.IsActive;
        if (isActive)
        {
            var activePlans = await _context.CareerPlans
                .Where(p => p.UserId == userId && p.IsActive)
                .ToListAsync(cancellationToken);

            foreach (var existing in activePlans)
            {
                existing.SetActive(false);
            }
        }
        else
        {
            bool hasAnyPlan = await _context.CareerPlans
                .AnyAsync(p => p.UserId == userId, cancellationToken);

            if (!hasAnyPlan)
            {
                isActive = true;
            }
        }

        var plan = new CareerPlan(
            userId,
            request.Name,
            request.University,
            request.TotalCredits,
            isActive);

        // Crear materias de dominio en memoria
        var identifierMap = new Dictionary<string, Guid>(StringComparer.OrdinalIgnoreCase);
        var domainSubjects = new List<CurriculumSubject>();

        for (int i = 0; i < request.Subjects.Count; i++)
        {
            var s = request.Subjects[i];
            var subject = new CurriculumSubject(
                plan.Id,
                userId,
                s.Name,
                s.YearLevel,
                s.PeriodNumber,
                s.Code,
                s.Credits,
                s.IsOptional,
                s.OrderIndex != 0 ? s.OrderIndex : i + 1);

            domainSubjects.Add(subject);

            if (!string.IsNullOrWhiteSpace(s.TempId))
            {
                identifierMap[s.TempId.Trim()] = subject.Id;
            }

            if (!string.IsNullOrWhiteSpace(s.Code))
            {
                identifierMap[s.Code.Trim()] = subject.Id;
            }

            identifierMap[s.Name.Trim()] = subject.Id;
        }

        // Crear correlatividades de dominio
        var domainPrerequisites = new List<CurriculumPrerequisite>();
        var registeredEdges = new HashSet<(Guid, Guid)>();

        for (int i = 0; i < request.Subjects.Count; i++)
        {
            var s = request.Subjects[i];
            var subject = domainSubjects[i];

            if (s.Prerequisites == null) continue;

            foreach (var prereq in s.Prerequisites)
            {
                if (string.IsNullOrWhiteSpace(prereq.RequiredCodeOrTempId)) continue;

                var trimmedKey = prereq.RequiredCodeOrTempId.Trim();
                if (!identifierMap.TryGetValue(trimmedKey, out var requiredSubjectId))
                {
                    throw new InvalidOperationException(
                        $"La correlativa requerida '{trimmedKey}' de la materia '{subject.Name}' no existe en el plan curricular.");
                }

                if (subject.Id == requiredSubjectId)
                {
                    throw new InvalidOperationException(
                        $"La materia '{subject.Name}' no puede tenerse a sí misma como correlativa requerida.");
                }

                if (registeredEdges.Add((subject.Id, requiredSubjectId)))
                {
                    var reqType = ParseRequirementType(prereq.RequirementType);
                    var domainPrereq = new CurriculumPrerequisite(
                        plan.Id,
                        userId,
                        subject.Id,
                        requiredSubjectId,
                        reqType);

                    domainPrerequisites.Add(domainPrereq);
                    subject.AddPrerequisite(domainPrereq);
                }
            }
        }

        // Validar aciclicidad matemática (DAG) con Kahn + DFS
        var validation = _prerequisiteEngine.ValidateAcyclicGraph(domainSubjects, domainPrerequisites);
        if (!validation.IsValid)
        {
            throw new InvalidOperationException(
                validation.ErrorMessage ?? "Se detectó una dependencia circular cíclica en las materias del plan.");
        }

        plan.UpdateTotalSubjectsCount(domainSubjects.Count);
        foreach (var s in domainSubjects)
        {
            plan.AddSubject(s);
        }

        _context.CareerPlans.Add(plan);
        _context.CurriculumSubjects.AddRange(domainSubjects);
        _context.CurriculumPrerequisites.AddRange(domainPrerequisites);

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Plan de carrera '{PlanName}' (Id: {PlanId}) creado exitosamente para el usuario {UserId}.",
            plan.Name, plan.Id, userId);

        return new CareerPlanSummaryDto(
            plan.Id,
            plan.Name,
            plan.University,
            plan.TotalSubjects,
            plan.TotalCredits,
            plan.IsActive,
            0,
            0,
            0,
            0.0,
            plan.CreatedAt);
    }

    public async Task<IReadOnlyList<CareerPlanSummaryDto>> GetUserPlansAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var plans = await _context.CareerPlans
            .AsNoTracking()
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.IsActive)
            .ThenByDescending(p => p.CreatedAt)
            .ToListAsync(cancellationToken);

        if (plans.Count == 0)
        {
            return Array.Empty<CareerPlanSummaryDto>();
        }

        var planIds = plans.Select(p => p.Id).ToList();
        var allCurriculumSubjects = await _context.CurriculumSubjects
            .AsNoTracking()
            .Where(s => s.UserId == userId && planIds.Contains(s.CareerPlanId))
            .ToListAsync(cancellationToken);

        var academicSubjects = await _context.AcademicSubjects
            .AsNoTracking()
            .Where(s => s.UserId == userId)
            .ToListAsync(cancellationToken);

        var subjectsByPlan = allCurriculumSubjects
            .GroupBy(s => s.CareerPlanId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var result = new List<CareerPlanSummaryDto>();

        foreach (var plan in plans)
        {
            subjectsByPlan.TryGetValue(plan.Id, out var planSubjects);
            planSubjects ??= [];

            int approved = 0;
            int regularized = 0;
            int inProgress = 0;

            foreach (var subject in planSubjects)
            {
                var matched = MatchAcademicSubject(subject, academicSubjects);
                if (matched != null)
                {
                    if (matched.Status == SubjectStatus.Aprobada) approved++;
                    else if (matched.Status == SubjectStatus.Regularizada) regularized++;
                    else if (matched.Status == SubjectStatus.EnCurso) inProgress++;
                }
            }

            double progress = plan.TotalSubjects > 0
                ? Math.Round((double)approved / plan.TotalSubjects * 100.0, 1)
                : 0.0;

            result.Add(new CareerPlanSummaryDto(
                plan.Id,
                plan.Name,
                plan.University,
                plan.TotalSubjects,
                plan.TotalCredits,
                plan.IsActive,
                approved,
                regularized,
                inProgress,
                progress,
                plan.CreatedAt));
        }

        return result;
    }

    public async Task<CareerPlanDetailDto?> GetPlanDetailAsync(
        Guid userId,
        Guid planId,
        CancellationToken cancellationToken = default)
    {
        var plan = await _context.CareerPlans
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == planId && p.UserId == userId, cancellationToken);

        if (plan == null) return null;

        var subjects = await _context.CurriculumSubjects
            .AsNoTracking()
            .Where(s => s.CareerPlanId == planId && s.UserId == userId)
            .OrderBy(s => s.YearLevel)
            .ThenBy(s => s.PeriodNumber)
            .ThenBy(s => s.OrderIndex)
            .ToListAsync(cancellationToken);

        var prerequisites = await _context.CurriculumPrerequisites
            .AsNoTracking()
            .Where(p => p.CareerPlanId == planId && p.UserId == userId)
            .ToListAsync(cancellationToken);

        var academicSubjects = await _context.AcademicSubjects
            .AsNoTracking()
            .Where(s => s.UserId == userId)
            .ToListAsync(cancellationToken);

        // Mapear el estado del estudiante para cada materia
        var studentStatuses = new Dictionary<Guid, SubjectStatus>();
        var academicMatchMap = new Dictionary<Guid, AcademicSubject>();

        foreach (var subject in subjects)
        {
            var match = MatchAcademicSubject(subject, academicSubjects);
            if (match != null)
            {
                studentStatuses[subject.Id] = match.Status;
                academicMatchMap[subject.Id] = match;
            }
        }

        // Evaluar elegibilidad en el motor de correlatividades
        var eligibilityResults = _prerequisiteEngine.EvaluateEligibility(subjects, prerequisites, studentStatuses)
            .ToDictionary(e => e.SubjectId);

        var subjectMap = subjects.ToDictionary(s => s.Id);
        var prereqsBySubject = prerequisites
            .GroupBy(p => p.SubjectId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var subjectDtos = new List<CurriculumSubjectItemDto>();
        int approvedCount = 0;

        foreach (var subject in subjects)
        {
            eligibilityResults.TryGetValue(subject.Id, out var eligibility);
            var statusStr = eligibility != null
                ? FormatCurriculumSubjectStatus(eligibility.Status)
                : "bloqueada";

            if (eligibility?.Status == CurriculumSubjectStatus.Aprobada)
            {
                approvedCount++;
            }

            academicMatchMap.TryGetValue(subject.Id, out var linkedAcademic);

            var prereqDtos = new List<CurriculumPrerequisiteItemDto>();
            if (prereqsBySubject.TryGetValue(subject.Id, out var prereqList))
            {
                foreach (var prereq in prereqList)
                {
                    subjectMap.TryGetValue(prereq.RequiredSubjectId, out var requiredSubject);
                    studentStatuses.TryGetValue(prereq.RequiredSubjectId, out var reqStatus);

                    bool isSatisfied = prereq.RequirementType switch
                    {
                        PrerequisiteRequirementType.RequiereRegularizada =>
                            reqStatus == SubjectStatus.Regularizada || reqStatus == SubjectStatus.Aprobada,
                        PrerequisiteRequirementType.RequiereAprobada =>
                            reqStatus == SubjectStatus.Aprobada,
                        _ => false
                    };

                    prereqDtos.Add(new CurriculumPrerequisiteItemDto(
                        prereq.Id,
                        prereq.RequiredSubjectId,
                        requiredSubject?.Code,
                        requiredSubject?.Name ?? "Materia requerida",
                        prereq.RequirementType == PrerequisiteRequirementType.RequiereAprobada
                            ? "requiere_aprobada"
                            : "requiere_regularizada",
                        isSatisfied));
                }
            }

            subjectDtos.Add(new CurriculumSubjectItemDto(
                subject.Id,
                subject.Code,
                subject.Name,
                subject.YearLevel,
                subject.PeriodNumber,
                subject.Credits,
                subject.IsOptional,
                subject.OrderIndex,
                statusStr,
                linkedAcademic?.Id,
                prereqDtos));
        }

        double progress = plan.TotalSubjects > 0
            ? Math.Round((double)approvedCount / plan.TotalSubjects * 100.0, 1)
            : 0.0;

        return new CareerPlanDetailDto(
            plan.Id,
            plan.Name,
            plan.University,
            plan.TotalSubjects,
            plan.TotalCredits,
            plan.IsActive,
            progress,
            subjectDtos);
    }

    public async Task<CareerPlanDetailDto?> GetActivePlanAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var activePlan = await _context.CareerPlans
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId && p.IsActive, cancellationToken);

        activePlan ??= await _context.CareerPlans
            .AsNoTracking()
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (activePlan == null) return null;

        return await GetPlanDetailAsync(userId, activePlan.Id, cancellationToken);
    }

    public async Task<bool> SetActivePlanAsync(
        Guid userId,
        Guid planId,
        CancellationToken cancellationToken = default)
    {
        var target = await _context.CareerPlans
            .FirstOrDefaultAsync(p => p.Id == planId && p.UserId == userId, cancellationToken);

        if (target == null) return false;

        var allPlans = await _context.CareerPlans
            .Where(p => p.UserId == userId)
            .ToListAsync(cancellationToken);

        foreach (var p in allPlans)
        {
            p.SetActive(p.Id == planId);
        }

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Plan {PlanId} activado exclusivamente para el usuario {UserId}.", planId, userId);
        return true;
    }

    public async Task<CareerRecommendationResult> GetRecommendationsAsync(
        Guid userId,
        Guid planId,
        int quota = 4,
        CancellationToken cancellationToken = default)
    {
        var plan = await _context.CareerPlans
            .FirstOrDefaultAsync(p => p.Id == planId && p.UserId == userId, cancellationToken);

        if (plan == null)
        {
            throw new KeyNotFoundException($"El plan de carrera con ID '{planId}' no fue encontrado.");
        }

        var subjects = await _context.CurriculumSubjects
            .Where(s => s.CareerPlanId == planId && s.UserId == userId)
            .OrderBy(s => s.YearLevel)
            .ThenBy(s => s.PeriodNumber)
            .ThenBy(s => s.OrderIndex)
            .ToListAsync(cancellationToken);

        // Asegurar que las materias estén en plan.Subjects
        foreach (var s in subjects)
        {
            if (!plan.Subjects.Any(x => x.Id == s.Id))
            {
                plan.AddSubject(s);
            }
        }

        var prerequisites = await _context.CurriculumPrerequisites
            .AsNoTracking()
            .Where(p => p.CareerPlanId == planId && p.UserId == userId)
            .ToListAsync(cancellationToken);

        var academicSubjects = await _context.AcademicSubjects
            .AsNoTracking()
            .Where(s => s.UserId == userId)
            .ToListAsync(cancellationToken);

        var studentStatuses = new Dictionary<Guid, SubjectStatus>();
        foreach (var subject in subjects)
        {
            var match = MatchAcademicSubject(subject, academicSubjects);
            if (match != null)
            {
                studentStatuses[subject.Id] = match.Status;
            }
        }

        return _prerequisiteEngine.GenerateNextTermRecommendations(
            plan,
            prerequisites,
            studentStatuses,
            quotaLimit: Math.Max(1, quota));
    }

    public async Task<IReadOnlyList<AcademicSubjectDto>> EnrollSuggestedSubjectsAsync(
        Guid userId,
        Guid planId,
        EnrollSuggestedSubjectsRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Term))
        {
            throw new ArgumentException("El término lectivo es requerido.", nameof(request.Term));
        }

        if (request.CurriculumSubjectIds == null || request.CurriculumSubjectIds.Count == 0)
        {
            throw new ArgumentException("Debe seleccionar al menos una materia para inscribir.", nameof(request.CurriculumSubjectIds));
        }

        var planExists = await _context.CareerPlans
            .AnyAsync(p => p.Id == planId && p.UserId == userId, cancellationToken);

        if (!planExists)
        {
            throw new KeyNotFoundException($"El plan de carrera con ID '{planId}' no fue encontrado.");
        }

        var subjectsToEnroll = await _context.CurriculumSubjects
            .Where(s => s.CareerPlanId == planId && s.UserId == userId && request.CurriculumSubjectIds.Contains(s.Id))
            .ToListAsync(cancellationToken);

        if (subjectsToEnroll.Count == 0)
        {
            throw new ArgumentException("Ninguna de las materias seleccionadas pertenece al plan curricular.");
        }

        var term = request.Term.Trim();
        var existingAcademic = await _context.AcademicSubjects
            .Where(s => s.UserId == userId && s.Term == term)
            .ToListAsync(cancellationToken);

        var enrolledList = new List<AcademicSubject>();

        foreach (var curriculumSubject in subjectsToEnroll)
        {
            var existing = existingAcademic.FirstOrDefault(a =>
                (a.CurriculumSubjectId.HasValue && a.CurriculumSubjectId.Value == curriculumSubject.Id)
                || (!string.IsNullOrEmpty(curriculumSubject.Code) && string.Equals(a.Code, curriculumSubject.Code, StringComparison.OrdinalIgnoreCase))
                || string.Equals(a.Name, curriculumSubject.Name, StringComparison.OrdinalIgnoreCase));

            if (existing != null)
            {
                if (!existing.CurriculumSubjectId.HasValue)
                {
                    existing.LinkCurriculumSubject(curriculumSubject.Id);
                }
                enrolledList.Add(existing);
            }
            else
            {
                var newAcademic = new AcademicSubject(
                    userId,
                    curriculumSubject.Name,
                    term,
                    curriculumSubject.Code,
                    null,
                    SubjectStatus.EnCurso,
                    null);

                newAcademic.LinkCurriculumSubject(curriculumSubject.Id);
                _context.AcademicSubjects.Add(newAcademic);
                existingAcademic.Add(newAcademic);
                enrolledList.Add(newAcademic);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Inscritas {Count} materias para el usuario {UserId} en el período '{Term}'.",
            enrolledList.Count, userId, term);

        return enrolledList.Select(a => new AcademicSubjectDto(
            a.Id,
            a.Name,
            a.Code,
            a.Term,
            a.Professor,
            FormatSubjectStatus(a.Status),
            a.Color,
            null,
            0,
            0)).ToList();
    }

    public async Task<bool> DeletePlanAsync(
        Guid userId,
        Guid planId,
        CancellationToken cancellationToken = default)
    {
        var plan = await _context.CareerPlans
            .FirstOrDefaultAsync(p => p.Id == planId && p.UserId == userId, cancellationToken);

        if (plan == null) return false;

        bool wasActive = plan.IsActive;

        _context.CareerPlans.Remove(plan);

        if (wasActive)
        {
            var fallbackActive = await _context.CareerPlans
                .Where(p => p.UserId == userId && p.Id != planId)
                .OrderByDescending(p => p.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);

            fallbackActive?.SetActive(true);
        }

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Plan de carrera {PlanId} eliminado para el usuario {UserId}.", planId, userId);
        return true;
    }

    private static AcademicSubject? MatchAcademicSubject(CurriculumSubject subject, List<AcademicSubject> academicSubjects)
    {
        // 1. Coincidencia directa por clave foránea
        var byFk = academicSubjects.Where(a => a.CurriculumSubjectId == subject.Id).ToList();
        if (byFk.Count > 0)
        {
            return PrioritizeStatus(byFk);
        }

        // 2. Coincidencia por código
        if (!string.IsNullOrWhiteSpace(subject.Code))
        {
            var byCode = academicSubjects
                .Where(a => string.Equals(a.Code?.Trim(), subject.Code.Trim(), StringComparison.OrdinalIgnoreCase))
                .ToList();

            if (byCode.Count > 0)
            {
                return PrioritizeStatus(byCode);
            }
        }

        // 3. Coincidencia por nombre exacto
        var byName = academicSubjects
            .Where(a => string.Equals(a.Name.Trim(), subject.Name.Trim(), StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (byName.Count > 0)
        {
            return PrioritizeStatus(byName);
        }

        return null;
    }

    private static AcademicSubject PrioritizeStatus(List<AcademicSubject> list)
    {
        // Prioridad: Aprobada > Regularizada > EnCurso > Recursar
        var approved = list.FirstOrDefault(a => a.Status == SubjectStatus.Aprobada);
        if (approved != null) return approved;

        var regularized = list.FirstOrDefault(a => a.Status == SubjectStatus.Regularizada);
        if (regularized != null) return regularized;

        var inProgress = list.FirstOrDefault(a => a.Status == SubjectStatus.EnCurso);
        if (inProgress != null) return inProgress;

        return list[0];
    }

    private static PrerequisiteRequirementType ParseRequirementType(string? reqType)
    {
        if (string.IsNullOrWhiteSpace(reqType)) return PrerequisiteRequirementType.RequiereRegularizada;
        var lower = reqType.ToLowerInvariant();
        if (lower.Contains("aprobada") || lower.Contains("final") || lower.Contains("promocion"))
        {
            return PrerequisiteRequirementType.RequiereAprobada;
        }
        return PrerequisiteRequirementType.RequiereRegularizada;
    }

    private static string FormatCurriculumSubjectStatus(CurriculumSubjectStatus status) => status switch
    {
        CurriculumSubjectStatus.Aprobada => "aprobada",
        CurriculumSubjectStatus.Regularizada => "regularizada",
        CurriculumSubjectStatus.EnCurso => "en_curso",
        CurriculumSubjectStatus.Habilitada => "habilitada",
        _ => "bloqueada"
    };

    private static string FormatSubjectStatus(SubjectStatus status) => status switch
    {
        SubjectStatus.Aprobada => "aprobada",
        SubjectStatus.Regularizada => "regularizada",
        SubjectStatus.Recursar => "recursar",
        _ => "en_curso"
    };
}
