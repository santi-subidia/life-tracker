# Desglose de Tareas: Fase 3 - Notas y Segundo Cerebro (Estilo Obsidian)

## Tarea 1: Migración de Base de Datos Supabase
- [x] **[TSK-N01]**: Crear el archivo de migración SQL `supabase/migrations/20260907000000_second_brain_notes.sql` con las columnas `slug`, `is_stub`, `is_archived`, backfill de slugs existentes, índice único `(user_id, slug)`, vector de búsqueda `search_vector` en español con índice GIN, e índices en `note_links`.

## Tarea 2: Dominio (LifeTracker.Domain)
- [x] **[TSK-N02]**: Crear el helper / Value Object `SlugGenerator` en `LifeTracker.Domain/Notes/SlugGenerator.cs` con normalización de diacríticos y formato kebab-case URL-safe.
- [x] **[TSK-N03]**: Crear la entidad `Note` (Aggregate Root) en `LifeTracker.Domain/Notes/Note.cs` con soporte para stubs, actualización de contenido, archivado y fijado.
- [x] **[TSK-N04]**: Crear la entidad `NoteLink` en `LifeTracker.Domain/Notes/NoteLink.cs` con propiedades para nota origen, nota destino y alias.
- [x] **[TSK-N05]**: Crear la interfaz `IWikilinkParser` y el record `WikilinkMatch` en `LifeTracker.Domain/Notes/IWikilinkParser.cs`.
- [x] **[TSK-N06]**: Implementar el Deep Module `WikilinkParser` en `LifeTracker.Domain/Notes/WikilinkParser.cs` contemplando exclusión de bloques cercados (```` ``` ```` y `~~~`), código en línea (`` ` ``), escapes, extracción de aliases y tags normalizados.

## Tarea 3: Tests Unitarios del `WikilinkParser` (LifeTracker.Domain.Tests)
- [x] **[TSK-N07]**: Crear el archivo de pruebas `WikilinkParserTests.cs` en `api/tests/LifeTracker.Domain.Tests/WikilinkParserTests.cs`.
- [x] **[TSK-N08]**: Implementar tests para parseo de wikilinks simples `[[Target]]` y con alias `[[Target|Alias]]` con trimming de espacios.
- [x] **[TSK-N09]**: Implementar tests para verificar que se ignoren enlaces dentro de fenced code blocks (```` ``` ```` y `~~~`).
- [x] **[TSK-N10]**: Implementar tests para verificar que se ignoren enlaces en código inline (`` ` ``) y enlaces escapados (`\[\[`).
- [x] **[TSK-N11]**: Implementar tests para extracción de tags `#tag`, asegurando que se ignoren encabezados Markdown (`# Título`) y anchors en URLs.
- [x] **[TSK-N12]**: Implementar tests unitarios para `SlugGenerator` y validar invariantes de `Note.CreateStub` verificando que la suite completa pase al 100% en VERDE.

## Tarea 4: Capa Infrastructure (LifeTracker.Infrastructure)
- [x] **[TSK-N13]**: Crear las configuraciones de EF Core `NoteConfiguration` y `NoteLinkConfiguration` en `LifeTracker.Infrastructure/Persistence/Configurations/NoteConfigurations.cs`.
- [x] **[TSK-N14]**: Actualizar la interfaz `ILifeTrackerDbContext` en `LifeTracker.Application` agregando los `DbSet<Note>` y `DbSet<NoteLink>`.
- [x] **[TSK-N15]**: Actualizar `LifeTrackerDbContext` en `LifeTracker.Infrastructure` agregando los `DbSet<Note>` y `DbSet<NoteLink>` correspondientes.
- [x] **[TSK-N16]**: Registrar `IWikilinkParser`, `INoteTimelineProjector` e `INoteService` en `LifeTracker.Infrastructure/DependencyInjection.cs`.

## Tarea 5: Capa Application (LifeTracker.Application)
- [x] **[TSK-N17]**: Crear los DTOs de notas, grafos y autocompletado en `LifeTracker.Application/Notes/Dtos/NoteDtos.cs` (`NoteListItemDto`, `NoteDetailDto`, `CreateNoteRequest`, `UpdateNoteRequest`, etc.).
- [x] **[TSK-N18]**: Implementar el Seam `INoteTimelineProjector` y `NoteTimelineProjector` en `LifeTracker.Application/Notes/Services/NoteTimelineProjector.cs` para sincronización selectiva con `timeline_items`.
- [x] **[TSK-N19]**: Definir el contrato `INoteService` en `LifeTracker.Application/Notes/Services/INoteService.cs`.
- [x] **[TSK-N20]**: Implementar `NoteService` en `LifeTracker.Application/Notes/Services/NoteService.cs` con sincronización atómica de enlaces salientes, creación/resolución transparente de stubs, materialización de stubs en notas reales, extracción de snippets contextuales para backlinks y topología de red.

## Tarea 6: Endpoints de API .NET (LifeTracker.Api)
- [x] **[TSK-N21]**: Crear `NoteEndpoints.cs` en `api/src/LifeTracker.Api/Endpoints/NoteEndpoints.cs` implementando los endpoints para listado, creación, detalle, actualización, borrado/archivado, grafo y autocompletado.
- [x] **[TSK-N22]**: Registrar `app.MapNoteEndpoints()` en `LifeTracker.Api/Program.cs` y verificar compilación limpia de la solución en .NET 10.

## Tarea 7: Frontend Next.js PWA (web/)
- [x] **[TSK-N23]**: Extender `web/src/lib/api-client.ts` con las interfaces TypeScript de notas, grafos y autocompletado, e implementar los métodos de API correspondientes.
- [x] **[TSK-N24]**: Implementar el componente `MarkdownEditor.tsx` en `web/src/components/notes/MarkdownEditor.tsx` con popover reactivo al tipear `[[`, navegación por teclado y renderizado interactivo de wikilinks.
- [x] **[TSK-N25]**: Implementar el componente `BacklinksPanel.tsx` en `web/src/components/notes/BacklinksPanel.tsx` mostrando lista de menciones entrantes con snippets destacados.
- [x] **[TSK-N26]**: Implementar el componente `GraphView.tsx` en `web/src/components/notes/GraphView.tsx` utilizando Canvas 2D nativo con física de fuerzas (drag, pan, zoom, radios proporcionales y estilo visual diferenciado para stubs).
- [x] **[TSK-N27]**: Implementar la página principal `/notas` (`web/src/app/(dashboard)/notas/page.tsx`) con diseño split de panel lateral de notas, editor central, panel de backlinks y modal de grafo.
- [x] **[TSK-N28]**: Actualizar la navegación en `web/src/app/page.tsx` para enlazar directamente al módulo de Segundo Cerebro.

## Tarea 8: Verificación Automatizada & Cierre
- [x] **[TSK-N29]**: Ejecutar `dotnet test api/LifeTracker.slnx` confirmando que todas las pruebas unitarias y de dominio pasen en VERDE.
- [x] **[TSK-N30]**: Ejecutar `npm run build` en el frontend (`web/`) asegurando compilación estricta sin errores de TypeScript ni de prerenderizado.
- [x] **[TSK-N31]**: Confeccionar el documento de verificación final en `.specs/03-second-brain-notes/verify.md`.
