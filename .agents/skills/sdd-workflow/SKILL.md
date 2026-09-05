---
name: sdd-workflow
description: >-
  Flujo de Desarrollo Guiado por Especificaciones (Spec-Driven Development - SDD).
  Utiliza este skill cuando el usuario quiera crear una nueva feature, refactorizar un módulo,
  o trabajar con el ciclo estructurado: Spec -> Clarificación -> Plan Técnico -> Tasks -> Implementación -> Verificación -> Archivado.
---

# SDD Workflow: Spec-Driven Development

Este skill define el protocolo de ingeniería de software estructurado para el desarrollo de nuevas features y cambios de arquitectura en **SubiKit**.

---

## Reglas Fundamentales del Flujo

> [!IMPORTANT]
> **1. Puertas de Aprobación Obligatorias (Gated Phases)**:
> El agente NUNCA debe avanzar a la siguiente fase sin la aprobación explícita del usuario. Cada fase requiere confirmación o ajustes antes de continuar.
>
> **2. Dominio y Lenguaje Ubicuo (`CONTEXT.md`)**:
> Durante las Fases 1 y 2, es obligatorio consultar y actualizar `CONTEXT.md` para evitar jerga inconsistente o malentendidos de negocio.
>
> **3. Feedback Loop Determinístico en Verificación**:
> Si durante la verificación algún criterio de aceptación de la Spec NO se cumple, el agente debe construir un test/loop automatizado que demuestre la discrepancia, aplicar el fix de forma aislada, y validar el paso a VERDE antes de solicitar re-aprobación.

---

## Las 7 Fases del Ciclo SDD

### 📁 Directorio de Trabajo
Cada feature se gestiona en `.specs/<feature-name>/` (o `docs/specs/<feature-name>/` si el repositorio ya usa `docs/`):
- `.specs/<feature-name>/spec.md`
- `.specs/<feature-name>/tech-plan.md`
- `.specs/<feature-name>/tasks.md`
- `.specs/<feature-name>/verify.md`
- `.specs/<feature-name>/archive.md`

---

### 🔹 Fase 1: Feature Spec (`spec.md`)
1. Crear el archivo `spec.md` basado en la plantilla oficial.
2. Definir:
   - Resumen del problema y valor de negocio.
   - Alcance (In Scope / Out of Scope).
   - Actores y flujos de usuario.
   - Criterios de Aceptación testeables en formato Gherkin (Dado/Cuando/Entonces).
3. Sincronizar términos con `CONTEXT.md` (Domain Modeling).
4. **🚪 Puerta de Aprobación 1**: Solicitar revisión al usuario de la Spec inicial.

---

### 🔹 Fase 2: Clarificación y Rondas de Preguntas
1. Analizar la Spec en busca de ambigüedades, asunciones implícitas, edge cases o dependencias técnicas no resueltas.
2. Presentar preguntas directas, estructuradas y con opciones cuando sea relevante.
3. Actualizar la `spec.md` y el glosario en `CONTEXT.md` con las respuestas y acuerdos alcanzados.
4. **🚪 Puerta de Aprobación 2**: Confirmar con el usuario que no quedan dudas abiertas antes de diseñar la solución técnica.

---

### 🔹 Fase 3: Plan Técnico (`tech-plan.md`)
1. Investigar la documentación existente del proyecto (`CONTEXT.md`, `docs/adr/`, schemas de BD, arquitecturas previas).
2. Aplicar principios de **Deep Modules & Seams** (John Ousterhout y Michael Feathers).
3. Aplicar **Design It Twice**: Comparar 2 opciones de diseño evaluando trade-offs antes de elegir.
4. Si la decisión tiene impacto estructural a nivel de sistema, registrar un ADR en `docs/adr/`.
5. Crear `tech-plan.md` detallando:
   - Capas afectadas (Domain, Application, Infrastructure, UI).
   - Esquemas de datos, DTOs, migraciones SQL o cambios en APIs.
   - Opciones evaluadas y justificación técnica.
   - Estrategia de testing (unitario, integración y feedback loops).
6. **🚪 Puerta de Aprobación 3**: Presentar el Plan Técnico y esperar aprobación explícita del usuario.

---

### 🔹 Fase 4: Desglose de Tareas (`tasks.md`)
1. Crear `tasks.md` organizando tareas atómicas y secuenciales por capas lógicas:
   - 1. Persistencia y Base de Datos (migraciones, RLS).
   - 2. Backend / Lógica de Negocio (entidades, handlers, validaciones).
   - 3. Frontend / UI (componentes, hooks, integración).
   - 4. Pruebas y Cobertura.
2. **🚪 Puerta de Aprobación 4**: Solicitar validación del plan de tareas antes de iniciar cualquier cambio en el código.

---

### 🔹 Fase 5: Implementación Controlada
1. Ejecutar las tareas en orden estricto.
2. Marcar el progreso en `tasks.md` (`[ ]` -> `[/]` -> `[x]`).
3. Realizar cambios atómicos y limpios siguiendo las reglas de calidad del proyecto (`clean-code`, `typescript`, `dotnet-csharp`, etc.).
4. Ejecutar tests locales al terminar cada bloque de tareas.
5. **🚪 Puerta de Aprobación 5**: Notificar la finalización de las tareas y solicitar pasar a la fase de verificación.

---

### 🔹 Fase 6: Verificación contra la Spec (`verify.md`)
1. Contrastar cada criterio de aceptación definido en la Fase 1 contra el código real implementado.
2. Ejecutar suite de pruebas (`tests`, linters, build).
3. **Evaluación de Resultados**:
   - **Caso Exitoso**: Si todos los criterios cumplen, documentar evidencias en `verify.md`.
   - **Caso con Observaciones (Feedback Loop)**:
     - Detallar qué criterio no se cumple y la causa técnica mediante un test reproducible.
     - Proponer las tareas de corrección a agregar en `tasks.md` (y actualizar `tech-plan.md` si hubo cambio de diseño).
     - Retornar a la Fase 5 (Implementación) hasta satisfacer el criterio en VERDE.
4. **🚪 Puerta de Aprobación 6**: Obtener el visto bueno final del usuario confirmando que la feature cumple al 100%.

---

### 🔹 Fase 7: Archivado y Ciclo Git (`archive.md`)
1. Generar commits semánticos (`feat(scope): ...`, `test(scope): ...`).
2. Si se trabajó en ramas o git worktrees, realizar el merge correspondiente y limpiar worktrees temporales.
3. Registrar `archive.md` con el resumen del ciclo y actualizar el estado a `ARCHIVADO`.
