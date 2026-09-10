using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using LifeTracker.Domain.Academics;

namespace LifeTracker.Infrastructure.Persistence.Configurations;

public class CareerPlanConfiguration : IEntityTypeConfiguration<CareerPlan>
{
    public void Configure(EntityTypeBuilder<CareerPlan> builder)
    {
        builder.ToTable("career_plans");

        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasColumnName("id");
        builder.Property(p => p.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(p => p.Name).HasColumnName("name").IsRequired();
        builder.Property(p => p.University).HasColumnName("university");
        builder.Property(p => p.TotalSubjects).HasColumnName("total_subjects").HasDefaultValue(0);
        builder.Property(p => p.TotalCredits).HasColumnName("total_credits");
        builder.Property(p => p.IsActive).HasColumnName("is_active").HasDefaultValue(false);
        builder.Property(p => p.CreatedAt).HasColumnName("created_at");
        builder.Property(p => p.UpdatedAt).HasColumnName("updated_at");

        builder.HasMany(p => p.Subjects)
            .WithOne()
            .HasForeignKey(s => s.CareerPlanId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(p => new { p.UserId, p.IsActive })
            .HasDatabaseName("idx_career_plans_user_active");
    }
}

public class CurriculumSubjectConfiguration : IEntityTypeConfiguration<CurriculumSubject>
{
    public void Configure(EntityTypeBuilder<CurriculumSubject> builder)
    {
        builder.ToTable("curriculum_subjects");

        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasColumnName("id");
        builder.Property(s => s.CareerPlanId).HasColumnName("career_plan_id").IsRequired();
        builder.Property(s => s.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(s => s.Code).HasColumnName("code");
        builder.Property(s => s.Name).HasColumnName("name").IsRequired();
        builder.Property(s => s.YearLevel).HasColumnName("year_level").IsRequired();
        builder.Property(s => s.PeriodNumber).HasColumnName("period_number").IsRequired();
        builder.Property(s => s.Credits).HasColumnName("credits");
        builder.Property(s => s.IsOptional).HasColumnName("is_optional").HasDefaultValue(false);
        builder.Property(s => s.OrderIndex).HasColumnName("order_index").HasDefaultValue(0);
        builder.Property(s => s.CreatedAt).HasColumnName("created_at");
        builder.Property(s => s.UpdatedAt).HasColumnName("updated_at");

        builder.HasMany(s => s.Prerequisites)
            .WithOne()
            .HasForeignKey(p => p.SubjectId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(s => new { s.CareerPlanId, s.YearLevel, s.PeriodNumber })
            .HasDatabaseName("idx_curriculum_subjects_plan_year_period");

        builder.HasIndex(s => s.UserId)
            .HasDatabaseName("idx_curriculum_subjects_user");
    }
}

public class CurriculumPrerequisiteConfiguration : IEntityTypeConfiguration<CurriculumPrerequisite>
{
    public void Configure(EntityTypeBuilder<CurriculumPrerequisite> builder)
    {
        builder.ToTable("curriculum_prerequisites");

        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasColumnName("id");
        builder.Property(p => p.CareerPlanId).HasColumnName("career_plan_id").IsRequired();
        builder.Property(p => p.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(p => p.SubjectId).HasColumnName("subject_id").IsRequired();
        builder.Property(p => p.RequiredSubjectId).HasColumnName("required_subject_id").IsRequired();
        builder.Property(p => p.CreatedAt).HasColumnName("created_at");

        builder.Property(p => p.RequirementType)
            .HasColumnName("requirement_type")
            .HasConversion(
                v => FormatRequirementType(v),
                v => ParseRequirementType(v))
            .IsRequired();

        builder.HasIndex(p => p.SubjectId)
            .HasDatabaseName("idx_curriculum_prereq_subject");

        builder.HasIndex(p => p.RequiredSubjectId)
            .HasDatabaseName("idx_curriculum_prereq_required");

        builder.HasIndex(p => p.CareerPlanId)
            .HasDatabaseName("idx_curriculum_prereq_plan");

        builder.HasIndex(p => p.UserId)
            .HasDatabaseName("idx_curriculum_prereq_user");

        builder.HasIndex(p => new { p.SubjectId, p.RequiredSubjectId })
            .IsUnique()
            .HasDatabaseName("uq_curriculum_prerequisites");
    }

    private static string FormatRequirementType(PrerequisiteRequirementType type) => type switch
    {
        PrerequisiteRequirementType.RequiereAprobada => "requiere_aprobada",
        _ => "requiere_regularizada"
    };

    private static PrerequisiteRequirementType ParseRequirementType(string type) => type switch
    {
        "requiere_aprobada" => PrerequisiteRequirementType.RequiereAprobada,
        _ => PrerequisiteRequirementType.RequiereRegularizada
    };
}
