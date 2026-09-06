using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using LifeTracker.Application.Ai.Dtos;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Domain.Ai;

namespace LifeTracker.Application.Ai.Services;

public class AiAssistantService : IAiAssistantService
{
    private readonly ILifeTrackerDbContext _context;
    private readonly IGeminiClient _geminiClient;
    private readonly IAiToolDispatcher _toolDispatcher;

    public AiAssistantService(
        ILifeTrackerDbContext context,
        IGeminiClient geminiClient,
        IAiToolDispatcher toolDispatcher)
    {
        _context = context;
        _geminiClient = geminiClient;
        _toolDispatcher = toolDispatcher;
    }

    public async Task<List<AiConversationDto>> GetConversationsAsync(Guid userId, CancellationToken ct = default)
    {
        var conversations = await _context.AiConversations
            .AsNoTracking()
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.UpdatedAt)
            .ToListAsync(ct);

        var convIds = conversations.Select(c => c.Id).ToList();
        var counts = await _context.AiMessages
            .AsNoTracking()
            .Where(m => convIds.Contains(m.ConversationId))
            .GroupBy(m => m.ConversationId)
            .Select(g => new { ConversationId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.ConversationId, g => g.Count, ct);

        return conversations.Select(c => new AiConversationDto(
            c.Id,
            c.Title,
            c.CreatedAt,
            c.UpdatedAt,
            counts.TryGetValue(c.Id, out var count) ? count : 0
        )).ToList();
    }

    public async Task<AiConversationDetailDto?> GetConversationByIdAsync(Guid conversationId, Guid userId, CancellationToken ct = default)
    {
        var conversation = await _context.AiConversations
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId, ct);

        if (conversation == null)
            return null;

        var messages = await _context.AiMessages
            .AsNoTracking()
            .Where(m => m.ConversationId == conversationId)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync(ct);

        var messageDtos = messages.Select(MapToDto).ToList();

