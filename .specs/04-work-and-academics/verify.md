# Verificación y Cierre: Fase 4 - Trabajo (Tablero Kanban & Deep Work) + Academia (Materias, Exámenes y Calificaciones)

- **Fase**: 4 (Productividad Profesional & Formación Académica)
- **Fecha**: 2026-09-06
- **Estado**: Verificado y Listo para Entrega (Ship)
- **Auditor**: Agente Orquestador & Tech Lead (SubiKit)

---

## 1. Resumen de Implementación

En esta fase se construyeron e integraron verticalmente dos Bounded Contexts de alto impacto para Subi:

1. **Módulo de Trabajo (`/trabajo`)**:
   - Tablero Kanban interactivo con 4 columnas (`Backlog`, `Todo`, `InProgress`, `Done`), con soporte HTML5 Drag & Drop en desktop y botones de cambio de columna accesibles en móvil (área táctil >= 44x44px).
   - Deep Module `KanbanOrderingService` con reordenamiento secuencial entero contiguo (`0..N-1`) libre de colisiones.
   - Temporizador de Deep Work `DeepWorkTimer.tsx` con modos duales: Pomodoro (25/5 min con Web Audio API) y Cronómetro libre, sincronizado con `localStorage` y modal de notas para registro de sesión.
   - Deep Module `FocusMetricsCalculator` con cálculo de minutos de foco acumulados en la semana y el día.
   - Proyección idempotente a `timeline_items` vía `WorkTimelineProjector` (al marcar `Done` proyecta, al desmarcar revierte).

2. **Módulo de Academia (`/academia`)**:
   - Catálogo de materias universitarias organizadas por período (`term`), profesor, código, color distintivo y estado (`EnCurso`, `Aprobada`, `Regularizada`, `Recursar`).
   - Gestión de hitos evaluativos (Parciales, Finales, Entregas, Recuperatorios) con fecha programada, ponderación (%) y nota numérica [0.00 - 10.00].
   - Deep Module `GradeAverageCalculator`: cálculo en tiempo real de promedios ponderados, manejo de ponderaciones parciales normalizadas, sustitución por recuperatorios y cálculo de promedio general de carrera.
   - Proyección de hitos calificados a `timeline_items` vía `AcademicTimelineProjector`.

3. **Enriquecimiento del Daily Hub (`/hoy`)**:
   - `WorkFocusWidget`: resumen de minutos de foco y tareas completadas hoy.
   - `UpcomingExamsWidget`: alerta proactiva de exámenes de los próximos 7 días con badges relativos ("¡Hoy!", "Mañana", "En X días") y navegación directa a `/academia`.

---

## 2. Evidencias de Pruebas Automatizadas

### 2.1 Backend .NET 10 (`dotnet test api/LifeTracker.slnx`)
```text
Passed!  - Failed: 0, Passed: 48, Skipped: 0, Total: 48, Duration: 352 ms - LifeTracker.Domain.Tests.dll (net10.0)
Build succeeded: 0 Warning(s), 0 Error(s).
```
- Cobertura:
  - Ausencia de notas -> promedio null.
  - Ponderaciones completas y parciales normalizadas.
  - Fallback a media aritmética simple.
  - Recuperatorios reemplazando parciales previos.
  - Redondeo financiero `MidpointRounding.AwayFromZero` a 2 decimales.
  - Promedio de carrera sobre materias aprobadas.
  - Reordenamiento intra-columna e inter-columna Kanban con índices contiguos.
  - Invariantes de tiempo en `WorkSession` y métricas de foco.
  - Validación de rango de notas [0, 10] en `AcademicMilestone`.

### 2.2 Frontend Next.js 16 (`npm run build --webpack`)
```text
▲ Next.js 16.3.4 (webpack)
✓ Compiled successfully in 4.1s
✓ Finished TypeScript in 2.9s
✓ Generating static pages (9/9)

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /academia
├ ○ /habitos
├ ○ /hoy
├ ○ /notas
├ ○ /salud
└ ○ /trabajo

○  (Static)  prerendered as static content
Status: EXIT CODE 0
```

---

## 3. Verificación de Criterios de Aceptación (Gherkin)

| Escenario | Criterio | Estado |
|---|---|---|
| Escenario 1 | Creación de proyecto y tarea en tablero Kanban | Cumplido ✅ |
| Escenario 2 | Movimiento de tarea (drag & drop y botones móviles) | Cumplido ✅ |
| Escenario 3 | Sesión de Deep Work guardada con proyección de foco | Cumplido ✅ |
| Escenario 4 | Tarea marcada 'Done' proyectada a Daily Hub | Cumplido ✅ |
| Escenario 5 | Revertir tarea de 'Done' remueve proyección de forma idempotente | Cumplido ✅ |
| Escenario 6 | Creación de materia e hito evaluativo | Cumplido ✅ |
| Escenario 7 | Calificación de hito y recálculo de promedio ponderado | Cumplido ✅ |
| Escenario 8 | Alerta de exámenes próximos en Daily Hub `/hoy` | Cumplido ✅ |
| Escenario 9 | Aislamiento estricto multi-tenant con RLS | Cumplido ✅ |
| Escenario 10 | Validación de notas numéricas [0.00, 10.00] | Cumplido ✅ |

---

## 4. Conclusión y Veredicto
- **Veredicto**: **SHIP (Listo para entrega)**.
- El sistema de Trabajo y Academia se encuentra plenamente operativo, testeado y alineado con los principios de Clean Architecture y UI Craftsmanship.
