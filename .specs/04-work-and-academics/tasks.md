# Desglose de Tareas: Fase 4 - Trabajo (Tablero Kanban & Deep Work) + Academia (Materias, Exámenes y Calificaciones)

## Tarea 1: Migración de Base de Datos Supabase
- [x] **[TSK-W01]**: Crear el script de migración SQL `supabase/migrations/20260908000000_work_and_academics_refinements.sql` con refinamientos en `work_projects` (`updated_at`), `work_sessions` (`task_id`, índice de usuario/inicio), `work_tasks` (índices de proyecto y posición), `academic_subjects` (`professor`, `updated_at`, normalización y constraint de status `en_curso`, `aprobada`, `regularizada`, `recursar`) y `academic_milestones` (`status`, `replaces_milestone_id`, `updated_at`, índice de vencimiento).

## Tarea 2: Dominio Trabajo (LifeTracker.Domain.Work)
- [x] **[TSK-W02]**: Crear enums `WorkProjectStatus`, `WorkTaskStatus` y `WorkTaskPriority` en `LifeTracker.Domain/Work/WorkEnums.cs`.
- [x] **[TSK-W03]**: Crear la entidad `WorkProject` (Aggregate Root) en `LifeTracker.Domain/Work/WorkProject.cs` con validaciones de invariantes y método `Update`.
- [x] **[TSK-W04]**: Crear la entidad `WorkTask` (Aggregate Root) en `LifeTracker.Domain/Work/WorkTask.cs` con métodos `MoveTo` y `UpdateDetails`.
- [x] **[TSK-W05]**: Crear la entidad `WorkSession` en `LifeTracker.Domain/Work/WorkSession.cs` con cálculo automático de duración en minutos e invariantes de tiempo.
- [x] **[TSK-W06]**: Crear el Deep Module `IKanbanOrderingService` y su implementación `KanbanOrderingService` en `LifeTracker.Domain/Work/KanbanOrderingService.cs` para reordenamiento intra-columna y transferencia inter-columna con índices contiguos base 0.
- [x] **[TSK-W07]**: Crear el Deep Module `IFocusMetricsCalculator` y `FocusMetricsCalculator` en `LifeTracker.Domain/Work/FocusMetricsCalculator.cs` para agregación de minutos de foco y tareas completadas por ventana semanal y diaria.

## Tarea 3: Dominio Academia (LifeTracker.Domain.Academics)
- [x] **[TSK-W08]**: Crear enums `SubjectStatus`, `MilestoneType` y `MilestoneStatus` en `LifeTracker.Domain/Academics/AcademicEnums.cs`.
- [x] **[TSK-W09]**: Crear la entidad `AcademicSubject` (Aggregate Root) en `LifeTracker.Domain/Academics/AcademicSubject.cs` con método `Update`.
- [x] **[TSK-W10]**: Crear la entidad `AcademicMilestone` en `LifeTracker.Domain/Academics/AcademicMilestone.cs` con validación de calificaciones [0.00, 10.00], estado derivado y autoreferencia `ReplacesMilestoneId`.
- [x] **[TSK-W11]**: Crear el Deep Module `IGradeAverageCalculator` y `GradeAverageCalculator` en `LifeTracker.Domain/Academics/GradeAverageCalculator.cs` implementando las reglas de ponderaciones completas, ponderaciones parciales normalizadas, fallback aritmético, reemplazo por recuperatorio y redondeo a 2 decimales.

## Tarea 4: Tests Unitarios de Dominio (LifeTracker.Domain.Tests)
- [x] **[TSK-W12]**: Crear el archivo de pruebas `GradeAverageCalculatorTests.cs` en `api/tests/LifeTracker.Domain.Tests/GradeAverageCalculatorTests.cs` con casos de prueba para ausencia de notas, ponderación completa, ponderación parcial, media aritmética simple, reemplazo por recuperatorio y promedio de carrera.
- [x] **[TSK-W13]**: Crear el archivo de pruebas `WorkDomainTests.cs` en `api/tests/LifeTracker.Domain.Tests/WorkDomainTests.cs` validando `KanbanOrderingService` (posicionamiento sin colisiones), invariantes de `WorkSession` y agregaciones de `FocusMetricsCalculator`.
- [x] **[TSK-W14]**: Ejecutar la suite `dotnet test` asegurando que todos los tests de dominio pasen en VERDE al 100%.

## Tarea 5: Capa Infrastructure (LifeTracker.Infrastructure)
- [x] **[TSK-W15]**: Crear las configuraciones de EF Core `WorkConfigurations.cs` (`WorkProjectConfiguration`, `WorkTaskConfiguration`, `WorkSessionConfiguration`) en `LifeTracker.Infrastructure/Persistence/Configurations/WorkConfigurations.cs`.
- [x] **[TSK-W16]**: Crear las configuraciones de EF Core `AcademicConfigurations.cs` (`AcademicSubjectConfiguration`, `AcademicMilestoneConfiguration`) en `LifeTracker.Infrastructure/Persistence/Configurations/AcademicConfigurations.cs`.
- [x] **[TSK-W17]**: Actualizar la interfaz `ILifeTrackerDbContext` en `LifeTracker.Application` agregando los `DbSet` de `WorkProjects`, `WorkTasks`, `WorkSessions`, `AcademicSubjects` y `AcademicMilestones`.
- [x] **[TSK-W18]**: Actualizar `LifeTrackerDbContext` en `LifeTracker.Infrastructure` implementando los nuevos `DbSet`.
- [x] **[TSK-W19]**: Registrar en `LifeTracker.Infrastructure/DependencyInjection.cs` los servicios y deep modules `IKanbanOrderingService`, `IFocusMetricsCalculator`, `IGradeAverageCalculator`, los seams `IWorkTimelineProjector` e `IAcademicTimelineProjector`, y los servicios de aplicación `IWorkService` e `IAcademicService`.

