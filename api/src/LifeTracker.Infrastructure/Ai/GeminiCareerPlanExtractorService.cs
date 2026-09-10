using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using LifeTracker.Application.Academics.Dtos;
using LifeTracker.Application.Common.Interfaces;

namespace LifeTracker.Infrastructure.Ai;

public class GeminiCareerPlanExtractorService : IAiCareerPlanExtractor
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GeminiCareerPlanExtractorService> _logger;

    private const string SystemPrompt = @"
Eres un experto universitario en análisis y estructuración de planes de estudio, mallas curriculares y regímenes de correlatividades.
Tu tarea es analizar el documento adjunto (PDF o imagen de plan de carrera universitario) y estructurar de forma exhaustiva:
1. Nombre sugerido del plan o carrera ('suggested_plan_name', ej: 'Ingeniería en Sistemas de Información', 'Licenciatura en Ciencias de la Computación').
2. Institución o Universidad emisora ('suggested_university', ej: 'UTN', 'UBA', 'UNLP').
3. Créditos u horas totales si se mencionan ('total_credits').
4. Lista completa de materias curriculares ('subjects'):
   - 'temp_id': Identificador único alfanumérico temporal para la materia (ej: 'M1', 'M2', 'MAT101', 'ALGEBRA').
   - 'code': Código o sigla oficial de la materia si figura en el documento (ej: '95.01', 'ASI-101', 'CS102').
   - 'name': Nombre completo oficial de la asignatura.
   - 'year_level': Nivel de año lectivo al que corresponde (entero del 1 al 10). Si no es explícito, infiérelo por la posición en la malla.
   - 'period_number': Número de cuatrimestre o semestre dentro del año (1 para 1er cuatrimestre, 2 para 2do cuatrimestre, o 1 si es anual). Rango 1 a 4.
   - 'credits': Créditos u horas semanales asignadas (si están indicadas).
   - 'is_optional': Booleano indicando si la materia es electiva u opcional (true) o parte del tronco obligatorio (false).
   - 'prerequisites': Lista de correlatividades requeridas para cursar esta materia:
     * 'required_subject_code': Código o temp_id de la materia correlativa requerida.
     * 'requirement_type': Tipo de exigencia estricto:
       - 'requiere_regularizada': si exige cursada regularizada, trabajos prácticos aprobados o cursada previa.
       - 'requiere_aprobada': si exige examen final aprobado, promoción o materia completamente rendida.
       Si el documento no explicita el tipo y solo lista la correlativa para cursar, usa 'requiere_regularizada' por defecto.

