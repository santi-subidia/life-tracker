# Desglose de Tareas Atómicas: Fase 7 - Entrenamientos y Actividad Física (Fitness)

- **Feature**: Módulo de Entrenamientos y Actividad Física (`/entrenamientos`)
- **Ruta del Artefacto**: `.specs/07-fitness/tasks.md`
- **Fase**: 4 (Desglose Atómico de Tareas)
- **Estado**: Listo para Ejecución (Puerta de Aprobación 4)
- **Fecha**: 2026-09-10
- **Responsable**: Tech Lead & Agente Orquestador (SubiKit)

---

## Bloque 1: Base de Datos & Persistencia (PostgreSQL / Supabase)
- [x] **T1.1**: Crear migración `supabase/migrations/20260912000000_fitness_schema.sql` actualizando el `CHECK` de `timeline_items` para incluir `'fitness'`.
- [x] **T1.2**: Crear tabla `exercises` con validación de dueño (`is_custom`), taxonomía de músculos, columna JSONB `muscle_stimulus` e índices de búsqueda.
- [x] **T1.3**: Habilitar RLS en `exercises` (lectura global para catálogo base, CRUD exclusivo para ejercicios del usuario autenticado).
- [x] **T1.4**: Crear tablas `routines` y `routine_exercises` con políticas RLS y restricciones de orden.
- [x] **T1.5**: Crear tabla `workout_sessions` con índice único parcial para garantizar la Invariante 9 (máximo una sesión activa por usuario).
- [x] **T1.6**: Crear tabla `workout_sets` con tipos de serie (`normal`, `warmup`, `drop_set`, `failure`), peso, reps, RPE y RLS.
- [x] **T1.7**: Sembrar el catálogo base con los ejercicios esenciales de gimnasio en español, instrucciones y porcentajes de estímulo muscular.

---

## Bloque 2: Backend & Lógica de Negocio (.NET 9 Clean Architecture)
- [x] **T2.1**: Crear enums y Value Objects en `LifeTracker.Domain/Fitness`: `FitnessDiscipline`, `MuscleGroup`, `EquipmentType`, `WorkoutStatus`, `SetType`, `MuscleStimulus`.
- [x] **T2.2**: Implementar entidades de dominio: `Exercise`, `Routine`, `RoutineExercise`, `WorkoutSession`, `WorkoutSet` con validaciones de negocio (Invariantes 8, 9, 10, 11).
- [x] **T2.3**: Registrar `DbSet`s en `ILifeTrackerDbContext` y `LifeTrackerDbContext`, y mapeos Fluent API en `FitnessConfigurations.cs`.
- [x] **T2.4**: Implementar Deep Module `ProgressiveOverloadCalculator`: algoritmo de búsqueda y emparejamiento de series de la sesión previa.
- [x] **T2.5**: Implementar Deep Module `MuscleVolumeAggregator`: cálculo de volumen en kg y series efectivas ponderadas `Sum(1 * (stimulus_pct / 100))`.
- [x] **T2.6**: Implementar Deep Module `RestTimerController`: lógica de cuenta regresiva y adición de tiempo basada en marcas UTC absolutas.
- [x] **T2.7**: Implementar Seam `FitnessTimelineProjector`: proyección atómica de entrenamientos completados a `timeline_items`.
- [x] **T2.8**: Implementar DTOs y Handlers de aplicación para ejercicios, rutinas y ciclo de vida de sesiones.
- [x] **T2.9**: Exponer endpoints REST/Minimal APIs en `LifeTracker.Api/Endpoints/FitnessEndpoints.cs`.

---

## Bloque 3: Frontend & Experiencia de Usuario (Next.js 16 / Tailwind)
- [x] **T3.1**: Agregar acceso a "Entrenamientos" en la barra de navegación principal del Dashboard con icono representativo (`Dumbbell`).
- [x] **T3.2**: Crear Hub principal `/entrenamientos/page.tsx` con accesos directos, rutinas y resumen de volumen semanal.
- [x] **T3.3**: Crear Catálogo de Ejercicios `/entrenamientos/ejercicios/page.tsx` con filtros por grupo muscular, buscador en tiempo real y drawer de detalle con GIF en bucle, instrucciones y barras de estímulo.
- [x] **T3.4**: Crear Gestor y Constructor de Rutinas `/entrenamientos/rutinas/page.tsx` (crear, editar, reordenar ejercicios, configurar series y descansos).
- [x] **T3.5**: Implementar hook `useRestTimer` con Web Audio API (síntesis de sonido nativo sin latencia) y soporte de vibración háptica.
- [x] **T3.6**: Implementar hook `useLiveWorkout` con persistencia reactiva en `localStorage` y sincronización con el backend.
- [x] **T3.7**: Construir Live Workout Tracker `/entrenamientos/sesion/activa/page.tsx` con modo operar para una sola mano, visualización de cargas anteriores (sobrecarga progresiva) y Rest Timer emergente.
- [x] **T3.8**: Crear vista de Historial y Detalle `/entrenamientos/historial/page.tsx` con desglose de volumen total y series efectivas por músculo.

---

## Bloque 4: Verificación, Tests & Calidad
- [x] **T4.1**: Escribir Unit Tests para `Exercise` validando el rechazo de ejercicios sin motor primario al 100% (Invariante 8).
- [x] **T4.2**: Escribir Unit Tests para `MuscleVolumeAggregator` validando la ponderación porcentual y exclusión de series de calentamiento.
- [x] **T4.3**: Escribir Unit Tests para `ProgressiveOverloadCalculator` validando la resolución correcta de referencias históricas.
- [x] **T4.4**: Escribir Unit Tests para `RestTimerController` validando precisión UTC y comportamiento de `+30s`.
- [x] **T4.5**: Validar compilación del backend (`dotnet build`) y pruebas automatizadas (`dotnet test`).
- [x] **T4.6**: Validar build del frontend (`npm run build`).
