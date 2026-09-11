using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using LifeTracker.Application.Admin.Dtos;
using LifeTracker.Domain.Profiles;
using LifeTracker.Infrastructure.Auth;
using LifeTracker.Infrastructure.Persistence;
using Xunit;

namespace LifeTracker.Domain.Tests;

public class SupabaseAdminAuthServiceTests
{
    private static LifeTrackerDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<LifeTrackerDbContext>()
            .UseInMemoryDatabase(databaseName: $"LifeTracker_Auth_Test_{Guid.NewGuid()}")
            .Options;

        return new LifeTrackerDbContext(options);
    }

    [Fact]
    public async Task FallbackMode_ListUsersAsync_WhenEmpty_ReturnsDefaultAdmin()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var configuration = new ConfigurationBuilder().Build();
        var httpClient = new HttpClient();
        var service = new SupabaseAdminAuthService(httpClient, dbContext, configuration, NullLogger<SupabaseAdminAuthService>.Instance);

        // Act
        var users = await service.ListUsersAsync(CancellationToken.None);

        // Assert
        Assert.NotEmpty(users);
        var admin = users.First();
        Assert.Equal("admin@soma.local", admin.Email);
        Assert.Equal("admin", admin.Role);
        Assert.True(admin.IsActive);
    }

    [Fact]
    public async Task FallbackMode_CreateUserAsync_AddsProfileAndReturnsDto()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var configuration = new ConfigurationBuilder().Build();
        var httpClient = new HttpClient();
        var service = new SupabaseAdminAuthService(httpClient, dbContext, configuration, NullLogger<SupabaseAdminAuthService>.Instance);

        var request = new CreateAdminUserRequest("nuevo@soma.local", "SuperPassword123!", "Usuario Nuevo", "user");

        // Act
        var created = await service.CreateUserAsync(request, CancellationToken.None);

        // Assert
        Assert.NotNull(created);
        Assert.Equal("nuevo@soma.local", created.Email);
        Assert.Equal("Usuario Nuevo", created.FullName);
        Assert.Equal("user", created.Role);
        Assert.True(created.IsActive);

        var savedProfile = await dbContext.Profiles.FindAsync(created.Id);
        Assert.NotNull(savedProfile);
        Assert.Equal("nuevo@soma.local", savedProfile.Email);
    }

    [Fact]
    public async Task FallbackMode_UpdateUserRoleAsync_UpdatesRoleInDatabase()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var configuration = new ConfigurationBuilder().Build();
        var httpClient = new HttpClient();
        var service = new SupabaseAdminAuthService(httpClient, dbContext, configuration, NullLogger<SupabaseAdminAuthService>.Instance);

        var userId = Guid.NewGuid();
        var profile = new UserProfile(userId, "target@soma.local", "user", "Target User", true);
        dbContext.Profiles.Add(profile);
        await dbContext.SaveChangesAsync();

        // Act
        await service.UpdateUserRoleAsync(userId, "admin", CancellationToken.None);

        // Assert
        var updated = await dbContext.Profiles.FindAsync(userId);
        Assert.NotNull(updated);
        Assert.Equal("admin", updated.Role);
    }

    [Fact]
    public async Task FallbackMode_ToggleUserStatusAsync_UpdatesIsActiveInDatabase()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();
        var configuration = new ConfigurationBuilder().Build();
        var httpClient = new HttpClient();
        var service = new SupabaseAdminAuthService(httpClient, dbContext, configuration, NullLogger<SupabaseAdminAuthService>.Instance);

        var userId = Guid.NewGuid();
        var profile = new UserProfile(userId, "status@soma.local", "user", "Status User", true);
        dbContext.Profiles.Add(profile);
        await dbContext.SaveChangesAsync();

        // Act - Desactivar
        await service.ToggleUserStatusAsync(userId, false, CancellationToken.None);

        // Assert
        var updated = await dbContext.Profiles.FindAsync(userId);
        Assert.NotNull(updated);
        Assert.False(updated.IsActive);

        // Act - Reactivar
        await service.ToggleUserStatusAsync(userId, true, CancellationToken.None);
        var reactivated = await dbContext.Profiles.FindAsync(userId);
        Assert.NotNull(reactivated);
        Assert.True(reactivated.IsActive);
    }

    [Fact]
    public async Task ConfiguredMode_ListUsersAsync_ParsesSupabaseUsersAndSyncsProfiles()
    {
        // Arrange
        using var dbContext = CreateInMemoryDbContext();

        var userId = Guid.NewGuid();
        var supabaseUsersJson = JsonSerializer.Serialize(new
        {
            users = new[]
            {
                new
                {
                    id = userId.ToString(),
                    email = "gotrue.user@soma.local",
                    app_metadata = new { role = "admin" },
                    user_metadata = new { full_name = "GoTrue Admin" },
                    banned_until = (string?)null,
                    created_at = "2026-09-11T12:00:00Z",
                    updated_at = "2026-09-11T12:00:00Z"
                }
            }
        });

        var testHandler = new MockHttpMessageHandler(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(supabaseUsersJson, System.Text.Encoding.UTF8, "application/json")
        });

        var httpClient = new HttpClient(testHandler);
        var inMemoryConfig = new Dictionary<string, string?>
        {
            ["Supabase:Url"] = "https://test.supabase.co",
            ["Supabase:ServiceRoleKey"] = "service-role-secret-key-for-testing"
        };
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(inMemoryConfig).Build();

        var service = new SupabaseAdminAuthService(httpClient, dbContext, configuration, NullLogger<SupabaseAdminAuthService>.Instance);

        // Act
        var users = await service.ListUsersAsync(CancellationToken.None);

        // Assert
        Assert.Single(users);
        var user = users.First();
        Assert.Equal(userId, user.Id);
        Assert.Equal("gotrue.user@soma.local", user.Email);
        Assert.Equal("GoTrue Admin", user.FullName);
        Assert.Equal("admin", user.Role);
        Assert.True(user.IsActive);

        // Sincronización en public.profiles
        var profile = await dbContext.Profiles.FindAsync(userId);
        Assert.NotNull(profile);
        Assert.Equal("admin", profile.Role);
        Assert.Equal("GoTrue Admin", profile.FullName);
    }

    private class MockHttpMessageHandler : HttpMessageHandler
    {
        private readonly HttpResponseMessage _response;

        public MockHttpMessageHandler(HttpResponseMessage response)
        {
            _response = response;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return Task.FromResult(_response);
        }
    }
}
