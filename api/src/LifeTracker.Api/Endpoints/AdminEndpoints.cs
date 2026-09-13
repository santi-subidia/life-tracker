using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using LifeTracker.Application.Admin.Dtos;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Domain.Profiles;
using LifeTracker.Infrastructure.Identity;
using LifeTracker.Api.Extensions;

namespace LifeTracker.Api.Endpoints;

public static class AdminEndpoints
{
    public static RouteGroupBuilder MapAdminEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/admin/users")
            .RequireAuthorization("AdminOnly")
            .WithTags("Administración de Cuentas (ASP.NET Core Identity)");

        // GET /api/admin/users - Listar usuarios
        group.MapGet("/", async (
            [FromServices] UserManager<ApplicationUser> userManager) =>
        {
            var users = await userManager.Users.OrderByDescending(u => u.CreatedAt).ToListAsync();
            var dtos = new List<AdminUserDto>();

            foreach (var u in users)
            {
                var roles = await userManager.GetRolesAsync(u);
                dtos.Add(new AdminUserDto(
                    Id: u.Id,
                    Email: u.Email!,
                    FullName: u.FullName,
                    Role: roles.FirstOrDefault() ?? "user",
                    IsActive: u.IsActive,
                    CreatedAt: u.CreatedAt,
                    UpdatedAt: u.UpdatedAt
                ));
            }

            return Results.Ok(dtos);
        });

        // POST /api/admin/users - Crear nuevo usuario
        group.MapPost("/", async (
            [FromBody] CreateAdminUserRequest request,
            [FromServices] UserManager<ApplicationUser> userManager,
            [FromServices] RoleManager<ApplicationRole> roleManager,
            [FromServices] ILifeTrackerDbContext dbContext) =>
        {
            var cleanEmail = request.Email.Trim().ToLowerInvariant();
            var existing = await userManager.FindByEmailAsync(cleanEmail);
            if (existing != null)
            {
                return Results.Conflict(new { error = "El usuario ya existe con ese correo electrónico." });
            }

            var role = string.Equals(request.Role, "admin", StringComparison.OrdinalIgnoreCase) ? "admin" : "user";
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new ApplicationRole(role));
            }

            var user = new ApplicationUser
            {
                UserName = cleanEmail,
                Email = cleanEmail,
                EmailConfirmed = true,
                FullName = request.FullName,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var createResult = await userManager.CreateAsync(user, request.Password);
            if (!createResult.Succeeded)
            {
                var errors = string.Join(", ", createResult.Errors.Select(e => e.Description));
                return Results.BadRequest(new { error = errors });
            }

            await userManager.AddToRoleAsync(user, role);

            // Sincronizar también en _dbContext.Profiles
            var existingProfile = await dbContext.Profiles.FirstOrDefaultAsync(p => p.Id == user.Id);
            if (existingProfile == null)
            {
                var profile = new UserProfile(user.Id, user.Email!, role, user.FullName, isActive: true);
                dbContext.Profiles.Add(profile);
            }
            else
            {
                existingProfile.UpdateProfile(user.FullName, user.Email);
                existingProfile.UpdateRole(role);
                existingProfile.SetActive(true);
            }
            await dbContext.SaveChangesAsync();

            var dto = new AdminUserDto(
                Id: user.Id,
                Email: user.Email!,
                FullName: user.FullName,
                Role: role,
                IsActive: user.IsActive,
                CreatedAt: user.CreatedAt,
                UpdatedAt: user.UpdatedAt
            );

            return Results.Created($"/api/admin/users/{user.Id}", dto);
        }).RequireRateLimiting(RateLimitingExtensions.PolicyAdminSensitive);

        // PATCH /api/admin/users/{id:guid}/role - Modificar rol
        group.MapPatch("/{id:guid}/role", async (
            Guid id,
            [FromBody] UpdateUserRoleRequest request,
            [FromServices] UserManager<ApplicationUser> userManager,
            [FromServices] RoleManager<ApplicationRole> roleManager) =>
        {
            var user = await userManager.FindByIdAsync(id.ToString());
            if (user == null) return Results.NotFound(new { error = "Usuario no encontrado." });

            var newRole = string.Equals(request.Role, "admin", StringComparison.OrdinalIgnoreCase) ? "admin" : "user";
            if (!await roleManager.RoleExistsAsync(newRole))
            {
                await roleManager.CreateAsync(new ApplicationRole(newRole));
            }

            var currentRoles = await userManager.GetRolesAsync(user);
            await userManager.RemoveFromRolesAsync(user, currentRoles);
            await userManager.AddToRoleAsync(user, newRole);

            user.UpdatedAt = DateTime.UtcNow;
            await userManager.UpdateAsync(user);

            return Results.NoContent();
        });

        // PATCH /api/admin/users/{id:guid}/status - Activar o suspender usuario
        group.MapPatch("/{id:guid}/status", async (
            Guid id,
            [FromBody] ToggleUserStatusRequest request,
            [FromServices] UserManager<ApplicationUser> userManager) =>
        {
            var user = await userManager.FindByIdAsync(id.ToString());
            if (user == null) return Results.NotFound(new { error = "Usuario no encontrado." });

            user.IsActive = request.IsActive;
            user.UpdatedAt = DateTime.UtcNow;
            await userManager.UpdateAsync(user);

            return Results.NoContent();
        });

        // POST /api/admin/users/{id:guid}/reset-password - Restablecer contraseña
        group.MapPost("/{id:guid}/reset-password", async (
            Guid id,
            [FromBody] ResetUserPasswordRequest request,
            [FromServices] UserManager<ApplicationUser> userManager) =>
        {
            var user = await userManager.FindByIdAsync(id.ToString());
            if (user == null) return Results.NotFound(new { error = "Usuario no encontrado." });

            var token = await userManager.GeneratePasswordResetTokenAsync(user);
            var result = await userManager.ResetPasswordAsync(user, token, request.NewPassword);
            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                return Results.BadRequest(new { error = errors });
            }

            user.UpdatedAt = DateTime.UtcNow;
            await userManager.UpdateAsync(user);

            return Results.NoContent();
        }).RequireRateLimiting(RateLimitingExtensions.PolicyAdminSensitive);

        return group;
    }
}
