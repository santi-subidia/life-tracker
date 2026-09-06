using LifeTracker.Domain.Ai;
using Xunit;

namespace LifeTracker.Domain.Tests;

public class AiConversationTests
{
    [Fact]
    public void Create_WithDefaultTitle_ShouldSetDefaultAndUtcDates()
    {
        var userId = Guid.NewGuid();
        var conv = AiConversation.Create(userId);

        Assert.Equal(userId, conv.UserId);
        Assert.Equal("Nueva conversación", conv.Title);
        Assert.NotEqual(Guid.Empty, conv.Id);
        Assert.Empty(conv.Messages);
        Assert.True((DateTime.UtcNow - conv.CreatedAt).TotalSeconds < 5);
        Assert.True((DateTime.UtcNow - conv.UpdatedAt).TotalSeconds < 5);
    }

    [Fact]
    public void Create_WithCustomTitle_ShouldTrimAndSet()
    {
        var userId = Guid.NewGuid();
        var conv = AiConversation.Create(userId, "  Planificación Semanal  ");

        Assert.Equal("Planificación Semanal", conv.Title);
    }

    [Fact]
    public void Create_WithEmptyUserId_ShouldThrowArgumentException()
    {
        Assert.Throws<ArgumentException>(() => AiConversation.Create(Guid.Empty));
    }

    [Fact]
    public void AddMessage_ShouldAddMessageAndTouchUpdatedAt()
    {
        var userId = Guid.NewGuid();
        var conv = AiConversation.Create(userId);
        var originalUpdatedAt = conv.UpdatedAt;

        // Esperar un instante para verificar mutación temporal
        var message = conv.AddMessage(AiMessageRole.User, "¿Cómo están mis hábitos hoy?");

        Assert.Single(conv.Messages);
        Assert.Equal(conv.Id, message.ConversationId);
        Assert.Equal(userId, message.UserId);
        Assert.Equal(AiMessageRole.User, message.Role);
        Assert.Equal("¿Cómo están mis hábitos hoy?", message.Content);
        Assert.True(conv.UpdatedAt >= originalUpdatedAt);
    }

    [Fact]
    public void UpdateTitle_WithValidTitle_ShouldUpdateAndTouch()
    {
        var conv = AiConversation.Create(Guid.NewGuid());
        conv.UpdateTitle("  Resumen de Exámenes  ");

        Assert.Equal("Resumen de Exámenes", conv.Title);
    }

    [Fact]
    public void UpdateTitle_WithEmptyTitle_ShouldFallbackToDefault()
    {
        var conv = AiConversation.Create(Guid.NewGuid(), "Título inicial");
        conv.UpdateTitle("   ");

        Assert.Equal("Nueva conversación", conv.Title);
    }

    [Fact]
    public void AiMessage_Factories_ShouldCreateExpectedRolesAndDefaults()
    {
        var convId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        var userMsg = AiMessage.CreateUser(convId, userId, "Hola");
        Assert.Equal(AiMessageRole.User, userMsg.Role);
        Assert.Equal("[]", userMsg.ToolCallsJson);
        Assert.Equal("[]", userMsg.ToolResultsJson);

        var modelMsg = AiMessage.CreateModel(convId, userId, "Respuesta");
        Assert.Equal(AiMessageRole.Model, modelMsg.Role);

        var toolCallMsg = AiMessage.CreateToolCall(convId, userId, "[{\"callId\":\"1\"}]");
        Assert.Equal(AiMessageRole.ToolCall, toolCallMsg.Role);
        Assert.Equal("[{\"callId\":\"1\"}]", toolCallMsg.ToolCallsJson);

        var toolResultMsg = AiMessage.CreateToolResult(convId, userId, "[{\"success\":true}]");
        Assert.Equal(AiMessageRole.ToolResult, toolResultMsg.Role);
        Assert.Equal("[{\"success\":true}]", toolResultMsg.ToolResultsJson);
    }
}
