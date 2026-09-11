using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace LifeTracker.Domain.Tests;

public class AuthorizationPolicyTests
{
    private readonly IAuthorizationService _authService;

    public AuthorizationPolicyTests()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAuthorizationCore(options =>
        {
            options.AddPolicy("AdminOnly", p => p.RequireRole("admin"));
            options.AddPolicy("UserOnly", p => p.RequireRole("user"));
        });

        var provider = services.BuildServiceProvider();
        _authService = provider.GetRequiredService<IAuthorizationService>();
    }

    [Fact]
    public async Task AdminOnlyPolicy_UserWithAdminRole_Succeeds()
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.Role, "admin")
        }, "TestAuth"));

        var result = await _authService.AuthorizeAsync(user, "AdminOnly");
        Assert.True(result.Succeeded);
    }

    [Fact]
    public async Task AdminOnlyPolicy_UserWithUserRoleOnly_Fails()
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.Role, "user")
        }, "TestAuth"));

        var result = await _authService.AuthorizeAsync(user, "AdminOnly");
        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task UserOnlyPolicy_UserWithUserRole_Succeeds()
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.Role, "user")
        }, "TestAuth"));

        var result = await _authService.AuthorizeAsync(user, "UserOnly");
        Assert.True(result.Succeeded);
    }

    [Fact]
    public async Task UserOnlyPolicy_AdminUserOnly_Fails()
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.Role, "admin")
        }, "TestAuth"));

        var result = await _authService.AuthorizeAsync(user, "UserOnly");
        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task UserOnlyPolicy_AnonymousUser_Fails()
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity());

        var result = await _authService.AuthorizeAsync(user, "UserOnly");
        Assert.False(result.Succeeded);
    }
}
