using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using LifeTracker.Domain.Academics;

namespace LifeTracker.Infrastructure.Persistence.Configurations;

public class AcademicSubjectConfiguration : IEntityTypeConfiguration<AcademicSubject>
{
    public void Configure(EntityTypeBuilder<AcademicSubject> builder)
    {
        builder.ToTable("academic_subjects");

        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasColumnName("id");
        builder.Property(s => s.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(s => s.CurriculumSubjectId).HasColumnName("curriculum_subject_id");
        builder.Property(s => s.Name).HasColumnName("name").IsRequired();
        builder.Property(s => s.Code).HasColumnName("code");
        builder.Property(s => s.Term).HasColumnName("term").IsRequired();
        builder.Property(s => s.Professor).HasColumnName("professor");
        builder.Property(s => s.Color).HasColumnName("color");
        builder.Property(s => s.CreatedAt).HasColumnName("created_at");
        builder.Property(s => s.UpdatedAt).HasColumnName("updated_at");

        builder.Property(s => s.Status)
            .HasColumnName("status")
            .HasConversion(
                v => FormatSubjectStatus(v),
                v => ParseSubjectStatus(v))
            .IsRequired();

        builder.HasOne<CurriculumSubject>()
            .WithMany()
            .HasForeignKey(s => s.CurriculumSubjectId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(s => s.CurriculumSubjectId)
            .HasDatabaseName("idx_academic_subjects_curriculum_id");

        builder.HasIndex(s => new { s.UserId, s.Term });
    }

    private static string FormatSubjectStatus(SubjectStatus status) => status switch
    {
        SubjectStatus.Aprobada => "aprobada",
        SubjectStatus.Regularizada => "regularizada",
        SubjectStatus.Recursar => "recursar",
        _ => "en_curso"
    };

    private static SubjectStatus ParseSubjectStatus(string status) => status switch
    {
        "aprobada" => SubjectStatus.Aprobada,
        "regularizada" => SubjectStatus.Regularizada,
        "recursar" => SubjectStatus.Recursar,
        _ => SubjectStatus.EnCurso
    };
}

public class AcademicMilestoneConfiguration : IEntityTypeConfiguration<AcademicMilestone>
{
    public void Configure(EntityTypeBuilder<AcademicMilestone> builder)
    {
        builder.ToTable("academic_milestones");

        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).HasColumnName("id");
        builder.Property(m => m.SubjectId).HasColumnName("subject_id").IsRequired();
        builder.Property(m => m.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(m => m.Title).HasColumnName("title").IsRequired();
        builder.Property(m => m.DueDate).HasColumnName("due_date").IsRequired();
        builder.Property(m => m.Grade).HasColumnName("grade").HasColumnType("numeric(4,2)");
        builder.Property(m => m.WeightPercentage).HasColumnName("weight_percentage").HasColumnType("numeric(5,2)");
        builder.Property(m => m.ReplacesMilestoneId).HasColumnName("replaces_milestone_id");
        builder.Property(m => m.Notes).HasColumnName("notes");
        builder.Property(m => m.CreatedAt).HasColumnName("created_at");
        builder.Property(m => m.UpdatedAt).HasColumnName("updated_at");

        builder.Property(m => m.MilestoneType)
            .HasColumnName("milestone_type")
            .HasConversion(
                v => FormatMilestoneType(v),
                v => ParseMilestoneType(v))
            .IsRequired();

        builder.Property(m => m.Status)
            .HasColumnName("status")
            .HasConversion(
                v => FormatMilestoneStatus(v),
                v => ParseMilestoneStatus(v))
            .IsRequired();

        builder.HasOne<AcademicSubject>()
            .WithMany()
            .HasForeignKey(m => m.SubjectId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<AcademicMilestone>()
            .WithMany()
            .HasForeignKey(m => m.ReplacesMilestoneId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(m => new { m.UserId, m.DueDate });
    }

    private static string FormatMilestoneType(MilestoneType type) => type switch
    {
        MilestoneType.Entrega => "entrega",
        MilestoneType.Final => "final",
        MilestoneType.Recuperatorio => "recuperatorio",
        _ => "parcial"
    };

    private static MilestoneType ParseMilestoneType(string type) => type switch
    {
        "entrega" => MilestoneType.Entrega,
        "final" => MilestoneType.Final,
        "recuperatorio" => MilestoneType.Recuperatorio,
        _ => MilestoneType.Parcial
    };

    private static string FormatMilestoneStatus(MilestoneStatus status) => status switch
    {
        MilestoneStatus.Aprobado => "aprobado",
        MilestoneStatus.Reprobado => "reprobado",
        _ => "pendiente"
    };

    private static MilestoneStatus ParseMilestoneStatus(string status) => status switch
    {
        "aprobado" => MilestoneStatus.Aprobado,
        "reprobado" => MilestoneStatus.Reprobado,
        _ => MilestoneStatus.Pendiente
    };
}
