# ADR-0002: Motor de Correlatividades DAG en Memoria, Extracción IA y Desacoplamiento de Malla Curricular

- **Estado**: Aceptado
- **Fecha**: 2026-09-10
- **Decisores**: Subi, Tech Lead / Orchestrator, System Architect
- **Contexto de Negocio**: Feature `07-career-plan-and-prerequisites` (Plan de Estudio Universitario, Malla Curricular y Recomendador Inteligente)

---

## Contexto y Problema

El sistema universitario de educación superior en Argentina y Latinoamérica presenta una estructura de correlatividades no lineal y con semántica dual:
1. Materias que requieren que la correlativa previa esté **Regularizada** (cursada aprobada con parciales/TPs) para habilitar su cursado.
2. Materias que requieren que la previa esté **Aprobada** (examen final acreditado o promoción cerrada) para habilitar su cursado o inscripción a final.

La carga manual de mallas curriculares de 40 a 60 materias con códigos y decenas de dependencias cruzadas genera una alta fricción inicial. Asimismo, la toma de decisiones semestral de qué materias cursar suele ser desorganizada, provocando retrasos de meses o años cuando el alumno no prioriza materias que forman parte del camino crítico hacia la graduación.

Se requiere diseñar la arquitectura técnica para:
- Ingestar automáticamente planes oficiales mediante IA multimodal (PDF / imagen).
- Validar rigurosamente la aciclicidad de las dependencias (Grafo Dirigido Acíclico - DAG).
- Evaluar en tiempo real qué materias están habilitadas según el historial académico del estudiante.
- Calcular un puntaje de prioridad determinista (*Critical Path* + *Transitive Fan-Out*) para sugerir un cupo óptimo de cursada para el siguiente cuatrimestre.
- Mantener la integridad histórica de las cursadas activas sin contaminar el catálogo maestro del título.

A continuación se presentan las decisiones estructurales evaluadas bajo el principio **Design It Twice**.

---

## Decisión 1: Motor de Correlatividades y Algoritmos de Grafos (C# In-Memory DAG Engine vs Recursive CTEs en PostgreSQL)

### Opción A: Motor en Memoria en C# .NET 9 (`CareerPrerequisiteEngine`) - Deep Module
Se modela la malla curricular como un Grafo Dirigido Acíclico $G=(V, E)$ procesado enteramente en memoria en la capa de dominio:
- Detección de ciclos mediante algoritmo de Kahn (Topological Sorting por in-degrees) y DFS con coloración de nodos.
- Evaluación de semántica dual en una sola pasada $O(V + E)$ en memoria.
- Cálculo de clausura transitiva hacia adelante (*Fan-Out*) y longitud de camino crítico (*Critical Path*) mediante programación dinámica en orden topológico reverso.
- **Pros**:
  - **Latencia ultra-baja**: El cálculo para mallas típicas universitarias (40 a 80 nodos, 100 a 180 aristas) se completa en < 2 ms.
  - **Testeabilidad Pura y Aislada**: Pruebas unitarias de dominio puras con xUnit sin necesidad de base de datos, Docker ni migraciones.
  - **Deep Module (Ousterhout)**: Oculta una gran complejidad matemática detrás de una interfaz estrecha (`ICareerPrerequisiteEngine`).
  - **Reutilización y Portabilidad**: Mismo motor ejecutable en APIs, background workers o herramientas de importación offline.
- **Contras**: Requiere transferir el grafo completo de materias y correlativas a memoria para el cálculo (aproximadamente 10-25 KB de DTOs en memoria por consulta, despreciable para cargas de trabajo estándar).

### Opción B: Consultas Recursivas en Base de Datos (Recursive Common Table Expressions - CTEs en PostgreSQL)
Se formulan consultas SQL con `WITH RECURSIVE` dentro de funciones PL/pgSQL o vistas en Supabase.
- **Pros**: No requiere cargar el grafo a la memoria de la aplicación .NET; Postgres resuelve la recursión localmente.
- **Contras**:
  - Dificultad extrema para calcular simultáneamente el camino crítico más largo y la semántica dual en SQL recursivo estándar (tendencia a bucles infinitos en caso de datos inconsistentes).
  - Pruebas complejas que requieren una base de datos PostgreSQL viva en CI/CD.
  - Lógica de negocio crítica fragmentada entre stored procedures SQL y código de aplicación.

### Elección y Justificación
Se adopta la **Opción A: Motor en Memoria en C# .NET 9 (`CareerPrerequisiteEngine`)**.
El tamaño acotado de un plan universitario (máximo ~120 asignaturas) convierte al cálculo en memoria en la opción óptima en rendimiento (< 2 ms), testeabilidad unitaria sin dependencias y adhesión estricta a Clean Architecture.

