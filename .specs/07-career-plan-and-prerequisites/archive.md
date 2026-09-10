# Archivado de Feature: Feature 07 - Plan de Estudio Universitario, Extracción IA de Malla Curricular y Motor de Correlativas DAG con Priorización de Cursada

- **Feature**: `07-career-plan-and-prerequisites`
- **Fecha de Cierre**: 2026-09-10
- **Estado**: Completada, Verificada y Lista para Producción (SHIP)
- **Aprobador**: Subi
- **Autor**: Tech Lead & SDD Orchestrator (SubiKit)

## Resumen de Logros

1. **Base de Datos & Seguridad Multi-Tenant**:
   - Migración PostgreSQL en Supabase: `20260910100000_career_plans_and_prerequisites.sql`.
   - Tablas `career_plans`, `curriculum_subjects`, `curriculum_prerequisites`.
   - Enum `prerequisite_requirement_type` (`requiere_regularizada`, `requiere_aprobada`).
   - Restricción referencial y desacoplamiento limpio con `academic_subjects(curriculum_subject_id)`.
   - Políticas RLS completas `FOR ALL USING (auth.uid() = user_id)`.

2. **Capa de Dominio & Deep Module C# (.NET 9)**:
   - Aggregate Root `CareerPlan`, entidades `CurriculumSubject` y `CurriculumPrerequisite`.
   - Deep Module `CareerPrerequisiteEngine`:
     * Algoritmo de Kahn (V+E)$ para aciclicidad y ordenamiento topológico.
     * DFS tricolor para diagnóstico y reconstrucción exacta de ciclos directos e indirectos.
     * Semántica dual de correlatividades (`RequiereRegularizada` vs `RequiereAprobada`).
     * Cálculo de Fan-Out transitivo y profundidad en Camino Crítico mediante programación dinámica.
     * Scoring multivariable de prioridad (.45 \cdot \text{CriticalPath} + 0.35 \cdot \text{FanOut} + 0.20 \cdot \text{DelayBoost}$) con badges explicativos y cupo sugerido.

3. **Seam de IA Multimodal & Aplicación**:
   - `GeminiCareerPlanExtractorService` (`IAiCareerPlanExtractor`): extracción estructurada JSON multimodal de planes en PDF o imagen con Gemini 2.5 Flash y fallback determinista.
   - Flujo efímero Human-in-the-Loop sin residuos en base de datos previo a confirmación.
   - `CareerPlanService` con validación acíclica obligatoria, cálculo dinámico de habilitaciones según cursadas activas y método de inscripción rápida en lote.

4. **API RESTful (.NET Minimal APIs)**:
   - Endpoints bajo `/api/academics/career-plans` (`/extract`, `/`, `/{id}`, `/{id}/set-active`, `/{id}/recommendations`, `/{id}/enroll-suggested`, `/{id}`).

5. **Frontend Next.js (React 19 & Tailwind)**:
   - Cliente API `LifeTrackerApiClient` ampliado con tipado estricto.
   - `CareerPlanUploadModal`: dropzone accesible para PDF/imágenes con loader interactivo.
   - `CurriculumReviewModal`: pilar Human-in-the-Loop con edición granular de materias, correlatividades duales y validación en cliente.
   - `NextTermRecommendationCard`: recomendador interactivo con selector de cupo (3-6), scores, badges explicativos y 1-click enroll.
   - `CareerPlanDashboard` & `CurriculumGraphView`: visualización matricial por años/cuatrimestres y grafo SVG interactivo con iluminación de dependencias precedentes y sucesoras.
   - Página `/academia/plan` y barra superior de navegación unificada en `/academia`.

6. **Verificación & Calidad de Código**:
   - `dotnet test api/LifeTracker.slnx`: 126/126 pruebas superadas (100% verde).
   - `npm run build`: 19/19 rutas compiladas sin advertencias en TypeScript ni de prerenderizado estático.
   - Veredicto de auditoría: **SHIP**.
