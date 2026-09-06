# Desglose de Tareas: Fase 5 - Inteligencia Holística (Asistente IA Transversal con Google Gemini 2.5 Flash)

## Tarea 1: Migración de Base de Datos Supabase
- [x] **[TSK-AI01]**: Crear el script de migración SQL `supabase/migrations/20260909000000_ai_assistant_refinements.sql` incorporando la columna `updated_at` en `ai_conversations`, índice `(user_id, updated_at DESC)`, ampliación de roles válidos en `ai_messages` (`user`, `model`, `tool_call`, `tool_result`, `system`), columnas JSONB `tool_calls` y `tool_results`, trigger `trg_update_ai_conversation_timestamp` y políticas RLS para multi-tenancy.

## Tarea 2: Dominio Ai (LifeTracker.Domain.Ai)
- [x] **[TSK-AI02]**: Crear el enum de roles `AiMessageRole` en `LifeTracker.Domain/Ai/AiEnums.cs`.
- [x] **[TSK-AI03]**: Crear los records de Function Calling `AiToolCallDefinition`, `AiToolCallRequest`, `AiToolExecutionResult` y `GeminiChatResponse` en `LifeTracker.Domain/Ai/AiToolModels.cs`.
- [x] **[TSK-AI04]**: Crear la entidad `AiMessage` en `LifeTracker.Domain/Ai/AiMessage.cs` con validación de invariantes no nulos y valores JSON por defecto (`"[]"`).
- [x] **[TSK-AI05]**: Crear la raíz de agregado `AiConversation` en `LifeTracker.Domain/Ai/AiConversation.cs` con métodos `UpdateTitle`, `Touch` y `AddMessage`.

## Tarea 3: Tests Unitarios de Dominio (LifeTracker.Domain.Tests)
- [x] **[TSK-AI06]**: Agregar referencia de proyecto a `LifeTracker.Application` en `api/tests/LifeTracker.Domain.Tests/LifeTracker.Domain.Tests.csproj` para habilitar pruebas unitarias de agregados y dispatcher con dependencias mockeadas.
- [x] **[TSK-AI07]**: Crear la suite de pruebas `AiConversationTests.cs` en `api/tests/LifeTracker.Domain.Tests/AiConversationTests.cs` evaluando invariantes de agregación, adición de mensajes, actualización de marcas temporales y títulos por defecto.
- [x] **[TSK-AI08]**: Crear la suite de pruebas `AiToolDispatcherTests.cs` en `api/tests/LifeTracker.Domain.Tests/AiToolDispatcherTests.cs` validando el despacho correcto de herramientas (`create_work_task`, `get_health_summary`, `toggle_habit`, `search_notes`), manejo controlado de argumentos inválidos y aislamiento por `userId`.

## Tarea 4: Capa Infrastructure (LifeTracker.Infrastructure)
- [x] **[TSK-AI09]**: Crear el archivo de configuraciones de EF Core `AiConfigurations.cs` en `LifeTracker.Infrastructure/Persistence/Configurations/AiConfigurations.cs` mapeando `AiConversation` y `AiMessage` con conversión de roles y tipos `jsonb`.
- [x] **[TSK-AI10]**: Actualizar la interfaz `ILifeTrackerDbContext` en `LifeTracker.Application/Common/Interfaces/ILifeTrackerDbContext.cs` agregando `DbSet<AiConversation> AiConversations` y `DbSet<AiMessage> AiMessages`.
- [x] **[TSK-AI11]**: Actualizar `LifeTrackerDbContext` en `LifeTracker.Infrastructure/Persistence/LifeTrackerDbContext.cs` implementando los nuevos `DbSet`.
- [x] **[TSK-AI12]**: Implementar el Seam `IGeminiClient` y la clase `GeminiClient` en `LifeTracker.Infrastructure/Ai/GeminiClient.cs` con llamada HTTPS REST a `models/gemini-2.5-flash:generateContent`, fallback inteligente mock para desarrollo offline y parseo de `functionCall`.
- [x] **[TSK-AI13]**: Registrar `IGeminiClient`, `IAiToolDispatcher` y `IAiAssistantService` en `LifeTracker.Infrastructure/DependencyInjection.cs`.

