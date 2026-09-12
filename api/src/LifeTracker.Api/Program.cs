using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using LifeTracker.Api.Endpoints;
using LifeTracker.Api.Extensions;
using LifeTracker.Infrastructure;

LoadDotEnv();

var builder = WebApplication.CreateBuilder(args);

// 1. Inyección de dependencias de Infraestructura y Aplicación
builder.Services.AddInfrastructureServices(builder.Configuration);

// 2. CORS para desarrollo con Next.js en puerto 3000
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000",
                "https://localhost:3000"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// 3. Autenticación JWT con ASP.NET Core Identity
var jwtSecret = builder.Configuration["Jwt:SecretKey"] 
                ?? Environment.GetEnvironmentVariable("JWT_SECRET_KEY")
                ?? LifeTracker.Infrastructure.Auth.JwtTokenGenerator.DefaultSecretKey;

var signingKey = Encoding.UTF8.GetBytes(jwtSecret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(signingKey),
        ValidateIssuer = false,
        ValidateAudience = false,
        ClockSkew = TimeSpan.Zero
    };
    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = context =>
        {
            if (context.Principal?.Identity is ClaimsIdentity identity)
            {
                var role = identity.FindFirst(ClaimTypes.Role)?.Value
                           ?? identity.FindFirst("role")?.Value;

                var normalizedRole = (role ?? "user").Trim().ToLowerInvariant();
                if (normalizedRole != "admin" && normalizedRole != "user")
                {
                    normalizedRole = "user";
                }

                var existingRoleClaims = identity.FindAll(ClaimTypes.Role).ToList();
                foreach (var rc in existingRoleClaims)
                {
                    identity.RemoveClaim(rc);
                }

                identity.AddClaim(new Claim(ClaimTypes.Role, normalizedRole));
            }

            return Task.CompletedTask;
        }
    };
});

// 4. Políticas de Autorización RBAC
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", p => p.RequireRole("admin"));
    options.AddPolicy("UserOnly", p => p.RequireRole("user"));
});

// 5. Configuración de cabeceras de proxy inverso (Nginx / Cloudflare)
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

// 6. Rate Limiting nativo (.NET 10)
builder.Services.AddAppRateLimiting();

builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseForwardedHeaders();
app.UseExceptionHandler();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

// Health Check Endpoint
app.MapGet("/health", () => Results.Ok(new
{
    status = "Healthy",
    service = "LifeTracker.Api",
    runtime = ".NET 10",
    timestamp = DateTime.UtcNow
})).WithTags("Diagnóstico").RequireRateLimiting(RateLimitingExtensions.PolicyGeneralApi);

// Registrar Endpoints de Autenticación (ASP.NET Core Identity)
app.MapAuthEndpoints();

// Registrar Endpoints de Módulos del Life OS protegidos con política UserOnly y Rate Limiting
app.MapHealthEndpoints().RequireAuthorization("UserOnly").RequireRateLimiting(RateLimitingExtensions.PolicyGeneralApi);
app.MapHabitEndpoints().RequireAuthorization("UserOnly").RequireRateLimiting(RateLimitingExtensions.PolicyGeneralApi);
app.MapDailyHubEndpoints().RequireAuthorization("UserOnly").RequireRateLimiting(RateLimitingExtensions.PolicyGeneralApi);
app.MapNoteEndpoints().RequireAuthorization("UserOnly").RequireRateLimiting(RateLimitingExtensions.PolicyGeneralApi);
app.MapWorkEndpoints().RequireAuthorization("UserOnly").RequireRateLimiting(RateLimitingExtensions.PolicyGeneralApi);
app.MapAcademicEndpoints().RequireAuthorization("UserOnly").RequireRateLimiting(RateLimitingExtensions.PolicyGeneralApi);
app.MapCareerPlanEndpoints().RequireAuthorization("UserOnly").RequireRateLimiting(RateLimitingExtensions.PolicyGeneralApi);
app.MapAiEndpoints().RequireAuthorization("UserOnly").RequireRateLimiting(RateLimitingExtensions.PolicyGeneralApi);
app.MapProfileEndpoints().RequireAuthorization("UserOnly").RequireRateLimiting(RateLimitingExtensions.PolicyGeneralApi);
app.MapFinanceEndpoints().RequireAuthorization("UserOnly").RequireRateLimiting(RateLimitingExtensions.PolicyGeneralApi);
app.MapFitnessEndpoints().RequireAuthorization("UserOnly").RequireRateLimiting(RateLimitingExtensions.PolicyGeneralApi);

