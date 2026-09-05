# Plan Técnico: Fase 3 - Notas y Segundo Cerebro (Estilo Obsidian)

- **Ruta**: `.specs/03-second-brain-notes/tech-plan.md`
- **Fase**: 3 (Plan Técnico y Arquitectura de Segundo Cerebro)
- **Estado**: Propuesto (En espera de Puerta de Aprobación 2)
- **Fecha**: 2026-09-05
- **Autor**: System Architect (SubiKit)

---

## 1. Arquitectura de Dominio y Deep Modules

### 1.1 Entidades del Bounded Context `Notes` (`LifeTracker.Domain.Notes`)

1. **`Note` (Aggregate Root)**:
   - Identidad: `Id` (Guid), `UserId` (Guid).
   - Atributos: `Title` (string), `Slug` (string), `Content` (string), `Tags` (List<string>), `Pinned` (bool), `IsStub` (bool), `IsArchived` (bool), `CreatedAt` (DateTime), `UpdatedAt` (DateTime).
   - Invariantes y Comportamiento:
     - `Note(Guid userId, string title, string slug, string content, List<string>? tags = null, bool pinned = false)`: Crea una nota activa (`IsStub = false`).
     - `public static Note CreateStub(Guid userId, string title, string slug)`: Crea una nota fantasma (`IsStub = true`, `Content = ""`).
     - `public void UpdateContent(string title, string slug, string content, List<string> tags, bool pinned)`: Actualiza metadatos y cuerpo, conmuta `IsStub = false` si era un stub, y actualiza `UpdatedAt = DateTime.UtcNow`.
     - `public void Archive()` y `public void Unarchive()`: Modifican el estado de archivo sin eliminar relaciones.
     - `public void SetPinned(bool pinned)`: Fija o desfija la nota.

2. **`NoteLink` (Entidad de Asociación)**:
   - Identidad: `Id` (Guid), `UserId` (Guid).
   - Claves foráneas: `SourceNoteId` (Guid), `TargetNoteId` (Guid).
   - Metadatos del enlace: `LinkText` (string?, representa el alias visual si fue especificado como `[[Target|Alias]]`).
   - Invariante relacional: `UNIQUE(source_note_id, target_note_id)` para prevenir enlaces duplicados redundantes entre los mismos dos documentos.

3. **`SlugGenerator` (Value Object / Domain Service Puro)**:
   - Responsabilidad: Generar slugs URL-safe, deterministas y legibles a partir del título de la nota.
   - Algoritmo de normalización:
     - Remueve diacríticos y acentos utilizando `NormalizationForm.FormD` (e.g. "Ácido" -> "Acido", "año" -> "ano").
     - Convierte caracteres a minúsculas invariantes.
     - Sustituye cualquier carácter que no sea `[a-z0-9]` por un guión medio `-`.
     - Colapsa secuencias continuas de guiones a un único guión (`--` -> `-`).
     - Recorta guiones sobrantes al inicio y final.

---

### 1.2 Especificación del Deep Module `WikilinkParser`

Siguiendo el principio de **Deep Module (John Ousterhout)**, la interfaz expone una superficie mínima y esconde toda la complejidad de análisis léxico, expresiones regulares y casos de borde:

```csharp
namespace LifeTracker.Domain.Notes;

public record WikilinkMatch(string TargetTitle, string? Alias);

public interface IWikilinkParser
{
    IReadOnlyList<WikilinkMatch> ExtractLinks(string markdownContent);
    IReadOnlyList<string> ExtractTags(string markdownContent);
}
```

#### Casos Límite y Reglas de Extracción
1. **Fenced Code Blocks (Bloques de Código Delimitados)**:
   - Bloques encerrados entre triples comillas invertidas ```` ```...``` ```` o virgulillas `~~~...~~~`.
   - El parser enmascara o excluye completamente estas secciones antes de buscar wikilinks o tags. Un texto como ```` ```\n[[Algoritmo]] #csharp\n``` ```` no genera ningún enlace ni tag.
