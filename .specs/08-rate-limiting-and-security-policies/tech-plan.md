# Plan Técnico: Rate Limiting y Matriz de Seguridad RBAC

- **Feature**: `08-rate-limiting-and-security-policies`
- **Fecha**: 2026-09-12
- **Estado**: Propuesta Técnica (Fase 3 SDD)
- **Autor**: Tech Lead & Orquestador (SubiKit)

---

## 1. Arquitectura y Principios de Diseño

### A. Deep Modules & Seams
- **Módulo Profundo de Rate Limiting (`RateLimitingExtensions`)**: Encapsula toda la complejidad de creación de particiones dinámicas (`PartitionedRateLimiter`), políticas de ventana deslizante (`SlidingWindowRateLimiterOptions`), límites de concurrencia (`ConcurrencyLimiterOptions`) y formateo de respuestas RFC 7807 (`OnRejected`) detrás de una interfaz limpia de extensión: `builder.Services.AddAppRateLimiting(builder.Configuration)`.
- **Costura (Seam)**: La resolución de la IP del cliente se desacopla a través de `IForwardedHeaders` y `HttpContext.Connection.RemoteIpAddress`, permitiendo simular IPs en pruebas de integración sin mockeos frágiles.

### B. Design It Twice: Evaluación de Alternativas

| Criterio | Opción 1: Nativo .NET 10 (`Microsoft.AspNetCore.RateLimiting`) ⭐ Seleccionada | Opción 2: Paquete Externo (`AspNetCoreRateLimit`) |
| :--- | :--- | :--- |
| **Dependencias** | **Cero**. Incluido en el runtime de ASP.NET Core (.NET 10). | Requiere paquetes NuGet de terceros con posible incompatibilidad en .NET 10. |
| **Rendimiento** | Optimizado en memoria con asignaciones mínimas de GC y estructuras `ValueTask`. | Mayor consumo de memoria por wrappers legacy de ASP.NET Core 3.1/5.0. |
| **Flexibilidad** | Particionamiento dinámico nativo por IP, User ID o claims (`PartitionedRateLimiter.Create<HttpContext, string>`). | Configuración estática basada en appsettings compleja de particionar dinámicamente. |
| **Mantenibilidad** | API estándar de Microsoft con soporte oficial a largo plazo. | Proyecto con bajo mantenimiento reciente. |

**Decisión**: Se selecciona la **Opción 1**, estándar oficial de la plataforma .NET 10.

---

## 2. Componentes e Impacto Técnico

### 1. `LifeTracker.Api/Extensions/RateLimitingExtensions.cs` [NEW]
Construye las siguientes 4 políticas y particionadores:
- `auth-login`:
  - Algoritmo: `SlidingWindow` (5 permisos / 60s / 3 segmentos).
  - Partición: IP remota del cliente.
- `ai-assistant`:
  - Algoritmo: `SlidingWindow` (10 permisos / 60s / 2 segmentos) + `ConcurrencyLimiter` (máximo 2 simultáneas).
  - Partición: `User ID` (si está autenticado) o IP.
- `admin-sensitive`:
  - Algoritmo: `FixedWindow` (10 permisos / 60s).
  - Partición: `User ID` del administrador.
- `general-api`:
  - Particionador dinámico:
    - Si `User.Identity?.IsAuthenticated == true` -> `SlidingWindow` (120 permisos / 60s / 2 segmentos) particionado por `User ID`.
    - Si es anónimo -> `SlidingWindow` (30 permisos / 60s / 2 segmentos) particionado por `IP`.
- Rejection Handler (`OnRejected`):
  - Inyecta cabecera `Retry-After: <segundos>`.
  - Retorna `ProblemDetails` (RFC 7807) con status `429 Too Many Requests`.

### 2. Configuración de Nginx Reverse Proxy (`ForwardedHeadersOptions`)
En `Program.cs`:
```csharp
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear(); // Permite proxy local/Docker Nginx
});
...
app.UseForwardedHeaders();
```

### 3. Middleware y Políticas de Endpoints
- Invocación de `app.UseRateLimiter()` antes de los endpoints y después de `app.UseAuthorization()`.
- Mapeo explícito:
  - `POST /api/auth/login` -> `.RequireRateLimiting("auth-login")`
  - `POST /api/ai/conversations/{id}/messages` -> `.RequireRateLimiting("ai-assistant")`
  - `POST /api/health/extract` -> `.RequireRateLimiting("ai-assistant")`
  - `POST /api/admin/users/{id}/reset-password` -> `.RequireRateLimiting("admin-sensitive")`
  - `POST /api/admin/users` -> `.RequireRateLimiting("admin-sensitive")`
  - Todo el resto de grupos de API -> protegidos por la política `general-api` (vía `DefaultSecurityPolicy` o atribución grupal).

### 4. Coherencia RBAC en `Program.cs`
- Se mantienen las políticas:
  - `AdminOnly`: `RequireRole("admin")`
  - `UserOnly`: `RequireRole("user")`
- Se asegura que `/api/auth/me` use `.RequireAuthorization()` estándar (permitiendo a tanto `user` como `admin` inspeccionar su propia identidad).
- Se preserva el aislamiento estricto: usuarios `admin` reciben `403 Forbidden` al invocar módulos del Life OS, y usuarios `user` reciben `403 Forbidden` al invocar `/api/admin/*`.

---

## 3. Estrategia de Pruebas

1. **Pruebas de Integración WebApplicationFactory (`RateLimitingTests.cs` y `RbacPolicyTests.cs`)**:
   - Enviar 5 requests a `/api/auth/login` con credenciales ficticias -> respuestas 401/400.
   - Enviar el 6to request a `/api/auth/login` desde la misma IP -> respuesta `429 Too Many Requests` con cabecera `Retry-After` y body RFC 7807.
   - Probar usuario con token `admin` en `/api/notes` -> retorna `403 Forbidden`.
   - Probar usuario con token `user` en `/api/admin/users` -> retorna `403 Forbidden`.
   - Probar usuario con token `admin` en `/api/auth/me` -> retorna `200 OK` con rol `admin`.
