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

REGLAS CRÍTICAS DE EXCLUSIÓN (TAXATIVAS):
1. EXCLUYE taxativamente tablas de valores de referencia / intervalos normales (ej: 'Hasta 30 ug/mg', '70 a 110 mg/dL').
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
                            text = "Extrae los datos de este estudio médico a partir del documento adjunto."
                        }
                    }
                }
            },
            generationConfig = new
            {
                response_mime_type = "application/json",
                response_schema = new
                {
                    type = "OBJECT",
                    properties = new
                    {
                        study_type = new { type = "STRING", description = "Tipo de estudio" },
                        study_date = new { type = "STRING", description = "Fecha en formato YYYY-MM-DD" },
                        institution = new { type = "STRING", description = "Institución o laboratorio" },
                        clinical_values = new
                        {
                            type = "ARRAY",
                            description = "Valores clínicos obtenidos",
                            items = new
                            {
                                type = "OBJECT",
                                properties = new
                                {
                                    metric_name = new { type = "STRING" },
                                    value = new { type = "STRING" },
                                    unit = new { type = "STRING" },
                                    category = new { type = "STRING" }
                                },
                                required = new[] { "metric_name", "value" }
                            }
                        }
                    },
                    required = new[] { "study_type", "study_date", "clinical_values" }
                }
            }
        };

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";

        var response = await _httpClient.PostAsJsonAsync(url, requestPayload, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Error de la API de Google Gemini: {StatusCode} - {Content}", response.StatusCode, errorContent);
            throw new InvalidOperationException($"Error al invocar Gemini 2.5 Flash: {response.StatusCode}. Detalle: {errorContent}");
        }

        var responseJson = await response.Content.ReadFromJsonAsync<GeminiApiResponse>(cancellationToken: cancellationToken);
        var rawText = responseJson?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;

        if (string.IsNullOrWhiteSpace(rawText))
        {
            throw new InvalidOperationException("La respuesta de Gemini 2.5 Flash estuvo vacía.");
        }

        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var extractedRaw = JsonSerializer.Deserialize<GeminiExtractedRaw>(rawText, options);

        if (extractedRaw is null)
        {
            throw new InvalidOperationException("No se pudo deserializar el JSON devuelto por Gemini.");
        }

        var values = (extractedRaw.ClinicalValues ?? [])
            .Select(v => new ExtractedClinicalValueDto(v.MetricName, v.Value, v.Unit, v.Category, false))
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
    }
}
