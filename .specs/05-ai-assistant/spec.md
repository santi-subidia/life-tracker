# Especificación Funcional: Fase 5 - Inteligencia Holística (Asistente IA Transversal con Google Gemini 2.5 Flash)

- **Feature**: Asistente IA Transversal Holístico con Function Calling
- **Ruta del Artefacto**: `.specs/05-ai-assistant/spec.md`
- **Fase**: 5 (Inteligencia Unificadora & Copiloto Personal)
- **Estado**: Propuesto (En espera de Puerta de Aprobación 1)
- **Fecha**: 2026-09-06
- **Autor**: System Architect (SubiKit)
- **Aprobador**: Subi

---

## 1. Resumen del Problema y Propuesta de Valor

### 1.1 Contexto y Dolor Actual
Life Tracker ha consolidado con éxito los 5 pilares de la vida de Subi:
1. **Salud**: Análisis clínicos, métricas sanguíneas multianuales y seguimiento de estudios.
2. **Hábitos**: Rutinas diarias, frecuencias personalizadas y rachas de consistencia.
3. **Segundo Cerebro**: Notas interconectadas con wikilinks bidireccionales, grafo de conocimiento y bitácora diaria.
4. **Trabajo**: Tablero Kanban, gestión de proyectos y sesiones de foco (Deep Work).
5. **Academia**: Materias cursadas, hitos evaluativos (parciales/finales) y promedios ponderados.
6. **Spine Transversal**: Línea de tiempo unificada (`timeline_items`) y check-in diario (`daily_logs`).

A pesar de contar con todos estos datos soberanos, existía una brecha cognitiva: **los módulos operaban como silos de información independientes**. Subi debía navegar manualmente entre pantallas para responder preguntas cruzadas fundamentales:
- "¿Existe correlación entre mis semanas de alta carga académica y la caída de mis rachas de hábitos saludables?"
- "¿Qué compromisos de exámenes tengo en los próximos 7 días y qué tareas urgentes del Kanban compiten por mi tiempo?"
- "¿Cuál fue la evolución de mi colesterol en mis últimos tres análisis de sangre?"
- "Anota una idea en el Segundo Cerebro y simultáneamente ponme una tarea en el Kanban para mañana sin salir del flujo de pensamiento".

### 1.2 Propuesta de Valor
El **Asistente IA** se erige como el **núcleo cognitivo unificador** del sistema personal:
- **Diálogo en Lenguaje Natural**: Subi interactúa con un copiloto inteligente que comprende el contexto holístico de su vida.
- **Function Calling Nativo con Gemini 2.5 Flash**: El modelo de Google cuenta con herramientas (*tools*) que le permiten consultar la base de datos de los 5 pilares en tiempo real y ejecutar mutaciones atómicas a pedido del usuario.
- **Respuestas Síntesis Multidominio**: Correlaciona hábitos, métricas de salud, proyectos y materias universitarias con razonamiento deductivo de alta precisión.
- **Acciones Rápidas en 1 Mensaje**: Crea tareas, registra hitos académicos, añade notas al Segundo Cerebro y marca hábitos cumplidos desde el mismo chat, mostrando confirmaciones visuales inmediatas (*Rich Tool Cards*).
- **Privacidad y Aislamiento Absoluto**: Multi-tenant estricto con Row Level Security (RLS) en PostgreSQL; la IA jamás tiene visibilidad ni acceso a datos ajenos al usuario autenticado.

---

## 2. Bounded Contexts y Arquitectura de Dominio

