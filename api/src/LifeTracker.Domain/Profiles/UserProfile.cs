using LifeTracker.Domain.Common;

namespace LifeTracker.Domain.Profiles;

public class UserProfile : BaseEntity
{
    public string Email { get; private set; } = string.Empty;
    public string Role { get; private set; } = "user";
    public string? FullName { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    private UserProfile() { }

    public UserProfile(Guid id, string email, string role = "user", string? fullName = null, bool isActive = true)
    {
        Id = id;
        Email = email;
        Role = NormalizeRole(role);
        FullName = fullName;
        IsActive = isActive;
        CreatedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateRole(string newRole)
    {
        Role = NormalizeRole(newRole);
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetActive(bool isActive)
    {
        IsActive = isActive;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateProfile(string? fullName, string? email = null)
    {
        if (!string.IsNullOrWhiteSpace(email))
        {
            Email = email;
        }
        FullName = fullName;
        UpdatedAt = DateTime.UtcNow;
    }

    private static string NormalizeRole(string role)
    {
        var normalized = role.Trim().ToLowerInvariant();
        return normalized == "admin" ? "admin" : "user";
    }
}
