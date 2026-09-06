using LifeTracker.Domain.Common;

namespace LifeTracker.Domain.Ai;

public class AiConversation : BaseEntity
{
    private readonly List<AiMessage> _messages = [];

    public Guid UserId { get; private set; }
    public string Title { get; private set; } = "Nueva conversación";
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    public IReadOnlyCollection<AiMessage> Messages => _messages.AsReadOnly();

    private AiConversation() { }

    public AiConversation(Guid userId, string? title = null)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("El ID de usuario no puede estar vacío.", nameof(userId));

        UserId = userId;
        Title = string.IsNullOrWhiteSpace(title) ? "Nueva conversación" : title.Trim();
        UpdatedAt = DateTime.UtcNow;
    }

    public static AiConversation Create(Guid userId, string? title = null)
    {
        return new AiConversation(userId, title);
    }

    public void AddMessage(AiMessage message)
    {
        ArgumentNullException.ThrowIfNull(message);
        _messages.Add(message);
        UpdatedAt = DateTime.UtcNow;
    }

    public AiMessage AddMessage(
        AiMessageRole role,
        string content,
        string? toolCallsJson = null,
        string? toolResultsJson = null)
    {
        var message = new AiMessage(Id, UserId, role, content, toolCallsJson, toolResultsJson);
        _messages.Add(message);
        UpdatedAt = DateTime.UtcNow;
        return message;
    }

    public void UpdateTitle(string title)
    {
        Title = string.IsNullOrWhiteSpace(title) ? "Nueva conversación" : title.Trim();
        UpdatedAt = DateTime.UtcNow;
    }

    public void Touch()
    {
        UpdatedAt = DateTime.UtcNow;
    }
}