## Tarea 6: Capa Application (LifeTracker.Application)
- [x] **[TSK-W20]**: Crear los DTOs de Trabajo en `LifeTracker.Application/Work/Dtos/WorkDtos.cs` (`WorkProjectDto`, `WorkTaskDto`, `WorkSessionDto`, `WorkMetricsDto`, requests de creación, actualización y movimiento).
- [x] **[TSK-W21]**: Crear los DTOs de Academia en `LifeTracker.Application/Academics/Dtos/AcademicDtos.cs` (`AcademicSubjectDto`, `AcademicSubjectDetailDto`, `AcademicMilestoneDto`, `AcademicMetricsDto`, requests de creación, actualización y calificación).
- [x] **[TSK-W22]**: Implementar el Seam `IWorkTimelineProjector` y `WorkTimelineProjector` en `LifeTracker.Application/Work/Services/WorkTimelineProjector.cs` para proyección idempotente de tareas completadas y sesiones de foco en `timeline_items`.
- [x] **[TSK-W23]**: Implementar el Seam `IAcademicTimelineProjector` y `AcademicTimelineProjector` en `LifeTracker.Application/Academics/Services/AcademicTimelineProjector.cs` para proyección de hitos calificados.
- [x] **[TSK-W24]**: Implementar `IWorkService` y `WorkService` en `LifeTracker.Application/Work/Services/WorkService.cs` con orquestación de proyectos, tareas (invocando `KanbanOrderingService` y el proyector de timeline), sesiones y métricas semanales.
- [x] **[TSK-W25]**: Implementar `IAcademicService` y `AcademicService` en `LifeTracker.Application/Academics/Services/AcademicService.cs` con cálculo al vuelo de promedios mediante `GradeAverageCalculator`, asignación de notas y métricas de carrera.
- [x] **[TSK-W26]**: Actualizar `DailyHubDtos.cs` y `DailyHubService.cs` enriqueciendo la vista diaria con `WorkSummaryDto` (tareas hechas hoy + minutos de foco) y `UpcomingExamDto` (exámenes de los próximos 7 días).

## Tarea 7: Endpoints de API .NET (LifeTracker.Api)
- [x] **[TSK-W27]**: Crear `WorkEndpoints.cs` en `api/src/LifeTracker.Api/Endpoints/WorkEndpoints.cs` implementando los endpoints para proyectos, tareas, movimiento de tareas con PATCH, sesiones de foco y métricas semanales.
- [x] **[TSK-W28]**: Crear `AcademicEndpoints.cs` en `api/src/LifeTracker.Api/Endpoints/AcademicEndpoints.cs` implementando los endpoints para materias, hitos, calificación de hitos con PATCH y métricas académicas.
- [x] **[TSK-W29]**: Registrar `app.MapWorkEndpoints()` y `app.MapAcademicEndpoints()` en `LifeTracker.Api/Program.cs` y verificar compilación limpia de la solución en .NET 10.

## Tarea 8: Frontend Next.js PWA (web/)
- [x] **[TSK-W30]**: Extender `web/src/lib/api-client.ts` incorporando las interfaces TypeScript y métodos cliente para proyectos, tareas, sesiones de Deep Work, materias, hitos evaluativos y métricas de ambos módulos.
- [x] **[TSK-W31]**: Implementar los componentes de Kanban en `web/src/components/work/` (`KanbanBoard.tsx`, `TaskCard.tsx`, `ProjectManagerModal.tsx`) con drag-and-drop en desktop y botones de cambio de columna accesibles en móvil.
- [x] **[TSK-W32]**: Implementar el temporizador `DeepWorkTimer.tsx` en `web/src/components/work/DeepWorkTimer.tsx` con soporte para modo Pomodoro y Cronómetro libre, sincronización reactiva en `localStorage` y modal de notas para registro de sesión.
- [x] **[TSK-W33]**: Implementar los componentes de Academia en `web/src/components/academics/` (`SubjectCard.tsx`, `MilestonesList.tsx`, `MilestoneGradeModal.tsx`, `CareerSummaryCard.tsx`, modales de creación/edición de materias e hitos).
- [x] **[TSK-W34]**: Implementar la página principal de Trabajo `/trabajo` (`web/src/app/(dashboard)/trabajo/page.tsx`) integrando selector de proyectos, métricas semanales, timer flotante y tablero Kanban.
- [x] **[TSK-W35]**: Implementar la página principal de Academia `/academia` (`web/src/app/(dashboard)/academia/page.tsx`) con selector de cuatrimestre, hero card de promedio de carrera, grilla de materias y detalle interactivo con hitos evaluativos.
- [x] **[TSK-W36]**: Actualizar la vista `/hoy` (`web/src/app/(dashboard)/hoy/page.tsx`) agregando los widgets `WorkFocusWidget` y `UpcomingExamsWidget`, y actualizar la navegación principal en `web/src/app/page.tsx`.

## Tarea 9: Verificación Automatizada & Cierre
- [x] **[TSK-W37]**: Ejecutar `dotnet test api/LifeTracker.slnx` confirmando que todos los tests unitarios y de integración pasen en VERDE sin advertencias.
- [x] **[TSK-W38]**: Ejecutar `npm run build` en el frontend (`web/`) asegurando compilación estricta sin errores de TypeScript ni de prerenderizado.
- [x] **[TSK-W39]**: Confeccionar el documento de verificación final en `.specs/04-work-and-academics/verify.md`.
