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

        return new DailyHubDto(
            today,
            dailyLog == null ? null : MapToDto(dailyLog),
            habitItems,
            percentage,
            timelineDtos
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