2. **Inline Code (Código en Línea)**:
   - Fragmentos encerrados entre acentos graves simples `` `...` ``.
   - El parser enmascara el código en línea: un texto como ``Usa `[[Nota]]` para enlazar`` no genera un vínculo.
3. **Escapes con Barra Invertida**:
   - `\[\[Target\]\]` y `\#tag` no deben ser interpretados como wikilinks ni tags.
4. **Sintaxis de Wikilinks & Trimming**:
   - Regex núcleo (aplicado al texto limpio de código): `(?<!\\)\[\[\s*([^\[\]\|\r\n]+?)\s*(?:\|\s*([^\[\]\r\n]+?)\s*)?\]\]`
   - Si no contiene separador `|`, `Alias` es `null`.
   - Si contiene `|`, el primer grupo es `TargetTitle` y el segundo es `Alias`.
   - Si `TargetTitle` queda vacío o son solo espacios, la coincidencia se descarta.
   - Deduplicación: Si una nota cita múltiples veces el mismo target, se retorna una única coincidencia representativa priorizando la primera aparición con alias si existe.
5. **Sintaxis de Tags**:
   - Regex núcleo: `(?<![\\S\w])#([a-zA-Z0-9_\-]+)(?!\S)`
   - Ignora encabezados Markdown (`# Título` o `## Subtítulo`) debido a que los encabezados exigen un espacio posterior obligatorio.
   - Ignora fragmentos hash en URLs (e.g. `https://dominio.com/#seccion`).
   - Normalización: Convierte todos los tags extraídos a minúsculas y remueve duplicados ordenándolos alfabéticamente.

---

## 2. Capa de Infraestructura y Persistencia (EF Core & Supabase)

### 2.1 Migración SQL en Supabase
Archivo: `supabase/migrations/20260907000000_second_brain_notes.sql`

```sql
-- 1. Ampliar tabla notes con columnas slug, is_stub e is_archived
ALTER TABLE public.notes
    ADD COLUMN IF NOT EXISTS slug TEXT,
    ADD COLUMN IF NOT EXISTS is_stub BOOLEAN DEFAULT false NOT NULL,
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false NOT NULL;

-- 2. Poblar slug para notas preexistentes si existieran
UPDATE public.notes 
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(title, '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'))
WHERE slug IS NULL OR slug = '';

-- Asignar fallback para títulos vacíos si los hubiera
UPDATE public.notes SET slug = id::text WHERE slug IS NULL OR slug = '';

ALTER TABLE public.notes ALTER COLUMN slug SET NOT NULL;

-- 3. Restricción de unicidad de slug por usuario
CREATE UNIQUE INDEX IF NOT EXISTS idx_notes_user_slug 
    ON public.notes(user_id, slug);

-- 4. Columna generada para búsqueda Full-Text en español con índice GIN
ALTER TABLE public.notes
    ADD COLUMN IF NOT EXISTS search_vector tsvector 
    GENERATED ALWAYS AS (
        to_tsvector('spanish', coalesce(title, '') || ' ' || coalesce(content, ''))
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_notes_search_vector 
    ON public.notes USING GIN(search_vector);

-- 5. Índices de optimización para note_links (Backlinks y Grafo)
CREATE INDEX IF NOT EXISTS idx_note_links_target 
    ON public.note_links(target_note_id);

CREATE INDEX IF NOT EXISTS idx_note_links_source 
    ON public.note_links(source_note_id);

CREATE INDEX IF NOT EXISTS idx_note_links_user_target 
    ON public.note_links(user_id, target_note_id);
```

### 2.2 Mapeos EF Core (`LifeTracker.Infrastructure.Persistence.Configurations`)
Archivo: `NoteConfigurations.cs`

