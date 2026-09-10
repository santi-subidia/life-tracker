using Microsoft.EntityFrameworkCore;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Application.Profile.Dtos;
using LifeTracker.Domain.Academics;
using LifeTracker.Domain.Habits;
using LifeTracker.Domain.Work;

namespace LifeTracker.Application.Profile.Services;

public class ProfileService : IProfileService
{
    private readonly ILifeTrackerDbContext _dbContext;

    public ProfileService(ILifeTrackerDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ProfileSummaryDto> GetSummaryAsync(Guid userId, string? period, CancellationToken ct = default)
    {
        var normalizedPeriod = (period ?? "week").Trim().ToLowerInvariant();
        if (normalizedPeriod is not ("week" or "month" or "year"))
        {
            normalizedPeriod = "week";
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var startDate = normalizedPeriod switch
        {
            "year" => today.AddDays(-365),
            "month" => today.AddDays(-30),
            _ => today.AddDays(-7),
        };

        var startDateTime = startDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var endDateTime = today.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

        // 1. Sesiones de Foco (Deep Work)
        var workSessions = await _dbContext.WorkSessions
            .AsNoTracking()
            .Where(s => s.UserId == userId && s.StartedAt >= startDateTime && s.StartedAt <= endDateTime)
            .ToListAsync(ct);

        var totalFocusMinutes = workSessions.Sum(s => s.DurationMinutes);
        var totalFocusSessions = workSessions.Count;

        // 2. Hábitos
        var habitLogs = await _dbContext.HabitLogs
            .AsNoTracking()
            .Where(l => l.UserId == userId && l.Status == HabitLogStatus.Completed && l.Date >= startDate && l.Date <= today)
            .ToListAsync(ct);

        var completedHabitsCount = habitLogs.Count;

        var habits = await _dbContext.HabitDefinitions
            .AsNoTracking()
            .Include(h => h.Logs)
            .Where(h => h.UserId == userId && !h.IsArchived)
            .ToListAsync(ct);

        var longestStreak = habits.Count > 0 
            ? habits.Max(h => h.Logs.Count(l => l.Status == HabitLogStatus.Completed)) 
            : 0;

        // 3. Tareas Kanban Finalizadas
        var completedTasksCount = await _dbContext.WorkTasks
            .AsNoTracking()
            .CountAsync(t => t.UserId == userId 
                             && t.Status == WorkTaskStatus.Done 
                             && t.UpdatedAt >= startDateTime 
                             && t.UpdatedAt <= endDateTime, ct);

        // 4. Notas del Segundo Cerebro creadas
        var notesCreatedCount = await _dbContext.Notes
            .AsNoTracking()
            .CountAsync(n => n.UserId == userId 
                             && n.CreatedAt >= startDateTime 
                             && n.CreatedAt <= endDateTime, ct);

        // 5. Exámenes e Hitos Académicos Aprobados (Calificados con nota >= 4 o estado Aprobado)
        var approvedMilestonesCount = await _dbContext.AcademicMilestones
            .AsNoTracking()
            .CountAsync(m => m.UserId == userId 
                             && (m.Status == MilestoneStatus.Aprobado || (m.Grade != null && m.Grade >= 4))
                             && m.DueDate >= startDate 
                             && m.DueDate <= today, ct);

        // 6. Estudios Médicos Cargados
        var healthStudiesCount = await _dbContext.HealthStudies
            .AsNoTracking()
            .CountAsync(s => s.UserId == userId 
                             && s.StudyDate >= startDate 
                             && s.StudyDate <= today, ct);

        // 7. Agregación de Línea Temporal de Actividad Inteligente
        var timelineItems = await _dbContext.TimelineItems
            .AsNoTracking()
            .Where(t => t.UserId == userId && t.Date >= startDate && t.Date <= today)
            .ToListAsync(ct);

        var activityTimeline = new List<ProfileActivityPointDto>();

        if (normalizedPeriod == "week")
        {
            // 7 días individuales
            var dayNames = new[] { "Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb" };
            for (var d = startDate; d <= today; d = d.AddDays(1))
            {
                var dayOfWeek = dayNames[(int)d.DayOfWeek];
                var label = d == today ? "Hoy" : $"{dayOfWeek} {d.Day}";

                var dayFocus = workSessions
                    .Where(s => DateOnly.FromDateTime(s.StartedAt) == d)
                    .Sum(s => s.DurationMinutes);

                var dayHabits = habitLogs.Count(l => l.Date == d);
                var dayEvents = timelineItems.Count(t => t.Date == d);

                activityTimeline.Add(new ProfileActivityPointDto(label, dayFocus, dayHabits, 0, dayEvents));
            }
        }
        else if (normalizedPeriod == "month")
        {
            // 4 semanas agrupadas (7-8 días cada una)
            var totalDays = today.DayNumber - startDate.DayNumber + 1;
            var daysPerBucket = (int)Math.Ceiling(totalDays / 4.0);

            for (var i = 0; i < 4; i++)
            {
                var bucketStart = startDate.AddDays(i * daysPerBucket);
                var bucketEnd = startDate.AddDays((i + 1) * daysPerBucket - 1);
                if (bucketEnd > today) bucketEnd = today;
                if (bucketStart > today) break;

                var label = $"Sem {i + 1}";

                var bucketFocus = workSessions
                    .Where(s => DateOnly.FromDateTime(s.StartedAt) >= bucketStart && DateOnly.FromDateTime(s.StartedAt) <= bucketEnd)
                    .Sum(s => s.DurationMinutes);

                var bucketHabits = habitLogs.Count(l => l.Date >= bucketStart && l.Date <= bucketEnd);
                var bucketEvents = timelineItems.Count(t => t.Date >= bucketStart && t.Date <= bucketEnd);

                activityTimeline.Add(new ProfileActivityPointDto(label, bucketFocus, bucketHabits, 0, bucketEvents));
            }
        }
        else // "year"
        {
            // 12 meses agrupados
            var monthNames = new[] { "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic" };
            for (var m = 11; m >= 0; m--)
            {
                var targetDate = today.AddMonths(-m);
                var yearMonthStart = new DateOnly(targetDate.Year, targetDate.Month, 1);
                var daysInMonth = DateTime.DaysInMonth(targetDate.Year, targetDate.Month);
                var yearMonthEnd = new DateOnly(targetDate.Year, targetDate.Month, daysInMonth);

                if (yearMonthEnd > today) yearMonthEnd = today;

                var label = monthNames[targetDate.Month - 1];

                var monthFocus = workSessions
                    .Where(s => DateOnly.FromDateTime(s.StartedAt) >= yearMonthStart && DateOnly.FromDateTime(s.StartedAt) <= yearMonthEnd)
                    .Sum(s => s.DurationMinutes);

                var monthHabits = habitLogs.Count(l => l.Date >= yearMonthStart && l.Date <= yearMonthEnd);
                var monthEvents = timelineItems.Count(t => t.Date >= yearMonthStart && t.Date <= yearMonthEnd);

                activityTimeline.Add(new ProfileActivityPointDto(label, monthFocus, monthHabits, 0, monthEvents));
            }
        }

        return new ProfileSummaryDto(
            normalizedPeriod,
            startDate.ToString("yyyy-MM-dd"),
            today.ToString("yyyy-MM-dd"),
            totalFocusMinutes,
            totalFocusSessions,
            completedHabitsCount,
            longestStreak,
            completedTasksCount,
            notesCreatedCount,
            approvedMilestonesCount,
            healthStudiesCount,
            activityTimeline
        );
    }
}
