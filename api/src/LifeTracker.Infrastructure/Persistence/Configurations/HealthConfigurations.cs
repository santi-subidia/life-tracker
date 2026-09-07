using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using LifeTracker.Domain.Health;

namespace LifeTracker.Infrastructure.Persistence.Configurations;

public class HealthStudyConfiguration : IEntityTypeConfiguration<HealthStudy>
{
    public void Configure(EntityTypeBuilder<HealthStudy> builder)
    {
        builder.ToTable("health_studies");

        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasColumnName("id");
        builder.Property(s => s.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(s => s.StudyType).HasColumnName("study_type").IsRequired();
        builder.Property(s => s.StudyDate).HasColumnName("study_date").IsRequired();
        builder.Property(s => s.FileUrl).HasColumnName("file_url").IsRequired();
        builder.Property(s => s.Institution).HasColumnName("institution");
        builder.Property(s => s.Summary).HasColumnName("summary");
        builder.Property(s => s.FileHash).HasColumnName("file_hash");
        builder.Property(s => s.CreatedAt).HasColumnName("created_at");

        builder.HasIndex(s => new { s.UserId, s.FileHash })
            .HasDatabaseName("ix_health_studies_user_hash");

        builder.HasMany(s => s.ClinicalValues)
            .WithOne(v => v.Study)
            .HasForeignKey(v => v.StudyId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class HealthClinicalValueConfiguration : IEntityTypeConfiguration<HealthClinicalValue>
{
    public void Configure(EntityTypeBuilder<HealthClinicalValue> builder)
    {
        builder.ToTable("health_clinical_values");

        builder.HasKey(v => v.Id);
        builder.Property(v => v.Id).HasColumnName("id");
        builder.Property(v => v.StudyId).HasColumnName("study_id").IsRequired();
        builder.Property(v => v.MetricName).HasColumnName("metric_name").IsRequired();
        builder.Property(v => v.Value).HasColumnName("value").IsRequired();
        builder.Property(v => v.Unit).HasColumnName("unit");
        builder.Property(v => v.Category).HasColumnName("category");
        builder.Property(v => v.IsAbnormal).HasColumnName("is_abnormal");
        builder.Property(v => v.CreatedAt).HasColumnName("created_at");
    }
}
