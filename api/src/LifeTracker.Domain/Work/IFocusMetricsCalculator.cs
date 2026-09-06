namespace LifeTracker.Domain.Work;

public record FocusMetrics(
    int FocusMinutesThisWeek,
    int FocusMinutesToday,
    int CompletedTasksThisWeek,
    int CompletedTasksToday,
    int SessionsCountThisWeek
);

public interface IFocusMetricsCalculator
{
    FocusMetrics Calculate(IEnumerable<WorkSession> sessions, IEnumerable<WorkTask> tasks, DateTime referenceUtc);
}