```mermaid
graph TD
    subgraph UI_NextJs ["Frontend Next.js (/asistente)"]
        ChatView["Vista de Chat & Barra Lateral"]
        RichCards["Rich Tool Cards (Tarjetas de Tareas, Salud, Hábitos, Academia)"]
        EmptyStatePrompts["Prompts Sugeridos Holísticos"]
        ChatView --> RichCards
        ChatView --> EmptyStatePrompts
    end

    subgraph Contexto_Ai ["Bounded Context: Asistente IA (LifeTracker.Domain.Ai)"]
        AiConv[AiConversation - Aggregate Root]
        AiMsg[AiMessage - Entity]
        AiConv -->|Contiene historial| AiMsg
        
        AiToolDispatcher[AiToolDispatcher - Deep Module]
        GeminiComposer[GeminiPromptComposer - Deep Module]
        ContextCompressor[AiContextCompressor - Deep Module]
    end

    subgraph Seams_Integracion ["Seams & Abstracciones"]
        GeminiClient[IGeminiClient - Seam]
        ToolRegistry[IAiToolRegistry - Seam]
    end

    subgraph Modulos_De_Dominio ["Módulos de Dominio (Life Tracker)"]
        HealthSvc[IHealthService]
        HabitsSvc[IHabitService]
        NotesSvc[INoteService]
        WorkSvc[IWorkService]
        AcademicsSvc[IAcademicService]
        TimelineSvc[ITimelineService]
    end

    subgraph Proveedor_Externo ["Google GenAI API"]
        GeminiAPI["Gemini 2.5 Flash Endpoint"]
    end

    ChatView -->|POST /api/ai/conversations/{id}/messages| Contexto_Ai
    ContextCompressor -->|Historial Comprimido| GeminiComposer
    GeminiComposer -->|Payload + Tools Schema| GeminiClient
    GeminiClient -->|HTTPS REST / GenAI SDK| GeminiAPI
    GeminiAPI -.->|Function Call Response| GeminiClient
    GeminiClient -->|Invoca Tool| AiToolDispatcher
    AiToolDispatcher --> ToolRegistry
    ToolRegistry --> HealthSvc
    ToolRegistry --> HabitsSvc
    ToolRegistry --> NotesSvc
    ToolRegistry --> WorkSvc
    ToolRegistry --> AcademicsSvc
    ToolRegistry --> TimelineSvc
    AiToolDispatcher -.->|Resultado de Tool| GeminiComposer
    GeminiComposer -->|Payload con Tool Result| GeminiClient
    GeminiClient -->|Respuesta Final Sintetizada| ChatView
```

### 2.1 Principios de Diseño Aplicados

1. **Deep Modules (John Ousterhout)**:
   - `AiToolDispatcher`: Módulo profundo con interfaz minimalista (`ExecuteToolAsync(name, jsonArgs, userId)`). Por dentro valida esquemas JSON, realiza autorización rigurosa por `userId`, ejecuta el dispatch hacia el módulo correspondiente y estandariza los errores en respuestas comprensibles para el modelo.
   - `GeminiPromptComposer`: Oculta toda la complejidad de generar los esquemas de herramientas OpenAPI/JSON Schema requeridos por Gemini 2.5 Flash, ensamblar el system prompt y reconstruir el historial multipart (`user`, `model`, `functionResponse`).
   - `AiContextCompressor`: Gestiona la ventana de memoria contextual de los últimos N mensajes (predeterminado 20 mensajes). Trunca selectivamente payloads antiguos de herramientas volumétricas preservando la coherencia semántica sin disparar latencias ni costos de tokens.

2. **Seams (Michael Feathers)**:
   - `IGeminiClient`: Permite desacoplar completamente la infraestructura de red de Google Gemini de la lógica de aplicación. En tests unitarios e integrados permite simular respuestas simples o llamadas consecutivas de herramientas sin costo de red ni necesidad de claves reales.
   - `IAiToolRegistry`: Desacopla al Asistente IA de las implementaciones concretas de base de datos de cada pilar. Cada módulo expone sus capacidades registrando handlers en el registry.

3. **Invariantes de Negocio Rigurosos**:
   - **Invariante 1 (Aislamiento RLS Multi-tenant)**: Toda conversación, mensaje y llamada a herramienta está estrictamente delimitada por el `userId` autenticado. El Asistente IA tiene prohibido por construcción inyectar identificadores ajenos.
   - **Invariante 2 (Validación Pre-ejecución de Mutaciones)**: Las herramientas de escritura (`create_work_task`, `create_quick_note`, `create_academic_milestone`, `toggle_habit`) validan rangos y campos requeridos antes de persistir; cualquier inconsistencia retorna un error de negocio que la IA explica pedagógicamente al usuario.
   - **Invariante 3 (Trazabilidad y No Repudio de Acciones)**: Cada invocación de herramienta se guarda en la base de datos dentro del mensaje con su nombre, argumentos enviados y respuesta obtenida en formato JSONB.

---

## 3. Alcance Detallado (Scope)

### 3.1 In Scope: Catálogo Exhaustivo de Herramientas (Function Calling)

#### A. Herramientas de Lectura (Read Tools)

1. `get_health_summary`
   - **Descripción**: Consulta estudios médicos realizados, instituciones y la evolución histórica de parámetros clínicos y métricas de laboratorio del usuario.
   - **Parámetros**:
     * `metricName` (string, opcional): Nombre o subcadena de la métrica a buscar (ej: "Colesterol", "Glucosa", "Vitamina D").
     * `year` (integer, opcional): Año específico de los estudios clínicos a filtrar (ej: 2025).
   - **Retorno**: Lista de estudios con fecha, institución, parámetros clínicos encontrados y flag de valores fuera de referencia (`isAbnormal`).

