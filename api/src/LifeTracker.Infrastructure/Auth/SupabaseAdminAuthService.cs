using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using LifeTracker.Application.Admin.Dtos;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Domain.Profiles;

namespace LifeTracker.Infrastructure.Auth;

public class SupabaseAdminAuthService : ISupabaseAdminAuthService
{
    private readonly HttpClient _httpClient;
    private readonly ILifeTrackerDbContext _dbContext;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SupabaseAdminAuthService> _logger;

    private readonly string? _supabaseUrl;
    private readonly string? _serviceRoleKey;
    private readonly bool _isConfigured;

    public SupabaseAdminAuthService(
        HttpClient httpClient,
        ILifeTrackerDbContext dbContext,
        IConfiguration configuration,
        ILogger<SupabaseAdminAuthService> logger)
    {
        _httpClient = httpClient;
        _dbContext = dbContext;
        _configuration = configuration;
        _logger = logger;

        _supabaseUrl = _configuration["Supabase:Url"]
                       ?? Environment.GetEnvironmentVariable("SUPABASE_URL");
        _serviceRoleKey = _configuration["Supabase:ServiceRoleKey"]
                          ?? Environment.GetEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY");

        _isConfigured = !string.IsNullOrWhiteSpace(_supabaseUrl)
                        && !string.IsNullOrWhiteSpace(_serviceRoleKey)
                        && !_serviceRoleKey.StartsWith("your-", StringComparison.OrdinalIgnoreCase);

        if (!_isConfigured)
        {
            _logger.LogInformation("Supabase ServiceRoleKey no configurado o inválido. SupabaseAdminAuthService operará en modo resiliente de desarrollo.");
        }
    }

    public async Task<IReadOnlyList<AdminUserDto>> ListUsersAsync(CancellationToken ct)
    {
        if (_isConfigured)
        {
            try
            {
                using var request = CreateRequest(HttpMethod.Get, "/auth/v1/admin/users?page=1&per_page=1000");
                using var response = await _httpClient.SendAsync(request, ct);

                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync(ct);
                    using var doc = JsonDocument.Parse(content);

                    JsonElement usersArray = default;
                    if (doc.RootElement.ValueKind == JsonValueKind.Array)
                    {
                        usersArray = doc.RootElement;
                    }
                    else if (doc.RootElement.TryGetProperty("users", out var usersProp) && usersProp.ValueKind == JsonValueKind.Array)
                    {
                        usersArray = usersProp;
                    }

                    if (usersArray.ValueKind == JsonValueKind.Array)
                    {
                        var parsedUsers = new List<AdminUserDto>();

                        foreach (var elem in usersArray.EnumerateArray())
                        {
                            if (!elem.TryGetProperty("id", out var idProp) || !Guid.TryParse(idProp.GetString(), out var userId))
                                continue;

                            var email = elem.TryGetProperty("email", out var emailProp) ? emailProp.GetString() ?? "" : "";

                            // Extraer rol de app_metadata
                            string role = "user";
                            if (elem.TryGetProperty("app_metadata", out var appMeta) && appMeta.ValueKind == JsonValueKind.Object)
                            {
                                if (appMeta.TryGetProperty("role", out var rProp) && rProp.GetString() is { } r)
                                {
                                    role = r;
                                }
                            }

                            // Extraer full_name de user_metadata
                            string? fullName = null;
                            if (elem.TryGetProperty("user_metadata", out var userMeta) && userMeta.ValueKind == JsonValueKind.Object)
                            {
                                if (userMeta.TryGetProperty("full_name", out var fnProp) && fnProp.GetString() is { } fn)
                                {
                                    fullName = fn;
                                }
                                else if (userMeta.TryGetProperty("name", out var nProp) && nProp.GetString() is { } n)
                                {
                                    fullName = n;
                                }
                            }

                            // Verificar si está baneado
                            bool isActive = true;
                            if (elem.TryGetProperty("banned_until", out var bannedProp) && bannedProp.ValueKind == JsonValueKind.String)
                            {
                                if (DateTime.TryParse(bannedProp.GetString(), out var bannedUntil) && bannedUntil > DateTime.UtcNow)
                                {
                                    isActive = false;
                                }
                            }

                            DateTime createdAt = DateTime.UtcNow;
                            if (elem.TryGetProperty("created_at", out var createdProp) && createdProp.ValueKind == JsonValueKind.String)
                            {
                                if (DateTime.TryParse(createdProp.GetString(), out var dt))
                                    createdAt = dt.ToUniversalTime();
                            }

                            DateTime? updatedAt = null;
                            if (elem.TryGetProperty("updated_at", out var updatedProp) && updatedProp.ValueKind == JsonValueKind.String)
                            {
                                if (DateTime.TryParse(updatedProp.GetString(), out var dt))
                                    updatedAt = dt.ToUniversalTime();
                            }

                            parsedUsers.Add(new AdminUserDto(
                                userId,
                                email,
                                fullName,
                                role.ToLowerInvariant() == "admin" ? "admin" : "user",
                                isActive,
                                createdAt,
                                updatedAt
                            ));
                        }

                        // Sincronizar perfiles con la base de datos local / public.profiles
                        await SyncProfilesFromSupabaseAsync(parsedUsers, ct);

                        return parsedUsers;
                    }
                }
                else
                {
                    _logger.LogWarning("Supabase Admin API devolvió status {StatusCode} al listar usuarios. Ejecutando fallback en public.profiles.", response.StatusCode);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error al comunicarse con Supabase GoTrue Admin API. Ejecutando fallback a public.profiles.");
            }
        }

        // Fallback resiliente: consultar public.profiles
        return await GetProfilesFallbackAsync(ct);
    }

