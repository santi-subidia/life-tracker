# Desglose de Tareas: Fase 4 - Plan de Estudio Universitario, Extracción IA de Malla Curricular y Motor de Correlativas DAG con Priorización de Cursada

- **Feature**: Plan de Carrera, Malla Curricular, Correlatividades y Recomendación Inteligente (`07-career-plan-and-prerequisites`)
- **Ruta del Artefacto**: `.specs/07-career-plan-and-prerequisites/tasks.md`
- **Fase**: 4 SDD (Desglose Atómico de Tareas de Implementación)
- **Estado**: Propuesto para Aprobación (Puerta de Aprobación 4)
- **Fecha**: 2026-09-10
- **Autor**: System Architect & Domain Specialist (SubiKit)
- **Aprobador**: Subi
- **ADR Relacionado**: [docs/adr/0002-career-plan-dag-engine-and-prerequisites.md](../../docs/adr/0002-career-plan-dag-engine-and-prerequisites.md)
- **Spec Relacionado**: [.specs/07-career-plan-and-prerequisites/spec.md](spec.md)
- **Plan Técnico Relacionado**: [.specs/07-career-plan-and-prerequisites/tech-plan.md](tech-plan.md)

---

## Tarea 1: Base de Datos y Migraciones Supabase
- [x] **[TSK-CP01]**: Crear el script de migración SQL `supabase/migrations/20260910100000_career_plans_and_prerequisites.sql` definiendo de forma idempotente el enum `prerequisite_requirement_type` con los valores `'requiere_regularizada'` y `'requiere_aprobada'`.
- [x] **[TSK-CP02]**: Crear la tabla `career_plans` en la migración SQL con columnas `id` (UUID PK default `gen_random_uuid()`), `user_id` (UUID FK a `auth.users(id)` ON DELETE CASCADE), `name` (TEXT NOT NULL), `university` (TEXT nullable), `total_subjects` (INTEGER NOT NULL default 0), `total_credits` (INTEGER nullable), `is_active` (BOOLEAN NOT NULL default false), `created_at` y `updated_at` (TIMESTAMPTZ UTC), constraint de nombre no vacío e índice compuesto `idx_career_plans_user_active` sobre `(user_id, is_active)`.
- [x] **[TSK-CP03]**: Crear la tabla `curriculum_subjects` en la migración SQL con columnas `id` (UUID PK), `career_plan_id` (UUID FK a `career_plans(id)` ON DELETE CASCADE), `user_id` (UUID FK a `auth.users(id)` ON DELETE CASCADE), `code` (TEXT nullable), `name` (TEXT NOT NULL), `year_level` (INTEGER NOT NULL con constraint `year_level BETWEEN 1 AND 10`), `period_number` (INTEGER NOT NULL con constraint `period_number BETWEEN 1 AND 4`), `credits` (INTEGER nullable), `is_optional` (BOOLEAN NOT NULL default false), `order_index` (INTEGER NOT NULL default 0), `created_at` y `updated_at` (TIMESTAMPTZ UTC), constraint de nombre no vacío e índices `idx_curriculum_subjects_plan_year_period` y `idx_curriculum_subjects_user`.
- [x] **[TSK-CP04]**: Crear la tabla `curriculum_prerequisites` en la migración SQL con columnas `id` (UUID PK), `career_plan_id` (UUID FK a `career_plans(id)` ON DELETE CASCADE), `user_id` (UUID FK a `auth.users(id)` ON DELETE CASCADE), `subject_id` (UUID FK a `curriculum_subjects(id)` ON DELETE CASCADE), `required_subject_id` (UUID FK a `curriculum_subjects(id)` ON DELETE CASCADE), `requirement_type` (`prerequisite_requirement_type` NOT NULL), `created_at` (TIMESTAMPTZ UTC), constraint `chk_prereq_no_self_reference` (`subject_id <> required_subject_id`), constraint UNIQUE `(subject_id, required_subject_id)` e índices en `subject_id` y `required_subject_id`.
- [x] **[TSK-CP05]**: Alterar la tabla `academic_subjects` agregando la columna `curriculum_subject_id UUID REFERENCES public.curriculum_subjects(id) ON DELETE SET NULL` y creando el índice `idx_academic_subjects_curriculum_id` para garantizar el desacoplamiento referencial limpio entre la malla canónica y las cursadas activas.
- [x] **[TSK-CP06]**: Habilitar PostgreSQL Row Level Security (RLS) en `career_plans`, `curriculum_subjects` y `curriculum_prerequisites`, definiendo políticas `FOR ALL` restrictivas con `USING (auth.uid() = user_id)` y `WITH CHECK (auth.uid() = user_id)` para garantizar estricto aislamiento multitenant.

