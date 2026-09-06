using LifeTracker.Domain.Common;

namespace LifeTracker.Domain.Ai;

public class AiMessage : BaseEntity
{
    public Guid ConversationId { get; private set; }
    public Guid UserId { get; private set; }
    public AiMessageRole Role { get; private set; }
    public string Content { get; private set; } = string.Empty;
    public string ToolCallsJson { get; private set; } = "[]";
    public string ToolResultsJson { get; private set; } = "[]";

    private AiMessage() { }

    public AiMessage(
        Guid conversationId,
        Guid userId,
        AiMessageRole role,
        string content,
        string? toolCallsJson = null,
        string? toolResultsJson = null)
    {
        if (conversationId == Guid.Empty)
            throw new ArgumentException("El ID de conversación no puede estar vacío.", nameof(conversationId));

        if (userId == Guid.Empty)
            throw new ArgumentException("El ID de usuario no puede estar vacío.", nameof(userId));

        ConversationId = conversationId;
        UserId = userId;
        Role = role;
        Content = content ?? string.Empty;
        ToolCallsJson = string.IsNullOrWhiteSpace(toolCallsJson) ? "[]" : toolCallsJson.Trim();
        ToolResultsJson = string.IsNullOrWhiteSpace(toolResultsJson) ? "[]" : toolResultsJson.Trim();
    }

    public static AiMessage CreateUser(Guid conversationId, Guid userId, string content)
    {
        return new AiMessage(conversationId, userId, AiMessageRole.User, content);
    }

    public static AiMessage CreateModel(Guid conversationId, Guid userId, string content, string? toolCallsJson = null, string? toolResultsJson = null)
    {
        return new AiMessage(conversationId, userId, AiMessageRole.Model, content, toolCallsJson, toolResultsJson);
    }

    public static AiMessage CreateToolCall(Guid conversationId, Guid userId, string toolCallsJson)
    {
        return new AiMessage(conversationId, userId, AiMessageRole.ToolCall, string.Empty, toolCallsJson: toolCallsJson);
    }

    public static AiMessage CreateToolResult(Guid conversationId, Guid userId, string toolResultsJson)
    {
        return new AiMessage(conversationId, userId, AiMessageRole.ToolResult, string.Empty, toolResultsJson: toolResultsJson);
    }
}
