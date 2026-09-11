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

    private static Guid GetUserId(HttpContext context) => EndpointAuthHelper.GetUserId(context);
}
