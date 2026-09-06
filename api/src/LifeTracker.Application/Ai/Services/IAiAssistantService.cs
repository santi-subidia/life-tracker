using LifeTracker.Application.Ai.Dtos;

namespace LifeTracker.Application.Ai.Services;

public interface IAiAssistantService
{
    Task<List<AiConversationDto>> GetConversationsAsync(Guid userId, CancellationToken ct = default);
    Task<AiConversationDetailDto?> GetConversationByIdAsync(Guid conversationId, Guid userId, CancellationToken ct = default);
    Task<AiConversationDto> CreateConversationAsync(Guid userId, CreateAiConversationRequest req, CancellationToken ct = default);
    Task<AiConversationDto?> UpdateConversationTitleAsync(Guid conversationId, Guid userId, UpdateAiConversationTitleRequest req, CancellationToken ct = default);
    Task<bool> DeleteConversationAsync(Guid conversationId, Guid userId, CancellationToken ct = default);
    Task<AiChatTurnResultDto> ProcessUserMessageAsync(Guid? conversationId, Guid userId, SendAiMessageRequest req, CancellationToken ct = default);
}
