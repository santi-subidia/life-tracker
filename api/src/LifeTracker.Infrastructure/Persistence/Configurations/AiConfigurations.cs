using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using LifeTracker.Domain.Ai;

namespace LifeTracker.Infrastructure.Persistence.Configurations;

public class AiConversationConfiguration : IEntityTypeConfiguration<AiConversation>
{
    public void Configure(EntityTypeBuilder<AiConversation> builder)
    {
        builder.ToTable("ai_conversations");

        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id");
        builder.Property(c => c.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(c => c.Title).HasColumnName("title").HasMaxLength(250).IsRequired();
        builder.Property(c => c.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(c => c.UpdatedAt).HasColumnName("updated_at").IsRequired();

        builder.HasMany(c => c.Messages)
            .WithOne()
            .HasForeignKey(m => m.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(c => new { c.UserId, c.UpdatedAt });
    }
}

public class AiMessageConfiguration : IEntityTypeConfiguration<AiMessage>
{
    public void Configure(EntityTypeBuilder<AiMessage> builder)
    {
        builder.ToTable("ai_messages");

        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).HasColumnName("id");
        builder.Property(m => m.ConversationId).HasColumnName("conversation_id").IsRequired();
        builder.Property(m => m.UserId).HasColumnName("user_id").IsRequired();

        builder.Property(m => m.Role)
            .HasColumnName("role")
            .HasConversion(
                v => FormatRole(v),
                v => ParseRole(v))
            .IsRequired();

        builder.Property(m => m.Content).HasColumnName("content").IsRequired();
        builder.Property(m => m.ToolCallsJson).HasColumnName("tool_calls").HasColumnType("jsonb").IsRequired();
        builder.Property(m => m.ToolResultsJson).HasColumnName("tool_results").HasColumnType("jsonb").IsRequired();
        builder.Property(m => m.CreatedAt).HasColumnName("created_at").IsRequired();

        builder.HasIndex(m => new { m.ConversationId, m.CreatedAt });
    }

    private static string FormatRole(AiMessageRole role) => role switch
    {
        AiMessageRole.Model => "model",
        AiMessageRole.ToolCall => "tool_call",
        AiMessageRole.ToolResult => "tool_result",
        AiMessageRole.System => "system",
        _ => "user"
    };

    private static AiMessageRole ParseRole(string role) => role?.ToLowerInvariant() switch
    {
        "model" => AiMessageRole.Model,
        "tool_call" => AiMessageRole.ToolCall,
        "tool_result" => AiMessageRole.ToolResult,
        "system" => AiMessageRole.System,
        _ => AiMessageRole.User
    };
}