---

## Tarea 2: Dominio C# (.NET 9)
- [x] **[TSK-CP07]**: Crear el archivo `api/src/LifeTracker.Domain/Academics/CurriculumEnums.cs` con la definición del enum `PrerequisiteRequirementType` (`RequiereRegularizada = 1`, `RequiereAprobada = 2`) y del enum `CurriculumSubjectStatus` (`Bloqueada`, `Habilitada`, `EnCurso`, `Regularizada`, `Aprobada`).
- [x] **[TSK-CP08]**: Crear la entidad `CareerPlan` (Aggregate Root) en `api/src/LifeTracker.Domain/Academics/CareerPlan.cs` heredando de `BaseEntity`, con propiedades encapsuladas (`UserId`, `Name`, `University`, `TotalSubjects`, `TotalCredits`, `IsActive`, `CreatedAt`, `UpdatedAt`), colección de sólo lectura `Subjects`, constructor que valida invariantes (nombre no vacío, UserId no vacío), y métodos de dominio `UpdateDetails`, `SetActive` y `UpdateTotalSubjectsCount`.
- [x] **[TSK-CP09]**: Crear la entidad `CurriculumSubject` en `api/src/LifeTracker.Domain/Academics/CurriculumSubject.cs` heredando de `BaseEntity`, con propiedades (`CareerPlanId`, `UserId`, `Code`, `Name`, `YearLevel`, `PeriodNumber`, `Credits`, `IsOptional`, `OrderIndex`, `CreatedAt`, `UpdatedAt`), colección de sólo lectura `Prerequisites`, constructor con validación de rangos (`YearLevel` 1..10, `PeriodNumber` 1..4, `Name` no vacío) y método de dominio `Update`.
- [x] **[TSK-CP10]**: Crear la entidad `CurriculumPrerequisite` en `api/src/LifeTracker.Domain/Academics/CurriculumPrerequisite.cs` heredando de `BaseEntity`, con propiedades (`CareerPlanId`, `UserId`, `SubjectId`, `RequiredSubjectId`, `RequirementType`, `CreatedAt`), y constructor con validación estricta de no auto-referencia (`SubjectId != RequiredSubjectId`) e identificadores no vacíos.
- [x] **[TSK-CP11]**: Actualizar la entidad `AcademicSubject` en `api/src/LifeTracker.Domain/Academics/AcademicSubject.cs` agregando la propiedad de navegación y clave foránea `public Guid? CurriculumSubjectId { get; private set; }` y el método de dominio `LinkCurriculumSubject(Guid? curriculumSubjectId)` con actualización de `UpdatedAt`.
- [x] **[TSK-CP12]**: Definir los records de transporte (`GraphValidationResult`, `MissingPrerequisiteInfo`, `SubjectEligibilityResult`, `SubjectRecommendation`, `CareerRecommendationResult`) y la interfaz del Deep Module `ICareerPrerequisiteEngine` en `api/src/LifeTracker.Domain/Academics/ICareerPrerequisiteEngine.cs`.
- [x] **[TSK-CP13]**: Implementar el Deep Module `CareerPrerequisiteEngine` en `api/src/LifeTracker.Domain/Academics/CareerPrerequisiteEngine.cs`:
  - `ValidateAcyclicGraph`: Algoritmo de Kahn ($O(V + E)$) con cola de in-degree 0 y fallback a DFS tricolor (Blanco, Gris, Negro) para reconstruir y reportar la traza textual del ciclo si existe.
  - `EvaluateEligibility`: Mapeo determinista de materias evaluando dependencias contra el estado académico del alumno (`RequiereRegularizada` satisfecha con `Regularizada` o `Aprobada`; `RequiereAprobada` satisfecha únicamente con `Aprobada`).
  - `CalculateTransitiveFanOut`: Recorrido BFS/DFS hacia adelante para computar el conteo de asignaturas directas e indirectas que se desbloquean.
  - `CalculateCriticalPathDepths`: Programación dinámica sobre el orden topológico reverso para computar la profundidad cuatrimestral máxima hasta nodos terminales.
  - `GenerateNextTermRecommendations`: Scoring multivariable normalizado $[0, 100]$ combinando Camino Crítico (45%), Fan-Out (35%) y Retraso Curricular (20%), asignando badges explicativos (`Camino Crítico`, `Desbloqueo Alto`, `Troncal Pendiente`, `Materia Terminal`, `Avance Regular`) y dividiendo la recomendación según el cupo solicitado.

