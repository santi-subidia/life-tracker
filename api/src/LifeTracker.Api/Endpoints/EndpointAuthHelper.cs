using System.Security.Claims;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace LifeTracker.Api.Endpoints;

public static class EndpointAuthHelper
{
    public static Guid GetUserId(HttpContext context)
    {
        // 1. Extraer identificador desde ClaimTypes.NameIdentifier o sub
        var claim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? context.User.FindFirst("sub")?.Value;

        if (Guid.TryParse(claim, out var jwtUserId))
        {
            return jwtUserId;
        }

        // 2. Soporte para pruebas y desarrollo controlado vía header X-User-Id (bloqueado en Producción)
        var env = context.RequestServices?.GetService<IWebHostEnvironment>();
        var isProduction = env?.IsProduction() ?? false;

        if (!isProduction)
        {
            if (context.Request.Headers.TryGetValue("X-User-Id", out var headerValue) 
                && Guid.TryParse(headerValue, out var headerUserId))
            {
                return headerUserId;
            }

            // 3. Fallback anónimo únicamente habilitado en ambiente de pruebas explícito (Testing)
            if (env != null && (env.IsEnvironment("Testing") || env.IsEnvironment("Test")))
            {
                return Guid.Parse("00000000-0000-0000-0000-000000000001");
            }
        }

        throw new UnauthorizedAccessException("Usuario no autenticado o identificador de usuario inválido.");
    }
}
