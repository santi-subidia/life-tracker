using Microsoft.EntityFrameworkCore;
using LifeTracker.Application.Academics.Dtos;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Domain.Academics;

namespace LifeTracker.Application.Academics.Services;

public class AcademicService : IAcademicService
{
    private readonly ILifeTrackerDbContext _context;
    private readonly IGradeAverageCalculator _gradeCalculator;
    private readonly IAcademicTimelineProjector _timelineProjector;

    public AcademicService(
        ILifeTrackerDbContext context,
        IGradeAverageCalculator gradeCalculator,
        IAcademicTimelineProjector timelineProjector)
    {
        _context = context;
        _gradeCalculator = gradeCalculator;
        _timelineProjector = timelineProjector;
    }

    public async Task<List<AcademicSubjectDto>> GetSubjectsAsync(Guid userId, string? term, CancellationToken ct = default)
    {
        var query = _context.AcademicSubjects
            .AsNoTracking()
            .Where(s => s.UserId == userId);

        if (!string.IsNullOrWhiteSpace(term))
        {
            query = query.Where(s => s.Term == term.Trim());
        }

        var subjects = await query
            .OrderByDescending(s => s.Term)
            .ThenBy(s => s.Name)
            .ToListAsync(ct);

        var subjectIds = subjects.Select(s => s.Id).ToList();
        var allMilestones = await _context.AcademicMilestones
            .AsNoTracking()
            .Where(m => m.UserId == userId && subjectIds.Contains(m.SubjectId))
            .ToListAsync(ct);

        var milestonesBySubject = allMilestones.GroupBy(m => m.SubjectId).ToDictionary(g => g.Key, g => g.ToList());

        return subjects.Select(s =>
        {
            milestonesBySubject.TryGetValue(s.Id, out var milestones);
            milestones ??= [];

            var average = _gradeCalculator.CalculateSubjectAverage(milestones);
            var total = milestones.Count;
            var completed = milestones.Count(m => m.Grade.HasValue);

            return new AcademicSubjectDto(
                s.Id,
                s.Name,
                s.Code,
                s.Term,
                s.Professor,
                FormatSubjectStatus(s.Status),
                s.Color,
                average,
                total,
                completed
            );
        }).ToList();
    }

