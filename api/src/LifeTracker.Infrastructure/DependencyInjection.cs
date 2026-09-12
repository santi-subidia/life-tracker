using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using LifeTracker.Application.Academics.Services;
using LifeTracker.Application.Ai.Services;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Application.Finances.Services;
using LifeTracker.Application.Fitness.Services;
using LifeTracker.Application.Habits.Services;
using LifeTracker.Application.Health.Services;
using LifeTracker.Application.Notes.Services;
using LifeTracker.Application.Timeline.Services;
using LifeTracker.Application.Work.Services;
using LifeTracker.Domain.Academics;
using LifeTracker.Domain.Habits;
using LifeTracker.Domain.Notes;
using LifeTracker.Domain.Work;
using LifeTracker.Infrastructure.Ai;
using LifeTracker.Infrastructure.Auth;
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
                options.UseNpgsql("Host=localhost;Database=life_tracker;Username=postgres;Password=postgres")
                       .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));
        }
        else
        {
            services.AddDbContext<LifeTrackerDbContext>(options =>
                options.UseNpgsql(connectionString, b => b.MigrationsAssembly(typeof(LifeTrackerDbContext).Assembly.FullName))
                       .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));
        }

        services.AddScoped<ILifeTrackerDbContext>(provider => provider.GetRequiredService<LifeTrackerDbContext>());

        // ASP.NET Core Identity & Token Generation
        services.AddIdentityCore<LifeTracker.Infrastructure.Identity.ApplicationUser>(options =>
        {
            options.Password.RequireDigit = false;
            options.Password.RequireLowercase = false;
            options.Password.RequireUppercase = false;
            options.Password.RequireNonAlphanumeric = false;
            options.Password.RequiredLength = 6;
            options.User.RequireUniqueEmail = true;
        })
        .AddRoles<LifeTracker.Infrastructure.Identity.ApplicationRole>()
        .AddEntityFrameworkStores<LifeTrackerDbContext>()
        .AddDefaultTokenProviders();

        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();

        // Storage & AI
        services.AddSingleton<IStorageService, CloudflareR2StorageService>();
        services.AddHttpClient<IAiExtractorService, GeminiAiExtractorService>();
        services.AddHttpClient<IAiCareerPlanExtractor, GeminiCareerPlanExtractorService>();
        services.AddHttpClient<IGeminiClient, GeminiClient>();
        services.AddHttpClient<ISupabaseAdminAuthService, SupabaseAdminAuthService>();

        // Domain Services & Deep Modules
        services.AddSingleton<ICareerPrerequisiteEngine, CareerPrerequisiteEngine>();
        services.AddSingleton<IStreakCalculator, StreakCalculator>();
        services.AddSingleton<IWikilinkParser, WikilinkParser>();
        services.AddSingleton<IKanbanOrderingService, KanbanOrderingService>();
        services.AddSingleton<IFocusMetricsCalculator, FocusMetricsCalculator>();
        services.AddSingleton<IGradeAverageCalculator, GradeAverageCalculator>();
        services.AddScoped<IAccountBalanceManager, AccountBalanceManager>();
        services.AddSingleton<IBudgetConsumptionAnalyzer, BudgetConsumptionAnalyzer>();
        services.AddSingleton<ICashflowAggregator, CashflowAggregator>();
        services.AddSingleton<IProgressiveOverloadCalculator, ProgressiveOverloadCalculator>();
        services.AddSingleton<IMuscleVolumeAggregator, MuscleVolumeAggregator>();
        services.AddSingleton<IRestTimerController, RestTimerController>();

        // Seams
        services.AddScoped<IHabitTimelineProjector, HabitTimelineProjector>();
        services.AddScoped<INoteTimelineProjector, NoteTimelineProjector>();
        services.AddScoped<IWorkTimelineProjector, WorkTimelineProjector>();
        services.AddScoped<IAcademicTimelineProjector, AcademicTimelineProjector>();
        services.AddScoped<IFinanceTimelineProjector, FinanceTimelineProjector>();
        services.AddScoped<IFitnessTimelineProjector, FitnessTimelineProjector>();

        // Application Services
        services.AddScoped<IHealthService, HealthService>();
        services.AddScoped<IHabitService, HabitService>();
        services.AddScoped<IDailyHubService, DailyHubService>();
        services.AddScoped<INoteService, NoteService>();
        services.AddScoped<IWorkService, WorkService>();
        services.AddScoped<IAcademicService, AcademicService>();
        services.AddScoped<ICareerPlanService, CareerPlanService>();
        services.AddScoped<IFinanceService, FinanceService>();
        services.AddScoped<IFitnessService, FitnessService>();
        services.AddScoped<IAiToolDispatcher, AiToolDispatcher>();
        services.AddScoped<IAiAssistantService, AiAssistantService>();
        services.AddScoped<LifeTracker.Application.Profile.Services.IProfileService, LifeTracker.Application.Profile.Services.ProfileService>();

        return services;
    }
}
