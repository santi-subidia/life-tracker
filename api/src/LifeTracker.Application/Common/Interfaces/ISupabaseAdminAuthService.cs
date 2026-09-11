using LifeTracker.Application.Admin.Dtos;

namespace LifeTracker.Application.Common.Interfaces;

public interface ISupabaseAdminAuthService
{
    Task<IReadOnlyList<AdminUserDto>> ListUsersAsync(CancellationToken ct);
    Task<AdminUserDto> CreateUserAsync(CreateAdminUserRequest request, CancellationToken ct);
    Task UpdateUserRoleAsync(Guid userId, string newRole, CancellationToken ct);
    Task ToggleUserStatusAsync(Guid userId, bool isActive, CancellationToken ct);
    Task ResetUserPasswordAsync(Guid userId, string newPassword, CancellationToken ct);
}
