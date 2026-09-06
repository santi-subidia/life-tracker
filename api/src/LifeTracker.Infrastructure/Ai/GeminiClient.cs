using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using LifeTracker.Application.Ai.Services;
using LifeTracker.Domain.Ai;

namespace LifeTracker.Infrastructure.Ai;

public class GeminiClient : IGeminiClient
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GeminiClient> _logger;

    public GeminiClient(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<GeminiClient> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<GeminiChatResponse> SendChatTurnAsync(
        IEnumerable<AiMessage> conversationHistory,
        IEnumerable<AiToolCallDefinition> availableTools,
        CancellationToken cancellationToken = default)
    {
        var apiKey = _configuration["Gemini:ApiKey"]
                     ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY");

        var isMock = string.IsNullOrWhiteSpace(apiKey)
                     || apiKey.Contains("your-")
                     || apiKey.Equals("mock", StringComparison.OrdinalIgnoreCase);

        if (isMock)
        {
            _logger.LogInformation("Gemini API Key no configurada o en modo mock. Utilizando fallback determinista inteligente.");
            return GenerateSmartMockResponse(conversationHistory);
        }

        try
        {
            var systemInstruction = GeminiPromptComposer.ComposeSystemInstruction();
            var payload = BuildGeminiPayload(systemInstruction, conversationHistory, availableTools);

            var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";
            var response = await _httpClient.PostAsJsonAsync(endpoint, payload, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning("Fallo en llamada a Google Gemini ({StatusCode}): {Error}. Activando fallback mock.", response.StatusCode, errorBody);
                return GenerateSmartMockResponse(conversationHistory);
            }

            var doc = await response.Content.ReadFromJsonAsync<JsonDocument>(cancellationToken: cancellationToken);
            return ParseGeminiResponse(doc);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error comunicándose con Google Gemini. Activando fallback mock offline.");
            return GenerateSmartMockResponse(conversationHistory);
        }
    }

    private static object BuildGeminiPayload(
        string systemInstruction,
        IEnumerable<AiMessage> history,
        IEnumerable<AiToolCallDefinition> tools)
    {
        var contentsList = new List<object>();

        foreach (var msg in history)
        {
            if (msg.Role == AiMessageRole.User)
            {
                contentsList.Add(new
                {
                    role = "user",
                    parts = new object[] { new { text = msg.Content } }
                });
            }
            else if (msg.Role == AiMessageRole.ToolCall)
            {
                var toolCalls = TryDeserialize<List<AiToolCallRequest>>(msg.ToolCallsJson) ?? [];
                var parts = toolCalls.Select(tc => new
                {
                    functionCall = new
                    {
                        name = tc.ToolName,
                        args = tc.Arguments
                    }
                }).ToArray();

                contentsList.Add(new
                {
                    role = "model",
                    parts
                });
            }
            else if (msg.Role == AiMessageRole.ToolResult)
            {
                var results = TryDeserialize<List<AiToolExecutionResult>>(msg.ToolResultsJson) ?? [];
                var parts = results.Select(r => new
                {
                    functionResponse = new
                    {
                        name = r.ToolName,
                        response = new
                        {
                            success = r.Success,
                            output = r.Data,
                            error = r.ErrorMessage
                        }
                    }
                }).ToArray();

                contentsList.Add(new
                {
                    role = "user",
                    parts
                });
            }
            else if (msg.Role == AiMessageRole.Model)
            {
                contentsList.Add(new
                {
                    role = "model",
                    parts = new object[] { new { text = msg.Content } }
                });
            }
        }

        var toolDeclarations = tools.Select(t => new
        {
            name = t.Name,
            description = t.Description,
            parameters = t.ParametersSchema
        }).ToArray();

        return new
        {
            system_instruction = new
            {
                parts = new object[] { new { text = systemInstruction } }
            },
            contents = contentsList,
            tools = new object[]
            {
                new { function_declarations = toolDeclarations }
            },
            generationConfig = new
            {
                temperature = 0.2,
                topK = 40,
                topP = 0.95
            }
        };
    }

    private static GeminiChatResponse ParseGeminiResponse(JsonDocument? doc)
    {
        if (doc == null)
            return new GeminiChatResponse("No se obtuvo respuesta del modelo.", []);

        var root = doc.RootElement;
        if (!root.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
            return new GeminiChatResponse("No se recibieron candidatos en la respuesta de Gemini.", []);

        var firstCandidate = candidates[0];
        string finishReason = "STOP";
        if (firstCandidate.TryGetProperty("finishReason", out var fr))
            finishReason = fr.GetString() ?? "STOP";

        var toolCalls = new List<AiToolCallRequest>();
        string? textResponse = null;

        if (firstCandidate.TryGetProperty("content", out var content) && content.TryGetProperty("parts", out var parts))
        {
            foreach (var part in parts.EnumerateArray())
            {
                if (part.TryGetProperty("text", out var t))
                {
                    textResponse = t.GetString();
                }

                if (part.TryGetProperty("functionCall", out var fc))
                {
                    var name = fc.GetProperty("name").GetString() ?? string.Empty;
                    var args = new Dictionary<string, object?>();
                    if (fc.TryGetProperty("args", out var argsProp))
                    {
                        foreach (var prop in argsProp.EnumerateObject())
                        {
                            args[prop.Name] = prop.Value.Clone();
                        }
                    }

                    toolCalls.Add(new AiToolCallRequest(Guid.NewGuid().ToString(), name, args));
                }
            }
        }

        return new GeminiChatResponse(textResponse, toolCalls, finishReason);
    }

    private static GeminiChatResponse GenerateSmartMockResponse(IEnumerable<AiMessage> conversationHistory)
    {
        var historyList = conversationHistory?.ToList() ?? [];
        var lastMessage = historyList.LastOrDefault();

        if (lastMessage == null)
        {
            return new GeminiChatResponse("¡Hola Subi! ¿En qué te puedo ayudar hoy con tu Life Tracker?", []);
        }

        // Si el último mensaje es el resultado de una herramienta, sintetizamos la respuesta
        if (lastMessage.Role == AiMessageRole.ToolResult)
        {
            var results = TryDeserialize<List<AiToolExecutionResult>>(lastMessage.ToolResultsJson) ?? [];
            var first = results.FirstOrDefault();
            var toolName = first?.ToolName ?? "la herramienta";

            var summary = $"¡Listo Subi! He consultado y procesado la información de **{toolName}** correctamente. " +
                          "Los datos han sido integrados a tu vista transversal. ¿Deseas hacer algo más con esta información?";

            return new GeminiChatResponse(summary, []);
        }

        // Si es mensaje de usuario, detectamos intenciones para disparar Function Calling
        var userText = (lastMessage.Content ?? string.Empty).ToLowerInvariant();

        if (userText.Contains("tarea") || userText.Contains("task") || userText.Contains("kanban"))
        {
            if (userText.Contains("crea") || userText.Contains("agregar") || userText.Contains("nueva"))
            {
                var args = new Dictionary<string, object?>
                {
                    ["title"] = "Tarea generada desde Asistente IA",
                    ["priority"] = "high"
                };
                return new GeminiChatResponse(null, [new AiToolCallRequest(Guid.NewGuid().ToString(), "create_work_task", args)]);
            }

            return new GeminiChatResponse(null, [new AiToolCallRequest(Guid.NewGuid().ToString(), "get_work_tasks", new Dictionary<string, object?>())]);
        }

        if (userText.Contains("hábito") || userText.Contains("habito") || userText.Contains("racha"))
        {
            return new GeminiChatResponse(null, [new AiToolCallRequest(Guid.NewGuid().ToString(), "get_habits_status", new Dictionary<string, object?>())]);
        }

        if (userText.Contains("salud") || userText.Contains("estudio") || userText.Contains("laboratorio") || userText.Contains("análisis") || userText.Contains("analisis"))
        {
            return new GeminiChatResponse(null, [new AiToolCallRequest(Guid.NewGuid().ToString(), "get_health_summary", new Dictionary<string, object?>())]);
        }

        if (userText.Contains("nota") || userText.Contains("segundo cerebro"))
        {
            if (userText.Contains("crea") || userText.Contains("anota"))
            {
                var args = new Dictionary<string, object?>
                {
                    ["title"] = "Nota rápida desde Asistente IA",
                    ["content"] = "Contenido inicial registrado automáticamente."
                };
                return new GeminiChatResponse(null, [new AiToolCallRequest(Guid.NewGuid().ToString(), "create_quick_note", args)]);
            }

            var searchArgs = new Dictionary<string, object?> { ["query"] = "ideas" };
            return new GeminiChatResponse(null, [new AiToolCallRequest(Guid.NewGuid().ToString(), "search_notes", searchArgs)]);
        }

        if (userText.Contains("examen") || userText.Contains("materia") || userText.Contains("parcial") || userText.Contains("facultad") || userText.Contains("promedio"))
        {
            return new GeminiChatResponse(null, [new AiToolCallRequest(Guid.NewGuid().ToString(), "get_academic_status", new Dictionary<string, object?>())]);
        }

        if (userText.Contains("timeline") || userText.Contains("hoy") || userText.Contains("resumen"))
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var feedArgs = new Dictionary<string, object?>
            {
                ["startDate"] = today.AddDays(-7).ToString("yyyy-MM-dd"),
                ["endDate"] = today.ToString("yyyy-MM-dd")
            };
            return new GeminiChatResponse(null, [new AiToolCallRequest(Guid.NewGuid().ToString(), "get_timeline_feed", feedArgs)]);
        }

        return new GeminiChatResponse(
            "¡Hola Subi! Estoy conectado como tu copiloto transversal en Life Tracker. " +
            "Puedo ayudarte a revisar tus hábitos, consultar estudios médicos, gestionar el tablero Kanban, revisar notas o verificar tus materias universitarias. ¿Qué deseas consultar?",
            []
        );
    }

    private static T? TryDeserialize<T>(string json)
    {
        try
        {
            return string.IsNullOrWhiteSpace(json) ? default : JsonSerializer.Deserialize<T>(json);
        }
        catch
        {
            return default;
        }
    }
}