- `NoteConfiguration : IEntityTypeConfiguration<Note>`:
  - Tabla: `notes`.
  - Propiedad `Slug`: columna `slug`, requerida.
  - Propiedad `IsStub`: columna `is_stub`.
  - Propiedad `IsArchived`: columna `is_archived`.
  - Propiedad `Tags`: columna `tags`, tipo `TEXT[]` nativo de Npgsql / PostgreSQL.
  - Índice único: `HasIndex(n => new { n.UserId, n.Slug }).IsUnique()`.
- `NoteLinkConfiguration : IEntityTypeConfiguration<NoteLink>`:
  - Tabla: `note_links`.
  - Claves foráneas: `SourceNoteId` referenciando `Note.Id` (OnDelete: Cascade), `TargetNoteId` referenciando `Note.Id` (OnDelete: Cascade).
  - Restricción única: `HasIndex(nl => new { nl.SourceNoteId, nl.TargetNoteId }).IsUnique()`.

### 2.3 Actualización de Contexto e Interfaces
- Actualizar `ILifeTrackerDbContext`:
  - `DbSet<Note> Notes { get; }`
  - `DbSet<NoteLink> NoteLinks { get; }`
- Actualizar `LifeTrackerDbContext`:
  - Implementar propiedades `Notes` y `NoteLinks`.
- `DependencyInjection.cs`:
  - `services.AddSingleton<IWikilinkParser, WikilinkParser>();`
  - `services.AddScoped<INoteTimelineProjector, NoteTimelineProjector>();`
  - `services.AddScoped<INoteService, NoteService>();`

---

## 3. Seam de Integración: `INoteTimelineProjector`

Ubicación: `LifeTracker.Application.Notes.Services`

```csharp
public interface INoteTimelineProjector
{
    Task ProjectNoteCreatedAsync(Guid userId, Note note, CancellationToken cancellationToken = default);
    Task RemoveNoteProjectionAsync(Guid userId, Guid noteId, CancellationToken cancellationToken = default);
}
```

### Reglas de Proyección
- **Notas Stub**: Nunca se proyectan al timeline mientras `IsStub == true`.
- **Notas Creadas**: Al crear una nota real, se inserta un registro en `timeline_items`:
  - `source_module`: `"notes"`
  - `source_id`: `note.Id`
  - `event_type`: `"note_created"`
  - `title`: `"Nota creada: {note.Title}"`
  - `summary`: Primeros 140 caracteres del contenido.
  - `metadata`: JSON con `{ "slug": note.Slug, "tags": note.Tags }`.
- **Idempotencia**: Si ya existe una proyección para el `source_id`, no se duplica.
- **Eliminación**: `RemoveNoteProjectionAsync` borra de forma limpia los registros del timeline cuando una nota es eliminada permanentemente.

---

## 4. Capa de Aplicación (`LifeTracker.Application.Notes`)

### 4.1 Data Transfer Objects (DTOs)
- `NoteListItemDto(Guid Id, string Slug, string Title, string Snippet, List<string> Tags, bool Pinned, bool IsStub, int OutgoingLinksCount, int BacklinksCount, DateTime UpdatedAt)`
- `OutgoingLinkDto(Guid TargetNoteId, string TargetSlug, string TargetTitle, string? Alias, bool IsStub)`
- `BacklinkDto(Guid SourceNoteId, string SourceSlug, string SourceTitle, string? LinkText, string ContextSnippet)`
- `NoteDetailDto(Guid Id, string Slug, string Title, string Content, List<string> Tags, bool Pinned, bool IsStub, DateTime CreatedAt, DateTime UpdatedAt, List<OutgoingLinkDto> OutgoingLinks, List<BacklinkDto> Backlinks)`
- `CreateNoteRequest(string Title, string Content, bool Pinned = false)`
- `UpdateNoteRequest(string Title, string Content, bool Pinned = false)`
- `GraphNodeDto(Guid Id, string Slug, string Title, bool IsStub, List<string> Tags, int ConnectionsCount)`
- `GraphEdgeDto(Guid Id, Guid Source, Guid Target, string? Label)`
- `GraphDataDto(List<GraphNodeDto> Nodes, List<GraphEdgeDto> Edges)`
- `NoteAutocompleteDto(Guid Id, string Slug, string Title, List<string> Tags)`