---

## Decisión 2: Ciclo de Ingesta con IA y Human-in-the-Loop (Borrador Efímero en Memoria vs Staging Table en Base de Datos)

### Opción A: Borrador Efímero en Memoria / Cliente (Stateless DTO)
El endpoint `POST /api/academics/career-plans/extract` recibe el archivo (PDF/imagen), invoca a Gemini 2.5 Flash y responde con un DTO `CareerPlanDraftDto` sin realizar inserción en PostgreSQL.
- El usuario revisa, ajusta nombres, códigos y correlativas en el modal interactivo de la UI.
- Al confirmar, el cliente envía la carga validada a `POST /api/academics/career-plans`, donde se valida la aciclicidad y se persiste en una transacción atómica.
- **Pros**:
  - **Cero basura en base de datos**: No se generan registros huérfanos si el usuario cancela la extracción o abandona la sesión.
  - **Sin esquemas temporales**: No requiere tablas de staging, cron jobs de limpieza ni estados intermedios `is_draft` que compliquen las políticas de RLS.
  - **Arquitectura REST Stateless**: Cumple con el principio de estado mantenido en el cliente durante el flujo interactivo.
- **Contras**: Si el usuario cierra accidentalmente la pestaña sin confirmar, se pierde el borrador y debe re-subir el archivo (mitigable guardando en `sessionStorage` en el frontend si fuera necesario).

### Opción B: Tabla de Staging / Estado Persistido en Base de Datos (`career_plan_drafts`)
Se persiste el resultado de la IA inmediatamente en una tabla temporal o con un flag `status = 'draft'`.
- **Pros**: Permite reanudar la revisión en otro dispositivo o sesión más tarde.
- **Contras**:
  - Contaminación de base de datos con planes abandonados o alucinados por IA.
  - Mayor complejidad de migraciones, índices y mantenimiento (requiere workers periódicos de limpieza).
  - Riesgo de consultar accidentalmente borradores inválidos en reportes o dashboards.

### Elección y Justificación
Se adopta la **Opción A: Borrador Efímero en Memoria / Cliente (Stateless DTO)**.
Garantiza limpieza absoluta en la base de datos de producción, simplicidad de RLS y cumplimiento estricto del invariante de Human-in-the-Loop: los datos solo ingresan al sistema formal cuando el usuario los aprueba explícitamente.

---

## Decisión 3: Modelado de Malla Curricular vs Cursadas Activas (Separación de Bounded Contexts vs Modelo Único)

### Opción A: Desacoplamiento Estricto (`CurriculumSubject` vs `AcademicSubject`)
Se definen dos entidades separadas pertenecientes a contextos diferenciados:
1. `CurriculumSubject` (Catálogo maestro inmutable de la carrera: código, nombre, año, período, créditos, correlatividades).
2. `AcademicSubject` (Instancia operativa de cursada: ciclo lectivo "2026-1C", docente, notas de parciales, estado actual), vinculada con una clave foránea opcional nullable `curriculum_subject_id`.
- **Pros**:
  - **Soporte natural de recursadas**: Un alumno puede recursar una materia (ej. cursada en 2025-1C desaprobada, y cursada en 2026-1C aprobada) sin duplicar materias en la malla canónica ni sobreescribir el historial de exámenes.
  - **Inmutabilidad del Plan**: Modificar o eliminar cursadas en `/academia` no corrompe la estructura del título.
  - **Múltiples carreras**: Permite que una cursada se homologue o vincule a materias de distintos planes de estudio.
- **Contras**: Requiere un servicio de proyección / sincronización (`AcademicSubjectSynchronizer`) que combine los estados de cursada activa con los nodos de la malla curricular.

### Opción B: Tabla Única / Entidad Combinada (`subjects`)
Una única tabla almacena tanto la definición del plan de estudios como las notas y cursadas activas.
- **Pros**: Menos tablas en el esquema inicial; consultas `JOIN` directas más simples.
- **Contras**:
  - Incapacidad para modelar recursadas limpiamente sin perder notas históricas.
  - Acoplamiento severo entre la estructura estática del plan y los eventos dinámicos del cuatrimestre.
  - Violación del principio de Responsabilidad Única (SRP) y Clean Architecture.

### Elección y Justificación
Se adopta la **Opción A: Desacoplamiento Estricto (`CurriculumSubject` vs `AcademicSubject`)**.
Es la única estructura que soporta con elegancia la realidad académica universitaria (recursadas, cambios de plan, equivalencias) garantizando que el plan curricular funcione como un catálogo maestro intocable.

---

## Decisión 4: Semántica de Correlatividades Dual (`RequiereRegularizada` vs `RequiereAprobada`)

