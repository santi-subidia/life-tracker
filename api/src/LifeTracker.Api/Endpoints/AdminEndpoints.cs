using Microsoft.AspNetCore.Mvc;
using LifeTracker.Application.Admin.Dtos;
using LifeTracker.Application.Common.Interfaces;

namespace LifeTracker.Api.Endpoints;

public static class AdminEndpoints
{
    public static RouteGroupBuilder MapAdminEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/admin/users")
            .RequireAuthorization("AdminOnly")
            .WithTags("Administración de Cuentas");

        // GET /api/admin/users - Listar usuarios y perfiles sincronizados
        group.MapGet("/", async (
            [FromServices] ISupabaseAdminAuthService adminService,
            CancellationToken ct) =>
        {
            var users = await adminService.ListUsersAsync(ct);
            return Results.Ok(users);
        });

        // POST /api/admin/users - Crear nuevo usuario
        group.MapPost("/", async (
            [FromBody] CreateAdminUserRequest request,
            [FromServices] ISupabaseAdminAuthService adminService,
            CancellationToken ct) =>
        {
            var createdUser = await adminService.CreateUserAsync(request, ct);
            return Results.Created($"/api/admin/users/{createdUser.Id}", createdUser);
        });

        // PATCH /api/admin/users/{id:guid}/role - Modificar rol RBAC (admin/user)
        group.MapPatch("/{id:guid}/role", async (
            Guid id,
            [FromBody] UpdateUserRoleRequest request,
            [FromServices] ISupabaseAdminAuthService adminService,
            CancellationToken ct) =>
        {
            await adminService.UpdateUserRoleAsync(id, request.Role, ct);
            return Results.NoContent();
        });

        // PATCH /api/admin/users/{id:guid}/status - Activar o suspender usuario
        group.MapPatch("/{id:guid}/status", async (
            Guid id,
            [FromBody] ToggleUserStatusRequest request,
            [FromServices] ISupabaseAdminAuthService adminService,
            CancellationToken ct) =>
        {
            await adminService.ToggleUserStatusAsync(id, request.IsActive, ct);
            return Results.NoContent();
        });

        // POST /api/admin/users/{id:guid}/reset-password - Restablecer contraseña
        group.MapPost("/{id:guid}/reset-password", async (
            Guid id,
            [FromBody] ResetUserPasswordRequest request,
            [FromServices] ISupabaseAdminAuthService adminService,
            CancellationToken ct) =>
        {
            await adminService.ResetUserPasswordAsync(id, request.NewPassword, ct);
            return Results.NoContent();
        });

        return group;
    }
}