2. `get_habits_status`
   - **Descripción**: Consulta el estado de los hábitos del usuario para una fecha determinada, incluyendo estado de cumplimiento de hoy, racha actual y mejor racha histórica.
   - **Parámetros**:
     * `date` (string en formato `YYYY-MM-DD`, opcional): Fecha a consultar (por defecto la fecha actual).
   - **Retorno**: Lista de hábitos activos, categoría, porcentaje de cumplimiento diario, estado `isCompleted` y rachas (`currentStreak`, `longestStreak`).

3. `search_notes`
   - **Descripción**: Realiza una búsqueda semántica y por palabras clave en las notas del Segundo Cerebro, devolviendo títulos, extracto del contenido, etiquetas y backlinks asociados.
   - **Parámetros**:
     * `query` (string, obligatorio): Término o frase a buscar en título o contenido de las notas.
     * `tag` (string, opcional): Etiqueta para filtrar (ej: "arquitectura", "ideas").
   - **Retorno**: Lista de notas coincidentes con su resumen, enlaces salientes ([[wikilinks]]) y notas que la referencian (backlinks).

4. `get_work_tasks`
   - **Descripción**: Obtiene las tareas del tablero Kanban y las métricas de foco acumuladas en la semana o el día actual.
   - **Parámetros**:
     * `projectId` (string UUID, opcional): Filtra tareas de un proyecto específico.
     * `status` (string, opcional: "backlog", "todo", "in_progress", "done"): Filtra por columna del tablero Kanban.
   - **Retorno**: Lista de tareas con prioridad, fecha límite y proyecto, más las horas/minutos acumulados de Deep Work.

5. `get_academic_status`
   - **Descripción**: Consulta las materias universitarias en curso o finalizadas, el promedio ponderado actual, y la lista de exámenes, parciales y entregas previstos en el calendario.
   - **Parámetros**: Ninguno.
   - **Retorno**: Lista de materias con promedio calculado, estado curricular (`en_curso`, `aprobada`, etc.) y próximos hitos evaluativos ordenados por fecha de vencimiento.

6. `get_timeline_feed`
   - **Descripción**: Consulta la línea de tiempo unificada del Spine transversal de Life Tracker en una ventana temporal, consolidando eventos de salud, hábitos, notas, trabajo y exámenes.
   - **Parámetros**:
     * `startDate` (string `YYYY-MM-DD`, obligatorio): Fecha inicial de la ventana de tiempo.
     * `endDate` (string `YYYY-MM-DD`, obligatorio): Fecha final de la ventana de tiempo.
   - **Retorno**: Lista cronológica de eventos con su módulo de origen, tipo de evento, título y detalles complementarios.

---

#### B. Herramientas de Escritura / Mutación Rápida (Action Tools)

7. `toggle_habit`
   - **Descripción**: Alterna el estado de cumplimiento de un hábito (marcar como completado o desmarcar) para la fecha especificada o el día de hoy.
   - **Parámetros**:
     * `habitId` (string UUID, obligatorio): Identificador único del hábito.
     * `date` (string `YYYY-MM-DD`, opcional): Fecha del registro (por defecto hoy).
   - **Retorno**: Objeto con el nuevo estado del hábito (`isCompletedToday`), racha actualizada y mensaje de confirmación.

8. `create_work_task`
   - **Descripción**: Añade una nueva tarea directamente a una columna del tablero Kanban de Trabajo, con prioridad opcional, fecha límite y proyecto asociado.
   - **Parámetros**:
     * `title` (string, obligatorio): Título claro de la tarea.
     * `description` (string, opcional): Detalle o contexto adicional.
     * `priority` (string, opcional: "low", "medium", "high", "urgent"; por defecto "medium").
     * `dueDate` (string `YYYY-MM-DD`, opcional): Fecha límite.
     * `projectId` (string UUID, opcional): Identificador del proyecto al que pertenece.
   - **Retorno**: Objeto de la tarea creada con su ID generado, posición asignada y columna por defecto ("todo").

9. `create_quick_note`
   - **Descripción**: Guarda instantáneamente una nota en el Segundo Cerebro, admitiendo formato Markdown y enlaces a otras notas existentes con sintaxis de wikilinks `[[Título]]`.
   - **Parámetros**:
     * `title` (string, obligatorio): Título único de la nota.
     * `content` (string, obligatorio): Cuerpo de la nota en Markdown.
     * `tags` (array de strings, opcional): Etiquetas conceptuales de la nota.
   - **Retorno**: Objeto de la nota creada con su ID, slug y lista de wikilinks detectados y vinculados.

