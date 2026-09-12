# Especificación: Rate Limiting y Matriz de Políticas de Seguridad RBAC

- **Feature**: `08-rate-limiting-and-security-policies`
- **Fecha**: 2026-09-12
- **Estado**: Propuesta para Aprobación (Fase 1 SDD)
- **Autor**: Tech Lead & Orquestador (SubiKit)

---

## 1. Resumen Ejecutivo y Valor de Negocio

El backend de **Soma (Life OS)** cuenta actualmente con autenticación basada en JWT y ASP.NET Core Identity, con endpoints divididos entre administración (`/api/admin/*`), módulos del Life OS (`/api/*`) y diagnóstico (`/health`). Sin embargo:
1. **Falta de Rate Limiting**: El sistema carece de protección perimetral contra ataques de fuerza bruta (en `/api/auth/login`), abuso de consumo en endpoints costosos de IA (`/api/ai/conversations/{id}/messages` y `/api/health/extract`), y loops descontrolados en clientes frontend o scripts externos.
2. **Inconsistencia en Políticas RBAC (`UserOnly`)**: Actualmente, la política `UserOnly` exige estrictamente el rol `user` (`RequireRole("user")`). Como consecuencia directa, un usuario con rol `admin` no puede acceder a ningún módulo personal (hábitos, notas, finanzas, fitness, timeline) recibiendo un `403 Forbidden`, a menos que tenga asignado explícitamente ambos roles o que la política reconozca a usuarios autorizados de la plataforma.

Esta especificación formaliza la matriz integral de acceso RBAC y define un sistema de **Rate Limiting nativo en .NET 10** (`Microsoft.AspNetCore.RateLimiting`), particionado por identidad de usuario e IP de origen, con respuesta estandarizada RFC 7807 (HTTP 429).

---

## 2. Alcance (Scope)

### Dentro del Alcance (In Scope)
- **Arquitectura de Rate Limiting en ASP.NET Core (.NET 10)**:
  - Registro de middleware `app.UseRateLimiter()`.
  - Configuración de particionadores dinámicos por `User ID` (autenticados) e `IP remota` (anónimos/login).
  - Políticas específicas:
    1. `auth-login`: 5 intentos / 1 minuto por IP (Sliding Window, sin cola).
    2. `ai-assistant`: 10 solicitudes / 1 minuto por usuario + Concurrency Limiter (máximo 2 simultáneas) para endpoints con LLM (`/api/ai/.../messages`, `/api/health/extract`).
    3. `admin-sensitive`: 10 solicitudes / 1 minuto por usuario admin (`reset-password`, altas de usuarios).
    4. `general-api`: 120 solicitudes / 1 minuto por usuario autenticado; 30 solicitudes / 1 minuto por IP para anónimos.
  - Formato estandarizado de rechazo con código `429 Too Many Requests`, cabecera `Retry-After` y payload RFC 7807 `ProblemDetails`.
- **Revisión y Reestructuración de Políticas RBAC**:
  - Definición formal de roles: `admin` y `user`.
  - Políticas de autorización claras:
    1. `AllowAnonymous`: Endpoints públicos (`/health`, `/api/auth/login`, Swagger en desarrollo).
    2. `RequireAppUser` (reemplazo o corrección de `UserOnly`): Permite acceso tanto a `user` como a `admin` para interactuar con sus propios recursos del Life OS (`RequireRole("user", "admin")` o `RequireAuthenticatedUser()`), preservando el aislamiento de datos por `user_id`.
    3. `AdminOnly`: Restringido estrictamente a `admin` (`/api/admin/users/*`).
- **Actualización de `CONTEXT.md`**:
  - Incorporar la sección de "Seguridad, RBAC y Rate Limiting" en el glosario y las invariantes del dominio.
- **Suite de Pruebas**:
  - Tests unitarios y de integración para validar que las políticas aplican las cuotas correctas y devuelven HTTP 429 con `Retry-After`.
  - Tests para comprobar que un usuario `admin` y un usuario `user` acceden correctamente a los endpoints según la matriz.

### Fuera del Alcance (Out of Scope)
- Almacenamiento distribuido de Rate Limiting con Redis (se implementa in-memory con los algoritmos nativos de .NET 10, apto para la arquitectura actual en contenedor único).
- Multi-factor authentication (MFA/2FA) por SMS/TOTP (futura fase).
- Gestión granular de permisos dinámicos a nivel de permisos CRUD individuales por entidad (el modelo de dominio opera con RBAC + aislamiento estricto por `user_id`).

---

## 3. Matriz de Seguridad y Accesos por Rol

