using System.Security.Claims;
using System.Text.Json;
using Xunit;

namespace LifeTracker.Domain.Tests;

public class JwtRoleEnrichmentTests
{
    // Método que replica con fidelidad la lógica configurada en JwtBearerOptions.Events.OnTokenValidated en Program.cs
    private static void EnrichClaims(ClaimsIdentity identity)
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

    [Fact]
    public void EnrichClaims_WhenAppMetadataContainsAdminRole_AssignsStrictlyAdminRole()
    {
        // Arrange
        var identity = new ClaimsIdentity();
        identity.AddClaim(new Claim("app_metadata", "{\"provider\":\"email\",\"role\":\"admin\"}"));

        // Act
        EnrichClaims(identity);

        // Assert
        var roles = identity.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
        Assert.Single(roles);
        Assert.Equal("admin", roles[0]);
        Assert.DoesNotContain("user", roles);
    }

    [Fact]
    public void EnrichClaims_WhenAppMetadataContainsUserRole_AssignsOnlyUserRole()
    {
        // Arrange
        var identity = new ClaimsIdentity();
        identity.AddClaim(new Claim("app_metadata", "{\"provider\":\"email\",\"role\":\"user\"}"));

        // Act
        EnrichClaims(identity);

        // Assert
        var roles = identity.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
        Assert.Single(roles);
        Assert.Equal("user", roles[0]);
    }

    [Fact]
    public void EnrichClaims_WhenUserRoleClaimProvided_AssignsRoleCorrectly()
    {
        // Arrange
        var identity = new ClaimsIdentity();
        identity.AddClaim(new Claim("user_role", "admin"));

        // Act
        EnrichClaims(identity);

        // Assert
        var roles = identity.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
        Assert.Single(roles);
        Assert.Equal("admin", roles[0]);
        Assert.DoesNotContain("user", roles);
    }

    [Fact]
    public void EnrichClaims_WhenNoRoleClaimsPresent_DefaultsToUserRole()
    {
        // Arrange
        var identity = new ClaimsIdentity();
        identity.AddClaim(new Claim("sub", Guid.NewGuid().ToString()));

        // Act
        EnrichClaims(identity);

        // Assert
        var roles = identity.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
        Assert.Single(roles);
        Assert.Equal("user", roles[0]);
    }
}
