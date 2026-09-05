# Plan Técnico: 01-monorepo-scaffold

## 1. Arquitectura del Sistema
El sistema Life Tracker se estructura como un monorepo desacoplado con dos componentes primarios:

1. **`web/`**: Single Page / Progressive Web App en Next.js 16 con React 19 y Tailwind CSS v4. Implementa el patrón Shell responsivo con soporte offline mediante `@ducanh2912/next-pwa`.
2. **`api/`**: Backend en .NET 10 Web API organizado con Clean Architecture en 4 proyectos (`Domain`, `Application`, `Infrastructure`, `Api`) más suite de tests.

## 2. Capas y Costuras (Seams)
- **LifeTracker.Domain**: Sin dependencias externas. Contiene entidades del núcleo (`DailyLog`, `TimelineItem`) y de los módulos (`HealthStudy`, `Habit`, `Note`, `WorkProject`, `AcademicSubject`).
- **LifeTracker.Application**: Casos de uso, orquestación, validadores con FluentValidation, DTOs y abstracciones de servicios (`IStorageService`, `IAiExtractorService`, `IUnitOfWork`).
- **LifeTracker.Infrastructure**: Implementación concreta de EF Core con Npgsql hacia Supabase PostgreSQL, cliente de Cloudflare R2 vía S3 SDK y cliente HTTP/SDK de Google Gemini 2.5 Flash.
- **LifeTracker.Api**: Exposición de Minimal APIs / Controllers REST, validación de JWT emitidos por Supabase Auth, Swagger/OpenAPI y CORS configurado para el frontend.

## 3. Estrategia de Testing
- Pruebas unitarias en `LifeTracker.Domain.Tests` para validar invariantes de dominio (ej. cálculo de rachas de hábitos, estados de tareas Kanban).
- Verificación automatizada con `dotnet test` y compilación de frontend con `npm run build`.