        return new AiConversationDetailDto(
            conversation.Id,
            conversation.Title,
            conversation.CreatedAt,
            conversation.UpdatedAt,
            messageDtos
        );
    }

    public async Task<AiConversationDto> CreateConversationAsync(Guid userId, CreateAiConversationRequest req, CancellationToken ct = default)
    {
        var conv = AiConversation.Create(userId, req.Title);
        _context.AiConversations.Add(conv);
        await _context.SaveChangesAsync(ct);

        return new AiConversationDto(
            conv.Id,
            conv.Title,
            conv.CreatedAt,
            conv.UpdatedAt,
            0
        );
    }

    public async Task<AiConversationDto?> UpdateConversationTitleAsync(
        Guid conversationId,
        Guid userId,
        UpdateAiConversationTitleRequest req,
        CancellationToken ct = default)
    {
        var conv = await _context.AiConversations.FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId, ct);
        if (conv == null)
            return null;

        conv.UpdateTitle(req.Title);
        await _context.SaveChangesAsync(ct);

        var count = await _context.AiMessages.CountAsync(m => m.ConversationId == conversationId, ct);

        return new AiConversationDto(
            conv.Id,
            conv.Title,
            conv.CreatedAt,
            conv.UpdatedAt,
            count
        );
    }

    public async Task<bool> DeleteConversationAsync(Guid conversationId, Guid userId, CancellationToken ct = default)
    {
        var conv = await _context.AiConversations.FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId, ct);
        if (conv == null)
            return false;

        var messages = await _context.AiMessages.Where(m => m.ConversationId == conversationId).ToListAsync(ct);
        if (messages.Count > 0)
        {
            _context.AiMessages.RemoveRange(messages);
        }

        _context.AiConversations.Remove(conv);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<AiChatTurnResultDto> ProcessUserMessageAsync(
        Guid? conversationId,
        Guid userId,
        SendAiMessageRequest req,
        CancellationToken ct = default)
    {
        AiConversation? conv = null;

        if (conversationId.HasValue && conversationId.Value != Guid.Empty)
        {
            conv = await _context.AiConversations.FirstOrDefaultAsync(c => c.Id == conversationId.Value && c.UserId == userId, ct);
        }

        if (conv == null)
        {
            var initialTitle = req.Message.Trim();
            if (initialTitle.Length > 40)
                initialTitle = initialTitle[..40] + "...";

            conv = AiConversation.Create(userId, initialTitle);
            _context.AiConversations.Add(conv);
            await _context.SaveChangesAsync(ct);
        }
        else if (conv.Title == "Nueva conversación")
        {
            var smartTitle = req.Message.Trim();
            if (smartTitle.Length > 40)
                smartTitle = smartTitle[..40] + "...";
            conv.UpdateTitle(smartTitle);
        }

        var messages = await _context.AiMessages
            .Where(m => m.ConversationId == conv.Id)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync(ct);

        // 1. Registrar mensaje del usuario
        var userMessage = AiMessage.CreateUser(conv.Id, userId, req.Message);
        _context.AiMessages.Add(userMessage);
        messages.Add(userMessage);

        var newMessages = new List<AiMessageDto> { MapToDto(userMessage) };

        // 2. Comprimir contexto (últimos 20 turnos)
        var compressedHistory = AiContextCompressor.Compress(messages);
        var tools = _toolDispatcher.GetAvailableToolDefinitions();

        // 3. Invocación inicial a Gemini
        var response = await _geminiClient.SendChatTurnAsync(compressedHistory, tools, ct);

        if (response.ToolCalls.Count > 0)
        {
            // Turno de solicitud de herramientas
            var toolCallsJson = JsonSerializer.Serialize(response.ToolCalls);
            var toolCallMessage = AiMessage.CreateToolCall(conv.Id, userId, toolCallsJson);
            _context.AiMessages.Add(toolCallMessage);
            messages.Add(toolCallMessage);
            newMessages.Add(MapToDto(toolCallMessage));

            // Ejecución local de cada herramienta solicitada
            var toolResults = new List<AiToolExecutionResult>();
            foreach (var call in response.ToolCalls)
            {
                var result = await _toolDispatcher.DispatchAsync(userId, call, ct);
                toolResults.Add(result);
            }

            var toolResultsJson = JsonSerializer.Serialize(toolResults);
            var toolResultMessage = AiMessage.CreateToolResult(conv.Id, userId, toolResultsJson);
            _context.AiMessages.Add(toolResultMessage);
            messages.Add(toolResultMessage);
            newMessages.Add(MapToDto(toolResultMessage));

            // Segundo turno: síntesis final de Gemini con los resultados
            var updatedHistory = AiContextCompressor.Compress(messages);
            var finalResponse = await _geminiClient.SendChatTurnAsync(updatedHistory, tools, ct);

            var finalText = !string.IsNullOrWhiteSpace(finalResponse.Text)
                ? finalResponse.Text
                : "Operación completada exitosamente.";

            var assistantMessage = AiMessage.CreateModel(conv.Id, userId, finalText, toolCallsJson, toolResultsJson);
            _context.AiMessages.Add(assistantMessage);
            messages.Add(assistantMessage);
            newMessages.Add(MapToDto(assistantMessage));
        }
        else
        {
            var text = !string.IsNullOrWhiteSpace(response.Text)
                ? response.Text
                : "Entendido.";

            var assistantMessage = AiMessage.CreateModel(conv.Id, userId, text);
            _context.AiMessages.Add(assistantMessage);
            messages.Add(assistantMessage);
            newMessages.Add(MapToDto(assistantMessage));
        }

        conv.Touch();
        await _context.SaveChangesAsync(ct);

        return new AiChatTurnResultDto(conv.Id, conv.Title, newMessages);
    }

    private static AiMessageDto MapToDto(AiMessage m) => new(
        m.Id,
        m.Role.ToString().ToLowerInvariant(),
        m.Content,
        m.ToolCallsJson,
        m.ToolResultsJson,
        m.CreatedAt
    );
}