    public async Task<AcademicSubjectDetailDto?> GetSubjectDetailAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var subject = await _context.AcademicSubjects
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId, ct);

        if (subject == null)
            return null;

        var milestones = await _context.AcademicMilestones
            .AsNoTracking()
            .Where(m => m.SubjectId == id && m.UserId == userId)
            .OrderBy(m => m.DueDate)
            .ToListAsync(ct);

        var average = _gradeCalculator.CalculateSubjectAverage(milestones);

        var milestoneDtos = milestones.Select(m => new AcademicMilestoneDto(
            m.Id,
            m.SubjectId,
            m.Title,
            FormatMilestoneType(m.MilestoneType),
            m.DueDate,
            m.Grade,
            m.WeightPercentage,
            FormatMilestoneStatus(m.Status),
            m.ReplacesMilestoneId,
            m.Notes
        )).ToList();

        return new AcademicSubjectDetailDto(
            subject.Id,
            subject.Name,
            subject.Code,
            subject.Term,
            subject.Professor,
            FormatSubjectStatus(subject.Status),
            subject.Color,
            average,
            milestoneDtos
        );
    }

    public async Task<AcademicSubjectDto> CreateSubjectAsync(Guid userId, CreateAcademicSubjectRequest req, CancellationToken ct = default)
    {
        var status = ParseSubjectStatus(req.Status);
        var subject = new AcademicSubject(
            userId: userId,
            name: req.Name,
            term: req.Term,
            code: req.Code,
            professor: req.Professor,
            status: status,
            color: req.Color
        );

        _context.AcademicSubjects.Add(subject);
        await _context.SaveChangesAsync(ct);

        return new AcademicSubjectDto(
            subject.Id,
            subject.Name,
            subject.Code,
            subject.Term,
            subject.Professor,
            FormatSubjectStatus(subject.Status),
            subject.Color,
            null,
            0,
            0
        );
    }

    public async Task<AcademicSubjectDto?> UpdateSubjectAsync(Guid userId, Guid id, UpdateAcademicSubjectRequest req, CancellationToken ct = default)
    {
        var subject = await _context.AcademicSubjects.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId, ct);
        if (subject == null)
            return null;

        var status = ParseSubjectStatus(req.Status);
        subject.Update(req.Name, req.Code, req.Term, req.Professor, status, req.Color);

        await _context.SaveChangesAsync(ct);

        var milestones = await _context.AcademicMilestones
            .AsNoTracking()
            .Where(m => m.SubjectId == id && m.UserId == userId)
            .ToListAsync(ct);

        var average = _gradeCalculator.CalculateSubjectAverage(milestones);

        return new AcademicSubjectDto(
            subject.Id,
            subject.Name,
            subject.Code,
            subject.Term,
            subject.Professor,
            FormatSubjectStatus(subject.Status),
            subject.Color,
            average,
            milestones.Count,
            milestones.Count(m => m.Grade.HasValue)
        );
    }

    public async Task<bool> DeleteSubjectAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var subject = await _context.AcademicSubjects.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId, ct);
        if (subject == null)
            return false;

        var milestones = await _context.AcademicMilestones
            .Where(m => m.SubjectId == id && m.UserId == userId)
            .ToListAsync(ct);

        foreach (var m in milestones)
        {
            await _timelineProjector.RemoveMilestoneProjectionAsync(userId, m.Id, ct);
        }

        _context.AcademicSubjects.Remove(subject);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<AcademicMilestoneDto> CreateMilestoneAsync(Guid userId, CreateAcademicMilestoneRequest req, CancellationToken ct = default)
    {
        var subject = await _context.AcademicSubjects.AsNoTracking().FirstOrDefaultAsync(s => s.Id == req.SubjectId && s.UserId == userId, ct);
        if (subject == null)
            throw new InvalidOperationException("La materia especificada no existe o no pertenece al usuario.");

        var milestoneType = ParseMilestoneType(req.MilestoneType);
        var milestone = new AcademicMilestone(
            userId: userId,
            subjectId: req.SubjectId,
            title: req.Title,
            milestoneType: milestoneType,
            dueDate: req.DueDate,
            weightPercentage: req.WeightPercentage,
            replacesMilestoneId: req.ReplacesMilestoneId,
            notes: req.Notes
        );

        _context.AcademicMilestones.Add(milestone);
        await _context.SaveChangesAsync(ct);

        return new AcademicMilestoneDto(
            milestone.Id,
            milestone.SubjectId,
            milestone.Title,
            FormatMilestoneType(milestone.MilestoneType),
            milestone.DueDate,
            milestone.Grade,
            milestone.WeightPercentage,
            FormatMilestoneStatus(milestone.Status),
            milestone.ReplacesMilestoneId,
            milestone.Notes
        );
    }

    public async Task<AcademicMilestoneDto?> UpdateMilestoneAsync(Guid userId, Guid id, UpdateAcademicMilestoneRequest req, CancellationToken ct = default)
    {
        var milestone = await _context.AcademicMilestones.FirstOrDefaultAsync(m => m.Id == id && m.UserId == userId, ct);
        if (milestone == null)
            return null;

        var milestoneType = ParseMilestoneType(req.MilestoneType);
        milestone.UpdateDetails(req.Title, milestoneType, req.DueDate, req.WeightPercentage, req.ReplacesMilestoneId, req.Notes);

        await _context.SaveChangesAsync(ct);

        if (milestone.Grade.HasValue)
        {
            var subject = await _context.AcademicSubjects.AsNoTracking().FirstOrDefaultAsync(s => s.Id == milestone.SubjectId, ct);
            if (subject != null)
            {
                await _timelineProjector.ProjectMilestoneGradedAsync(userId, subject, milestone, ct);
            }
        }

        return new AcademicMilestoneDto(
            milestone.Id,
            milestone.SubjectId,
            milestone.Title,
            FormatMilestoneType(milestone.MilestoneType),
            milestone.DueDate,
            milestone.Grade,
            milestone.WeightPercentage,
            FormatMilestoneStatus(milestone.Status),
            milestone.ReplacesMilestoneId,
            milestone.Notes
        );
    }

    public async Task<AcademicMilestoneDto?> AssignGradeAsync(Guid userId, Guid id, AssignGradeRequest req, CancellationToken ct = default)
    {
        var milestone = await _context.AcademicMilestones.FirstOrDefaultAsync(m => m.Id == id && m.UserId == userId, ct);
        if (milestone == null)
            return null;

        var subject = await _context.AcademicSubjects.FirstOrDefaultAsync(s => s.Id == milestone.SubjectId && s.UserId == userId, ct);
        if (subject == null)
            return null;

        milestone.AssignGrade(req.Grade, req.Notes);
        await _context.SaveChangesAsync(ct);

        await _timelineProjector.ProjectMilestoneGradedAsync(userId, subject, milestone, ct);

        return new AcademicMilestoneDto(
            milestone.Id,
            milestone.SubjectId,
            milestone.Title,
            FormatMilestoneType(milestone.MilestoneType),
            milestone.DueDate,
            milestone.Grade,
            milestone.WeightPercentage,
            FormatMilestoneStatus(milestone.Status),
            milestone.ReplacesMilestoneId,
            milestone.Notes
        );
    }

    public async Task<bool> DeleteMilestoneAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var milestone = await _context.AcademicMilestones.FirstOrDefaultAsync(m => m.Id == id && m.UserId == userId, ct);
        if (milestone == null)
            return false;

        await _timelineProjector.RemoveMilestoneProjectionAsync(userId, id, ct);

        _context.AcademicMilestones.Remove(milestone);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<AcademicMetricsDto> GetMetricsAsync(Guid userId, CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var subjects = await _context.AcademicSubjects
            .AsNoTracking()
            .Where(s => s.UserId == userId)
            .ToListAsync(ct);

        var milestones = await _context.AcademicMilestones
            .AsNoTracking()
            .Where(m => m.UserId == userId)
            .ToListAsync(ct);

        var milestonesBySubject = milestones.GroupBy(m => m.SubjectId).ToDictionary(g => g.Key, g => g.ToList());

        var summaries = subjects.Select(s =>
        {
            milestonesBySubject.TryGetValue(s.Id, out var ms);
            var avg = _gradeCalculator.CalculateSubjectAverage(ms ?? []);
            return new SubjectGradeSummary(s.Id, s.Status, avg);
        }).ToList();

        var careerAverage = _gradeCalculator.CalculateCareerAverage(summaries);
        var approvedCount = subjects.Count(s => s.Status == SubjectStatus.Aprobada);
        var inProgressCount = subjects.Count(s => s.Status == SubjectStatus.EnCurso);

        var nextSevenDays = today.AddDays(7);
        var upcomingExamsCount = milestones
            .Count(m => m.Status == MilestoneStatus.Pendiente && m.DueDate >= today && m.DueDate <= nextSevenDays);

        return new AcademicMetricsDto(
            careerAverage,
            approvedCount,
            inProgressCount,
            upcomingExamsCount
        );
    }

    private static SubjectStatus ParseSubjectStatus(string? status) => status?.ToLowerInvariant() switch
    {
        "aprobada" => SubjectStatus.Aprobada,
        "regularizada" => SubjectStatus.Regularizada,
        "recursar" => SubjectStatus.Recursar,
        _ => SubjectStatus.EnCurso
    };

    private static string FormatSubjectStatus(SubjectStatus status) => status switch
    {
        SubjectStatus.Aprobada => "aprobada",
        SubjectStatus.Regularizada => "regularizada",
        SubjectStatus.Recursar => "recursar",
        _ => "en_curso"
    };

    private static MilestoneType ParseMilestoneType(string? type) => type?.ToLowerInvariant() switch
    {
        "entrega" => MilestoneType.Entrega,
        "final" => MilestoneType.Final,
        "recuperatorio" => MilestoneType.Recuperatorio,
        _ => MilestoneType.Parcial
    };

    private static string FormatMilestoneType(MilestoneType type) => type switch
    {
        MilestoneType.Entrega => "entrega",
        MilestoneType.Final => "final",
        MilestoneType.Recuperatorio => "recuperatorio",
        _ => "parcial"
    };

    private static string FormatMilestoneStatus(MilestoneStatus status) => status switch
    {
        MilestoneStatus.Aprobado => "aprobado",
        MilestoneStatus.Reprobado => "reprobado",
        _ => "pendiente"
    };
}
