using System.Security.Claims;
using System.Text.Json;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;

namespace LifeTracker.Api.Extensions;

public static class RateLimitingExtensions
{
    public const string PolicyAuthLogin = "auth-login";
    public const string PolicyAiAssistant = "ai-assistant";
    public const string PolicyAdminSensitive = "admin-sensitive";
    public const string PolicyGeneralApi = "general-api";

    public static SlidingWindowRateLimiterOptions GetAuthLoginOptions() => new()
    {
        PermitLimit = 5,
        Window = TimeSpan.FromMinutes(1),
        SegmentsPerWindow = 3,
        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
        QueueLimit = 0
    };

    public static SlidingWindowRateLimiterOptions GetAiAssistantOptions() => new()
    {
        PermitLimit = 10,
        Window = TimeSpan.FromMinutes(1),
        SegmentsPerWindow = 2,
        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
        QueueLimit = 0
    };

    public static FixedWindowRateLimiterOptions GetAdminSensitiveOptions() => new()
    {
        PermitLimit = 10,
        Window = TimeSpan.FromMinutes(1),
        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
        QueueLimit = 0
    };

    public static SlidingWindowRateLimiterOptions GetGeneralApiAuthenticatedOptions() => new()
    {
        PermitLimit = 120,
        Window = TimeSpan.FromMinutes(1),
        SegmentsPerWindow = 2,
        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
        QueueLimit = 0
    };

    public static SlidingWindowRateLimiterOptions GetGeneralApiAnonymousOptions() => new()
    {
        PermitLimit = 30,
        Window = TimeSpan.FromMinutes(1),
        SegmentsPerWindow = 2,
        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
        QueueLimit = 0
    };

    public static IServiceCollection AddAppRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            // 1. Política para /api/auth/login: Protección de fuerza bruta (5 intentos / 1 min por IP)
            options.AddPolicy(PolicyAuthLogin, httpContext =>
            {
                var ip = GetClientIpAddress(httpContext);
                return RateLimitPartition.GetSlidingWindowLimiter(
                    $"login_{ip}",
                    _ => GetAuthLoginOptions());
            });

            // 2. Política para /api/ai/... y /api/health/extract: Protección de cuota LLM (10 req / 1 min por usuario)
            options.AddPolicy(PolicyAiAssistant, httpContext =>
            {
                var partitionKey = GetUserOrIpPartitionKey(httpContext);
                return RateLimitPartition.GetSlidingWindowLimiter(
                    $"ai_{partitionKey}",
                    _ => GetAiAssistantOptions());
            });

            // 3. Política para endpoints de administración críticos (10 req / 1 min por admin)
            options.AddPolicy(PolicyAdminSensitive, httpContext =>
            {
                var partitionKey = GetUserOrIpPartitionKey(httpContext);
                return RateLimitPartition.GetFixedWindowLimiter(
                    $"admin_{partitionKey}",
                    _ => GetAdminSensitiveOptions());
            });

            // 4. Política General de la API: 120 req/min para autenticados, 30 req/min para anónimos
            options.AddPolicy(PolicyGeneralApi, httpContext =>
            {
                var isAuthenticated = httpContext.User.Identity?.IsAuthenticated == true;
                if (isAuthenticated)
                {
                    var partitionKey = GetUserOrIpPartitionKey(httpContext);
                    return RateLimitPartition.GetSlidingWindowLimiter(
                        $"gen_auth_{partitionKey}",
                        _ => GetGeneralApiAuthenticatedOptions());
                }
                else
                {
                    var ip = GetClientIpAddress(httpContext);
                    return RateLimitPartition.GetSlidingWindowLimiter(
                        $"gen_anon_{ip}",
                        _ => GetGeneralApiAnonymousOptions());
                }
            });

            // Formato de rechazo unificado RFC 7807 (ProblemDetails) con Retry-After
            options.OnRejected = async (context, cancellationToken) =>
            {
                context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                context.HttpContext.Response.ContentType = "application/problem+json";

                var retryAfterSeconds = 60;
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfterTimeSpan))
                {
                    retryAfterSeconds = Math.Max(1, (int)retryAfterTimeSpan.TotalSeconds);
                }

                context.HttpContext.Response.Headers.RetryAfter = retryAfterSeconds.ToString();

                var problemDetails = new
                {
                    type = "https://tools.ietf.org/html/rfc6585#section-4",
                    title = "Too Many Requests",
                    status = StatusCodes.Status429TooManyRequests,
                    detail = $"Has superado el límite de solicitudes permitido para este recurso. Por favor espera {retryAfterSeconds} segundos antes de reintentar.",
                    instance = context.HttpContext.Request.Path.Value,
                    retryAfterSeconds
                };

                var json = JsonSerializer.Serialize(problemDetails);
                await context.HttpContext.Response.WriteAsync(json, cancellationToken: cancellationToken);
            };
        });

        return services;
    }

    public static string GetClientIpAddress(HttpContext httpContext)
    {
        return httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown-ip";
    }

    public static string GetUserOrIpPartitionKey(HttpContext httpContext)
    {
        var userId = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                     ?? httpContext.User.FindFirst("sub")?.Value;

        if (!string.IsNullOrWhiteSpace(userId))
        {
            return $"usr_{userId}";
        }

        return $"ip_{GetClientIpAddress(httpContext)}";
    }
}