10. `create_academic_milestone`
    - **Descripción**: Agenda un hito evaluativo (parcial, entrega de TP, final o recuperatorio) dentro de una materia universitaria existente.
    - **Parámetros**:
      * `subjectId` (string UUID, obligatorio): ID de la materia.
      * `title` (string, obligatorio): Nombre de la evaluación (ej: "Primer Parcial Teórico").
      * `milestoneType` (string, obligatorio: "parcial", "entrega", "final", "recuperatorio").
      * `dueDate` (string `YYYY-MM-DD`, obligatorio): Fecha programada para la evaluación.
      * `weightPercentage` (number, opcional): Ponderación porcentual sobre la nota final (ej: 40.0).
    - **Retorno**: Objeto del hito evaluativo creado en estado "pendiente" con fecha proyectada al calendario.

---

### 3.2 In Scope: Persistencia, Sesiones y Memoria Conversacional
- **Sesiones de Chat Persistentes**:
  - `AiConversation`: Identificador único, título autogenerado basado en el primer mensaje de Subi o editable manualmente, marcas temporales `created_at` y `updated_at`.
  - `AiMessage`: Cada turno de la conversación persistido con:
    * `role`: `user`, `model`, `tool_call`, `tool_result`.
    * `content`: Texto en lenguaje natural o resumen.
    * `tool_calls`: Objeto JSONB estructurado con el nombre de la herramienta invocada, los argumentos provistos y el identificador de llamada.
    * `tool_results`: Objeto JSONB con la salida generada por la herramienta para retroalimentar al modelo.
- **Ventana Deslizante de Memoria Contextual**:
  - Al enviar una nueva consulta a Gemini, el servicio recopila los últimos N mensajes (configurado en 20 mensajes) pertenecientes a la conversación activa para proveer continuidad temática (ej: "De las tareas que me listaste antes, crea una subtarea para la segunda").
- **Multi-tenancy Estricto**:
  - RLS activado en todas las tablas de IA; ningún usuario puede leer ni modificar conversaciones ajenas.

---

### 3.3 In Scope: Experiencia de Usuario Frontend en Next.js (`/asistente`)
- **Layout Responsivo de Dos Paneles**:
  - **Barra Lateral**:
    * Botón destacado `+ Nueva Conversación`.
    * Historial de conversaciones agrupadas cronológicamente ("Hoy", "Ayer", "Últimos 7 días", "Anteriores").
    * Acciones contextuales: renombrar conversación y eliminar con confirmación modal.
    * Colapsable en dispositivos móviles mediante menú lateral tipo cajón (*drawer*).
  - **Ventana de Chat Principal**:
    * Renderizado fluido de Markdown (encabezados, listas, citas, tablas, énfasis).
    * Bloques de código con resaltado de sintaxis y botón de "Copiar".
    * **Rich Tool Cards (Tarjetas Visuales Interactivas)**:
      - *Tarjeta de Salud*: Muestra métricas consultadas, valor numérico y badge de estado (Normal / Alerta).
      - *Tarjeta de Hábitos*: Muestra el hábito con checkbox interactivo y racha actual con llama de fuego.
      - *Tarjeta de Tarea Kanban*: Visualiza la tarea creada con badge de prioridad y botón de acceso rápido a `/trabajo`.
      - *Tarjeta de Academia*: Muestra el hito agendado con fecha y badge de materia.
      - *Tarjeta de Nota*: Muestra el snippet de la nota y sus wikilinks asociados.
    * Indicador de escritura animado (*typing indicator*) con estado "Consultando tus métricas de salud...", "Registrando tarea...", etc.
- **Estado Vacío con Prompts Sugeridos**:
  - Tarjetas de clic rápido con consultas predefinidas:
    * *"¿Cómo influyen mis hábitos en mis estudios médicos?"*
    * *"¿Qué prioridades académicas y de trabajo tengo esta semana?"*
    * *"Dame un resumen holístico de cómo va mi día de hoy."*
    * *"Anota una tarea en el Kanban para estudiar y una nota rápida de repaso."*
- **Navegación Unificada**:
  - Enlace activo en la cabecera superior y barra de navegación inferior móvil.
  - Tarjeta de acceso directo en la pantalla de inicio `/`.

---

### 3.4 Out of Scope
- Reconocimiento de voz continuo con Whisper en servidor (se aprovecha la Web Speech API nativa del navegador en el cliente o entrada de teclado).
- Agentes totalmente autónomos con ejecución desatendida en segundo plano sin intervención ni comando previo del usuario.
- Generación de imágenes generativas (DALL-E / Imagen) dentro del chat.

---

## 4. Modelo de Datos y Evolución de Esquema

### 4.1 Refinamiento DDL en Supabase PostgreSQL