## Tarea 5: Capa Application (LifeTracker.Application.Ai)
- [x] **[TSK-AI14]**: Crear los DTOs de conversación y mensajes en `LifeTracker.Application/Ai/Dtos/AiDtos.cs` (`AiConversationDto`, `AiConversationDetailDto`, `AiMessageDto`, `SendAiMessageRequest`, `CreateAiConversationRequest`, `UpdateAiConversationTitleRequest`, `AiChatTurnResultDto`, `AiToolCallDetailDto`).
- [x] **[TSK-AI15]**: Implementar la interfaz y deep module `IAiToolDispatcher` y `AiToolDispatcher` en `LifeTracker.Application/Ai/Services/AiToolDispatcher.cs` compilando los esquemas OpenAPI de las 10 herramientas y delegando a `IHealthService`, `IHabitService`, `INoteService`, `IWorkService`, `IAcademicService` y `IDailyHubService`.
- [x] **[TSK-AI16]**: Implementar el deep module `GeminiPromptComposer` en `LifeTracker.Application/Ai/Services/GeminiPromptComposer.cs` con el system prompt holístico de Subi y serialización multipart.
- [x] **[TSK-AI17]**: Implementar el deep module `AiContextCompressor` en `LifeTracker.Application/Ai/Services/AiContextCompressor.cs` aplicando compresión en ventana deslizante de 20 turnos.
- [x] **[TSK-AI18]**: Implementar el servicio `IAiAssistantService` y `AiAssistantService` en `LifeTracker.Application/Ai/Services/AiAssistantService.cs` con el bucle cerrado transaccional de dos turnos, auto-titulación y persistencia.

## Tarea 6: Endpoints de API .NET (LifeTracker.Api)
- [x] **[TSK-AI19]**: Crear `AiEndpoints.cs` en `api/src/LifeTracker.Api/Endpoints/AiEndpoints.cs` con endpoints para listar conversaciones (`GET /api/ai/conversations`), crear conversación (`POST /api/ai/conversations`), obtener detalle (`GET /api/ai/conversations/{id}`), enviar mensaje (`POST /api/ai/conversations/{id}/messages`), actualizar título (`PATCH /api/ai/conversations/{id}/title`) y eliminar (`DELETE /api/ai/conversations/{id}`).
- [x] **[TSK-AI20]**: Registrar `app.MapAiEndpoints()` en `LifeTracker.Api/Program.cs`.
- [x] **[TSK-AI21]**: Verificar compilación limpia de la solución backend completa con .NET 10.

## Tarea 7: Frontend Next.js PWA (web/)
- [x] **[TSK-AI22]**: Extender `web/src/lib/api-client.ts` con interfaces TypeScript para IA (`AiConversation`, `AiMessage`, `AiToolCall`, `AiChatTurnResult`) y métodos de cliente (`getAiConversations`, `getAiConversation`, `createAiConversation`, `sendAiMessage`, `updateAiConversationTitle`, `deleteAiConversation`).
- [x] **[TSK-AI23]**: Implementar los componentes `RichToolCards` en `web/src/components/ai/` (`RichToolCards.tsx`, `HealthToolCard.tsx`, `HabitsToolCard.tsx`, `WorkTaskToolCard.tsx`, `AcademicMilestoneToolCard.tsx`, `NoteToolCard.tsx`, `TimelineFeedToolCard.tsx`).
- [x] **[TSK-AI24]**: Implementar `ChatMessage.tsx` en `web/src/components/ai/ChatMessage.tsx` con renderizado fluido de Markdown, bloques de código cercados con botón de copiado y contenedor para Rich Tool Cards.
- [x] **[TSK-AI25]**: Implementar `EmptyStatePrompts.tsx` en `web/src/components/ai/EmptyStatePrompts.tsx` con las 4 tarjetas de consultas holísticas sugeridas de 1-click.
- [x] **[TSK-AI26]**: Implementar `AiSidebar.tsx` en `web/src/components/ai/AiSidebar.tsx` con historial agrupado ("Hoy", "Ayer", etc.), botón "+ Nueva Conversación", eliminación y drawer responsivo para mobile.
- [x] **[TSK-AI27]**: Implementar `ChatInput.tsx` en `web/src/components/ai/ChatInput.tsx` con textarea auto-expandible, envío con Enter y bloqueo reactivo durante procesamiento.
- [x] **[TSK-AI28]**: Implementar la vista principal `/asistente` en `web/src/app/(dashboard)/asistente/page.tsx` conectando sidebar, historial, chat reactivo, scroll automático y fallback offline si la API no responde.

## Tarea 8: Verificación Automatizada & Cierre
- [x] **[TSK-AI29]**: Ejecutar `dotnet test` asegurando que todos los tests unitarios pasen en VERDE al 100% sin advertencias.
- [x] **[TSK-AI30]**: Ejecutar `npm run build` en `web/` asegurando compilación estricta de TypeScript y prerenderizado estático sin fallos.
- [x] **[TSK-AI31]**: Confeccionar el documento de verificación final en `.specs/05-ai-assistant/verify.md`.