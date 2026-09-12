# Dominio: Soma (Personal Life OS)

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
- **Materia de Cursada (Academic Subject)**: Asignatura o curso en curso o completado en un período lectivo específico (`term`), con seguimiento de profesor y promedio ponderado.
- **Hito Académico (Milestone)**: Evento evaluativo con fecha límite (`Parcial`, `Final`, `Entrega`, `Recuperatorio`), ponderación y calificación obtenida.
- **Plan de Carrera (Career Plan)**: Estructura formal y canónica del plan de estudios de un título académico (`CareerPlan`). Contiene el catálogo completo de asignaturas requeridas para la graduación y soporta estado activo (`is_active`).
- **Materia Curricular (Curriculum Subject)**: Asignatura perteneciente a la malla formal de un plan de carrera (`CurriculumSubject`). Modela código oficial, nombre, año y cuatrimestre sugerido, créditos y condición de optativa.
- **Correlatividad Curricular (Curriculum Prerequisite)**: Arista dirigida del grafo de dependencias académicas (`CurriculumPrerequisite`). Vincula una materia con su requisito previo, tipificado explícitamente mediante `RequirementType` (`RequiereRegularizada` vs `RequiereAprobada`).
- **Motor de Correlatividades y Priorización (Career Prerequisite Engine)**: Módulo profundo (`CareerPrerequisiteEngine`) encargado de validar la aciclicidad del plan (DAG), evaluar la elegibilidad de materias y calcular el Score de Prioridad para el siguiente cuatrimestre basado en Camino Crítico y Desbloqueo Futuro (Fan-Out).
- **Cupo Sugerido (Suggested Quota)**: Conjunto priorizado de materias recomendadas para cursar en el período lectivo inmediato, optimizado para destrabar cuellos de botella y maximizar el progreso curricular con explicaciones transparentes.

### 6. Asistente IA (AI Assistant)
- **Asistente (Life Assistant)**: Agente impulsado por Google Gemini 2.5 Flash con capacidad de consultar el Timeline unificado y ejecutar herramientas (*Function Calling*) para responder y correlacionar información de todas las áreas de vida.

### 7. Finanzas Personales (Finances)
- **Cuenta / Billetera (Financial Account)**: Depósito o instrumento monetario que custodia fondos líquidos o pasivos (ej. Efectivo ARS, Galicia, Mercado Pago, Caja de Ahorro USD). Posee una divisa base fija (`currency`), saldo inicial y saldo actual sincronizado.
- **Transacción / Movimiento (Transaction)**: Registro atómico de flujo de capital clasificado como Ingreso (*Income*), Gasto (*Expense*) o Transferencia (*Transfer*) entre cuentas propias. Es auditable y posee fecha/hora, importe, categoría e impacto inmediato en el balance.
- **Categoría Financiera (Transaction Category)**: Taxonomía funcional para clasificar ingresos y gastos (ej. Alimentación, Transporte, Servicios, Ocio, Salud, Educación, Salario) con color e icono Lucide identificatorio.
- **Presupuesto Mensual (Budget)**: Límite de gasto planificado para un mes/año calendario específico, aplicable globalmente o por categoría, con cálculo de consumo porcentual y alertas de sobregiro.
- **Flujo de Caja (Cashflow)**: Balance neto periódico resultante de la diferencia entre Ingresos Totales y Gastos Totales para una divisa dada, determinando la capacidad de ahorro.

### 8. Entrenamientos y Actividad Física (Fitness)
- **Ejercicio (Exercise)**: Unidad atómica de movimiento físico clasificada por disciplina (`strength`, `cardio`, `calisthenics`, `mobility`). Posee instrucciones técnicas paso a paso en español, recursos multimedia (GIFs demostrativos en bucle, enlaces opcionales a video), equipamiento requerido y tipo de propiedad (catálogo base sembrado en el sistema o personalizado por el usuario vía `is_custom`).
- **Ponderación Muscular (Muscle Stimulus / Muscle Activation Ratio)**: Value Object (`MuscleStimulus`) que mapea grupos musculares con un porcentaje de estímulo efectivo (entero de 1 a 100). Modela con exactitud la biomecánica de ejercicios compuestos y de aislamiento (ej. Press de Banca: 100% pecho, 60% tríceps, 40% deltoides anterior), permitiendo calcular volumen efectivo semanal real, fatiga acumulada y mapas de calor anatómicos (*heatmaps*).
- **Rutina / Plantilla (Routine Template)**: Estructura planificada y reutilizable de entrenamiento (`Routine`), integrada por ejercicios ordenados (`RoutineExercise`), series objetivo, rango de repeticiones sugerido y tiempos de descanso estándar por ejercicio.
- **Sesión de Entrenamiento (Workout Session / Live Workout)**: Registro agregado de un entrenamiento ejecutado en tiempo real o histórico (`WorkoutSession`). Posee estado (`active`, `completed`, `discarded`), marca temporal de inicio/fin, volumen total movido en kilogramos, duración efectiva y notas de sensaciones.
- **Serie de Entrenamiento (Workout Set)**: Ejecución individual de esfuerzo dentro de un ejercicio (`WorkoutSet`). Se tipifica como serie normal (*Normal*), de aproximación (*Warmup*), descendente (*Drop set*) o al fallo (*Failure*). Almacena carga (`weight_kg`), repeticiones (`reps`), RPE/RIR opcional, estado de completado y marca temporal para el disparo del temporizador.
- **Sobrecarga Progresiva Referencial (Progressive Overload Reference / Ghost Set)**: Proyección contextual en el Live Tracker de las cargas y repeticiones logradas en la última sesión completada para el mismo ejercicio y serie, facilitando la toma de decisiones inmediata de incremento de estímulo.
- **Temporizador de Descanso (Rest Timer)**: Utilidad de sesión en vivo que se activa automáticamente al completar una serie, proveyendo cuenta regresiva con ajuste rápido (+30s), alertas visuales, sonoras (Web Audio API) y hápticas (Vibration API) diseñadas para manipulación ergonómica con una sola mano.