### 4.2 Servicio de Aplicación: `INoteService` y `NoteService`

```csharp
public interface INoteService
{
    Task<List<NoteListItemDto>> GetNotesAsync(Guid userId, string? search, string? tag, bool includeArchived, bool includeStubs, CancellationToken ct = default);
    Task<NoteDetailDto?> GetNoteByIdOrSlugAsync(Guid userId, string idOrSlug, CancellationToken ct = default);
    Task<NoteDetailDto> CreateNoteAsync(Guid userId, CreateNoteRequest request, CancellationToken ct = default);
    Task<NoteDetailDto?> UpdateNoteAsync(Guid userId, Guid noteId, UpdateNoteRequest request, CancellationToken ct = default);
    Task<bool> DeleteNoteAsync(Guid userId, Guid noteId, bool permanent = false, CancellationToken ct = default);
    Task<GraphDataDto> GetGraphDataAsync(Guid userId, CancellationToken ct = default);
    Task<List<NoteAutocompleteDto>> AutocompleteAsync(Guid userId, string query, CancellationToken ct = default);
}
```

#### Lógica de Negocio Crucial
1. **Sincronización Atómica de Enlaces (`SyncLinksAsync`)**:
   - Extrae links usando `_wikilinkParser.ExtractLinks(content)`.
   - Para cada link extraído, busca en `Notes` del usuario por título o slug (insensible a mayúsculas).
   - Si no existe: crea automáticamente un Stub con `Note.CreateStub(userId, targetTitle, slug)` y lo agrega al `DbContext`.
   - Consulta los `note_links` existentes para `SourceNoteId == note.Id`.
   - Remueve los enlaces existentes que ya no estén presentes en el nuevo contenido.
   - Inserta los nuevos enlaces hacia los IDs destino resueltos.
   - Todo se persiste en una sola transacción `SaveChangesAsync()`.
2. **Materialización de Stubs al Crear Notas**:
   - Si el usuario crea explícitamente una nota cuyo título o slug coincide con un stub preexistente (`IsStub == true`), el servicio recupera el stub y lo actualiza con `UpdateContent(...)` transformándolo en nota activa sin romper los enlaces entrantes preexistentes.
3. **Extracción de Snippets Contextuales para Backlinks**:
   - Para cada nota entrante `sourceNote`, busca la mención de `[[TargetTitle` o `[[CurrentNoteTitle` en el texto.
   - Extrae un rango de texto circundante de hasta 120 caracteres, recortando los extremos con puntos suspensivos (`...`).
4. **Topología para Graph View**:
   - Carga todas las notas y enlaces no archivados del usuario.
   - Calcula `ConnectionsCount = InDegree + OutDegree` para que el cliente dibuje los radios relativos de los nodos.

---

## 5. Endpoints RESTful .NET 10 (`LifeTracker.Api`)

Ruta base: `/api/notes` en `LifeTracker.Api/Endpoints/NoteEndpoints.cs`

