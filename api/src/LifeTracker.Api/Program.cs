using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using LifeTracker.Api.Endpoints;
using LifeTracker.Infrastructure;

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
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

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

app.Run();