Se creará la migración `supabase/migrations/20260909000000_ai_assistant_refinements.sql` para actualizar las tablas iniciales de IA:

```sql
-- ==============================================================================
-- REFINAMIENTO DE TABLAS DEL ASISTENTE IA (FASE 5)
-- ==============================================================================

-- 1. Actualizar ai_conversations con updated_at e índices
ALTER TABLE public.ai_conversations
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_updated 
    ON public.ai_conversations(user_id, updated_at DESC);

-- 2. Ampliar ai_messages para soportar roles de herramientas y almacenamiento JSONB
-- Eliminar restricción antigua de roles si existía
ALTER TABLE public.ai_messages DROP CONSTRAINT IF EXISTS ai_messages_role_check;

-- Aplicar nueva restricción con soporte completo de Function Calling
ALTER TABLE public.ai_messages 
    ADD CONSTRAINT ai_messages_role_check 
    CHECK (role IN ('user', 'model', 'tool_call', 'tool_result', 'system'));

-- Agregar columnas para llamadas y resultados de herramientas
ALTER TABLE public.ai_messages
    ADD COLUMN IF NOT EXISTS tool_calls JSONB DEFAULT '[]'::jsonb NOT NULL,
    ADD COLUMN IF NOT EXISTS tool_results JSONB DEFAULT '[]'::jsonb NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_messages_conv_created 
    ON public.ai_messages(conversation_id, created_at ASC);

-- 3. Trigger para actualizar automáticamente updated_at en ai_conversations
CREATE OR REPLACE FUNCTION public.update_ai_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.ai_conversations
    SET updated_at = timezone('utc'::text, now())
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_ai_conversation_timestamp ON public.ai_messages;
CREATE TRIGGER trg_update_ai_conversation_timestamp
    AFTER INSERT ON public.ai_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_ai_conversation_timestamp();

-- 4. Verificación de Políticas Row Level Security
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_conversations_all_own" ON public.ai_conversations;
CREATE POLICY "ai_conversations_all_own" 
    ON public.ai_conversations FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_messages_all_own" ON public.ai_messages;
CREATE POLICY "ai_messages_all_own" 
    ON public.ai_messages FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
```

---

## 5. Modelado de Dominio en C# (`LifeTracker.Domain.Ai`)

### 5.1 Entidades del Agregado de Conversación

```csharp
namespace LifeTracker.Domain.Ai;

using LifeTracker.Domain.Common;

public enum AiMessageRole
{
    User,
    Model,
    ToolCall,
    ToolResult,
    System
}

public class AiConversation : BaseEntity
{
    public Guid UserId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    private readonly List<AiMessage> _messages = new();
    public IReadOnlyCollection<AiMessage> Messages => _messages.AsReadOnly();

    // Constructor para EF Core
    private AiConversation() { }

    public AiConversation(Guid userId, string title)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("El usuario es requerido.", nameof(userId));

        UserId = userId;
        Title = string.IsNullOrWhiteSpace(title) ? "Nueva conversación" : title.Trim();
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateTitle(string newTitle)
    {
        if (string.IsNullOrWhiteSpace(newTitle))
            throw new ArgumentException("El título no puede estar vacío.", nameof(newTitle));

        Title = newTitle.Trim();
        UpdatedAt = DateTime.UtcNow;
    }

    public void Touch()
    {
        UpdatedAt = DateTime.UtcNow;
    }

    public AiMessage AddMessage(
        AiMessageRole role, 
        string content, 
        string? toolCallsJson = null, 
        string? toolResultsJson = null)
    {
        var message = new AiMessage(Id, UserId, role, content, toolCallsJson, toolResultsJson);
        _messages.Add(message);
        Touch();
        return message;
    }
}

public class AiMessage : BaseEntity
{
    public Guid ConversationId { get; private set; }
    public Guid UserId { get; private set; }
    public AiMessageRole Role { get; private set; }
    public string Content { get; private set; } = string.Empty;
    public string ToolCallsJson { get; private set; } = "[]";
    public string ToolResultsJson { get; private set; } = "[]";

    private AiMessage() { }

    internal AiMessage(
        Guid conversationId, 
        Guid userId, 
        AiMessageRole role, 
        string content, 
        string? toolCallsJson, 
        string? toolResultsJson)
    {
        ConversationId = conversationId;
        UserId = userId;
        Role = role;
        Content = content ?? string.Empty;
        ToolCallsJson = string.IsNullOrWhiteSpace(toolCallsJson) ? "[]" : toolCallsJson;
        ToolResultsJson = string.IsNullOrWhiteSpace(toolResultsJson) ? "[]" : toolResultsJson;
    }
}
```

