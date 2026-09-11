using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using LifeTracker.Application.Ai.Dtos;
using LifeTracker.Application.Ai.Services;

namespace LifeTracker.Api.Endpoints;

public static class AiEndpoints
{
    public static RouteGroupBuilder MapAiEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/ai")
            .WithTags("Asistente IA");

        // 1. Listar conversaciones del usuario
        group.MapGet("/conversations", async (
            [FromServices] IAiAssistantService aiService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var conversations = await aiService.GetConversationsAsync(userId, ct);
            return Results.Ok(conversations);
        });

        // 2. Crear nueva conversación
        group.MapPost("/conversations", async (
            [FromBody] CreateAiConversationRequest request,
            [FromServices] IAiAssistantService aiService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var conv = await aiService.CreateConversationAsync(userId, request, ct);
            return Results.Created($"/api/ai/conversations/{conv.Id}", conv);
        });

        // 3. Detalle de conversación con mensajes
        group.MapGet("/conversations/{id:guid}", async (
            Guid id,
            [FromServices] IAiAssistantService aiService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var detail = await aiService.GetConversationByIdAsync(id, userId, ct);
            return detail != null ? Results.Ok(detail) : Results.NotFound(new { error = "Conversación no encontrada." });
        });

        // 4. Enviar mensaje a una conversación (orquestación transaccional con Gemini y Tools)
        group.MapPost("/conversations/{id:guid}/messages", async (
            Guid id,
            [FromBody] SendAiMessageRequest request,
            [FromServices] IAiAssistantService aiService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var turnResult = await aiService.ProcessUserMessageAsync(id, userId, request, ct);
            return Results.Ok(turnResult);
        });

        // 5. Actualizar título de la conversación
        group.MapPatch("/conversations/{id:guid}/title", async (
            Guid id,
            [FromBody] UpdateAiConversationTitleRequest request,
            [FromServices] IAiAssistantService aiService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var updated = await aiService.UpdateConversationTitleAsync(id, userId, request, ct);
            return updated != null ? Results.Ok(updated) : Results.NotFound(new { error = "Conversación no encontrada." });
        });

        // 6. Eliminar conversación
        group.MapDelete("/conversations/{id:guid}", async (
            Guid id,
            [FromServices] IAiAssistantService aiService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var success = await aiService.DeleteConversationAsync(id, userId, ct);
            return success ? Results.NoContent() : Results.NotFound(new { error = "Conversación no encontrada." });
        });

        return group;
    }

    private static Guid GetUserId(HttpContext context) => EndpointAuthHelper.GetUserId(context);
}
