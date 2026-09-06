namespace LifeTracker.Domain.Work;

public class FocusMetricsCalculator : IFocusMetricsCalculator
{
    public FocusMetrics Calculate(IEnumerable<WorkSession> sessions, IEnumerable<WorkTask> tasks, DateTime referenceUtc)
    {
        var refDate = referenceUtc.Kind == DateTimeKind.Utc
            ? referenceUtc
            : DateTime.SpecifyKind(referenceUtc, DateTimeKind.Utc);

        int daysFromMonday = ((int)refDate.DayOfWeek + 6) % 7;
        var startOfWeekUtc = new DateTime(refDate.Year, refDate.Month, refDate.Day, 0, 0, 0, DateTimeKind.Utc).AddDays(-daysFromMonday);
        var endOfWeekUtc = startOfWeekUtc.AddDays(7).AddTicks(-1);

        var startOfTodayUtc = new DateTime(refDate.Year, refDate.Month, refDate.Day, 0, 0, 0, DateTimeKind.Utc);
        var endOfTodayUtc = startOfTodayUtc.AddDays(1).AddTicks(-1);

        var sessionList = sessions?.ToList() ?? [];
        var taskList = tasks?.ToList() ?? [];

        var weekSessions = sessionList
            .Where(s => s.StartedAt >= startOfWeekUtc && s.StartedAt <= endOfWeekUtc)
            .ToList();

        var todaySessions = sessionList
            .Where(s => s.StartedAt >= startOfTodayUtc && s.StartedAt <= endOfTodayUtc)
            .ToList();

        int focusMinutesThisWeek = weekSessions.Sum(s => s.DurationMinutes);
        int sessionsCountThisWeek = weekSessions.Count;
        int focusMinutesToday = todaySessions.Sum(s => s.DurationMinutes);

        int completedTasksThisWeek = taskList
            .Count(t => t.Status == WorkTaskStatus.Done && t.UpdatedAt >= startOfWeekUtc && t.UpdatedAt <= endOfWeekUtc);

        int completedTasksToday = taskList
            .Count(t => t.Status == WorkTaskStatus.Done && t.UpdatedAt >= startOfTodayUtc && t.UpdatedAt <= endOfTodayUtc);

        return new FocusMetrics(
            focusMinutesThisWeek,
            focusMinutesToday,
            completedTasksThisWeek,
            completedTasksToday,
            sessionsCountThisWeek
        );
    }
}