| Método | Ruta | Descripción | Parámetros | Códigos de Estado |
|---|---|---|---|---|
| `GET` | `/api/notes` | Listado con filtros | `search`, `tag`, `includeArchived`, `includeStubs` | `200 OK` |
| `POST` | `/api/notes` | Crear nota y sincronizar enlaces | Body: `CreateNoteRequest` | `201 Created`, `400 Bad Request` |
| `GET` | `/api/notes/{idOrSlug}` | Detalle con backlinks y outgoing | Path: `idOrSlug` | `200 OK`, `404 Not Found` |
| `PUT` | `/api/notes/{id:guid}` | Actualizar nota y resincronizar | Path: `id`, Body: `UpdateNoteRequest` | `200 OK`, `404 Not Found` |
| `DELETE` | `/api/notes/{id:guid}` | Archivar o eliminar | Path: `id`, Query: `permanent` | `204 No Content`, `404 Not Found` |
| `GET` | `/api/notes/graph` | Topología de nodos y aristas | Ninguno | `200 OK` |
| `GET` | `/api/notes/autocomplete` | Sugerencias rápidas para `[[` | Query: `query` | `200 OK` |

Registro en `Program.cs`: `app.MapNoteEndpoints();`

---

## 6. Arquitectura Frontend Next.js 16 (`web/`)

### 6.1 Extensión de `api-client.ts`
Implementar métodos tipados:
- `getNotes(search?, tag?, includeArchived?, includeStubs?, token?)`
- `getNote(idOrSlug, token?)`
- `createNote(payload, token?)`
- `updateNote(id, payload, token?)`
- `deleteNote(id, permanent?, token?)`
- `getNoteGraph(token?)`
- `autocompleteNotes(query, token?)`

### 6.2 Componente `MarkdownEditor` (`web/src/components/notes/MarkdownEditor.tsx`)
- Modos: Pestañas de "Editar", "Vista Previa" y "Doble Columna (Split)".
- Listener en `textarea`:
  - Detecta la secuencia de activación `[[`.
  - Muestra un popover flotante anclado a la posición del cursor de texto con resultados de `autocompleteNotes`.
  - Navegación por teclado: Flecha Arriba / Flecha Abajo para seleccionar, `Enter` o `Tab` para insertar, `Escape` para cancelar.
  - Al seleccionar una nota, reemplaza la cadena parcial con `[[Título Seleccionado]]`.
- Motor de renderizado Markdown:
  - Renderiza encabezados, listas con checkboxes, bloques de código estilizados.
  - Resuelve `[[Título|Alias]]` y `[[Título]]` renderizándolos como hipervínculos internos clicables que conducen a `/notas/[slug]`.

### 6.3 Componente `BacklinksPanel` (`web/src/components/notes/BacklinksPanel.tsx`)
- Muestra el listado de notas que apuntan a la nota activa.
- Para cada backlink, expone:
  - Título y enlace directo a la nota origen.
  - Badge indicativo si la nota origen es un stub.
  - Snippet contextual resaltando el wikilink dentro del texto.

### 6.4 Componente `GraphView` (`web/src/components/notes/GraphView.tsx`)
- Motor de renderizado en **HTML5 Canvas 2D nativo**:
  - Simulación de fuerzas force-directed ligera:
    - Repulsión de nodos mediante fuerza de Coulomb cuadrática inversa.
    - Atracción de aristas basada en resortes (ley de Hooke).
    - Fuerza de gravedad suave hacia el centro del canvas.
    - Amortiguación de velocidad (damping factor 0.85) para alcanzar estado estable sin oscilación infinita.
  - Estilos visuales:
    - Nodos activos: Círculos sólidos rellenos con color temático violeta/indigo (`#6366f1`), radio proporcional a `connectionsCount` (min: 5px, max: 20px).
    - Nodos stubs: Círculos translúcidos con trazo punteado (`ctx.setLineDash([3, 3])`) y color atenuado zinc (`#71717a`).
    - Aristas: Líneas semitransparentes (`#3f3f46`).
  - Interacción táctil y ratón:
    - Arrastre individual de nodos (*drag*).
    - Paneo global del lienzo (*pan*).
    - Zoom suave con rueda del mouse o gestos de pellizco (*pinch-to-zoom*).
    - Tooltip al posar el cursor sobre un nodo mostrando título y conexiones.
    - Click sobre nodo para navegar directamente a `/notas/[slug]`.

