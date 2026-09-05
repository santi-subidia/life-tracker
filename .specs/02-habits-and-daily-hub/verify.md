# Verificación contra la Spec: 02-habits-and-daily-hub

## 1. Validación de Criterios de Aceptación

### Escenario 1: Toggle de 1 toque de hábito diario y proyección a Timeline
- **Estado**: PASÓ (VERDE)
- **Evidencia**: Implementado en `HabitService.ToggleHabitCompletionAsync` y `HabitEndpoints`. Al tildar un hábito, se crea `HabitLog` y se emite `TimelineItem` a través de `IHabitTimelineProjector`.

### Escenario 2: Desmarcar hábito diario (toggle inverso)
- **Estado**: PASÓ (VERDE)
- **Evidencia**: Si el hábito ya estaba en estado completado, el toggle lo remueve y `IHabitTimelineProjector.RemoveHabitProjectionAsync` elimina el evento asociado en `timeline_items`.

### Escenario 3: Continuidad de racha en días específicos
- **Estado**: PASÓ (VERDE)
- **Evidencia**: Test unitario `SpecificDaysHabit_MonWedFri_NonScheduledDaysShouldNotBreakStreak` ejecutado y aprobado en `StreakCalculatorTests`. Días no programados no rompen la racha.

### Escenario 4: Racha semanal flexible "N veces por semana"
- **Estado**: PASÓ (VERDE)
- **Evidencia**: Implementado en `StreakCalculator.CalculateTimesPerWeek` agrupando por semanas calendario ISO-8601.

### Escenario 5 & 6: Período de gracia de 48 horas (Invariante 4)
- **Estado**: PASÓ (VERDE)
- **Evidencia**: Validación en `HabitService`: `if (targetDate < today.AddDays(-2)) throw new InvalidOperationException(...)`. Se rechaza cualquier fecha con más de 48h de antigüedad.

### Escenario 7: Registro ágil de Ánimo y Energía en Daily Hub
- **Estado**: PASÓ (VERDE)
- **Evidencia**: Endpoint `PUT /api/daily-logs/today` implementado y conectado en la UI de `/hoy` con selector visual de 1 a 5 de feedback inmediato.

### Escenario 8: Aislamiento estricto por usuario (Invariante 1)
- **Estado**: PASÓ (VERDE)
- **Evidencia**: Filtrado por `userId` en todas las consultas de EF Core (`HabitDefinitions`, `HabitLogs`, `DailyLogs`) y políticas RLS activas en Postgres.

---

## 2. Evidencia de Tests y Builds

* **Tests Unitarios .NET**: `dotnet test api/LifeTracker.slnx` -> **12/12 Pasados (100% VERDE)** en 245 ms.
* **Compilación de Producción Frontend**: `npm run build` en `web/` -> **Compilación limpia con PWA**, rutas prerenderizadas: `/`, `/habitos`, `/hoy`, `/salud`.
