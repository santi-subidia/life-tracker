namespace LifeTracker.Application.Admin.Dtos;

public record AdminUserDto(
    Guid Id,
    string Email,
    string? FullName,
    string Role,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public record CreateAdminUserRequest(
    string Email,
    string Password,
    string? FullName = null,
    string? Role = "user"
);

public record UpdateUserRoleRequest(
    string Role
);

public record ToggleUserStatusRequest(
    bool IsActive
);

public record ResetUserPasswordRequest(
    string NewPassword
);