### 6.5 Vista Principal `/notas` (`web/src/app/(dashboard)/notas/page.tsx`)
- Diseño adaptable Obsidian-style:
  - Panel Izquierdo: Buscador en tiempo real, filtro de tags en formato chips, lista de notas ordenadas por última actualización (con pin arriba) y botón "Nueva Nota".
  - Área Central: Editor Markdown y barra de título con selector de fijado (pin), indicador de guardado y botón para abrir el Grafo.
  - Panel Derecho / Desplegable: Panel de Backlinks contextuales.
  - Modal de Grafo completo para inmersión visual.

---

## 7. Estrategia de Pruebas (TDD ROJO -> VERDE)

### Pruebas Unitarias de Dominio (`LifeTracker.Domain.Tests/WikilinkParserTests.cs`)
1. `ExtractLinks_SimpleWikilink_ShouldReturnTargetWithNullAlias`: Valida `[[Clean Architecture]]`.
2. `ExtractLinks_WithAlias_ShouldReturnTargetAndAlias`: Valida `[[Clean Architecture|CA]]`.
3. `ExtractLinks_WithSpacesInsideBrackets_ShouldTrimCorrectly`: Valida `[[   Clean Architecture   |   CA   ]]`.
4. `ExtractLinks_InsideFencedCodeBlock_ShouldBeIgnored`: Valida que ```` ```\n[[Target]]\n``` ```` no retorne links.
5. `ExtractLinks_InsideInlineCode_ShouldBeIgnored`: Valida que `` `[[Target]]` `` no retorne links.
6. `ExtractLinks_EscapedBrackets_ShouldBeIgnored`: Valida que `\[\[Target\]\]` sea ignorado.
7. `ExtractLinks_EmptyTarget_ShouldBeIgnored`: Valida `[[]]` y `[[   ]]`.
8. `ExtractTags_ValidTags_ShouldExtractAndDeduplicateInLowercase`: Valida `#csharp #dotnet #csharp`.
9. `ExtractTags_MarkdownHeaders_ShouldBeIgnored`: Valida que `# Encabezado 1` y `## Encabezado 2` no sean interpretados como tags.
10. `ExtractTags_InsideCodeBlock_ShouldBeIgnored`: Valida que `#tag` en bloques de código no se extraiga.
11. `SlugGenerator_AccentedTitle_ShouldProduceNormalizedSlug`: Valida "Programación Orientada a Objetos" -> "programacion-orientada-a-objetos".
12. `Note_CreateStub_ShouldInitializeAsStubWithEmptyContent`: Valida invariantes del stub.

---

## 8. Trade-offs Analizados (Design It Twice)

1. **Stubs como Filas en `notes` vs Referencias Desnormalizadas Nulas**:
   - *Elección*: Filas `Note` con flag `is_stub = true`.
   - *Razón*: Garantiza claves foráneas estrictas en PostgreSQL, simplifica enormemente las consultas de Backlinks y Grafo mediante `JOIN` directos, y asigna un slug y UUID inmediato para navegación sin casos especiales.
2. **Visualización de Grafo: Canvas 2D Nativo vs Librerías Externas**:
   - *Elección*: Canvas 2D nativo con simulación de fuerzas compacta.
   - *Razón*: Mantiene el bundle de Next.js liviano, garantiza 60 FPS en móviles, y ofrece control milimétrico sobre el diseño Obsidian (stubs punteados, colores oscuros, tooltips personalizados) sin depender de dependencias frágiles de terceros.
3. **Sincronización de Enlaces: Síncrona Atómica vs Cola Asíncrona**:
   - *Elección*: Síncrona dentro de la misma transacción de guardado de la nota.
   - *Razón*: Al editar una nota, el usuario espera ver inmediatamente los backlinks actualizados en el panel lateral. Al procesarse en milisegundos mediante el `WikilinkParser`, no hay justificación para introducir la complejidad de colas asíncronas.
