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
- **Materia (Subject)**: Asignatura o curso en curso o completado en un período lectivo (`term`).
- **Hito Académico (Milestone)**: Evento evaluativo con fecha límite (`Parcial`, `Final`, `Entrega`, `Recuperatorio`), ponderación y calificación obtenida.

### 6. Asistente IA (AI Assistant)
- **Asistente (Life Assistant)**: Agente impulsado por Google Gemini 2.5 Flash con capacidad de consultar el Timeline unificado y ejecutar herramientas (*Function Calling*) para responder y correlacionar información de todas las áreas de vida.

### 7. Finanzas Personales (Finances)
- **Cuenta / Billetera (Financial Account)**: Depósito o instrumento monetario que custodia fondos líquidos o pasivos (ej. Efectivo ARS, Galicia, Mercado Pago, Caja de Ahorro USD). Posee una divisa base fija (`currency`), saldo inicial y saldo actual sincronizado.
- **Transacción / Movimiento (Transaction)**: Registro atómico de flujo de capital clasificado como Ingreso (*Income*), Gasto (*Expense*) o Transferencia (*Transfer*) entre cuentas propias. Es auditable y posee fecha/hora, importe, categoría e impacto inmediato en el balance.
- **Categoría Financiera (Transaction Category)**: Taxonomía funcional para clasificar ingresos y gastos (ej. Alimentación, Transporte, Servicios, Ocio, Salud, Educación, Salario) con color e icono Lucide identificatorio.
- **Presupuesto Mensual (Budget)**: Límite de gasto planificado para un mes/año calendario específico, aplicable globalmente o por categoría, con cálculo de consumo porcentual y alertas de sobregiro.
- **Flujo de Caja (Cashflow)**: Balance neto periódico resultante de la diferencia entre Ingresos Totales y Gastos Totales para una divisa dada, determinando la capacidad de ahorro.

---

## Invariantes del Negocio

1. **Propiedad y Privacidad**: Toda entidad pertenece estrictamente a un único usuario (`user_id`), protegido por políticas RLS y validación de tokens JWT en el backend.
2. **Desacoplamiento vía Proyecciones**: Ningún Bounded Context puede consultar directamente tablas privadas de otro Bounded Context; toda interacción transversal se realiza a través de contratos de API, eventos o el read-model de `Timeline`.
3. **Trazabilidad de Salud**: Ningún `ClinicalValue` puede existir sin su `MedicalStudy` de origen.
4. **Resiliencia de Streaks**: Las rachas de hábitos son inmutables retroactivamente a partir de un período de gracia configurable (máximo 48 horas).
5. **Consistencia Atómica de Saldos (Finanzas)**: El saldo actual (`current_balance`) de una cuenta refleja rigurosamente su saldo inicial más la suma algebraica de las transacciones asentadas. La inserción, edición o reversión de una transacción recalcula el saldo de las cuentas involucradas dentro de una transacción atómica de base de datos (Unit of Work), impidiendo inconsistencias o condiciones de carrera.
6. **Inmutabilidad y Precisión Decimal**: Ninguna transacción confirmada es purgada físicamente sin auditoría contable. Todos los montos se modelan obligatoriamente con tipo `decimal` (PostgreSQL `numeric(14,2)` / C# `decimal`), prohibiendo tipos de coma flotante (`float`/`double`) para eliminar errores de redondeo.
7. **Segregación Monetaria Explícita**: No se realizan conversiones implícitas entre divisas dispares (ej. ARS y USD). Cada cuenta opera en su moneda nativa. Las transferencias entre cuentas de distinta moneda exigen declarar explícitamente el tipo de cambio o los montos debitados y acreditados en cada extremo.

