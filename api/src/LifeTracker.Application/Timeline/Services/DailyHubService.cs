using Microsoft.EntityFrameworkCore;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Application.Timeline.Dtos;
using LifeTracker.Domain.Habits;
using LifeTracker.Domain.Timeline;

namespace LifeTracker.Application.Timeline.Services;

public class DailyHubService : IDailyHubService
{
    private readonly ILifeTrackerDbContext _dbContext;
    private readonly IStreakCalculator _streakCalculator;

    public DailyHubService(
        ILifeTrackerDbContext dbContext,
        IStreakCalculator streakCalculator)
    {
        _dbContext = dbContext;
        _streakCalculator = streakCalculator;
    }

    public async Task<DailyHubDto> GetTodayHubAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // 1. Obtener o consultar DailyLog de hoy
        var dailyLog = await _dbContext.DailyLogs
            .FirstOrDefaultAsync(d => d.UserId == userId && d.Date == today, cancellationToken);

        // 2. Obtener hábitos activos del usuario
        var habits = await _dbContext.HabitDefinitions
            .Include(h => h.Logs)
            .Where(h => h.UserId == userId && !h.IsArchived)
            .ToListAsync(cancellationToken);

        // Filtrar los que aplican para el día de hoy
        var scheduledHabits = habits
            .Where(h => h.IsScheduledFor(today))
            .ToList();

        var habitItems = scheduledHabits.Select(h =>
        {
            var streak = _streakCalculator.Calculate(h, h.Logs.ToList(), today);
            return new TodayHabitItemDto(
                h.Id,
                h.Name,
                h.Category,
                h.Color,
                h.Icon,
                streak.IsCompletedToday,
                streak.CurrentStreak,
                streak.LongestStreak,
                FormatFrequency(h.Frequency)
            );
        }).ToList();

        // 3. Porcentaje de completitud
        var completedCount = habitItems.Count(h => h.IsCompletedToday);
        var totalScheduled = habitItems.Count;
        var percentage = totalScheduled == 0 ? 100 : (int)Math.Round((double)completedCount / totalScheduled * 100);

        // 4. Timeline items de hoy
        var timelineEvents = await _dbContext.TimelineItems
            .Where(t => t.UserId == userId && t.Date == today)
            .OrderByDescending(t => t.Timestamp)
            .ToListAsync(cancellationToken);

        var timelineDtos = timelineEvents.Select(t => new TodayTimelineItemDto(
            t.Id,
            t.Timestamp,
            t.SourceModule,
            t.EventType,
            t.Title,
            t.Summary
        )).ToList();

        // 5. Resumen de Trabajo de hoy
        var nowUtc = DateTime.UtcNow;
        var startOfTodayUtc = new DateTime(nowUtc.Year, nowUtc.Month, nowUtc.Day, 0, 0, 0, DateTimeKind.Utc);
        var endOfTodayUtc = startOfTodayUtc.AddDays(1).AddTicks(-1);

        var completedTasksToday = await _dbContext.WorkTasks
            .AsNoTracking()
            .CountAsync(t => t.UserId == userId && t.Status == LifeTracker.Domain.Work.WorkTaskStatus.Done && t.UpdatedAt >= startOfTodayUtc && t.UpdatedAt <= endOfTodayUtc, cancellationToken);

        var focusMinutesToday = await _dbContext.WorkSessions
            .AsNoTracking()
            .Where(s => s.UserId == userId && s.StartedAt >= startOfTodayUtc && s.StartedAt <= endOfTodayUtc)
            .SumAsync(s => s.DurationMinutes, cancellationToken);

        var workSummary = new WorkSummaryDto(completedTasksToday, focusMinutesToday);

        // 6. Exámenes e hitos académicos próximos (hoy a 7 días)
        var nextWeek = today.AddDays(7);
        var upcomingMilestones = await _dbContext.AcademicMilestones
            .AsNoTracking()
            .Where(m => m.UserId == userId && m.Status == LifeTracker.Domain.Academics.MilestoneStatus.Pendiente && m.DueDate >= today && m.DueDate <= nextWeek)
            .OrderBy(m => m.DueDate)
            .ToListAsync(cancellationToken);

        var subjectIds = upcomingMilestones.Select(m => m.SubjectId).Distinct().ToList();
        var subjects = await _dbContext.AcademicSubjects
            .AsNoTracking()
            .Where(s => subjectIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, cancellationToken);

        var upcomingExams = upcomingMilestones.Select(m =>
        {
            subjects.TryGetValue(m.SubjectId, out var sub);
            int daysRemaining = m.DueDate.DayNumber - today.DayNumber;
            return new UpcomingExamDto(
                m.Id,
                m.SubjectId,
                sub?.Name ?? "Materia",
                sub?.Color,
                m.Title,
                m.MilestoneType.ToString().ToLowerInvariant(),
                m.DueDate,
                daysRemaining
            );
        }).ToList();

        return new DailyHubDto(
            today,
            dailyLog == null ? null : MapToDto(dailyLog),
            habitItems,
            percentage,
            timelineDtos,
            workSummary,
            upcomingExams
        );
    }

    public async Task<DailyLogDto> UpdateDailyLogTodayAsync(
        Guid userId,
        UpdateDailyLogRequest request,
        CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var dailyLog = await _dbContext.DailyLogs
            .FirstOrDefaultAsync(d => d.UserId == userId && d.Date == today, cancellationToken);

        if (dailyLog == null)
        {
            dailyLog = new DailyLog(userId, today, request.MoodScore, request.EnergyScore, request.SummaryText);
            _dbContext.DailyLogs.Add(dailyLog);
        }
        else
        {
            dailyLog.UpdateLog(request.MoodScore, request.EnergyScore, request.SummaryText);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapToDto(dailyLog);
    }

    private static string FormatFrequency(HabitFrequency freq) => freq.Type switch
    {
        FrequencyType.Daily => "Todos los días",
        FrequencyType.SpecificDays => "Días programados",
        FrequencyType.TimesPerWeek => $"{freq.TargetDaysPerWeek} veces por semana",
        _ => "Diario"
    };

    private static DailyLogDto MapToDto(DailyLog log)
    {
        return new DailyLogDto(
            log.Id,
            log.UserId,
            log.Date,
            log.MoodScore,
            log.EnergyScore,
            log.SummaryText,
            log.UpdatedAt
        );
    }
}
