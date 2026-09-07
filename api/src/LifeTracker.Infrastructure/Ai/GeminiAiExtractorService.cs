using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Application.Health.Dtos;

namespace LifeTracker.Infrastructure.Ai;

public class GeminiAiExtractorService : IAiExtractorService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GeminiAiExtractorService> _logger;

    private const string SystemPrompt = @"
Eres un asistente médico experto en interpretar resultados de laboratorios y estudios clínicos.
Tu tarea es analizar el documento PDF o imagen de un estudio médico, y estructurar la información extrayendo ÚNICAMENTE los valores y determinaciones obtenidos DIRECTAMENTE por el paciente en el estudio.

Debes extraer:
- Tipo de estudio (ej: Análisis de Sangre, Orina Completa, etc).
- Fecha de realización (formato YYYY-MM-DD).
- Institución médica o laboratorio emisor.
- Valores y parámetros clínicos medidos en el paciente:
  * Métrica o parámetro evaluado (ej: Glucosa, Colesterol, Hemoglobina, Leucocitos, etc).
  * Valor o resultado obtenido: DEBES incluir los resultados obtenidos por el paciente, tanto numéricos (ej: '1.025', '95.5') como cualitativos (ej: 'No contiene', 'Ambar', 'Positivo', 'Negativo').
  * Unidad de medida (si tiene, ej: 'mg/dL', 'g/L', o déjalo vacío si no aplica).
  * Categoría clínica o sección (ej: 'Química Clínica', 'Hematología', 'Sedimento').
  * is_abnormal: Booleano (true o false). EVALÚA el valor del paciente contra los valores o intervalos de referencia indicados en el propio documento para ese análisis (o si el laboratorio lo resalta con asterisco '*', 'Alto', 'Bajo', 'H', 'L', negrita o fuera de rango). Si el valor cae fuera del rango normal del laboratorio, pon true. Si está dentro del rango normal o no hay indicación de anomalía, pon false.