---

## Invariantes del Negocio

1. **Propiedad y Privacidad**: Toda entidad pertenece estrictamente a un único usuario (`user_id`), protegido por políticas RLS y validación de tokens JWT en el backend.
2. **Desacoplamiento vía Proyecciones**: Ningún Bounded Context puede consultar directamente tablas privadas de otro Bounded Context; toda interacción transversal se realiza a través de contratos de API, eventos o el read-model de `Timeline`.
3. **Trazabilidad de Salud**: Ningún `ClinicalValue` puede existir sin su `MedicalStudy` de origen.
4. **Resiliencia de Streaks**: Las rachas de hábitos son inmutables retroactivamente a partir de un período de gracia configurable (máximo 48 horas).
5. **Consistencia Atómica de Saldos (Finanzas)**: El saldo actual (`current_balance`) de una cuenta refleja rigurosamente su saldo inicial más la suma algebraica de las transacciones asentadas. La inserción, edición o reversión de una transacción recalcula el saldo de las cuentas involucradas dentro de una transacción atómica de base de datos (Unit of Work), impidiendo inconsistencias o condiciones de carrera.
6. **Inmutabilidad y Precisión Decimal**: Ninguna transacción confirmada es purgada físicamente sin auditoría contable. Todos los montos se modelan obligatoriamente con tipo `decimal` (PostgreSQL `numeric(14,2)` / C# `decimal`), prohibiendo tipos de coma flotante (`float`/`double`) para eliminar errores de redondeo.
7. **Segregación Monetaria Explícita**: No se realizan conversiones implícitas entre divisas dispares (ej. ARS y USD). Cada cuenta opera en su moneda nativa. Las transferencias entre cuentas de distinta moneda exigen declarar explícitamente el tipo de cambio o los montos debitados y acreditados en cada extremo.
8. **Integridad Anatómica y Motor Primario (Fitness)**: Todo ejercicio debe poseer obligatoriamente al menos un grupo muscular principal con ponderación del 100% (motor primario). Los estímulos secundarios se modelan en un rango estricto de 1 a 100% y los nombres de grupos musculares deben pertenecer a una taxonomía anatómica normalizada y cerrada (`chest`, `upper_chest`, `lats`, `rhomboids`, `traps`, `lower_back`, `anterior_deltoid`, `lateral_deltoid`, `posterior_deltoid`, `biceps`, `triceps`, `forearms`, `quadriceps`, `hamstrings`, `glutes`, `calves`, `abs`, `obliques`).
9. **Unicidad de Sesión Activa (Fitness)**: Un usuario no puede tener más de una sesión de entrenamiento con estado `active` simultáneamente. Si se intenta iniciar una nueva sesión existiendo una activa, el sistema fuerza su resolución explícita (finalizarla o descartarla) para salvaguardar la coherencia cronométrica y el estado reactivo del temporizador.
10. **Inmutabilidad y Consolidación de Sesiones Finalizadas (Fitness)**: Al transicionar una sesión a estado `completed`, se consolidan atómicamente sus métricas calculadas (volumen total en kg, duración neta en segundos, series efectivas completadas). La modificación o eliminación posterior de series recalcula el agregado y sincroniza la proyección de `timeline_items` dentro de una transacción única de base de datos.
11. **Segregación e Inmutabilidad de Catálogo del Sistema (Fitness)**: Los ejercicios presembrados del sistema (`is_custom = false`, `user_id = NULL`) son globales y de solo lectura. Los ejercicios creados por el usuario (`is_custom = true`, `user_id = auth.uid()`) son privados. La eliminación de un ejercicio personalizado utilizado en sesiones históricas no realiza borrado en cascada, preservando la integridad histórica de los entrenamientos pasados vía restricción referencial o archivo lógico.
12. **Aciclicidad del Plan de Carrera (DAG)**: El grafo de correlatividades no puede contener ciclos dirigidos ni auto-referencias. Toda mutación al grafo debe ser validada algorítmicamente antes de persistirse.
13. **Semántica Dual de Correlatividad**: La evaluación de correlatividades distingue estrictamente entre regularidad y aprobación final; ninguna materia con requisito de aprobación final (`RequiereAprobada`) puede ser habilitada únicamente con la regularidad de su correlativa previa.
14. **Human-in-the-Loop en Extracción Curricular**: La ingesta de planes de carrera vía IA requiere obligatoriamente revisión y confirmación interactiva por parte del usuario, prohibiendo la persistencia desatendida directa.
15. **Segregación Estricta de Roles (RBAC)**: El rol `admin` es exclusivamente administrativo (gestión y ciclo de vida de usuarios). Los módulos del Life OS (salud, hábitos, notas, proyectos, finanzas, fitness, IA) están reservados de forma estricta y excluyente al rol `user` (`UserOnly`).
16. **Protección Perimetral y Resiliencia (Rate Limiting)**: El acceso a endpoints críticos de autenticación (`/api/auth/login`) y consumo intensivo de IA/recursos (`/api/ai/...`, `/api/health/extract`) está protegido por algoritmos de ventana deslizante y concurrencia. Toda solicitud que exceda la tasa configurada es rechazada de forma inmediata con estado HTTP 429, cabecera `Retry-After` y formato RFC 7807 (`ProblemDetails`).
