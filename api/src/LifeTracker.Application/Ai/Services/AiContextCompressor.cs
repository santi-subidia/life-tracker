using LifeTracker.Domain.Ai;

namespace LifeTracker.Application.Ai.Services;

public static class AiContextCompressor
{
    public const int DefaultMaxTurns = 20;

    public static IReadOnlyList<AiMessage> Compress(IEnumerable<AiMessage> history, int maxMessages = DefaultMaxTurns)
    {
        if (history == null)
            return [];

        var list = history.ToList();
        if (list.Count <= maxMessages)
            return list;

        return list.Skip(list.Count - maxMessages).ToList();
    }
}