// Registrar Endpoints de Administración protegidos con política AdminOnly
app.MapAdminEndpoints().RequireRateLimiting(RateLimitingExtensions.PolicyGeneralApi);

// Aplicar migraciones y seeding inicial de Identity
using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<LifeTracker.Infrastructure.Persistence.LifeTrackerDbContext>();
        
        // Asegurar tablas de ASP.NET Core Identity de forma idempotente
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""AspNetRoles"" (
                ""Id"" uuid NOT NULL PRIMARY KEY,
                ""Name"" character varying(256) NULL,
                ""NormalizedName"" character varying(256) NULL,
                ""ConcurrencyStamp"" text NULL
            );

            CREATE TABLE IF NOT EXISTS ""AspNetUsers"" (
                ""Id"" uuid NOT NULL PRIMARY KEY,
                ""FullName"" text NULL,
                ""IsActive"" boolean NOT NULL DEFAULT true,
                ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
                ""UpdatedAt"" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
                ""UserName"" character varying(256) NULL,
                ""NormalizedUserName"" character varying(256) NULL,
                ""Email"" character varying(256) NULL,
                ""NormalizedEmail"" character varying(256) NULL,
                ""EmailConfirmed"" boolean NOT NULL DEFAULT false,
                ""PasswordHash"" text NULL,
                ""SecurityStamp"" text NULL,
                ""ConcurrencyStamp"" text NULL,
                ""PhoneNumber"" text NULL,
                ""PhoneNumberConfirmed"" boolean NOT NULL DEFAULT false,
                ""TwoFactorEnabled"" boolean NOT NULL DEFAULT false,
                ""LockoutEnd"" timestamp with time zone NULL,
                ""LockoutEnabled"" boolean NOT NULL DEFAULT false,
                ""AccessFailedCount"" integer NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS ""AspNetRoleClaims"" (
                ""Id"" integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                ""RoleId"" uuid NOT NULL REFERENCES ""AspNetRoles"" (""Id"") ON DELETE CASCADE,
                ""ClaimType"" text NULL,
                ""ClaimValue"" text NULL
            );

            CREATE TABLE IF NOT EXISTS ""AspNetUserClaims"" (
                ""Id"" integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                ""UserId"" uuid NOT NULL REFERENCES ""AspNetUsers"" (""Id"") ON DELETE CASCADE,
                ""ClaimType"" text NULL,
                ""ClaimValue"" text NULL
            );

            CREATE TABLE IF NOT EXISTS ""AspNetUserLogins"" (
                ""LoginProvider"" text NOT NULL,
                ""ProviderKey"" text NOT NULL,
                ""ProviderDisplayName"" text NULL,
                ""UserId"" uuid NOT NULL REFERENCES ""AspNetUsers"" (""Id"") ON DELETE CASCADE,
                PRIMARY KEY (""LoginProvider"", ""ProviderKey"")
            );

            CREATE TABLE IF NOT EXISTS ""AspNetUserRoles"" (
                ""UserId"" uuid NOT NULL REFERENCES ""AspNetUsers"" (""Id"") ON DELETE CASCADE,
                ""RoleId"" uuid NOT NULL REFERENCES ""AspNetRoles"" (""Id"") ON DELETE CASCADE,
                PRIMARY KEY (""UserId"", ""RoleId"")
            );

            CREATE TABLE IF NOT EXISTS ""AspNetUserTokens"" (
                ""UserId"" uuid NOT NULL REFERENCES ""AspNetUsers"" (""Id"") ON DELETE CASCADE,
                ""LoginProvider"" text NOT NULL,
                ""Name"" text NOT NULL,
                ""Value"" text NULL,
                PRIMARY KEY (""UserId"", ""LoginProvider"", ""Name"")
            );

            CREATE INDEX IF NOT EXISTS ""IX_AspNetRoleClaims_RoleId"" ON ""AspNetRoleClaims"" (""RoleId"");
            CREATE UNIQUE INDEX IF NOT EXISTS ""RoleNameIndex"" ON ""AspNetRoles"" (""NormalizedName"");
            CREATE INDEX IF NOT EXISTS ""IX_AspNetUserClaims_UserId"" ON ""AspNetUserClaims"" (""UserId"");
            CREATE INDEX IF NOT EXISTS ""IX_AspNetUserLogins_UserId"" ON ""AspNetUserLogins"" (""UserId"");
            CREATE INDEX IF NOT EXISTS ""IX_AspNetUserRoles_RoleId"" ON ""AspNetUserRoles"" (""RoleId"");
            CREATE INDEX IF NOT EXISTS ""EmailIndex"" ON ""AspNetUsers"" (""NormalizedEmail"");
            CREATE UNIQUE INDEX IF NOT EXISTS ""UserNameIndex"" ON ""AspNetUsers"" (""NormalizedUserName"");
        ");

        var roleManager = scope.ServiceProvider.GetRequiredService<Microsoft.AspNetCore.Identity.RoleManager<LifeTracker.Infrastructure.Identity.ApplicationRole>>();
        var userManager = scope.ServiceProvider.GetRequiredService<Microsoft.AspNetCore.Identity.UserManager<LifeTracker.Infrastructure.Identity.ApplicationUser>>();

        // Asegurar que existan los roles "admin" y "user"
        foreach (var role in new[] { "admin", "user" })
        {
            if (!roleManager.RoleExistsAsync(role).GetAwaiter().GetResult())
            {
                roleManager.CreateAsync(new LifeTracker.Infrastructure.Identity.ApplicationRole(role)).GetAwaiter().GetResult();
            }
        }

        // Asegurar usuario administrador inicial
        var adminUser = userManager.FindByEmailAsync("admin@soma.local").GetAwaiter().GetResult();
        if (adminUser == null)
        {
            adminUser = new LifeTracker.Infrastructure.Identity.ApplicationUser
            {
                UserName = "admin@soma.local",
                Email = "admin@soma.local",
                EmailConfirmed = true,
                FullName = "Administrador SOMA",
                IsActive = true
            };
            userManager.CreateAsync(adminUser, "Admin123!#Soma").GetAwaiter().GetResult();
            userManager.AddToRoleAsync(adminUser, "admin").GetAwaiter().GetResult();
        }
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Advertencia en inicialización de Identity o migraciones de base de datos.");
    }
}

app.Run();

static void LoadDotEnv()
{
    var current = new DirectoryInfo(Directory.GetCurrentDirectory());
    FileInfo? envFile = null;
    while (current != null)
    {
        var candidate = Path.Combine(current.FullName, ".env");
        if (File.Exists(candidate))
        {
            envFile = new FileInfo(candidate);
            break;
        }
        current = current.Parent;
    }

    if (envFile != null && envFile.Exists)
    {
        foreach (var line in File.ReadAllLines(envFile.FullName))
        {
            var trimmed = line.Trim();
            if (string.IsNullOrWhiteSpace(trimmed) || trimmed.StartsWith("#") || !trimmed.Contains('='))
                continue;

            var parts = trimmed.Split('=', 2);
            var key = parts[0].Trim();
            var value = parts[1].Trim().Trim('"', '\'');

            if (!string.IsNullOrEmpty(key) && string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
            {
                Environment.SetEnvironmentVariable(key, value);
            }
        }
    }
}