---

## Tarea 3: Tests Unitarios de Dominio (TDD Rojo -> Verde con xUnit)
- [x] **[TSK-CP14]**: Crear el archivo de pruebas `api/tests/LifeTracker.Domain.Tests/CareerPrerequisiteEngineTests.cs` inicializando fixtures de materias y correlatividades con grafos acíclicos válidos, ciclos directos y ciclos transitivos.
- [x] **[TSK-CP15]**: Implementar pruebas unitarias de validación de grafo acíclico:
  - `ValidateAcyclicGraph_ShouldSucceed_WhenGraphIsAcyclic`: Grafo en árbol y diamante acíclico retorna `IsValid = true`.
  - `ValidateAcyclicGraph_ShouldFail_WhenDirectCycleExists`: Ciclo directo ($A \to B \to A$) retorna `IsValid = false` y traza identificando a $A$ y $B$.
  - `ValidateAcyclicGraph_ShouldFail_WhenTransitiveCycleExists`: Ciclo de 4 nodos ($A \to B \to C \to D \to A$) retorna `IsValid = false` con ruta completa en `CyclePath`.
  - `ValidateAcyclicGraph_ShouldFail_WhenPrerequisiteReferencesNonExistentSubject`: Correlativa con ID ajeno al conjunto de materias retorna error de consistencia.
- [x] **[TSK-CP16]**: Implementar pruebas unitarias de evaluación semántica de correlatividades en `EvaluateEligibility`:
  - `EvaluateEligibility_ShouldEnableSubject_WhenRequirementIsRequiereRegularizada_AndPredecessorIsRegularizada`: Habilita la materia si la correlativa está regularizada.
  - `EvaluateEligibility_ShouldEnableSubject_WhenRequirementIsRequiereRegularizada_AndPredecessorIsAprobada`: Habilita la materia si la correlativa está aprobada.
  - `EvaluateEligibility_ShouldBlockSubject_WhenRequirementIsRequiereAprobada_AndPredecessorIsOnlyRegularizada`: Bloquea la materia e incluye la correlativa en `MissingPrerequisites` si sólo está regularizada.
  - `EvaluateEligibility_ShouldEnableSubject_WhenRequirementIsRequiereAprobada_AndPredecessorIsAprobada`: Habilita la materia cuando el final está rendido y aprobado.
  - `EvaluateEligibility_ShouldAccumulateMultipleMissingPrerequisites`: Si una materia requiere 3 previas y faltan 2, detalla ambas en la lista de adeudadas.
- [x] **[TSK-CP17]**: Implementar pruebas unitarias de cálculo de camino crítico, scoring y cupo en `GenerateNextTermRecommendations`:
  - `GenerateNextTermRecommendations_ShouldPrioritizeCriticalPathAndFanOut`: Verifica que una materia troncal llave obtenga mayor score y badge `"Camino Crítico"` que una electiva terminal.
  - `GenerateNextTermRecommendations_ShouldRespectQuotaLimit`: Con 7 materias habilitadas y cupo de 4, divide exactamente 4 en `Recommendations` y 3 en `OtherEligibleSubjects`.
  - `GenerateNextTermRecommendations_ShouldBoostDelayedSubjects`: Asignatura de 1° año pendiente cuando el alumno cursa 3° recibe boost de prioridad para evitar deudas troncales.
- [x] **[TSK-CP18]**: Implementar pruebas unitarias de invariantes en entidades `CareerPlan`, `CurriculumSubject` y `CurriculumPrerequisite`, verificando que la auto-referencia (`SubjectId == RequiredSubjectId`) lance `InvalidOperationException` y rangos inválidos lancen `ArgumentOutOfRangeException`.
- [x] **[TSK-CP19]**: Ejecutar `dotnet test` y certificar que la suite completa de `LifeTracker.Domain.Tests` pase al 100% en VERDE.

---