### 5.2 Objetos de Valor e Interfaces de Servicios

```csharp
namespace LifeTracker.Application.Ai.Common;

public record AiToolCallDefinition(
    string Name,
    string Description,
    object ParametersSchema
);

public record AiToolCallRequest(
    string CallId,
    string ToolName,
    Dictionary<string, object?> Arguments
);

public record AiToolExecutionResult(
    string CallId,
    string ToolName,
    bool Success,
    object? Data,
    string? ErrorMessage
);

public interface IAiToolDispatcher
{
    IReadOnlyList<AiToolCallDefinition> GetAvailableToolDefinitions();
    Task<AiToolExecutionResult> DispatchAsync(
        Guid userId, 
        AiToolCallRequest request, 
        CancellationToken cancellationToken = default);
}

public interface IGeminiClient
{
    Task<GeminiChatResponse> SendChatTurnAsync(
        IEnumerable<AiMessage> conversationHistory,
        IEnumerable<AiToolCallDefinition> availableTools,
        CancellationToken cancellationToken = default);
}

public record GeminiChatResponse(
    string? TextResponse,
    IReadOnlyList<AiToolCallRequest> ToolCalls,
    int PromptTokens,
    int CompletionTokens
);
```

---

## 6. Contratos de API (.NET RESTful en `/api/ai`)

### 6.1 Endpoints de Conversación

#### `GET /api/ai/conversations`
Obtiene la lista de conversaciones del usuario autenticado ordenadas por fecha reciente.
- **Respuesta (200 OK)**:
```json
[
  {
    "id": "c1a2b3c4-...",
    "title": "Correlación de Sueño y Exámenes",
    "createdAt": "2026-09-06T10:00:00Z",
    "updatedAt": "2026-09-06T10:15:00Z",
    "messagesCount": 6
  }
]
```

#### `POST /api/ai/conversations`
Inicia una nueva sesión de conversación vacía.
- **Payload**:
```json
{
  "title": "Planificación Semanal de Foco"
}
```
- **Respuesta (201 Created)**:
```json
{
  "id": "c1a2b3c4-...",
  "title": "Planificación Semanal de Foco",
  "createdAt": "2026-09-06T10:00:00Z",
  "updatedAt": "2026-09-06T10:00:00Z"
}
```

#### `GET /api/ai/conversations/{id}`
Obtiene el detalle de una conversación con su historial cronológico de mensajes.
- **Respuesta (200 OK)**:
```json
{
  "id": "c1a2b3c4-...",
  "title": "Correlación de Sueño y Exámenes",
  "messages": [
    {
      "id": "m111-...",
      "role": "user",
      "content": "¿Qué exámenes tengo esta semana y cómo están mis hábitos?",
      "createdAt": "2026-09-06T10:00:00Z"
    },
    {
      "id": "m222-...",
      "role": "model",
      "content": "Tienes 1 examen de Sistemas Distribuidos el jueves. Tus hábitos de hoy tienen un 66% de cumplimiento...",
      "toolCalls": [
        { "callId": "call_1", "toolName": "get_academic_status", "arguments": {} },
        { "callId": "call_2", "toolName": "get_habits_status", "arguments": { "date": "2026-09-06" } }
      ],
      "createdAt": "2026-09-06T10:00:05Z"
    }
  ]
}
```

#### `POST /api/ai/conversations/{id}/messages`
Envía un nuevo mensaje de usuario, procesa el bucle de herramientas en el backend con Gemini 2.5 Flash y devuelve la respuesta final consolidada con los tool calls ejecutados.
- **Payload**:
```json
{
  "content": "Crea una tarea en el Kanban para estudiar Sistemas Distribuidos con prioridad alta para el miércoles."
}
```
- **Respuesta (200 OK)**:
```json
{
  "userMessage": {
    "id": "msg-u-1",
    "role": "user",
    "content": "Crea una tarea en el Kanban para estudiar Sistemas Distribuidos con prioridad alta para el miércoles.",
    "createdAt": "2026-09-06T10:20:00Z"
  },
  "assistantMessage": {
    "id": "msg-m-1",
    "role": "model",
    "content": "¡Listo! He creado la tarea **'Estudiar Sistemas Distribuidos'** en tu Kanban con prioridad Alta para el miércoles 2026-09-09.",
    "toolCalls": [
      {
        "callId": "call_task_99",
        "toolName": "create_work_task",
        "arguments": {
          "title": "Estudiar Sistemas Distribuidos",
          "priority": "high",
          "dueDate": "2026-09-09"
        },
        "result": {
          "id": "task-uuid-888",
          "title": "Estudiar Sistemas Distribuidos",
          "status": "todo",
          "priority": "high"
        }
      }
    ],
    "createdAt": "2026-09-06T10:20:04Z"
  }
}
```

