using LifeTracker.Domain.Ai;

namespace LifeTracker.Application.Ai.Services;

public interface IAiToolDispatcher
{
    IReadOnlyList<AiToolCallDefinition> GetAvailableToolDefinitions();
    Task<AiToolExecutionResult> DispatchAsync(Guid userId, AiToolCallRequest request, CancellationToken ct = default);
}
