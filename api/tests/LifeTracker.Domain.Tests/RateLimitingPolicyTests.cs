using System.Net;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using LifeTracker.Api.Extensions;
using Xunit;

namespace LifeTracker.Domain.Tests;

public class RateLimitingPolicyTests
{
    private readonly RateLimiterOptions _options;

    public RateLimitingPolicyTests()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAppRateLimiting();

        var serviceProvider = services.BuildServiceProvider();
        _options = serviceProvider.GetRequiredService<IOptions<RateLimiterOptions>>().Value;
    }

    [Fact]
    public void AddAppRateLimiting_RegistersOptionsAndRejectionStatusCode()
    {
        Assert.NotNull(_options);
        Assert.Equal(StatusCodes.Status429TooManyRequests, _options.RejectionStatusCode);
        Assert.NotNull(_options.OnRejected);
    }

    [Fact]
    public async Task AuthLoginPolicy_Options_Allows5RequestsAndRejects6th()
    {
        var options = RateLimitingExtensions.GetAuthLoginOptions();
        Assert.Equal(5, options.PermitLimit);
        Assert.Equal(TimeSpan.FromMinutes(1), options.Window);
        Assert.Equal(0, options.QueueLimit);

        using var limiter = new SlidingWindowRateLimiter(options);

        for (int i = 0; i < 5; i++)
        {
            using var lease = await limiter.AcquireAsync(1);
            Assert.True(lease.IsAcquired, $"Request #{i + 1} should be acquired within limit");
        }

        // 6th request must fail
        using (var rejectedLease = await limiter.AcquireAsync(1))
        {
            Assert.False(rejectedLease.IsAcquired, "6th request within window must be rejected (HTTP 429)");
        }
    }

    [Fact]
    public async Task AiAssistantPolicy_Options_Allows10RequestsAndRejects11th()
    {
        var options = RateLimitingExtensions.GetAiAssistantOptions();
        Assert.Equal(10, options.PermitLimit);
        Assert.Equal(TimeSpan.FromMinutes(1), options.Window);
        Assert.Equal(0, options.QueueLimit);

        using var limiter = new SlidingWindowRateLimiter(options);

        for (int i = 0; i < 10; i++)
        {
            using var lease = await limiter.AcquireAsync(1);
            Assert.True(lease.IsAcquired, $"AI Request #{i + 1} should be acquired");
        }

        // 11th request must fail
        using (var rejectedLease = await limiter.AcquireAsync(1))
        {
            Assert.False(rejectedLease.IsAcquired, "11th AI request must be rejected");
        }
    }

    [Fact]
    public async Task AdminSensitivePolicy_Options_Allows10RequestsAndRejects11th()
    {
        var options = RateLimitingExtensions.GetAdminSensitiveOptions();
        Assert.Equal(10, options.PermitLimit);
        Assert.Equal(TimeSpan.FromMinutes(1), options.Window);
        Assert.Equal(0, options.QueueLimit);

        using var limiter = new FixedWindowRateLimiter(options);

        for (int i = 0; i < 10; i++)
        {
            using var lease = await limiter.AcquireAsync(1);
            Assert.True(lease.IsAcquired, $"Admin Request #{i + 1} should be acquired");
        }

        // 11th request must fail
        using (var rejectedLease = await limiter.AcquireAsync(1))
        {
            Assert.False(rejectedLease.IsAcquired, "11th admin request must be rejected");
        }
    }

    [Fact]
    public void PartitionKeys_ExtractUserAndIpCorrectly()
    {
        // 1. Contexto anónimo
        var anonContext = new DefaultHttpContext();
        anonContext.Connection.RemoteIpAddress = IPAddress.Parse("203.0.113.195");
        var anonKey = RateLimitingExtensions.GetUserOrIpPartitionKey(anonContext);
        Assert.Equal("ip_203.0.113.195", anonKey);

        // 2. Contexto autenticado con sub claim
        var authContext = new DefaultHttpContext();
        var userId = Guid.NewGuid().ToString();
        authContext.User = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim("sub", userId)
        }, "TestAuth"));
        var authKey = RateLimitingExtensions.GetUserOrIpPartitionKey(authContext);
        Assert.Equal($"usr_{userId}", authKey);
    }

    [Fact]
    public async Task OnRejected_WritesProblemDetailsAndRetryAfterHeader()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        context.Request.Path = "/api/auth/login";

        var failedLease = new FailedRateLimitLease();
        var onRejectedContext = new OnRejectedContext
        {
            HttpContext = context,
            Lease = failedLease
        };

        Assert.NotNull(_options.OnRejected);
        await _options.OnRejected(onRejectedContext, CancellationToken.None);

        Assert.Equal(StatusCodes.Status429TooManyRequests, context.Response.StatusCode);
        Assert.Equal("application/problem+json", context.Response.ContentType);
        Assert.True(context.Response.Headers.ContainsKey("Retry-After"));

        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var body = await reader.ReadToEndAsync();
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        Assert.Equal(429, root.GetProperty("status").GetInt32());
        Assert.Equal("Too Many Requests", root.GetProperty("title").GetString());
        Assert.Equal("/api/auth/login", root.GetProperty("instance").GetString());
        Assert.True(root.GetProperty("retryAfterSeconds").GetInt32() > 0);
    }

    private class FailedRateLimitLease : RateLimitLease
    {
        public override bool IsAcquired => false;
        public override IEnumerable<string> MetadataNames => new[] { MetadataName.RetryAfter.Name };

        public override bool TryGetMetadata(string metadataName, out object? metadata)
        {
            if (metadataName == MetadataName.RetryAfter.Name)
            {
                metadata = TimeSpan.FromSeconds(45);
                return true;
            }
            metadata = null;
            return false;
        }
    }
}