#### `DELETE /api/ai/conversations/{id}`
Elimina una conversación y todos sus mensajes en cascada.
- **Respuesta (204 No Content)**.

---

## 7. Criterios de Aceptación (Gherkin BDD)

### Escenario 1: Consulta holística cruzada de hábitos y exámenes académicos
```gherkin
Dado que Subi tiene una materia "Sistemas Distribuidos" con un examen programado para dentro de 3 días
Y tiene 3 hábitos configurados de los cuales ha completado 1 hoy
Cuando Subi envía el mensaje "¿Qué exámenes tengo esta semana y cómo va mi consistencia de hábitos?"
Entonces el Asistente IA invoca secuencialmente o en paralelo "get_academic_status" y "get_habits_status"
Y responde sintetizando la fecha del examen próximo junto al estado de los hábitos (1/3 completados, 33%)
Y ambas herramientas quedan registradas en el mensaje en "toolCalls"
```

### Escenario 2: Ejecución de herramienta de lectura médica (Salud)
```gherkin
Dado que Subi tiene registrado un estudio de laboratorio con "Glucosa" de 92 mg/dL y "Colesterol Total" de 185 mg/dL
Cuando Subi pregunta "¿Cuáles fueron mis últimos valores de glucosa y colesterol?"
Entonces el Asistente IA ejecuta la herramienta "get_health_summary" con parámetro "metricName"
Y formula una respuesta clara informando ambos valores con sus respectivas unidades
Y en el frontend se visualiza una tarjeta de resumen clínico con los datos devueltos
```

### Escenario 3: Ejecución de herramienta de acción (Crear tarea en Kanban)
```gherkin
Dado que Subi solicita: "Crea una tarea urgente en el Kanban llamada 'Repasar Capítulos 3 y 4' con fecha para mañana"
Cuando el sistema procesa el mensaje con Gemini 2.5 Flash
Entonces el backend detecta el tool call "create_work_task"
Y ejecuta la inserción de la tarea con título "Repasar Capítulos 3 y 4", prioridad "urgent" y fecha correspondiente
Y el modelo responde confirmando la creación exitosa
Y la interfaz de chat renderiza la tarjeta visual interactiva de la tarea con enlace a "/trabajo"
```

### Escenario 4: Marcar hábito desde el chat con confirmación visual (Action Tool)
```gherkin
Dado que Subi tiene el hábito "Tomar 2L de Agua" pendiente de completar hoy con racha actual de 5 días
Cuando Subi escribe al asistente "Marca como cumplido mi hábito de tomar agua de hoy"
Entonces el asistente identifica el ID del hábito y ejecuta "toggle_habit"
Y el sistema actualiza la racha a 6 días
Y el chat muestra un badge de confirmación con la llama de racha actualizada en 6
```

### Escenario 5: Creación rápida de nota con wikilinks en el Segundo Cerebro
```gherkin
Dado que Subi dicta al asistente: "Crea una nota rápida titulada 'Patrón Saga' con contenido 'Manejo de transacciones distribuidas en [[Microservicios]].' y etiqueta 'arquitectura'"
Cuando el Asistente IA ejecuta la herramienta "create_quick_note"
Entonces se inserta la nueva nota en el Segundo Cerebro
Y el parser detecta automáticamente el wikilink bidireccional hacia "Microservicios"
Y el asistente responde confirmando la creación y los enlaces detectados
```

### Escenario 6: Persistencia y reanudación de sesión conversacional
```gherkin
Dado que Subi mantuvo una conversación con 4 intercambios y cierra la ventana del navegador
Cuando vuelve a ingresar a "/asistente" y selecciona la conversación en la barra lateral
Entonces el sistema recupera todos los mensajes anteriores con su formato Markdown y tarjetas de herramientas
Y Subi puede continuar la conversación sin pérdida de contexto temático
```

### Escenario 7: Invariante 1 de Seguridad y Aislamiento Multi-tenant (RLS)
```gherkin
Dado el Usuario A y el Usuario B, ambos con cuentas activas y datos privados en Life Tracker
Cuando el Usuario A pregunta al Asistente IA por sus tareas, notas o estudios médicos
Entonces las herramientas ejecutadas por "AiToolDispatcher" filtran de manera inquebrantable por el "userId" del Usuario A
Y bajo ninguna circunstancia el modelo tiene acceso a información perteneciente al Usuario B
Y si el Usuario A intenta acceder por ID a una conversación del Usuario B vía API, recibe un error 404 Not Found
```

