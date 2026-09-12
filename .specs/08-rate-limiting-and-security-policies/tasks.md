# Tareas de Implementación: Rate Limiting y Matriz de Seguridad RBAC

- **Feature**: `08-rate-limiting-and-security-policies`
- **Fecha**: 2026-09-12
- **Estado**: Desglose de Tareas (Fase 4 SDD)
- **Autor**: Tech Lead & Orquestador (SubiKit)

---

## Tareas Secuenciales

- [x] **Tarea 1: Implementar Módulo Profundo de Rate Limiting**
  - Crear `api/src/LifeTracker.Api/Extensions/RateLimitingExtensions.cs`.
  - Configurar política `auth-login` (Sliding Window, 5 req/min por IP remota).
  - Configurar política `ai-assistant` (Sliding Window, 10 req/min por usuario + ConcurrencyLimiter max 2).
  - Configurar política `admin-sensitive` (Fixed Window, 10 req/min por admin).
  - Configurar particionador dinámico `general-api` (120 req/min para autenticados, 30 req/min para anónimos).
  - Implementar callback `OnRejected` generando respuesta estándar HTTP 429 con cabecera `Retry-After` y `ProblemDetails` RFC 7807.

- [x] **Tarea 2: Configurar ForwardedHeaders y Middleware en `Program.cs`**
  - Configurar `ForwardedHeadersOptions` para soporte de reverse proxy Nginx (`X-Forwarded-For`, `X-Forwarded-Proto`).
  - Registrar el middleware `app.UseForwardedHeaders()`.
  - Registrar los servicios con `builder.Services.AddAppRateLimiting()`.
  - Incorporar el middleware `app.UseRateLimiter()` en el pipeline HTTP en la posición correcta (después de routing y autenticación).

- [x] **Tarea 3: Asociar Políticas de Rate Limiting a los Endpoints**
  - Aplicar `.RequireRateLimiting("auth-login")` en `POST /api/auth/login`.
  - Aplicar `.RequireRateLimiting("ai-assistant")` en `POST /api/ai/conversations/{id}/messages` y `POST /api/health/extract`.
  - Aplicar `.RequireRateLimiting("admin-sensitive")` en operaciones de `POST /api/admin/users` y `POST /api/admin/users/{id}/reset-password`.
  - Asignar `.RequireRateLimiting("general-api")` a los grupos de endpoints del Life OS y endpoints generales.

- [x] **Tarea 4: Verificación y Auditoría de Políticas RBAC**
  - Confirmar que los módulos del Life OS se mantengan estrictamente con `.RequireAuthorization("UserOnly")`.
  - Confirmar que `/api/admin/*` se mantenga estrictamente con `.RequireAuthorization("AdminOnly")`.
  - Confirmar que `/api/auth/me` esté protegido con `.RequireAuthorization()` (permitiendo tanto `user` como `admin`).

- [x] **Tarea 5: Pruebas Automatizadas y Verificación contra la Spec**
  - Crear tests de integración para evaluar el comportamiento de rechazo HTTP 429 por ráfagas de login.
  - Crear tests para verificar el aislamiento RBAC (admin bloqueado de módulos de vida con 403, user bloqueado de endpoints admin con 403).
  - Ejecutar `dotnet test api/LifeTracker.slnx` y confirmar 100% de tests en VERDE.
  - Documentar evidencias en `verify.md`.