## Tarea 4: Infraestructura y Persistencia (LifeTracker.Infrastructure)
- [x] **[TSK-CP20]**: Crear el archivo de configuraciones EF Core `api/src/LifeTracker.Infrastructure/Persistence/Configurations/CareerPlanConfigurations.cs` conteniendo:
  - `CareerPlanConfiguration`: mapeo a tabla `career_plans`, clave primaria, columnas snake_case, e índice en `(UserId, IsActive)`.
  - `CurriculumSubjectConfiguration`: mapeo a tabla `curriculum_subjects`, clave primaria, columnas snake_case, e índices de búsqueda.
  - `CurriculumPrerequisiteConfiguration`: mapeo a tabla `curriculum_prerequisites`, clave primaria, conversión del enum `PrerequisiteRequirementType` a strings `'requiere_regularizada'` y `'requiere_aprobada'`, e índices en `SubjectId` y `RequiredSubjectId`.
- [x] **[TSK-CP21]**: Actualizar `api/src/LifeTracker.Infrastructure/Persistence/Configurations/AcademicConfigurations.cs` en `AcademicSubjectConfiguration` agregando el mapeo de la propiedad `CurriculumSubjectId` a la columna `curriculum_subject_id`.
- [x] **[TSK-CP22]**: Actualizar la interfaz `api/src/LifeTracker.Application/Common/Interfaces/ILifeTrackerDbContext.cs` incorporando `DbSet<CareerPlan> CareerPlans { get; }`, `DbSet<CurriculumSubject> CurriculumSubjects { get; }` y `DbSet<CurriculumPrerequisite> CurriculumPrerequisites { get; }`.
- [x] **[TSK-CP23]**: Actualizar la clase `api/src/LifeTracker.Infrastructure/Persistence/LifeTrackerDbContext.cs` implementando los nuevos `DbSet`s y aplicando las configuraciones de entidad en el método `OnModelCreating`.
- [x] **[TSK-CP24]**: Implementar el contrato del Seam `api/src/LifeTracker.Application/Academics/Services/IAiCareerPlanExtractor.cs` con el método `ExtractDraftFromDocumentAsync(Stream documentStream, string mimeType, CancellationToken cancellationToken)`.
- [x] **[TSK-CP25]**: Implementar la clase `api/src/LifeTracker.Infrastructure/Ai/GeminiAiCareerPlanExtractor.cs` implementando `IAiCareerPlanExtractor`:
  - Construcción del payload multimodal Base64 para Gemini 2.5 Flash con `system_instruction` especializado en currículas universitarias.
  - Especificación de Structured JSON Schema de Gemini garantizando el schema tipado de `CareerPlanDraftDto`.
  - Mecanismo de fallback mock estructurado determinista cuando no se configure `GEMINI_API_KEY` o en entornos de prueba locales.
- [x] **[TSK-CP26]**: Registrar en `api/src/LifeTracker.Infrastructure/DependencyInjection.cs`:
  - `services.AddSingleton<ICareerPrerequisiteEngine, CareerPrerequisiteEngine>();`
  - `services.AddHttpClient<IAiCareerPlanExtractor, GeminiAiCareerPlanExtractor>();`
  - `services.AddScoped<ICareerPlanService, CareerPlanService>();`

---

## Tarea 5: Capa de Aplicación (LifeTracker.Application)
- [x] **[TSK-CP27]**: Crear el archivo `api/src/LifeTracker.Application/Academics/Dtos/CareerPlanDtos.cs` con todos los DTOs requeridos: `ExtractedPrerequisiteDraftDto`, `ExtractedSubjectDraftDto`, `CareerPlanDraftDto`, `CareerPlanSummaryDto`, `CurriculumPrerequisiteItemDto`, `CurriculumSubjectItemDto`, `CareerPlanDetailDto`, `CreateCurriculumPrerequisiteRequest`, `CreateCurriculumSubjectRequest`, `CreateCareerPlanRequest` y `EnrollSuggestedSubjectsRequest`.
- [x] **[TSK-CP28]**: Crear la interfaz `api/src/LifeTracker.Application/Academics/Services/ICareerPlanService.cs` exponiendo las operaciones:
  - `ExtractDraftFromDocumentAsync` (Extracción efímera para Human-in-the-Loop)
  - `CreatePlanAsync` (Creación y persistencia con validación de DAG)
  - `GetUserPlansAsync` (Listado con métricas de avance)
  - `GetPlanDetailAsync` (Detalle con malla y estados calculados)
  - `SetActivePlanAsync` (Transición exclusiva de plan activo)
  - `GetRecommendationsAsync` (Ejecución del motor DAG y cupo sugerido)
  - `EnrollSuggestedSubjectsAsync` (Inscripción en lote a cursadas activas)
  - `DeletePlanAsync` (Eliminación en cascada)