### Opción A: Tipificación Explícita con Enum de Dominio
Se modela la relación con `PrerequisiteRequirementType`:
- `RequiereRegularizada` (1): Requiere cursada aprobada / regularidad en la previa.
- `RequiereAprobada` (2): Requiere examen final aprobado o promoción cerrada en la previa.
- **Pros**:
  - Refleja con precisión matemática la normativa universitaria argentina (UBA, UTN, UNLP, etc.).
  - Evita que el recomendador cometa el error crítico de habilitar una materia cuando en realidad el estudiante adeuda el examen final.
- **Contras**: Exige que la UI y el motor distingan ambos estados en la verificación de bordes y tooltips.

### Opción B: Relación Binaria Simple ("Correlativa Sí/No")
Se asume que correlativa implica aprobación genérica.
- **Pros**: Modelo trivial.
- **Contras**: Inutilizable en facultades donde el 70% de las correlatividades para cursar solo exigen regularidad previa, forzando al estudiante a engañar al sistema marcando materias como aprobadas cuando aún deben el final.

### Elección y Justificación
Se adopta la **Opción A: Tipificación Explícita Dual**.
Aporta la fidelidad que distingue a LifeTracker de cualquier plantilla genérica de Notion o Trello.

---

## Decisión 5: Seam de Extracción IA con Google Gemini 2.5 Flash

### Opción A: Seam `IAiCareerPlanExtractor` en Application + Gemini 2.5 Flash Structured Outputs en Infrastructure
- Contrato de interfaz en la capa de Aplicación.
- Implementación con HTTP client en `LifeTracker.Infrastructure.Ai` aprovechando `response_mime_type: "application/json"` y `response_schema` nativo de Gemini 2.5 Flash.
- Fallback determinista (mock estructurado) cuando no haya API key configurada.
- **Pros**:
  - Extracción de alta velocidad (~3 a 6 segundos para PDFs de varias páginas) a costo mínimo.
  - Schema estricto que elimina respuestas con markdown libre o texto conversacional.
  - Testeabilidad con fakes deterministas en pruebas automatizadas.
- **Contras**: Dependencia externa de la API de Google Gemini (mitigada con fallback y seam desacoplado).

### Opción B: OCR Tradicional (Tesseract) + Expresiones Regulares
- **Pros**: Sin dependencias de IA en la nube.
- **Contras**: Fragilidad extrema ante los variados diseños de planes de estudio universitarios (tablas de doble entrada, diagramas de bloques, resoluciones ministeriales escaneadas); tasa de error inaceptable.

### Elección y Justificación
Se adopta la **Opción A: Seam `IAiCareerPlanExtractor` con Gemini 2.5 Flash**.

---

## Resumen de Decisiones y Consecuencias

| Dimensión | Decisión Adoptada | Razón Principal |
| :--- | :--- | :--- |
| **Motor de Correlativas** | En memoria en C# .NET 9 (`CareerPrerequisiteEngine`) | Latencia < 2 ms, Deep Module, pruebas unitarias puras sin dependencias. |
| **Ingesta IA + HITL** | Borrador efímero en memoria/cliente (Stateless) | Cero residuos en base de datos, transacción atómica solo tras confirmación humana. |
| **Malla vs Cursada** | Entidades desacopladas (`CurriculumSubject` vs `AcademicSubject`) | Soporte limpio de recursadas históricas, cambios de plan e inmutabilidad de catálogo. |
| **Semántica Correlativas** | Enum Dual (`RequiereRegularizada` vs `RequiereAprobada`) | Fidelidad matemática al régimen académico universitario latinoamericano. |
| **Extracción IA** | Seam `IAiCareerPlanExtractor` con Gemini 2.5 Flash JSON Schema | Extracción multimodal veloz, schema tipado estricto y testeabilidad con fakes. |

### Riesgos y Mitigaciones
1. **Riesgo**: Grafos con ciclos introducidos accidentalmente por la IA o el usuario.
   - *Mitigación*: Validación atómica en memoria en el backend mediante el algoritmo de Kahn antes de cualquier `INSERT`. Si se detecta un ciclo, se rechaza la transacción con un error 400 detallando el camino circular.
2. **Riesgo**: Desconexión entre asignaturas cursadas y materias del plan.
   - *Mitigación*: Endpoint de vinculación masiva y acción de un clic para crear cursadas activas a partir del recomendador de cupo sugerido.
3. **Riesgo**: Latencia de respuesta de Gemini en documentos pesados.
   - *Mitigación*: Timeout defensivo de 30s, compresión y limitación de subida a 10 MB, validación de tipo MIME (PDF, PNG, JPG, WebP) e indicador visual de carga animado en el frontend.
