# Desglose de Tareas: Fase 2 - Hábitos y Rutinas + Daily Hub (Vista 'Hoy')

## 1. Dominio y Motor de Rachas (LifeTracker.Domain)
- [x] **[TSK-H01]**: Crear Value Object `HabitFrequency` y enum `FrequencyType`.
- [x] **[TSK-H02]**: Crear entidad `HabitDefinition` con método `IsScheduledFor(DateOnly date)`.
- [x] **[TSK-H03]**: Crear entidad `HabitLog` con estados `Completed` y `Skipped`.
- [x] **[TSK-H04]**: Implementar Deep Module `StreakCalculator` (`IStreakCalculator`).
- [x] **[TSK-H05]**: Escribir y validar pruebas unitarias exhaustivas en `LifeTracker.Domain.Tests` para el cálculo de rachas y período de gracia (48h) (12/12 tests pasando en VERDE).

## 2. Persistencia e Infraestructura (LifeTracker.Infrastructure)
- [x] **[TSK-H06]**: Crear migración SQL `supabase/migrations/20260906000000_habits_frequencies_and_streaks.sql`.
- [x] **[TSK-H07]**: Configurar mapeos EF Core en `HabitConfigurations.cs` y actualizar `LifeTrackerDbContext`.
- [x] **[TSK-H08]**: Actualizar `ILifeTrackerDbContext` en `LifeTracker.Application`.

## 3. Servicios de Aplicación (LifeTracker.Application)
- [x] **[TSK-H09]**: Crear DTOs de Hábitos y Daily Hub (`HabitDto`, `CreateHabitRequest`, `DailyHubDto`, etc.).
- [x] **[TSK-H10]**: Implementar `HabitService` (`IHabitService`) con toggle de 1 toque, cálculo de rachas y validación de período de gracia (48h).
- [x] **[TSK-H11]**: Implementar Seam de proyección `IHabitTimelineProjector` para actualizar `timeline_items`.
- [x] **[TSK-H12]**: Implementar `DailyHubService` (`IDailyHubService`) para consolidar la vista "Hoy".

## 4. Endpoints RESTful (LifeTracker.Api)
- [x] **[TSK-H13]**: Crear `HabitEndpoints.cs` (`/api/habits`).
- [x] **[TSK-H14]**: Crear `DailyHubEndpoints.cs` (`/api/daily-hub` y `/api/daily-logs`).
- [x] **[TSK-H15]**: Registrar endpoints en `Program.cs` y verificar compilación limpia.

## 5. Frontend Next.js PWA (web/)
- [x] **[TSK-H16]**: Extender `api-client.ts` con métodos para Hábitos y Daily Hub.
- [x] **[TSK-H17]**: Implementar la vista del Daily Hub `/hoy` (`web/src/app/(dashboard)/hoy/page.tsx`) con 1-tap checklist, ánimo/energía y timeline feed.
- [x] **[TSK-H18]**: Implementar la pantalla de gestión `/habitos` (`web/src/app/(dashboard)/habitos/page.tsx`).
- [x] **[TSK-H19]**: Actualizar navegación y verificar build de producción (`npm run build`).
- [x] **[TSK-H20]**: Documentar verificación en `verify.md` y realizar commit semántico.