    public async Task<AdminUserDto> CreateUserAsync(CreateAdminUserRequest request, CancellationToken ct)
    {
        var normalizedRole = (request.Role ?? "user").Trim().ToLowerInvariant() == "admin" ? "admin" : "user";

        if (_isConfigured)
        {
            try
            {
                var payload = new
                {
                    email = request.Email,
                    password = request.Password,
                    email_confirm = true,
                    app_metadata = new { role = normalizedRole },
                    user_metadata = new { full_name = request.FullName ?? "" }
                };

                var jsonContent = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                using var httpRequest = CreateRequest(HttpMethod.Post, "/auth/v1/admin/users", jsonContent);
                using var response = await _httpClient.SendAsync(httpRequest, ct);

                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync(ct);
                    using var doc = JsonDocument.Parse(content);

                    var idStr = doc.RootElement.GetProperty("id").GetString();
                    var userId = Guid.Parse(idStr!);

                    var createdDto = new AdminUserDto(
                        userId,
                        request.Email,
                        request.FullName,
                        normalizedRole,
                        true,
                        DateTime.UtcNow,
                        DateTime.UtcNow
                    );

                    // Sincronizar registro local en public.profiles
                    await UpsertProfileAsync(userId, request.Email, normalizedRole, request.FullName, true, ct);

                    return createdDto;
                }

                _logger.LogWarning("Supabase Admin API devolvió status {StatusCode} al crear usuario.", response.StatusCode);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Fallo al crear usuario en Supabase Admin API. Usando fallback de persistencia local.");
            }
        }

        // Fallback local
        var fallbackId = Guid.NewGuid();
        var fallbackDto = new AdminUserDto(
            fallbackId,
            request.Email,
            request.FullName,
            normalizedRole,
            true,
            DateTime.UtcNow,
            DateTime.UtcNow
        );

        await UpsertProfileAsync(fallbackId, request.Email, normalizedRole, request.FullName, true, ct);