| Categoría de Endpoint | Ruta Base | Métodos | Política de Autorización | Roles Permitidos | Rate Limit Policy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Diagnóstico** | `/health` | `GET` | Ninguna (`AllowAnonymous`) | Anónimo, User, Admin | `general-api` (IP: 30/min) |
| **Documentación** | `/swagger/*` | `GET` | Anónimo (solo en Development) | Todos (Dev) | Ninguno |
| **Autenticación (Login)** | `/api/auth/login` | `POST` | Ninguna (`AllowAnonymous`) | Anónimo | `auth-login` (IP: 5/min) |
| **Sesión Actual** | `/api/auth/me` | `GET` | Autenticado (`RequireAuthorization`) | `user`, `admin` | `general-api` (120/min) |
| **Salud (Extracción IA)** | `/api/health/extract` | `POST` | `UserOnly` | `user` | `ai-assistant` (10/min, conc=2) |
| **Salud (Estudios/Métricas)** | `/api/health/*` | `GET`, `POST`, `DELETE` | `UserOnly` | `user` | `general-api` (120/min) |
| **Hábitos y Rutinas** | `/api/habits/*` | `GET`, `POST`, `PUT`, `DELETE` | `UserOnly` | `user` | `general-api` (120/min) |
| **Daily Hub (Bitácora)** | `/api/daily-hub/*` | `GET`, `POST`, `PUT` | `UserOnly` | `user` | `general-api` (120/min) |
| **Notas y Wikilinks** | `/api/notes/*` | `GET`, `POST`, `PUT`, `DELETE` | `UserOnly` | `user` | `general-api` (120/min) |
| **Proyectos, Tareas, Foco** | `/api/work/*` | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | `UserOnly` | `user` | `general-api` (120/min) |
| **Académico** | `/api/academic/*` | `GET`, `POST`, `PUT`, `DELETE` | `UserOnly` | `user` | `general-api` (120/min) |
| **Plan de Carrera** | `/api/career-plan/*` | `GET`, `POST`, `PUT`, `DELETE` | `UserOnly` | `user` | `general-api` (120/min) |
| **Asistente IA (Conversaciones)** | `/api/ai/conversations` | `GET`, `POST` | `UserOnly` | `user` | `general-api` (120/min) |
| **Asistente IA (Mensajes / Gemini)** | `/api/ai/conversations/{id}/messages` | `POST` | `UserOnly` | `user` | `ai-assistant` (10/min, conc=2) |
| **Asistente IA (Gestión)** | `/api/ai/conversations/{id}/*` | `GET`, `PATCH`, `DELETE` | `UserOnly` | `user` | `general-api` (120/min) |
| **Perfil de Usuario** | `/api/profile/*` | `GET` | `UserOnly` | `user` | `general-api` (120/min) |
| **Finanzas Personales** | `/api/finances/*` | `GET`, `POST`, `PUT`, `DELETE` | `UserOnly` | `user` | `general-api` (120/min) |
| **Fitness y Entrenamientos** | `/api/fitness/*` | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | `UserOnly` | `user` | `general-api` (120/min) |
| **Admin: Usuarios (Listar/Crear)** | `/api/admin/users` | `GET`, `POST` | `AdminOnly` | `admin` únicamente | `admin-sensitive` (10/min) |
| **Admin: Roles y Estados** | `/api/admin/users/{id}/*` | `PATCH` | `AdminOnly` | `admin` únicamente | `admin-sensitive` (10/min) |
| **Admin: Reset Password** | `/api/admin/users/{id}/reset-password` | `POST` | `AdminOnly` | `admin` únicamente | `admin-sensitive` (10/min) |


---

## 4. Políticas de Rate Limiting Detalladas

### A. Política `auth-login`
- **Objetivo**: Mitigar ataques de fuerza bruta y credential stuffing.
- **Algoritmo**: `SlidingWindowRateLimiter` (Ventana deslizante con 3 segmentos).
- **Parámetros**:
  - `PermitLimit`: 5 solicitudes.
  - `Window`: 1 minuto (60 segundos).
  - `SegmentsPerWindow`: 3 (evaluación continua cada 20 segundos).
  - `QueueLimit`: 0 (rechazo inmediato, sin encolado).
- **Clave de partición**: IP remota del cliente (`RemoteIpAddress`).

### B. Política `ai-assistant`
- **Objetivo**: Controlar costos de tokens y saturación de la cuota de Google Gemini API.
- **Algoritmo**: Combinación de `TokenBucket` o `SlidingWindow` con `ConcurrencyLimiter`.
- **Parámetros**:
  - `PermitLimit`: 10 solicitudes por ventana de 1 minuto.
  - `ConcurrencyLimit`: Máximo 2 solicitudes concurrentes activas por usuario.
  - `QueueLimit`: 0.
