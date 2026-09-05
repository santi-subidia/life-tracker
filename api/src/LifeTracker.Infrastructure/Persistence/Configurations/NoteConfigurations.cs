using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using LifeTracker.Domain.Notes;

namespace LifeTracker.Infrastructure.Persistence.Configurations;

public class NoteConfiguration : IEntityTypeConfiguration<Note>
{
    public void Configure(EntityTypeBuilder<Note> builder)
    {
        builder.ToTable("notes");

        builder.HasKey(n => n.Id);
        builder.Property(n => n.Id).HasColumnName("id");
        builder.Property(n => n.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(n => n.Title).HasColumnName("title").IsRequired();
        builder.Property(n => n.Slug).HasColumnName("slug").IsRequired();
        builder.Property(n => n.Content).HasColumnName("content").IsRequired();
        builder.Property(n => n.Tags).HasColumnName("tags").HasColumnType("text[]");
        builder.Property(n => n.Pinned).HasColumnName("pinned");
        builder.Property(n => n.IsStub).HasColumnName("is_stub");
        builder.Property(n => n.IsArchived).HasColumnName("is_archived");
        builder.Property(n => n.CreatedAt).HasColumnName("created_at");
        builder.Property(n => n.UpdatedAt).HasColumnName("updated_at");

        builder.HasIndex(n => new { n.UserId, n.Slug }).IsUnique();
        builder.HasIndex(n => new { n.UserId, n.UpdatedAt });
    }
}

public class NoteLinkConfiguration : IEntityTypeConfiguration<NoteLink>
{
    public void Configure(EntityTypeBuilder<NoteLink> builder)
    {
        builder.ToTable("note_links");

        builder.HasKey(nl => nl.Id);
        builder.Property(nl => nl.Id).HasColumnName("id");
        builder.Property(nl => nl.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(nl => nl.SourceNoteId).HasColumnName("source_note_id").IsRequired();
        builder.Property(nl => nl.TargetNoteId).HasColumnName("target_note_id").IsRequired();
        builder.Property(nl => nl.LinkText).HasColumnName("link_text");
        builder.Property(nl => nl.CreatedAt).HasColumnName("created_at");

        builder.HasOne<Note>()
            .WithMany()
            .HasForeignKey(nl => nl.SourceNoteId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Note>()
            .WithMany()
            .HasForeignKey(nl => nl.TargetNoteId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(nl => new { nl.SourceNoteId, nl.TargetNoteId }).IsUnique();
        builder.HasIndex(nl => nl.TargetNoteId);
        builder.HasIndex(nl => nl.SourceNoteId);
        builder.HasIndex(nl => new { nl.UserId, nl.TargetNoteId });
    }
}
