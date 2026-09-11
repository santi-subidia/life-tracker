using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using LifeTracker.Domain.Profiles;

namespace LifeTracker.Infrastructure.Persistence.Configurations;

public class ProfileConfiguration : IEntityTypeConfiguration<UserProfile>
{
    public void Configure(EntityTypeBuilder<UserProfile> builder)
    {
        builder.ToTable("profiles", "public");

        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(p => p.Email).HasColumnName("email").IsRequired();
        builder.Property(p => p.Role).HasColumnName("role").HasDefaultValue("user").IsRequired();
        builder.Property(p => p.FullName).HasColumnName("full_name");
        builder.Property(p => p.IsActive).HasColumnName("is_active").HasDefaultValue(true).IsRequired();
        builder.Property(p => p.CreatedAt).HasColumnName("created_at");
        builder.Property(p => p.UpdatedAt).HasColumnName("updated_at");
    }
}
