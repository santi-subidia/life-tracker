using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using LifeTracker.Api.Endpoints;
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

// 3. Autenticación JWT con Supabase
var jwtSecret = builder.Configuration["Supabase:JwtSecret"] 
                ?? Environment.GetEnvironmentVariable("SUPABASE_JWT_SECRET");

var signingKey = !string.IsNullOrWhiteSpace(jwtSecret) && jwtSecret != "your-supabase-jwt-secret"
    ? Encoding.UTF8.GetBytes(jwtSecret)
    : Encoding.UTF8.GetBytes("soma-life-tracker-supabase-default-development-jwt-secret-key-32chars!");

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
                string? role = null;

                // 1. Extraer el rol desde el claim app_metadata (JSON: "role")
                var appMetadataClaim = identity.FindFirst("app_metadata")?.Value;
                if (!string.IsNullOrWhiteSpace(appMetadataClaim))
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(appMetadataClaim);
                        if (doc.RootElement.TryGetProperty("role", out var roleElem) && roleElem.ValueKind == JsonValueKind.String)
                        {
                            role = roleElem.GetString();
                        }
                    }
                    catch
                    {
                        // Fallback silencioso si app_metadata no es un JSON válido
                    }
                }

                // 2. Extraer rol alternativo desde claims sueltos ("user_role", "role" o ClaimTypes.Role)
                if (string.IsNullOrWhiteSpace(role))
                {
                    role = identity.FindFirst("user_role")?.Value
                        ?? identity.FindFirst("role")?.Value
                        ?? identity.FindFirst(ClaimTypes.Role)?.Value;
                }

                var normalizedRole = (role ?? "user").Trim().ToLowerInvariant();
                if (normalizedRole != "admin" && normalizedRole != "user")
                {
                    normalizedRole = "user";
                }

                // Limpiar claims de rol existentes para evitar colisiones
                var existingRoleClaims = identity.FindAll(ClaimTypes.Role).ToList();
                foreach (var rc in existingRoleClaims)
                {
                    identity.RemoveClaim(rc);
                }

                // Asignar rol como ClaimTypes.Role (segregación estricta ADR-0003)
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

builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

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

// Health Check Endpoint
app.MapGet("/health", () => Results.Ok(new
{
    status = "Healthy",
    service = "LifeTracker.Api",
    runtime = ".NET 10",
    timestamp = DateTime.UtcNow
})).WithTags("Diagnóstico");

// Registrar Endpoints de Módulos del Life OS protegidos con política UserOnly
app.MapHealthEndpoints().RequireAuthorization("UserOnly");
app.MapHabitEndpoints().RequireAuthorization("UserOnly");
app.MapDailyHubEndpoints().RequireAuthorization("UserOnly");
app.MapNoteEndpoints().RequireAuthorization("UserOnly");
app.MapWorkEndpoints().RequireAuthorization("UserOnly");
app.MapAcademicEndpoints().RequireAuthorization("UserOnly");
app.MapCareerPlanEndpoints().RequireAuthorization("UserOnly");
app.MapAiEndpoints().RequireAuthorization("UserOnly");
app.MapProfileEndpoints().RequireAuthorization("UserOnly");
app.MapFinanceEndpoints().RequireAuthorization("UserOnly");
app.MapFitnessEndpoints().RequireAuthorization("UserOnly");

// Registrar Endpoints de Administración
app.MapAdminEndpoints();

// Aplicar migraciones pendientes de EF Core automáticamente en la base de datos
using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<LifeTracker.Infrastructure.Persistence.LifeTrackerDbContext>();
        db.Database.Migrate();
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "No se pudieron aplicar migraciones automáticas de EF Core en el arranque.");
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
