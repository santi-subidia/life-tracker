using System;
using System.Linq;
using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Infrastructure.Identity;
using LifeTracker.Api.Extensions;

namespace LifeTracker.Api.Endpoints;

public record LoginRequest(string Email, string Password);
public record LoginResponse(string Token, string Role, string FullName, string Email, Guid UserId);
public record UserInfoResponse(Guid UserId, string Email, string FullName, string Role);

public static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuthEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/auth")
            .WithTags("Autenticación (ASP.NET Core Identity)");

        group.MapPost("/login", async (
            [FromBody] LoginRequest request,
            [FromServices] UserManager<ApplicationUser> userManager,
            [FromServices] IJwtTokenGenerator tokenGenerator,
            CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return Results.BadRequest(new { error = "Email y contraseña requeridos." });
            }

            var cleanEmail = request.Email.Trim().ToLowerInvariant();
            var user = await userManager.FindByEmailAsync(cleanEmail);

            if (user == null || !user.IsActive)
            {
                return Results.Json(new { error = "Credenciales incorrectas o cuenta inactiva." }, statusCode: StatusCodes.Status401Unauthorized);
            }

            var passwordValid = await userManager.CheckPasswordAsync(user, request.Password);
            if (!passwordValid)
            {
                return Results.Json(new { error = "Credenciales incorrectas o cuenta inactiva." }, statusCode: StatusCodes.Status401Unauthorized);
            }

            var roles = await userManager.GetRolesAsync(user);
            var primaryRole = roles.FirstOrDefault() ?? "user";
            var token = tokenGenerator.GenerateToken(user.Id, user.Email!, user.FullName, roles);

            return Results.Ok(new LoginResponse(
                Token: token,
                Role: primaryRole,
                FullName: user.FullName ?? user.Email!,
                Email: user.Email!,
                UserId: user.Id
            ));
        }).AllowAnonymous().RequireRateLimiting(RateLimitingExtensions.PolicyAuthLogin);

        group.MapGet("/me", async (
            HttpContext context,
            [FromServices] UserManager<ApplicationUser> userManager) =>
        {
            var userId = EndpointAuthHelper.GetUserId(context);
            var user = await userManager.FindByIdAsync(userId.ToString());
            if (user == null)
            {
                return Results.NotFound(new { error = "Usuario no encontrado." });
            }

            var roles = await userManager.GetRolesAsync(user);
            return Results.Ok(new UserInfoResponse(
                UserId: user.Id,
                Email: user.Email!,
                FullName: user.FullName ?? user.Email!,
                Role: roles.FirstOrDefault() ?? "user"
            ));
        }).RequireAuthorization().RequireRateLimiting(RateLimitingExtensions.PolicyGeneralApi);

        return group;
    }
}
