namespace LifeTracker.Application.Ai.Dtos;

public record AiConversationDto(
    Guid Id,
    string Title,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    int MessageCount
);

public record AiConversationDetailDto(
    Guid Id,
    string Title,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<AiMessageDto> Messages
);

public record AiMessageDto(
    Guid Id,
    string Role,
    string Content,
    string ToolCallsJson,
    string ToolResultsJson,
    DateTime CreatedAt
);

public record SendAiMessageRequest(
    string Message
);

public record CreateAiConversationRequest(
    string? Title
);

public record UpdateAiConversationTitleRequest(
    string Title
);

public record AiChatTurnResultDto(
    Guid ConversationId,
    string Title,
    IReadOnlyList<AiMessageDto> NewMessages
);

public record AiToolCallDetailDto(
    string CallId,
    string ToolName,
    object? Arguments,
    object? Result,
    bool Success
);
