using System.Globalization;

namespace LifeTracker.Domain.Habits;

public record StreakResult(
    int CurrentStreak,
    int LongestStreak,
    bool IsCompletedToday
);

public interface IStreakCalculator
{
    StreakResult Calculate(HabitDefinition habit, IReadOnlyList<HabitLog> logs, DateOnly targetDate);
}

public class StreakCalculator : IStreakCalculator
{
    public StreakResult Calculate(HabitDefinition habit, IReadOnlyList<HabitLog> logs, DateOnly targetDate)
    {
        if (logs == null || logs.Count == 0)
        {
            return new StreakResult(0, 0, false);
        }

        var logDict = logs
            .GroupBy(l => l.Date)
            .ToDictionary(g => g.Key, g => g.First().Status);

        var isCompletedToday = logDict.TryGetValue(targetDate, out var todayStatus) 
                               && todayStatus == HabitLogStatus.Completed;

        return habit.Frequency.Type switch
        {
            FrequencyType.Daily => CalculateDaily(logDict, targetDate, isCompletedToday),
            FrequencyType.SpecificDays => CalculateSpecificDays(habit.Frequency.SpecificDays ?? [], logDict, targetDate, isCompletedToday),
            FrequencyType.TimesPerWeek => CalculateTimesPerWeek(habit.Frequency.TargetDaysPerWeek ?? 1, logDict, targetDate, isCompletedToday),
            _ => CalculateDaily(logDict, targetDate, isCompletedToday)
        };
    }

    private static StreakResult CalculateDaily(
        Dictionary<DateOnly, HabitLogStatus> logs,
        DateOnly targetDate,
        bool isCompletedToday)
    {
        // 1. Current Streak
        var currentStreak = 0;
        var checkDate = targetDate;

        // Si hoy no está completado, hoy sigue en curso; comenzamos a evaluar desde ayer
        if (!isCompletedToday)
        {
            checkDate = targetDate.AddDays(-1);
        }

        while (true)
        {
            if (logs.TryGetValue(checkDate, out var status))
            {
                if (status == HabitLogStatus.Completed)
                {
                    currentStreak++;
                }
                // Si fue Skipped, no suma pero no rompe la racha; continúa evaluando el día anterior
            }
            else
            {
                // Día ausente sin justificación: racha interrumpida
                break;
            }

            checkDate = checkDate.AddDays(-1);
        }

        // 2. Longest Streak
        var longestStreak = 0;
        var tempStreak = 0;

        var allDates = logs.Keys.OrderBy(d => d).ToList();
        if (allDates.Count > 0)
        {
            var minDate = allDates.First();
            var maxDate = allDates.Last();

            for (var d = minDate; d <= maxDate; d = d.AddDays(1))
            {
                if (logs.TryGetValue(d, out var status))
                {
                    if (status == HabitLogStatus.Completed)
                    {
                        tempStreak++;
                        if (tempStreak > longestStreak) longestStreak = tempStreak;
                    }
                    // Skipped mantiene tempStreak sin sumar
                }
                else
                {
                    tempStreak = 0;
                }
            }
        }

        longestStreak = Math.Max(longestStreak, currentStreak);

        return new StreakResult(currentStreak, longestStreak, isCompletedToday);
    }

    private static StreakResult CalculateSpecificDays(
        IReadOnlyList<DayOfWeek> specificDays,
        Dictionary<DateOnly, HabitLogStatus> logs,
        DateOnly targetDate,
        bool isCompletedToday)
    {
        if (specificDays.Count == 0)
            return CalculateDaily(logs, targetDate, isCompletedToday);

        var currentStreak = 0;
        var checkDate = targetDate;

        // Si hoy tocaba pero aún no se completó, arrancar desde el día programado anterior
        if (specificDays.Contains(targetDate.DayOfWeek) && !isCompletedToday)
        {
            checkDate = targetDate.AddDays(-1);
        }

        // Retroceder hasta 365 días evaluando solo los días programados
        for (var i = 0; i < 365; i++)
        {
            if (specificDays.Contains(checkDate.DayOfWeek))
            {
                if (logs.TryGetValue(checkDate, out var status))
                {
                    if (status == HabitLogStatus.Completed)
                    {
                        currentStreak++;
                    }
                    // Skipped mantiene la continuidad
                }
                else
                {
                    // Falta un día programado
                    break;
                }
            }

            checkDate = checkDate.AddDays(-1);
        }

        return new StreakResult(currentStreak, Math.Max(currentStreak, 0), isCompletedToday);
    }

    private static StreakResult CalculateTimesPerWeek(
        int targetDaysPerWeek,
        Dictionary<DateOnly, HabitLogStatus> logs,
        DateOnly targetDate,
        bool isCompletedToday)
    {
        // Agrupar logs completados por Año + Semana ISO
        var calendar = CultureInfo.InvariantCulture.Calendar;
        var completedDates = logs.Where(kv => kv.Value == HabitLogStatus.Completed)
                                 .Select(kv => kv.Key)
                                 .ToList();

        var currentWeekYear = calendar.GetWeekOfYear(
            targetDate.ToDateTime(TimeOnly.MinValue), 
            CalendarWeekRule.FirstFourDayWeek, 
            DayOfWeek.Monday);

        var weekGroups = completedDates
            .GroupBy(d => new
            {
                Year = d.Year,
                Week = calendar.GetWeekOfYear(d.ToDateTime(TimeOnly.MinValue), CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday)
            })
            .ToDictionary(g => (g.Key.Year, g.Key.Week), g => g.Count());

        var currentStreak = 0;
        var checkDateTime = targetDate.ToDateTime(TimeOnly.MinValue);

        // Verificar si la semana actual ya cumplió
        var currentWeekCount = weekGroups.GetValueOrDefault((targetDate.Year, currentWeekYear), 0);
        if (currentWeekCount >= targetDaysPerWeek)
        {
            currentStreak++;
        }

        // Evaluar semanas anteriores (retrocediendo de a 7 días)
        checkDateTime = checkDateTime.AddDays(-7);
        for (var i = 0; i < 52; i++)
        {
            var y = checkDateTime.Year;
            var w = calendar.GetWeekOfYear(checkDateTime, CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday);

            if (weekGroups.TryGetValue((y, w), out var count) && count >= targetDaysPerWeek)
            {
                currentStreak++;
                checkDateTime = checkDateTime.AddDays(-7);
            }
            else
            {
                break;
            }
        }

        return new StreakResult(currentStreak, currentStreak, isCompletedToday);
    }
}