REGLAS CRÍTICAS DE EXCLUSIÓN (TAXATIVAS):
1. No extraigas las tablas de valores de referencia como métricas del paciente (ej: no crees una métrica llamada 'Hasta 30 ug/mg' o '70 a 110 mg/dL'). Úsalas únicamente para comparar y determinar si is_abnormal es true o false.
2. EXCLUYE criterios diagnósticos y clasificaciones de riesgo (ej: 'Criterios ADA', estadios KDIGO).
3. EXCLUYE recomendaciones médicas y notas metodológicas al pie del estudio.
4. ÚNICAMENTE extrae el resultado que corresponde a la muestra del paciente.";

    public GeminiAiExtractorService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<GeminiAiExtractorService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<ExtractedStudyDto> ExtractDataAsync(
        Stream documentStream,
        string mimeType,
        CancellationToken cancellationToken = default)
    {
        var apiKey = _configuration["Gemini:ApiKey"] 
                     ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY");

        if (string.IsNullOrWhiteSpace(apiKey) || apiKey == "your-google-gemini-api-key")
        {
            _logger.LogWarning("API Key de Gemini no configurada. Retornando estudio de demostración estructurado.");
            return GenerateMockExtractedData();
        }

        using var memoryStream = new MemoryStream();
        await documentStream.CopyToAsync(memoryStream, cancellationToken);
        var base64Data = Convert.ToBase64String(memoryStream.ToArray());

        var requestPayload = new
        {
            system_instruction = new
            {
                parts = new[] { new { text = SystemPrompt } }
            },
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new
                        {
                            inline_data = new
                            {
                                mime_type = mimeType,
                                data = base64Data
                            }
                        },
                        new
                        {
                            text = "Extrae los datos de este estudio médico a partir del documento adjunto. Responde estrictamente con formato JSON válido con la estructura: {\"study_type\": \"...\", \"study_date\": \"YYYY-MM-DD\", \"institution\": \"...\", \"clinical_values\": [{\"metric_name\": \"...\", \"value\": \"...\", \"unit\": \"...\", \"category\": \"...\", \"is_abnormal\": true|false}]}"
                        }
                    }
                }
            },
            generationConfig = new
            {
                response_mime_type = "application/json",
                temperature = 0.1
            }
        };

        var candidateModels = new[] { "gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-2.5-flash" };
        string? rawText = null;
        string lastError = string.Empty;

        foreach (var model in candidateModels)
        {
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
            
            for (int attempt = 1; attempt <= 2; attempt++)
            {
                try
                {
                    _logger.LogInformation("Llamando a Gemini con modelo {Model} (intento {Attempt})...", model, attempt);
                    var response = await _httpClient.PostAsJsonAsync(url, requestPayload, cancellationToken);

                    if (response.IsSuccessStatusCode)
                    {
                        var responseJson = await response.Content.ReadFromJsonAsync<GeminiApiResponse>(cancellationToken: cancellationToken);
                        rawText = responseJson?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;
                        if (!string.IsNullOrWhiteSpace(rawText))
                        {
                            break;
                        }
                    }
                    else
                    {
                        lastError = await response.Content.ReadAsStringAsync(cancellationToken);
                        _logger.LogWarning("Modelo {Model} respondió con {StatusCode}: {Content}. Reintentando...", model, response.StatusCode, lastError);
                        
                        // Si es 503 o 429, esperar un momento antes de reintentar
                        if ((int)response.StatusCode == 503 || (int)response.StatusCode == 429)
                        {
                            await Task.Delay(1500, cancellationToken);
                        }
                        else
                        {
                            break; // Pasar al siguiente modelo
                        }
                    }
                }
                catch (Exception ex) when (attempt < 2)
                {
                    _logger.LogWarning(ex, "Excepción de red llamando a {Model}. Reintentando...", model);
                    await Task.Delay(1000, cancellationToken);
                }
            }

            if (!string.IsNullOrWhiteSpace(rawText))
            {
                break;
            }
        }

        if (string.IsNullOrWhiteSpace(rawText))
        {
            throw new InvalidOperationException($"No se pudo obtener respuesta de Google Gemini. Último detalle: {lastError}");
        }

        // Limpiar bloques de código markdown si estuvieran presentes (```json ... ```)
        rawText = rawText.Trim();
        if (rawText.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
        {
            rawText = rawText[7..];
        }
        else if (rawText.StartsWith("```"))
        {
            rawText = rawText[3..];
        }

        if (rawText.EndsWith("```"))
        {
            rawText = rawText[..^3];
        }
        rawText = rawText.Trim();

        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        GeminiExtractedRaw? extractedRaw = null;

        try
        {
            if (rawText.StartsWith("["))
            {
                var list = JsonSerializer.Deserialize<List<GeminiExtractedRaw>>(rawText, options);
                extractedRaw = list?.FirstOrDefault();
            }
            else
            {
                extractedRaw = JsonSerializer.Deserialize<GeminiExtractedRaw>(rawText, options);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al deserializar respuesta de Gemini: {Raw}", rawText);
            throw new InvalidOperationException($"Error al interpretar JSON devuelto por Gemini: {ex.Message}. Respuesta: {rawText[..Math.Min(200, rawText.Length)]}");
        }

        if (extractedRaw is null)
        {
            throw new InvalidOperationException("No se pudo deserializar el JSON devuelto por Gemini.");
        }

        var values = (extractedRaw.ClinicalValues ?? [])
            .Select(v => new ExtractedClinicalValueDto(v.MetricName, v.Value, v.Unit, v.Category, v.IsAbnormal))
            .ToList();

        return new ExtractedStudyDto(
            extractedRaw.StudyType ?? "Estudio Clínico",
            extractedRaw.StudyDate ?? DateTime.UtcNow.ToString("yyyy-MM-dd"),
            extractedRaw.Institution,
            values
        );
    }

    private static ExtractedStudyDto GenerateMockExtractedData()
    {
        return new ExtractedStudyDto(
            "Análisis de Sangre Completo (Demo)",
            DateTime.UtcNow.ToString("yyyy-MM-dd"),
            "Laboratorio Central Demo",
            new List<ExtractedClinicalValueDto>
            {
                new("Glucemia", "92", "mg/dL", "Química Clínica", false),
                new("Colesterol Total", "185", "mg/dL", "Perfil Lipídico", false),
                new("HDL", "54", "mg/dL", "Perfil Lipídico", false),
                new("LDL", "110", "mg/dL", "Perfil Lipídico", false),
                new("Triglicéridos", "105", "mg/dL", "Perfil Lipídico", false),
                new("Hemoglobina", "14.8", "g/dL", "Hematología", false),
                new("Leucocitos", "6800", "/mm3", "Hematología", false),
                new("Plaquetas", "245000", "/mm3", "Hematología", false)
            }
        );
    }

    private class GeminiApiResponse
    {
        [JsonPropertyName("candidates")]
        public List<Candidate>? Candidates { get; set; }
    }

    private class Candidate
    {
        [JsonPropertyName("content")]
        public Content? Content { get; set; }
    }

    private class Content
    {
        [JsonPropertyName("parts")]
        public List<Part>? Parts { get; set; }
    }

    private class Part
    {
        [JsonPropertyName("text")]
        public string? Text { get; set; }
    }

    private class GeminiExtractedRaw
    {
        [JsonPropertyName("study_type")]
        public string? StudyType { get; set; }

        [JsonPropertyName("study_date")]
        public string? StudyDate { get; set; }

        [JsonPropertyName("institution")]
        public string? Institution { get; set; }

        [JsonPropertyName("clinical_values")]
        public List<ClinicalValueRaw>? ClinicalValues { get; set; }
    }

    private class ClinicalValueRaw
    {
        [JsonPropertyName("metric_name")]
        public string MetricName { get; set; } = string.Empty;

        [JsonPropertyName("value")]
        public string Value { get; set; } = string.Empty;

        [JsonPropertyName("unit")]
        public string? Unit { get; set; }

        [JsonPropertyName("category")]
        public string? Category { get; set; }

        [JsonPropertyName("is_abnormal")]
        public bool IsAbnormal { get; set; }
    }
}