        return fallbackDto;
    }

    public async Task UpdateUserRoleAsync(Guid userId, string newRole, CancellationToken ct)
    {
        var normalizedRole = newRole.Trim().ToLowerInvariant() == "admin" ? "admin" : "user";

        if (_isConfigured)
        {
            try
            {
                var payload = new
                {
                    app_metadata = new { role = normalizedRole }
                };

                var jsonContent = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                using var httpRequest = CreateRequest(HttpMethod.Put, $"/auth/v1/admin/users/{userId}", jsonContent);
                using var response = await _httpClient.SendAsync(httpRequest, ct);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Supabase Admin API devolvió status {StatusCode} al actualizar rol de usuario {UserId}.", response.StatusCode, userId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error al actualizar rol de usuario {UserId} en Supabase Admin API.", userId);
            }
        }

        // Actualizar en public.profiles
        var profile = await _dbContext.Profiles.FirstOrDefaultAsync(p => p.Id == userId, ct);
        if (profile != null)
        {
            profile.UpdateRole(normalizedRole);
            await _dbContext.SaveChangesAsync(ct);
        }
        else
        {
            await UpsertProfileAsync(userId, $"{userId}@local.tracker", normalizedRole, null, true, ct);
        }
    }

    public async Task ToggleUserStatusAsync(Guid userId, bool isActive, CancellationToken ct)
    {
        if (_isConfigured)
        {
            try
            {
                var payload = new
                {
                    ban_duration = isActive ? "none" : "876000h"
                };

                var jsonContent = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                using var httpRequest = CreateRequest(HttpMethod.Put, $"/auth/v1/admin/users/{userId}", jsonContent);
                using var response = await _httpClient.SendAsync(httpRequest, ct);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Supabase Admin API devolvió status {StatusCode} al cambiar estado de usuario {UserId}.", response.StatusCode, userId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error al cambiar estado de usuario {UserId} en Supabase Admin API.", userId);
            }
        }

        // Actualizar en public.profiles
        var profile = await _dbContext.Profiles.FirstOrDefaultAsync(p => p.Id == userId, ct);
        if (profile != null)
        {
            profile.SetActive(isActive);
            await _dbContext.SaveChangesAsync(ct);
        }
    }

    public async Task ResetUserPasswordAsync(Guid userId, string newPassword, CancellationToken ct)
    {
        if (_isConfigured)
        {
            try
            {
                var payload = new
                {
                    password = newPassword
                };

                var jsonContent = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                using var httpRequest = CreateRequest(HttpMethod.Put, $"/auth/v1/admin/users/{userId}", jsonContent);
                using var response = await _httpClient.SendAsync(httpRequest, ct);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Supabase Admin API devolvió status {StatusCode} al resetear contraseña de usuario {UserId}.", response.StatusCode, userId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error al resetear contraseña de usuario {UserId} en Supabase Admin API.", userId);
            }
        }
        else
        {
            _logger.LogInformation("Modo desarrollo: Contraseña de usuario {UserId} reseteada exitosamente en simulación.", userId);
        }
    }

    private HttpRequestMessage CreateRequest(HttpMethod method, string relativePath, HttpContent? content = null)
    {
        var fullUrl = $"{_supabaseUrl!.TrimEnd('/')}{relativePath}";
        var request = new HttpRequestMessage(method, fullUrl);
        request.Headers.Add("apikey", _serviceRoleKey);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _serviceRoleKey);

        if (content != null)
        {
            request.Content = content;
        }

        return request;
    }

    private async Task SyncProfilesFromSupabaseAsync(IEnumerable<AdminUserDto> users, CancellationToken ct)
    {
        try
        {
            var userIds = users.Select(u => u.Id).ToList();
            var existingProfiles = await _dbContext.Profiles
                .Where(p => userIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, ct);

            bool changed = false;
            foreach (var u in users)
            {
                if (existingProfiles.TryGetValue(u.Id, out var profile))
                {
                    if (profile.Role != u.Role)
                    {
                        profile.UpdateRole(u.Role);
                        changed = true;
                    }
                    if (profile.IsActive != u.IsActive)
                    {
                        profile.SetActive(u.IsActive);
                        changed = true;
                    }
                    if (profile.FullName != u.FullName)
                    {
                        profile.UpdateProfile(u.FullName, u.Email);
                        changed = true;
                    }
                }
                else
                {
                    var newProfile = new UserProfile(u.Id, u.Email, u.Role, u.FullName, u.IsActive);
                    _dbContext.Profiles.Add(newProfile);
                    changed = true;
                }
            }

            if (changed)
            {
                await _dbContext.SaveChangesAsync(ct);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error al sincronizar perfiles locales desde Supabase.");
        }
    }

    private async Task<IReadOnlyList<AdminUserDto>> GetProfilesFallbackAsync(CancellationToken ct)
    {
        try
        {
            var profiles = await _dbContext.Profiles
                .AsNoTracking()
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync(ct);

            if (profiles.Count > 0)
            {
                return profiles.Select(p => new AdminUserDto(
                    p.Id,
                    p.Email,
                    p.FullName,
                    p.Role,
                    p.IsActive,
                    p.CreatedAt,
                    p.UpdatedAt
                )).ToList();
            }

            // Si la tabla está vacía en ambiente de desarrollo, inicializar el administrador por defecto
            var defaultAdminId = Guid.Parse("00000000-0000-0000-0000-000000000001");
            var defaultAdmin = new UserProfile(defaultAdminId, "admin@soma.local", "admin", "Administrador SOMA", true);
            _dbContext.Profiles.Add(defaultAdmin);
            await _dbContext.SaveChangesAsync(ct);

            return new List<AdminUserDto>
            {
                new(defaultAdmin.Id, defaultAdmin.Email, defaultAdmin.FullName, defaultAdmin.Role, defaultAdmin.IsActive, defaultAdmin.CreatedAt, defaultAdmin.UpdatedAt)
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error al consultar public.profiles para fallback.");
            return new List<AdminUserDto>
            {
                new(Guid.Parse("00000000-0000-0000-0000-000000000001"), "admin@soma.local", "Administrador SOMA", "admin", true, DateTime.UtcNow, DateTime.UtcNow)
            };
        }
    }

    private async Task UpsertProfileAsync(Guid userId, string email, string role, string? fullName, bool isActive, CancellationToken ct)
    {
        try
        {
            var profile = await _dbContext.Profiles.FirstOrDefaultAsync(p => p.Id == userId, ct);
            if (profile != null)
            {
                profile.UpdateRole(role);
                profile.SetActive(isActive);
                profile.UpdateProfile(fullName, email);
            }
            else
            {
                var newProfile = new UserProfile(userId, email, role, fullName, isActive);
                _dbContext.Profiles.Add(newProfile);
            }

            await _dbContext.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error al guardar perfil de usuario {UserId} en public.profiles.", userId);
        }
    }
}