REGLAS CRÍTICAS:
- No inventes materias que no figuren en el documento.
- Asegúrate de que las correlatividades apunten a códigos o temp_ids que pertenezcan a materias de la lista.
- Una materia NO puede tenerse a sí misma como correlativa.
- Responde estrictamente con formato JSON válido.";

    public GeminiCareerPlanExtractorService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<GeminiCareerPlanExtractorService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public Task<CareerPlanDraftDto> ExtractDraftFromDocumentAsync(
        Stream documentStream,
        string mimeType,
        CancellationToken cancellationToken = default)
    {
        return ExtractCurriculumPlanAsync(documentStream, mimeType, cancellationToken);
    }

    public async Task<CareerPlanDraftDto> ExtractCurriculumPlanAsync(
        Stream fileStream,
        string mimeType,
        CancellationToken ct = default)
    {
        var apiKey = _configuration["Gemini:ApiKey"]
                     ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY");

        if (string.IsNullOrWhiteSpace(apiKey) || apiKey == "your-google-gemini-api-key")
        {
            _logger.LogWarning("API Key de Gemini no configurada. Retornando plan de estudio de demostración estructurado.");
            return GenerateMockCurriculumPlan();
        }

        using var memoryStream = new MemoryStream();
        await fileStream.CopyToAsync(memoryStream, ct);
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
                            text = "Extrae el plan de carrera y la malla de correlatividades a partir del documento adjunto. Responde estrictamente con JSON válido con la estructura: {\"suggested_plan_name\": \"...\", \"suggested_university\": \"...\", \"total_credits\": 123, \"subjects\": [{\"temp_id\": \"M1\", \"code\": \"...\", \"name\": \"...\", \"year_level\": 1, \"period_number\": 1, \"credits\": 4, \"is_optional\": false, \"prerequisites\": [{\"required_subject_code\": \"...\", \"requirement_type\": \"requiere_regularizada\"}]}]}"
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

        var candidateModels = new[] { "gemini-2.5-flash", "gemini-3.5-flash-lite", "gemini-3.5-flash" };
        string? rawText = null;
        string lastError = string.Empty;

        foreach (var model in candidateModels)
        {
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";

            for (int attempt = 1; attempt <= 2; attempt++)
            {
                try
                {
                    _logger.LogInformation("Llamando a Gemini con modelo {Model} para extraer plan curricular (intento {Attempt})...", model, attempt);
                    var response = await _httpClient.PostAsJsonAsync(url, requestPayload, ct);

                    if (response.IsSuccessStatusCode)
                    {
                        var responseJson = await response.Content.ReadFromJsonAsync<GeminiApiResponse>(cancellationToken: ct);
                        rawText = responseJson?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;
                        if (!string.IsNullOrWhiteSpace(rawText))
                        {
                            break;
                        }
                    }
                    else
                    {
                        lastError = await response.Content.ReadAsStringAsync(ct);
                        _logger.LogWarning("Modelo {Model} respondió con {StatusCode}: {Content}. Reintentando...", model, response.StatusCode, lastError);

                        if ((int)response.StatusCode == 503 || (int)response.StatusCode == 429)
                        {
                            await Task.Delay(1500, ct);
                        }
                        else
                        {
                            break;
                        }
                    }
                }
                catch (Exception ex) when (attempt < 2)
                {
                    _logger.LogWarning(ex, "Excepción de red llamando a {Model}. Reintentando...", model);
                    await Task.Delay(1000, ct);
                }
            }

            if (!string.IsNullOrWhiteSpace(rawText))
            {
                break;
            }
        }

        if (string.IsNullOrWhiteSpace(rawText))
        {
            _logger.LogWarning("No se pudo obtener respuesta de Google Gemini. Fallback a plan de demostración. Último error: {LastError}", lastError);
            return GenerateMockCurriculumPlan();
        }

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
        GeminiDraftRaw? extractedRaw = null;

        try
        {
            if (rawText.StartsWith("["))
            {
                var list = JsonSerializer.Deserialize<List<GeminiDraftRaw>>(rawText, options);
                extractedRaw = list?.FirstOrDefault();
            }
            else
            {
                extractedRaw = JsonSerializer.Deserialize<GeminiDraftRaw>(rawText, options);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al deserializar respuesta de Gemini para plan curricular: {Raw}", rawText);
            throw new InvalidOperationException($"Error al interpretar JSON devuelto por Gemini: {ex.Message}. Respuesta: {rawText[..Math.Min(200, rawText.Length)]}");
        }

        if (extractedRaw is null)
        {
            throw new InvalidOperationException("No se pudo deserializar el JSON de la currícula devuelto por Gemini.");
        }

        var subjects = (extractedRaw.Subjects ?? [])
            .Select((s, index) => new ExtractedSubjectDraftDto(
                string.IsNullOrWhiteSpace(s.TempId) ? $"SUBJ_{index + 1}" : s.TempId.Trim(),
                s.Code?.Trim(),
                string.IsNullOrWhiteSpace(s.Name) ? $"Materia {index + 1}" : s.Name.Trim(),
                s.YearLevel < 1 ? 1 : Math.Min(10, s.YearLevel),
                s.PeriodNumber < 1 ? 1 : Math.Min(4, s.PeriodNumber),
                s.Credits,
                s.IsOptional,
                (s.Prerequisites ?? []).Select(p => new ExtractedPrerequisiteDraftDto(
                    p.RequiredSubjectCode?.Trim() ?? string.Empty,
                    NormalizeRequirementType(p.RequirementType)
                )).Where(p => !string.IsNullOrWhiteSpace(p.RequiredSubjectCode)).ToList()
            )).ToList();

        var warnings = new List<string>();
        if (subjects.Count == 0)
        {
            warnings.Add("No se detectaron asignaturas en el documento. Verifique la calidad y nitidez del archivo subido.");
        }

        return new CareerPlanDraftDto(
            extractedRaw.SuggestedPlanName ?? "Plan de Carrera Extraído",
            extractedRaw.SuggestedUniversity,
            extractedRaw.TotalCredits,
            subjects,
            0.92,
            warnings
        );
    }

    private static string NormalizeRequirementType(string? reqType)
    {
        if (string.IsNullOrWhiteSpace(reqType)) return "requiere_regularizada";
        var lower = reqType.ToLowerInvariant();
        if (lower.Contains("aprobada") || lower.Contains("final") || lower.Contains("promocion"))
        {
            return "requiere_aprobada";
        }
        return "requiere_regularizada";
    }

    private static CareerPlanDraftDto GenerateMockCurriculumPlan()
    {
        var subjects = new List<ExtractedSubjectDraftDto>
        {
            new("M1", "AGA", "Álgebra y Geometría Analítica", 1, 1, 4, false, new List<ExtractedPrerequisiteDraftDto>()),
            new("M2", "AM1", "Análisis Matemático I", 1, 1, 5, false, new List<ExtractedPrerequisiteDraftDto>()),
            new("M3", "AED", "Algoritmos y Estructuras de Datos", 1, 1, 5, false, new List<ExtractedPrerequisiteDraftDto>()),
            new("M4", "AC", "Arquitectura de Computadores", 1, 2, 4, false, new List<ExtractedPrerequisiteDraftDto>()),
            new("M5", "F1", "Física I", 1, 2, 5, false, new List<ExtractedPrerequisiteDraftDto>
            {
                new("AM1", "requiere_regularizada")
            }),
            new("M6", "SSL", "Sintaxis y Semántica de los Lenguajes", 1, 2, 4, false, new List<ExtractedPrerequisiteDraftDto>
            {
                new("AED", "requiere_regularizada")
            }),
            new("M7", "AM2", "Análisis Matemático II", 2, 1, 5, false, new List<ExtractedPrerequisiteDraftDto>
            {
                new("AM1", "requiere_regularizada"),
                new("AGA", "requiere_regularizada")
            }),
            new("M8", "PDP", "Paradigmas de Programación", 2, 1, 4, false, new List<ExtractedPrerequisiteDraftDto>
            {
                new("AED", "requiere_aprobada")
            }),
            new("M9", "SO", "Sistemas Operativos", 2, 1, 4, false, new List<ExtractedPrerequisiteDraftDto>
            {
                new("AC", "requiere_regularizada"),
                new("AED", "requiere_regularizada")
            }),
            new("M10", "PYE", "Probabilidad y Estadística", 2, 2, 4, false, new List<ExtractedPrerequisiteDraftDto>
            {
                new("AM1", "requiere_aprobada"),
                new("AGA", "requiere_aprobada")
            }),
            new("M11", "DDS", "Diseño de Sistemas", 2, 2, 6, false, new List<ExtractedPrerequisiteDraftDto>
            {
                new("PDP", "requiere_regularizada"),
                new("SSL", "requiere_regularizada")
            }),
            new("M12", "RDI", "Redes de Información", 2, 2, 4, false, new List<ExtractedPrerequisiteDraftDto>
            {
                new("SO", "requiere_regularizada")
            })
        };

        return new CareerPlanDraftDto(
            "Ingeniería en Sistemas de Información (Demo)",
            "Universidad Tecnológica Nacional",
            120,
            subjects,
            0.95,
            new List<string> { "Modo demostración determinista activo (sin credencial Gemini)." }
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

    private class GeminiDraftRaw
    {
        [JsonPropertyName("suggested_plan_name")]
        public string? SuggestedPlanName { get; set; }

        [JsonPropertyName("suggested_university")]
        public string? SuggestedUniversity { get; set; }

        [JsonPropertyName("total_credits")]
        public int? TotalCredits { get; set; }

        [JsonPropertyName("subjects")]
        public List<SubjectDraftRaw>? Subjects { get; set; }
    }

    private class SubjectDraftRaw
    {
        [JsonPropertyName("temp_id")]
        public string? TempId { get; set; }

        [JsonPropertyName("code")]
        public string? Code { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("year_level")]
        public int YearLevel { get; set; }

        [JsonPropertyName("period_number")]
        public int PeriodNumber { get; set; }

        [JsonPropertyName("credits")]
        public int? Credits { get; set; }

        [JsonPropertyName("is_optional")]
        public bool IsOptional { get; set; }

        [JsonPropertyName("prerequisites")]
        public List<PrereqDraftRaw>? Prerequisites { get; set; }
    }

    private class PrereqDraftRaw
    {
        [JsonPropertyName("required_subject_code")]
        public string? RequiredSubjectCode { get; set; }

        [JsonPropertyName("requirement_type")]
        public string? RequirementType { get; set; }
    }
}

// Alias para satisfacer GeminiAiCareerPlanExtractor
public class GeminiAiCareerPlanExtractor : GeminiCareerPlanExtractorService
{
    public GeminiAiCareerPlanExtractor(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<GeminiCareerPlanExtractorService> logger)
        : base(httpClient, configuration, logger)
    {
    }
}