- [x] **[TSK-CP29]**: Implementar la clase `api/src/LifeTracker.Application/Academics/Services/CareerPlanService.cs` implementando `ICareerPlanService`:
  - Delegar la extracción a `IAiCareerPlanExtractor` devolviendo el borrador sin persistir en base de datos (Invariante HITL).
  - En `CreatePlanAsync`: construir los grafos en memoria a partir de los códigos/tempIds del request, validar aciclicidad con `ICareerPrerequisiteEngine.ValidateAcyclicGraph` lanzando `InvalidOperationException` si hay ciclos, persistir `CareerPlan`, `CurriculumSubject` y `CurriculumPrerequisite` atómicamente, y si `IsActive` es verdadero, desactivar cualquier otro plan del usuario.
  - En `GetUserPlansAsync` y `GetPlanDetailAsync`: recuperar el plan, consultar los `AcademicSubjects` del usuario para mapear estados (`Aprobada`, `Regularizada`, `EnCurso`) y evaluar la habilitación o bloqueo de cada materia curricular mediante `ICareerPrerequisiteEngine.EvaluateEligibility`.
  - En `SetActivePlanAsync`: transacción atómica que pone `is_active = false` en todos los planes del usuario excepto el seleccionado.
  - En `GetRecommendationsAsync`: obtener materias y correlativas del plan, calcular estados académicos y generar el cupo sugerido mediante `ICareerPrerequisiteEngine.GenerateNextTermRecommendations`.
  - En `EnrollSuggestedSubjectsAsync`: buscar las materias curriculares seleccionadas e instanciar nuevos `AcademicSubject` para el período académico indicado vinculando `CurriculumSubjectId`, persistiendo de manera idempotente.
  - En `DeletePlanAsync`: eliminar el plan garantizando remoción en cascada.

---

## Tarea 6: Endpoints de API .NET (LifeTracker.Api)
- [x] **[TSK-CP30]**: Crear el archivo `api/src/LifeTracker.Api/Endpoints/CareerPlanEndpoints.cs` definiendo la clase estática y el método de extensión `MapCareerPlanEndpoints(this IEndpointRouteBuilder app)` bajo la ruta `/api/academics/career-plans` con `.RequireAuthorization()`.
- [x] **[TSK-CP31]**: Implementar los endpoints en `CareerPlanEndpoints.cs`:
  - `POST /extract`: recibe `IFormFile`, valida tamaño (hasta 10 MB) y tipos permitidos (`application/pdf`, `image/png`, `image/jpeg`, `image/webp`), y retorna `200 OK` con `CareerPlanDraftDto`.
  - `POST /`: recibe `CreateCareerPlanRequest`, valida que posea materias, e invoca `CreatePlanAsync` retornando `201 Created`.
  - `GET /`: retorna lista de planes del usuario con `200 OK`.
  - `GET /active`: retorna el plan activo actual o 404.
  - `GET /{id:guid}`: retorna detalle del plan con `200 OK` o `404 NotFound`.
  - `PATCH /{id:guid}/set-active`: activa el plan y retorna `200 OK`.
  - `GET /{id:guid}/recommendations`: acepta query param opcional `quota` (default 4) y retorna `CareerRecommendationResult`.
  - `POST /{id:guid}/enroll-suggested`: inscribe materias en lote y retorna `200 OK` con las cursadas creadas.
  - `DELETE /{id:guid}`: elimina el plan y retorna `204 NoContent`.
- [x] **[TSK-CP32]**: Registrar `app.MapCareerPlanEndpoints();` en `api/src/LifeTracker.Api/Program.cs` y verificar compilación limpia de la solución en .NET 9.

---

