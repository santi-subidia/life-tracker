# Plan Técnico: Fase 2 - Hábitos y Rutinas + Daily Hub (Vista 'Hoy')

- **Ruta**: `.specs/02-habits-and-daily-hub/tech-plan.md`
- **Fase**: 3 (Plan Técnico y Arquitectura)
- **Estado**: Aprobado
- **Fecha**: 2026-09-05
- **Autor**: Tech Lead & Architect (SubiKit)

---

## 1. Arquitectura de Dominio y Deep Modules

### 1.1 El Bounded Context `Habits`
* **Entidades**:
  - `HabitDefinition`: Agregado raíz. Encapsula metadatos, reglas de frecuencia (`HabitFrequency`) y el método de consulta `IsScheduledFor(DateOnly date)`.
  - `HabitLog`: Registro atómico de realización (`Status`: `Completed`, `Skipped`).
* **Deep Module: `StreakCalculator`**:
  - Interfaz concisa: `IStreakCalculator.Calculate(HabitDefinition habit, IReadOnlyList<HabitLog> logs, DateOnly targetDate) -> StreakResult`.
  - Oculta la complejidad de semanas calendario ISO-8601, días no aplicables, tolerancia a saltos justificados (`skipped`) y la regla de 48 horas de gracia.

### 1.2 El Seam de Proyección al Spine (`IHabitTimelineProjector`)
* Al marcar un hábito como completado, se inserta una proyección en `timeline_items`:
  - `source_module`: `"habits"`
  - `source_id`: `habitLog.Id`
  - `event_type`: `"habit_completed"`
  - `title`: `"Hábito completado: {habit.Name}"`
  - `summary`: `"Racha de {currentStreak} días"`
* Al desmarcar un hábito, se elimina de forma idempotente la proyección de `timeline_items`.

---

## 2. Capa de Datos (EF Core & Supabase PostgreSQL)

### 2.1 Mapeos de Entidades
* `habit_definitions` y `habit_logs` en `LifeTracker.Infrastructure/Persistence/Configurations/HabitConfigurations.cs`.
* Soporte para JSONB o columnas escalares para `specific_days` (array de enteros 1 a 7) y `target_days_per_week`.

### 2.2 Migración SQL Complementaria
* Archivo: `supabase/migrations/20260906000000_habits_frequencies_and_streaks.sql` agregando columnas `frequency_type`, `target_days_per_week` y `specific_days` a `habit_definitions`.

---

## 3. Endpoints RESTful (.NET 10 Web API)

* **Rutas de Hábitos (`/api/habits`)**:
  - `GET /api/habits`: Lista de hábitos del usuario autenticado con rachas calculadas.
  - `POST /api/habits`: Creación de nuevo hábito con frecuencia validada.
  - `POST /api/habits/{id}/toggle`: Alternar estado en fecha dada (default hoy). Valida período de gracia (máx 48h).
  - `DELETE /api/habits/{id}`: Archivar hábito.
* **Rutas del Daily Hub (`/api/daily-hub`)**:
  - `GET /api/daily-hub/today`: Datos consolidados para la pantalla `/hoy` (DailyLog + hábitos de hoy + porcentaje + timeline de hoy).
  - `PUT /api/daily-logs/today`: Check-in de ánimo y energía.

---

## 4. Frontend Next.js 16 (PWA Mobile-First)

* `web/src/app/(dashboard)/hoy/page.tsx`:
  - Selector táctil de Ánimo (1 a 5) y Energía (1 a 5) con guardado instantáneo.
  - Checklist de hábitos de hoy con animación de completitud y recálculo visual en tiempo real.
  - Barra de progreso del día (% completado).
  - Feed de actividad de hoy (Spine transversal).
* `web/src/app/(dashboard)/habitos/page.tsx`:
  - Gestión integral de hábitos (crear, editar frecuencia, archivar).
* `web/src/lib/api-client.ts`:
  - Métodos `getDailyHubToday()`, `saveDailyLog()`, `toggleHabit()`, `getHabits()`, `createHabit()`.

---

## 5. Estrategia de Pruebas (Feedback Loop en VERDE)

1. **Tests de Dominio Unitarios**:
   - `StreakCalculatorTests`: Frecuencia diaria, días específicos, N veces por semana, días salteados y período de gracia.
2. **Tests de Integración y Compilación**:
   - `dotnet test api/LifeTracker.slnx` pasando al 100%.
   - `npm run build` en `web/` verificando prerenderizado de `/hoy` y `/habitos`.
