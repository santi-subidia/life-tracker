using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using LifeTracker.Application.Timeline.Dtos;
using LifeTracker.Application.Timeline.Services;

namespace LifeTracker.Api.Endpoints;

public static class DailyHubEndpoints
{
    public static RouteGroupBuilder MapDailyHubEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api")
            .WithTags("Daily Hub (Vista Hoy)");

        // 1. Obtener datos consolidados para la vista /hoy
        group.MapGet("/daily-hub/today", async (
            [FromServices] IDailyHubService dailyHubService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var hubData = await dailyHubService.GetTodayHubAsync(userId, ct);
            return Results.Ok(hubData);
        });

        // 2. Check-in de Ánimo y Energía de hoy
        group.MapPut("/daily-logs/today", async (
            [FromBody] UpdateDailyLogRequest request,
            [FromServices] IDailyHubService dailyHubService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            try
            {
                var updated = await dailyHubService.UpdateDailyLogTodayAsync(userId, request, ct);
                return Results.Ok(updated);
            }
            catch (ArgumentOutOfRangeException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        return group;
    }

    private static Guid GetUserId(HttpContext context) => EndpointAuthHelper.GetUserId(context);
}