## Tarea 7: Frontend Next.js / TypeScript (web/)
- [x] **[TSK-CP33]**: Actualizar `web/src/lib/api-client.ts` agregando las interfaces TypeScript (`ExtractedPrerequisiteDraft`, `ExtractedSubjectDraft`, `CareerPlanDraft`, `CareerPlanSummary`, `CurriculumPrerequisiteItem`, `CurriculumSubjectItem`, `CareerPlanDetail`, `CareerRecommendationResult`, `SubjectRecommendation`, `CreateCareerPlanPayload`, `EnrollSuggestedSubjectsPayload`) y los métodos estáticos en `LifeTrackerApiClient`: `extractCareerPlanDraft`, `createCareerPlan`, `getCareerPlans`, `getCareerPlanDetail`, `setActiveCareerPlan`, `getCareerPlanRecommendations`, `enrollSuggestedSubjects` y `deleteCareerPlan`.
- [x] **[TSK-CP34]**: Crear el componente `CareerPlanUploadModal.tsx` en `web/src/components/academics/CareerPlanUploadModal.tsx` con soporte de arrastrar y soltar (drag & drop), selección de archivos PDF/imágenes, validación de extensión y tamaño (10 MB), visualización de spinner animado con mensajes contextuales ("Analizando materias con IA...", "Extrayendo correlatividades...") y callback al borrador extraído.
- [x] **[TSK-CP35]**: Crear el componente **Human-in-the-Loop** `CurriculumReviewModal.tsx` en `web/src/components/academics/CurriculumReviewModal.tsx`:
  - Cabecera con edición de nombre sugerido de carrera, universidad y créditos totales.
  - Tabla interactiva de materias con inputs para ajustar código, nombre, año (1-6), cuatrimestre (1-2) y bandera de electiva/opcional.
  - Editor interactivo de correlatividades por materia: agregado/eliminación de dependencias y selector toggle entre `Requiere Regularizada` y `Requiere Aprobada`.
  - Alerta en vivo ante detección de ciclos o auto-referencias y botón de confirmación que persiste el plan validado mediante `createCareerPlan`.
- [x] **[TSK-CP36]**: Crear el componente `NextTermRecommendationCard.tsx` en `web/src/components/academics/NextTermRecommendationCard.tsx` mostrando:
  - Header con selector de cupo de cursada (3, 4, 5 o 6 materias).
  - Listado de tarjetas de materias prioritarias con puntuación de score de avance, insignia visual (`Camino Crítico`, `Desbloqueo Alto`, etc.) y explicación humana del motivo de recomendación.
  - Botón interactivo "Inscribir en Cuatrimestre Actual" que abre modal de confirmación de período y ejecuta la inscripción en lote.
- [x] **[TSK-CP37]**: Crear los componentes de visualización de malla en `web/src/components/academics/CareerPlanDashboard.tsx` y `CurriculumGraphView.tsx`:
  - `CareerPlanDashboard.tsx`: orquestador con toggle entre vista Grilla Curricular y vista Grafo Interactivo, selector de plan activo y botón de carga de nuevo plan.
  - Grilla Curricular: columnas organizadas por Año lectivo y sub-columnas por Cuatrimestre, con tarjetas coloreadas según estado (`Aprobada` en verde esmeralda, `Regularizada` en azul cielo, `EnCurso` en ámbar, `Habilitada` en índigo, `Bloqueada` en gris con candado y tooltip de correlativas adeudadas).
  - `CurriculumGraphView.tsx`: renderizado vectorial responsivo de nodos y aristas dirigidas (línea punteada para `RequiereRegularizada`, continua para `RequiereAprobada`), con resaltado de dependencias precedentes y sucesoras al hacer hover/click sobre un nodo.
- [x] **[TSK-CP38]**: Crear la página dedicada `/academia/plan` en `web/src/app/(dashboard)/academia/plan/page.tsx` integrando el hero resumen del plan de carrera, métricas de avance porcentual, el widget de recomendación `NextTermRecommendationCard` y el `CareerPlanDashboard`.
- [x] **[TSK-CP39]**: Actualizar la página `/academia` en `web/src/app/(dashboard)/academia/page.tsx` incorporando un banner destacado de "Plan de Carrera & Malla Curricular" con enlace directo a `/academia/plan`, indicador del plan activo actual, y resumen de materias habilitadas para el siguiente ciclo.

---

## Tarea 8: Verificación Automatizada & Build
- [x] **[TSK-CP40]**: Ejecutar `dotnet test api/LifeTracker.slnx` asegurando que todos los tests unitarios de dominio y servicios pasen en VERDE al 100% sin advertencias.
- [x] **[TSK-CP41]**: Ejecutar `npm run build` en el workspace `web/` asegurando compilación estricta de Next.js sin errores de TypeScript, imports rotos ni problemas en el renderizado del App Router.
- [x] **[TSK-CP42]**: Confeccionar el documento de verificación final en `.specs/07-career-plan-and-prerequisites/verify.md` registrando la evidencia de ejecución de tests, endpoints validados y cumplimiento de los requerimientos funcionales e invariantes de negocio.
