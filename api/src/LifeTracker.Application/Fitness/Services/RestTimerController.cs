using LifeTracker.Application.Fitness.Dtos;

namespace LifeTracker.Application.Fitness.Services;

public interface IRestTimerController
{
    RestTimerSnapshot Start(Guid sessionId, Guid setId, int durationSeconds, DateTimeOffset nowUtc);
    RestTimerSnapshot AddSeconds(RestTimerSnapshot current, int additionalSeconds, DateTimeOffset nowUtc);
    RestTimerSnapshot Stop(RestTimerSnapshot current, DateTimeOffset nowUtc);
    RestTimerSnapshot GetSnapshot(RestTimerSnapshot current, DateTimeOffset nowUtc);
}

public class RestTimerController : IRestTimerController
{
    public RestTimerSnapshot Start(Guid sessionId, Guid setId, int durationSeconds, DateTimeOffset nowUtc)
    {
        var targetEnd = nowUtc.AddSeconds(durationSeconds);
        return new RestTimerSnapshot(
            SessionId: sessionId,
            SetId: setId,
            DurationSeconds: durationSeconds,
            TargetEndUtc: targetEnd,
            IsRunning: true,
            RemainingSeconds: durationSeconds
        );
    }

    public RestTimerSnapshot AddSeconds(RestTimerSnapshot current, int additionalSeconds, DateTimeOffset nowUtc)
    {
        if (!current.IsRunning) return current;

        var newTarget = current.TargetEndUtc.AddSeconds(additionalSeconds);
        var remaining = Math.Max(0, (int)Math.Ceiling((newTarget - nowUtc).TotalSeconds));

        return current with
        {
            DurationSeconds = current.DurationSeconds + additionalSeconds,
            TargetEndUtc = newTarget,
            RemainingSeconds = remaining
        };
    }

    public RestTimerSnapshot Stop(RestTimerSnapshot current, DateTimeOffset nowUtc)
    {
        return current with { IsRunning = false, RemainingSeconds = 0 };
    }

    public RestTimerSnapshot GetSnapshot(RestTimerSnapshot current, DateTimeOffset nowUtc)
    {
        if (!current.IsRunning) return current;

        var remaining = (int)Math.Ceiling((current.TargetEndUtc - nowUtc).TotalSeconds);
        if (remaining <= 0)
        {
            return current with { IsRunning = false, RemainingSeconds = 0 };
        }

        return current with { RemainingSeconds = remaining };
    }
}