### Escenario 8: Degradación controlada ante fallo o límite de cuota de Gemini API
```gherkin
Dado que la API externa de Google Gemini devuelve un código HTTP 429 (Rate Limit) o 503 (Servicio no disponible)
Cuando Subi envía una consulta en el chat
Entonces el backend captura la excepción sin crashear el servidor
Y el chat muestra un mensaje empático: "El servicio de IA está experimentando alta demanda momentánea. Por favor, intenta de nuevo en unos instantes."
Y no se generan registros corruptos en la tabla "ai_messages"
```

---

## 8. Estrategia Incremental y Trade-offs Analizados (Design It Twice)

### 8.1 Decisión 1: Orquestación de Function Calling (Backend Loop vs Frontend Client Loop)
- **Opción A (Adoptada): Bucle de Orquestación en Backend .NET**:
  - El frontend envía una única petición `POST /api/ai/conversations/{id}/messages`. El backend .NET recibe la intención de Gemini, despacha las herramientas invocadas contra los servicios internos correspondientes (`IWorkService`, `IHabitService`, etc.), recopila los resultados y vuelve a llamar a Gemini para que emita la síntesis final antes de responder al cliente.
  - *Ventajas*:
    1. **Seguridad Total**: Las llamadas a los servicios internos y la API Key de Gemini nunca se exponen al cliente.
    2. **Latencia Óptima**: Las llamadas entre el motor de herramientas y PostgreSQL ocurren en la red interna del servidor (< 2ms) en lugar de múltiples idas y vueltas por internet móvil.
    3. **Transaccionalidad**: Se asegura la persistencia atómica de la conversación completa.
- **Opción B (Rechazada): Orquestación en el navegador del cliente**:
  - *Desventajas*: Expondría claves o requeriría múltiples endpoints intermedios, sobrecargando la red móvil de Subi con 3 a 4 roundtrips por cada pregunta que involucre herramientas.

### 8.2 Decisión 2: Almacenamiento de Tool Calls (JSONB vs Tablas Relacionales Separadas)
- **Opción A (Adoptada): Almacenamiento semi-estructurado en columnas JSONB (`tool_calls`, `tool_results`)**:
  - Cada registro de `ai_messages` almacena un array JSONB con la lista de herramientas invocadas y sus salidas.
  - *Ventajas*:
    1. Mapeo directo y sin fricción con la estructura nativa de mensajes de Google Gemini (`functionCall` y `functionResponse`).
    2. Flexibilidad absoluta para incorporar nuevas herramientas sin alterar el esquema relacional con migraciones adicionales.
    3. Rendimiento de lectura óptimo: una sola consulta a `ai_messages` recupera todo el turno con sus llamadas asociadas.
- **Opción B (Rechazada): Tabla relacional `ai_message_tool_calls` con columnas normalizadas**:
  - *Desventajas*: Esquema rígido que requiere migraciones por cada nuevo parámetro o tipo de datos de retorno, y joins relacionales adicionales innecesarios para lecturas de historial.

### 8.3 Decisión 3: Protocolo de Respuesta (Bucle Atómico Consolidado vs Streaming SSE)
- **Opción A (Adoptada en V1): Bucle Atómico Consolidado con Indicadores de Estado**:
  - El backend resuelve el bucle de herramientas y devuelve la respuesta estructurada completa con sus tarjetas asociadas. El frontend muestra un indicador visual animado durante el procesamiento.
  - *Ventajas*: Implementación robusta, predecible y libre de problemas de sincronización en conexiones intermitentes; permite renderizar las *Rich Tool Cards* con todos sus datos resueltos instantáneamente.
- **Opción B (Diferida a V2): Server-Sent Events (SSE) con Streaming Token a Token**:
  - *Motivo de diferimiento*: La complejidad añadida de gestionar eventos de streaming mientras se intercalan llamadas sincrónicas de herramientas no aporta valor crítico inmediato en una V1 de uso personal, donde Gemini 2.5 Flash responde en < 1.2 segundos.

---

## 9. Próximos Pasos (Puerta de Aprobación 1)

1. Presentar formalmente esta especificación a **Subi** en la **Puerta de Aprobación 1**.
2. Una vez aprobada por Subi:
   - Crear el **Tech Plan** (`tech-plan.md` en `.specs/05-ai-assistant/`) detallando DTOs, esquemas OpenAPI de las 10 tools, implementaciones de `AiToolDispatcher` y `GeminiClient`.
   - Generar el desglose de tareas TDD atómicas (`tasks.md`).
   - Aplicar la migración SQL `20260909000000_ai_assistant_refinements.sql`.
   - Desarrollar la interfaz en `/asistente` y los componentes visuales de Rich Tool Cards.
