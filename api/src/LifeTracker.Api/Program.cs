using System.Text;
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

if (!string.IsNullOrWhiteSpace(jwtSecret) && jwtSecret != "your-supabase-jwt-secret")
{
    var key = Encoding.UTF8.GetBytes(jwtSecret);
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.RequireHttpsMetadata = false;
            options.SaveToken = true;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = false,
                ValidateAudience = false,
                ClockSkew = TimeSpan.Zero
            };
        });
}
else
{
    builder.Services.AddAuthentication();
}

builder.Services.AddAuthorization();
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

// Registrar Endpoints de Módulos
app.MapHealthEndpoints();
app.MapHabitEndpoints();
app.MapDailyHubEndpoints();
app.MapNoteEndpoints();
app.MapWorkEndpoints();
app.MapAcademicEndpoints();
app.MapCareerPlanEndpoints();
app.MapAiEndpoints();
app.MapProfileEndpoints();
app.MapFinanceEndpoints();
app.MapFitnessEndpoints();

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
