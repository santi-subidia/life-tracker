# Dominio: Life Tracker (Personal Life OS)

## Glosario y Lenguaje Ubicuo

### Núcleo Transversal
- **Daily Log (Bitácora Diaria)**: Registro agregado de un día calendario (`date`) que captura métricas holísticas (`mood_score`, `energy_score`, `summary_text`) y sirve como ancla para la vista "Hoy".
- **Timeline Item (Evento Temporal)**: Proyección cronológica de actividad generada por cualquier Bounded Context (`health`, `habits`, `academics`, `work`, `notes`). Permite consultas transversales y alimenta al Asistente IA sin acoplar los esquemas de datos.

### 1. Salud y Bienestar (Health)
- **Estudio Médico (Medical Study)**: Documento clínico (PDF/Imagen) almacenado en Cloudflare R2 con metadatos (título, fecha, institución, tipo).
- **Valor Clínico (Clinical Value)**: Métrica cuantitativa o cualitativa extraída de un Estudio Médico (ej. Glucosa: 92 mg/dL) con referencia estricta a su estudio origen para comparativa histórica multianual.

### 2. Hábitos y Rutinas (Habits)
- **Hábito (Habit)**: Comportamiento recurrente deseado con frecuencia objetivo (diario, días específicos, N veces por semana).
- **Habit Log (Registro de Hábito)**: Confirmación de cumplimiento de un Hábito en una fecha dada (`status`: completed, skipped).
- **Racha (Streak)**: Cálculo consecutivo de cumplimiento sin interrupciones que superen la tolerancia permitida.

### 3. Notas y Segundo Cerebro (Notes)
- **Nota (Note)**: Documento libre en formato Markdown con título, contenido y fecha de actualización.
- **Wikilink (Enlace Bidireccional)**: Referencia en sintaxis `[[Título de la Nota]]` o `[[contexto:id]]` que conecta notas entre sí y con entidades del sistema.
- **Backlink**: Enlace inverso calculado automáticamente que muestra qué otras notas o entidades citan al documento actual.

### 4. Trabajo y Proyectos (Work)
- **Proyecto (Project)**: Iniciativa profesional o personal activa con estado (`Active`, `Paused`, `Completed`).
- **Tarea (Task)**: Unidad de trabajo atómica dentro de un proyecto, visible en tablero Kanban con estados (`Backlog`, `Todo`, `InProgress`, `Done`) y prioridad.
- **Sesión de Foco (Deep Work Session)**: Bloque de tiempo cronometrado (Pomodoro o libre) dedicado a un proyecto específico.

### 5. Estudios Académicos (Academics)
- **Materia (Subject)**: Asignatura o curso en curso o completado en un período lectivo (`term`).
- **Hito Académico (Milestone)**: Evento evaluativo con fecha límite (`Parcial`, `Final`, `Entrega`, `Recuperatorio`), ponderación y calificación obtenida.

### 6. Asistente IA (AI Assistant)
- **Asistente (Life Assistant)**: Agente impulsado por Google Gemini 2.5 Flash con capacidad de consultar el Timeline unificado y ejecutar herramientas (*Function Calling*) para responder y correlacionar información de todas las áreas de vida.

---

## Invariantes del Negocio

1. **Propiedad y Privacidad**: Toda entidad pertenece estrictamente a un único usuario (`user_id`), protegido por políticas RLS y validación de tokens JWT en el backend.
2. **Desacoplamiento vía Proyecciones**: Ningún Bounded Context puede consultar directamente tablas privadas de otro Bounded Context; toda interacción transversal se realiza a través de contratos de API, eventos o el read-model de `Timeline`.
3. **Trazabilidad de Salud**: Ningún `ClinicalValue` puede existir sin su `MedicalStudy` de origen.
4. **Resiliencia de Streaks**: Las rachas de hábitos son inmutables retroactivamente a partir de un período de gracia configurable (máximo 48 horas).
