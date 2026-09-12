# Informe de Verificación: Rate Limiting y Matriz de Seguridad RBAC

- **Feature**: `08-rate-limiting-and-security-policies`
- **Fecha**: 2026-09-12
- **Estado**: Verificado y Exitoso (Fase 6 SDD)
- **Evaluador**: Tech Lead & Orquestador (SubiKit)

---

## 1. Validación de Criterios de Aceptación

| Criterio / Escenario | Esperado | Resultado | Estado |
| :--- | :--- | :--- | :--- |
| **Escenario 1: Fuerza bruta en Login (`auth-login`)** | 5 solicitudes permitidas / 1 min por IP. La 6ta es rechazada con HTTP 429, cabecera `Retry-After` y ProblemDetails RFC 7807. | Validado en `RateLimitingPolicyTests.AuthLoginPolicy_Options_Allows5RequestsAndRejects6th` y `OnRejected_WritesProblemDetailsAndRetryAfterHeader`. | ✅ CUMPLE |
| **Escenario 2: Límite Asistente IA (`ai-assistant`)** | 10 solicitudes / 1 min por usuario para `/api/ai/.../messages` y `/api/health/extract`. | Validado en `RateLimitingPolicyTests.AiAssistantPolicy_Options_Allows10RequestsAndRejects11th`. | ✅ CUMPLE |
| **Escenario 3: Acceso de Admin a Módulos de Vida** | Usuario con rol `admin` recibe `403 Forbidden` en módulos de vida personal (`UserOnly`), y `200 OK` en `/api/admin/users`. | Validado en `AuthorizationPolicyTests.UserOnlyPolicy_AdminUserOnly_Fails` y `AdminOnlyPolicy_UserWithAdminRole_Succeeds`. | ✅ CUMPLE |
| **Escenario 4: Acceso de User a Admin Endpoints** | Usuario con rol `user` recibe `403 Forbidden` en `/api/admin/*`. | Validado en `AuthorizationPolicyTests.AdminOnlyPolicy_UserWithUserRoleOnly_Fails`. | ✅ CUMPLE |
| **Escenario 5: Acceso Anónimo a Endpoints Protegidos** | Cliente anónimo recibe `401 Unauthorized`. | Validado en `AuthorizationPolicyTests.UserOnlyPolicy_AnonymousUser_Fails`. | ✅ CUMPLE |
| **Escenario 6: Soporte Reverse Proxy (Nginx)** | Configuración de `ForwardedHeadersOptions` (`X-Forwarded-For`, `X-Forwarded-Proto`). | Registrado en `Program.cs` con `KnownIPNetworks.Clear()` y `app.UseForwardedHeaders()`. | ✅ CUMPLE |

---

## 2. Evidencia de Ejecución de Pruebas

```
Serie de pruebas para C:\Users\santi\Documents\GitHub\life-tracker\api\tests\LifeTracker.Domain.Tests\bin\Debug\net10.0\LifeTracker.Domain.Tests.dll (.NETCoreApp,Version=v10.0)
1 archivos de prueba en total coincidieron con el patrón especificado.

Correctas! - Con error: 0, Superado: 152, Omitido: 0, Total: 152, Duración: 1 s - LifeTracker.Domain.Tests.dll (net10.0)
```

---

## 3. Matriz Canónica Final de Seguridad en Backend

| Ruta / Grupo | Método | Política RBAC | Roles Permitidos | Rate Limit |
| :--- | :--- | :--- | :--- | :--- |
| `/health` | `GET` | Anónimo | Todos | `general-api` (IP: 30/min) |
| `/api/auth/login` | `POST` | Anónimo | Todos | `auth-login` (IP: 5/min) |
| `/api/auth/me` | `GET` | Autenticado | `user`, `admin` | `general-api` (120/min) |
| `/api/health/extract` | `POST` | `UserOnly` | `user` | `ai-assistant` (10/min) |
| `/api/health/*` (otros) | Todos | `UserOnly` | `user` | `general-api` (120/min) |
| `/api/habits/*` | Todos | `UserOnly` | `user` | `general-api` (120/min) |
| `/api/daily-hub/*` | Todos | `UserOnly` | `user` | `general-api` (120/min) |
| `/api/notes/*` | Todos | `UserOnly` | `user` | `general-api` (120/min) |
| `/api/work/*` | Todos | `UserOnly` | `user` | `general-api` (120/min) |
| `/api/academic/*` | Todos | `UserOnly` | `user` | `general-api` (120/min) |
| `/api/career-plan/*` | Todos | `UserOnly` | `user` | `general-api` (120/min) |
| `/api/ai/conversations/{id}/messages` | `POST` | `UserOnly` | `user` | `ai-assistant` (10/min) |
| `/api/ai/*` (otros) | Todos | `UserOnly` | `user` | `general-api` (120/min) |
| `/api/profile/*` | Todos | `UserOnly` | `user` | `general-api` (120/min) |
| `/api/finances/*` | Todos | `UserOnly` | `user` | `general-api` (120/min) |
| `/api/fitness/*` | Todos | `UserOnly` | `user` | `general-api` (120/min) |
| `/api/admin/users` | `POST` | `AdminOnly` | `admin` | `admin-sensitive` (10/min) |
| `/api/admin/users/{id}/reset-password` | `POST` | `AdminOnly` | `admin` | `admin-sensitive` (10/min) |
| `/api/admin/*` (otros) | Todos | `AdminOnly` | `admin` | `general-api` (120/min) |
