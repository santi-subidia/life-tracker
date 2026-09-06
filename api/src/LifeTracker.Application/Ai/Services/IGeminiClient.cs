using LifeTracker.Domain.Ai;

namespace LifeTracker.Application.Ai.Services;

public interface IGeminiClient
{
    Task<GeminiChatResponse> SendChatTurnAsync(
        IEnumerable<AiMessage> conversationHistory,
        IEnumerable<AiToolCallDefinition> availableTools,
        CancellationToken cancellationToken = default);
}
