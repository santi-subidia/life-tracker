using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using LifeTracker.Application.Profile.Services;

namespace LifeTracker.Api.Endpoints;

public static class ProfileEndpoints
{
    public static RouteGroupBuilder MapProfileEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/profile")
            .WithTags("Perfil & Resumen Analítico");

        group.MapGet("/summary", async (
            [FromQuery] string? period,
            [FromServices] IProfileService profileService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var summary = await profileService.GetSummaryAsync(userId, period, ct);
            return Results.Ok(summary);
        });

        return group;
    }

    private static Guid GetUserId(HttpContext context)
    {
        var claim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? context.User.FindFirst("sub")?.Value;

        if (Guid.TryParse(claim, out var jwtUserId))
            return jwtUserId;

        if (context.Request.Headers.TryGetValue("X-User-Id", out var headerValue) 
            && Guid.TryParse(headerValue, out var headerUserId))
        {
            return headerUserId;
        }

        return Guid.Parse("00000000-0000-0000-0000-000000000001");
    }
}