- **Clave de partición**: `User ID` (extraído del claim JWT).

### C. Política `admin-sensitive`
- **Objetivo**: Evitar ráfagas en endpoints administrativos críticos (creación masiva de cuentas, restablecimiento de contraseñas).
- **Algoritmo**: `FixedWindowRateLimiter`.
- **Parámetros**:
  - `PermitLimit`: 10 solicitudes por minuto.
  - `QueueLimit`: 0.
- **Clave de partición**: `User ID` del administrador.

### D. Política `general-api` (Fallback global)
- **Objetivo**: Prevención de bucles infinitos en el frontend y abuso general de la API.
- **Algoritmo**: `SlidingWindowRateLimiter`.
- **Parámetros**:
  - Para usuarios autenticados: 120 solicitudes / minuto (particionado por `User ID`).
  - Para clientes anónimos: 30 solicitudes / minuto (particionado por `IP`).
  - `QueueLimit`: 0.

### E. Manejo de Rechazo (OnRejected)
Cuando un límite es superado:
- Código HTTP: `429 Too Many Requests`.
- Cabecera HTTP: `Retry-After: <segundos_restantes>`.
- Cabecera HTTP: `Content-Type: application/problem+json`.
- Cuerpo de respuesta RFC 7807:
```json
{
  "type": "https://tools.ietf.org/html/rfc6585#section-4",
  "title": "Demasiadas solicitudes",
  "status": 429,
  "detail": "Has superado el límite de solicitudes permitido para este recurso. Por favor, inténtalo nuevamente en {RetryAfter} segundos.",
  "instance": "/api/auth/login",
  "retryAfterSeconds": 20
}
```

---

## 5. Criterios de Aceptación (Gherkin)

### Escenario 1: Bloqueo por fuerza bruta en Login
```gherkin
Dado que un cliente realiza solicitudes POST a "/api/auth/login" desde una misma IP
Cuando el cliente envía 5 solicitudes dentro de una ventana de 1 minuto
Entonces las primeras 5 solicitudes son procesadas con el resultado habitual de autenticación
Y cuando el cliente envía la 6ta solicitud dentro de la misma ventana
Entonces el servidor responde con estado HTTP 429 Too Many Requests
Y la respuesta incluye la cabecera "Retry-After" con el tiempo restante
Y el cuerpo de la respuesta contiene un ProblemDetails con detalle de la tasa excedida
```

### Escenario 2: Límite de mensajes al Asistente IA
```gherkin
Dado que un usuario autenticado envía mensajes a "/api/ai/conversations/{id}/messages"
Cuando el usuario envía 10 mensajes en menos de 1 minuto
Entonces todos son aceptados para procesamiento
Y cuando intenta enviar el 11º mensaje en el mismo minuto
Entonces el servidor responde con estado HTTP 429 Too Many Requests
Y no se ejecuta ninguna llamada a la API de Gemini
```

### Escenario 3: Intento de acceso a módulos Life OS para usuario con rol Admin
```gherkin
Dado un usuario autenticado que posee únicamente el rol "admin"
Cuando realiza una solicitud GET a "/api/notes" o "/api/finances/accounts"
Entonces el servidor rechaza la solicitud con estado HTTP 403 Forbidden
Y cuando realiza una solicitud GET a "/api/admin/users"
Entonces el servidor autoriza la solicitud con estado HTTP 200 OK
```

### Escenario 4: Intento de acceso a endpoints de administración por rol User
```gherkin
Dado un usuario autenticado que posee únicamente el rol "user"
Cuando realiza una solicitud GET a "/api/admin/users"
Entonces el servidor rechaza la solicitud con estado HTTP 403 Forbidden
```

### Escenario 5: Usuario anónimo intenta acceder a endpoints protegidos
```gherkin
Dado un cliente anónimo sin token JWT
Cuando realiza una solicitud GET a "/api/habits" o "/api/admin/users"
Entonces el servidor rechaza la solicitud con estado HTTP 401 Unauthorized
```

---

## 6. Puerta de Aprobación

- [ ] Revisión del esquema de políticas RBAC y resolución del bloqueo de admins en endpoints de usuario.
- [ ] Validación de los umbrales de rate limit (`auth-login: 5/min`, `ai: 10/min`, `general: 120/min`).
- [ ] Aprobación explícita de Subi para proceder a la Fase 2 (Clarificación) y Fase 3 (Plan Técnico).
