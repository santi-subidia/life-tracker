namespace LifeTracker.Domain.Ai;

public record AiToolCallDefinition(
    string Name,
    string Description,
    object ParametersSchema
);

public record AiToolCallRequest(
    string CallId,
    string ToolName,
    Dictionary<string, object?> Arguments
);

public record AiToolExecutionResult(
    string CallId,
    string ToolName,
    bool Success,
    object? Data,
    string? ErrorMessage = null
);

public record GeminiChatResponse(
    string? Text,
    IReadOnlyList<AiToolCallRequest> ToolCalls,
    string FinishReason = "STOP"
)
{
    public string? TextResponse => Text;
}
