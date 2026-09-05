using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Application.Habits.Services;
using LifeTracker.Application.Health.Services;
using LifeTracker.Application.Timeline.Services;
using LifeTracker.Domain.Habits;
using LifeTracker.Infrastructure.Ai;
using LifeTracker.Infrastructure.Persistence;
using LifeTracker.Infrastructure.Storage;

namespace LifeTracker.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("SupabasePostgres")
                               ?? Environment.GetEnvironmentVariable("SUPABASE_CONNECTION_STRING");

        if (string.IsNullOrWhiteSpace(connectionString) || connectionString.Contains("your-project"))
        {
            services.AddDbContext<LifeTrackerDbContext>(options =>
                options.UseNpgsql("Host=localhost;Database=life_tracker;Username=postgres;Password=postgres"));
        }
        else
        {
            services.AddDbContext<LifeTrackerDbContext>(options =>
                options.UseNpgsql(connectionString, b => b.MigrationsAssembly(typeof(LifeTrackerDbContext).Assembly.FullName)));
        }

        services.AddScoped<ILifeTrackerDbContext>(provider => provider.GetRequiredService<LifeTrackerDbContext>());

        // Storage & AI
        services.AddSingleton<IStorageService, CloudflareR2StorageService>();
        services.AddHttpClient<IAiExtractorService, GeminiAiExtractorService>();

        // Domain Services & Deep Modules
        services.AddSingleton<IStreakCalculator, StreakCalculator>();
        services.AddScoped<IHabitTimelineProjector, HabitTimelineProjector>();

        // Application Services
        services.AddScoped<IHealthService, HealthService>();
        services.AddScoped<IHabitService, HabitService>();
        services.AddScoped<IDailyHubService, DailyHubService>();

        return services;
    }
}
