using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using LifeTracker.Application.Academics.Dtos;
using LifeTracker.Application.Academics.Services;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Application.Finances.Dtos;
using LifeTracker.Application.Finances.Services;
using LifeTracker.Application.Habits.Dtos;
using LifeTracker.Application.Habits.Services;
using LifeTracker.Application.Health.Services;
using LifeTracker.Application.Notes.Dtos;
using LifeTracker.Application.Notes.Services;
using LifeTracker.Application.Timeline.Services;
using LifeTracker.Application.Work.Dtos;
using LifeTracker.Application.Work.Services;
using LifeTracker.Domain.Academics;
using LifeTracker.Domain.Ai;
using LifeTracker.Domain.Finances;

namespace LifeTracker.Application.Ai.Services;

public class AiToolDispatcher : IAiToolDispatcher
{
    private readonly IHealthService _healthService;
    private readonly IHabitService _habitService;
    private readonly INoteService _noteService;
    private readonly IWorkService _workService;
    private readonly IAcademicService _academicService;
    private readonly IDailyHubService _dailyHubService;
    private readonly IFinanceService _financeService;
    private readonly ILifeTrackerDbContext _dbContext;

    private static readonly List<AiToolCallDefinition> AvailableTools =
    [
        new(
            "get_health_summary",
            "Consulta estudios clínicos de laboratorio, fechas, instituciones y parámetros médicos históricos del usuario.",
            new
            {
                type = "OBJECT",
                properties = new
                {
                    metricName = new { type = "STRING", description = "Nombre de la métrica o parámetro de laboratorio a buscar (ej: 'Colesterol', 'Glucosa', 'Triglicéridos')." },
                    year = new { type = "INTEGER", description = "Año calendario para filtrar los estudios (ej: 2025)." }
                }
            }
        ),
        new(
            "get_habits_status",
            "Consulta el listado de hábitos activos, porcentaje de cumplimiento para una fecha y rachas actuales e históricas.",
            new
            {
                type = "OBJECT",
                properties = new
                {
                    date = new { type = "STRING", description = "Fecha a consultar en formato YYYY-MM-DD. Si no se indica, utiliza la fecha de hoy." }
                }
            }
        ),
        new(
            "search_notes",
            "Busca notas en el Segundo Cerebro por palabras clave en título/contenido o por etiqueta conceptual.",
            new
            {
                type = "OBJECT",
                properties = new
                {
                    query = new { type = "STRING", description = "Texto o término de búsqueda en títulos o contenido de notas." },
                    tag = new { type = "STRING", description = "Etiqueta para filtrar notas (ej: 'arquitectura', 'ideas', 'facultad')." }
                },
                required = new[] { "query" }
            }
        ),
        new(
            "get_work_tasks",
            "Obtiene tareas del tablero Kanban de trabajo y las métricas agregadas de foco acumuladas.",
            new
            {
                type = "OBJECT",
                properties = new
                {
                    projectId = new { type = "STRING", description = "UUID opcional del proyecto para filtrar tareas." },
                    status = new { type = "STRING", description = "Columna del tablero Kanban: backlog, todo, in_progress, done." }
                }
            }
        ),
        new(
            "get_academic_status",
            "Consulta materias cursadas, promedio de calificaciones actual y próximos exámenes e hitos evaluativos programados.",
            new
            {
                type = "OBJECT",
                properties = new { }
            }
        ),
        new(
            "get_timeline_feed",
            "Consulta la línea de tiempo unificada (Spine) entre dos fechas, consolidando eventos de salud, hábitos, notas, trabajo y exámenes.",
            new
            {
                type = "OBJECT",
                properties = new
                {
                    startDate = new { type = "STRING", description = "Fecha inicial en formato YYYY-MM-DD." },
                    endDate = new { type = "STRING", description = "Fecha final en formato YYYY-MM-DD." }
                },
                required = new[] { "startDate", "endDate" }
            }
        ),
        new(
            "toggle_habit",
            "Marca o desmarca el cumplimiento de un hábito para la fecha indicada (por defecto hoy), recalculando rachas.",
            new
            {
                type = "OBJECT",
                properties = new
                {
                    habitId = new { type = "STRING", description = "UUID del hábito a alternar." },
                    date = new { type = "STRING", description = "Fecha del log en formato YYYY-MM-DD (opcional, hoy por defecto)." }
                },
                required = new[] { "habitId" }
            }
        ),
        new(
            "create_work_task",
            "Crea una nueva tarea en el tablero Kanban de Trabajo con prioridad, fecha límite y proyecto opcional.",
            new
            {
                type = "OBJECT",
                properties = new
                {
                    title = new { type = "STRING", description = "Título descriptivo de la tarea." },
                    description = new { type = "STRING", description = "Detalles o criterios de aceptación." },
                    priority = new { type = "STRING", description = "Nivel de prioridad: low, medium, high, urgent." },
                    dueDate = new { type = "STRING", description = "Fecha límite de entrega en formato YYYY-MM-DD." },
                    projectId = new { type = "STRING", description = "UUID opcional del proyecto al que pertenece la tarea." }
                },
                required = new[] { "title" }
            }
        ),
        new(
            "create_quick_note",
            "Crea instantáneamente una nota en el Segundo Cerebro con soporte para Markdown, wikilinks [[Nota]] y etiquetas.",
            new
            {
                type = "OBJECT",
                properties = new
                {
                    title = new { type = "STRING", description = "Título único de la nota." },
                    content = new { type = "STRING", description = "Cuerpo en formato Markdown. Puede contener [[Wikilinks]]." },
                    tags = new { type = "ARRAY", items = new { type = "STRING" }, description = "Etiquetas temáticas asociadas." }
                },
                required = new[] { "title", "content" }
            }
        ),
        new(
            "create_academic_milestone",
            "Registra un nuevo examen, parcial o entrega dentro de una materia universitaria.",
            new
            {
                type = "OBJECT",
                properties = new
                {
                    subjectId = new { type = "STRING", description = "UUID opcional de la materia a la que pertenece el examen." },
                    subjectName = new { type = "STRING", description = "Nombre de la materia si no se cuenta con el UUID (ej: 'Matemática', 'Algoritmos')." },
                    title = new { type = "STRING", description = "Título de la evaluación o hito (ej: 'Primer Parcial', 'Trabajo Práctico 1')." },
                    milestoneType = new { type = "STRING", description = "Tipo de evaluación: parcial, entrega, final, recuperatorio." },
                    dueDate = new { type = "STRING", description = "Fecha del examen o entrega en formato YYYY-MM-DD." },
                    weightPercentage = new { type = "NUMBER", description = "Ponderación porcentual opcional sobre la nota final (ej: 40.0)." }
                },
                required = new[] { "title", "milestoneType", "dueDate" }
            }
        ),
        new(
            "get_finance_summary",
            "Consulta el saldo consolidado de liquidez en ARS y USD, cuentas financieras activas y el flujo de caja (ingresos, gastos, ahorro) del mes.",
            new
            {
                type = "OBJECT",
                properties = new
                {
                    month = new { type = "INTEGER", description = "Mes calendario a consultar (1 a 12). Opcional, mes actual por defecto." },
                    year = new { type = "INTEGER", description = "Año calendario a consultar (ej: 2026). Opcional, año actual por defecto." }
                }
            }
        ),
        new(
            "log_finance_transaction",
            "Registra un movimiento financiero (gasto, ingreso o transferencia) indicando cuenta, monto, categoría y descripción.",
            new
            {
                type = "OBJECT",
                properties = new
                {
                    accountName = new { type = "STRING", description = "Nombre o aproximación de la cuenta de origen (ej: 'Mercado Pago', 'Galicia', 'Efectivo')." },
                    accountId = new { type = "STRING", description = "UUID opcional de la cuenta de origen si se conoce." },
                    type = new { type = "STRING", description = "Tipo de movimiento: expense (gasto), income (ingreso) o transfer (transferencia)." },
                    amount = new { type = "NUMBER", description = "Monto de la transacción." },
                    description = new { type = "STRING", description = "Detalle, concepto o comercio del movimiento (ej: 'Almuerzo', 'Pago de sueldo', 'Supermercado')." },
                    categoryName = new { type = "STRING", description = "Nombre de la categoría (ej: 'Alimentación', 'Transporte', 'Servicios', 'Sueldo')." },
                    destinationAccountName = new { type = "STRING", description = "Nombre de la cuenta de destino (para transferencias)." },
                    destinationAccountId = new { type = "STRING", description = "UUID de la cuenta de destino (para transferencias)." },
                    destinationAmount = new { type = "NUMBER", description = "Monto a acreditar en la cuenta de destino (para transferencias bimonetarias)." },
                    exchangeRate = new { type = "NUMBER", description = "Tipo de cambio pactado (para transferencias bimonetarias)." },
                    date = new { type = "STRING", description = "Fecha de la transacción en formato YYYY-MM-DD (opcional, hoy por defecto)." },
                    notes = new { type = "STRING", description = "Notas o aclaraciones adicionales sobre la transacción." }
                },
                required = new[] { "amount", "description" }
            }
        )
    ];

    public AiToolDispatcher(
        IHealthService healthService,
        IHabitService habitService,
        INoteService noteService,
        IWorkService workService,
        IAcademicService academicService,
        IDailyHubService dailyHubService,
        IFinanceService financeService,
        ILifeTrackerDbContext dbContext)
    {
        _healthService = healthService;
        _habitService = habitService;
        _noteService = noteService;
        _workService = workService;
        _academicService = academicService;
        _dailyHubService = dailyHubService;
        _financeService = financeService;
        _dbContext = dbContext;
    }

    public IReadOnlyList<AiToolCallDefinition> GetAvailableToolDefinitions() => AvailableTools;

    public async Task<AiToolExecutionResult> DispatchAsync(Guid userId, AiToolCallRequest request, CancellationToken ct = default)
    {
        try
        {
            var args = request.Arguments ?? new Dictionary<string, object?>();

            switch (request.ToolName)
            {
                case "get_health_summary":
                {
                    var metricName = GetString(args, "metricName");
                    var year = GetInt(args, "year");

                    if (!string.IsNullOrWhiteSpace(metricName))
                    {
                        var comparison = await _healthService.CompareMetricHistoryAsync(userId, metricName, ct);
                        return new AiToolExecutionResult(request.CallId, request.ToolName, true, comparison);
                    }

                    var studies = await _healthService.GetUserStudiesAsync(userId, year, ct);
                    return new AiToolExecutionResult(request.CallId, request.ToolName, true, new { totalStudies = studies.Count, studies });
                }

                case "get_habits_status":
                {
                    var dateStr = GetString(args, "date");
                    var date = DateOnly.TryParse(dateStr, out var parsedDate) ? parsedDate : DateOnly.FromDateTime(DateTime.UtcNow);
                    var today = DateOnly.FromDateTime(DateTime.UtcNow);

                    if (date == today)
                    {
                        var hub = await _dailyHubService.GetTodayHubAsync(userId, ct);
                        return new AiToolExecutionResult(request.CallId, request.ToolName, true, new
                        {
                            date = today.ToString("yyyy-MM-dd"),
                            hub.CompletionPercentage,
                            hub.Habits
                        });
                    }

                    var habits = await _habitService.GetHabitsAsync(userId, false, ct);
                    return new AiToolExecutionResult(request.CallId, request.ToolName, true, new
                    {
                        date = date.ToString("yyyy-MM-dd"),
                        totalHabits = habits.Count,
                        habits
                    });
                }

                case "search_notes":
                {
                    var query = GetString(args, "query") ?? string.Empty;
                    var tag = GetString(args, "tag");
                    var notes = await _noteService.GetNotesAsync(userId, query, tag, includeArchived: false, includeStubs: false, ct);
                    return new AiToolExecutionResult(request.CallId, request.ToolName, true, new
                    {
                        totalMatches = notes.Count,
                        notes = notes.Select(n => new
                        {
                            n.Id,
                            n.Title,
                            n.Slug,
                            snippet = n.Snippet,
                            n.Tags
                        })
                    });
                }

                case "get_work_tasks":
                {
                    var projectId = GetGuid(args, "projectId");
                    var status = GetString(args, "status");
                    var tasks = await _workService.GetTasksAsync(userId, projectId, status, ct);
                    var metrics = await _workService.GetMetricsAsync(userId, ct);
                    return new AiToolExecutionResult(request.CallId, request.ToolName, true, new { metrics, tasks });
                }

                case "get_academic_status":
                {
                    var subjects = await _academicService.GetSubjectsAsync(userId, null, ct);
                    var metrics = await _academicService.GetMetricsAsync(userId, ct);
                    return new AiToolExecutionResult(request.CallId, request.ToolName, true, new
                    {
                        careerAverage = metrics.CareerAverage,
                        subjectsCount = subjects.Count,
                        subjects,
                        upcomingExamsCount = metrics.UpcomingExamsCount
                    });
                }

                case "get_timeline_feed":
                {
                    var startStr = GetString(args, "startDate");
                    var endStr = GetString(args, "endDate");
                    var today = DateOnly.FromDateTime(DateTime.UtcNow);

                    var start = DateOnly.TryParse(startStr, out var ps) ? ps : today.AddDays(-7);
                    var end = DateOnly.TryParse(endStr, out var pe) ? pe : today;

                    var items = await _dbContext.TimelineItems
                        .AsNoTracking()
                        .Where(t => t.UserId == userId && t.Date >= start && t.Date <= end)
                        .OrderByDescending(t => t.Timestamp)
                        .Take(50)
                        .ToListAsync(ct);

                    return new AiToolExecutionResult(request.CallId, request.ToolName, true, new
                    {
                        startDate = start.ToString("yyyy-MM-dd"),
                        endDate = end.ToString("yyyy-MM-dd"),
                        totalEvents = items.Count,
                        events = items.Select(i => new
                        {
                            i.Id,
                            i.SourceModule,
                            i.EventType,
                            i.Title,
                            i.Summary,
                            timestamp = i.Timestamp
                        })
                    });
                }

                case "toggle_habit":
                {
                    var habitId = GetGuid(args, "habitId");
                    if (!habitId.HasValue)
                        return new AiToolExecutionResult(request.CallId, request.ToolName, false, null, "El parámetro 'habitId' es requerido y debe ser un UUID válido.");

                    var date = GetDateOnly(args, "date");
                    var req = new ToggleHabitRequest(date, null);
                    var res = await _habitService.ToggleHabitCompletionAsync(userId, habitId.Value, req, ct);
                    return new AiToolExecutionResult(request.CallId, request.ToolName, true, res);
                }

                case "create_work_task":
                {
                    var title = GetString(args, "title");
                    if (string.IsNullOrWhiteSpace(title))
                        return new AiToolExecutionResult(request.CallId, request.ToolName, false, null, "El parámetro 'title' es requerido.");

                    var description = GetString(args, "description");
                    var priority = GetString(args, "priority") ?? "medium";
                    var dueDate = GetDateOnly(args, "dueDate");
                    var projectId = GetGuid(args, "projectId");

                    var req = new CreateWorkTaskRequest(projectId, title, description, "todo", priority, dueDate);
                    var task = await _workService.CreateTaskAsync(userId, req, ct);
                    return new AiToolExecutionResult(request.CallId, request.ToolName, true, task);
                }

                case "create_quick_note":
                {
                    var title = GetString(args, "title");
                    var content = GetString(args, "content");
                    if (string.IsNullOrWhiteSpace(title) || content == null)
                        return new AiToolExecutionResult(request.CallId, request.ToolName, false, null, "Los parámetros 'title' y 'content' son requeridos.");

                    var tags = GetStringList(args, "tags") ?? [];
                    var fullContent = content;
                    if (tags.Count > 0)
                    {
                        var tagsSuffix = string.Join(" ", tags.Select(t => t.StartsWith('#') ? t : $"#{t}"));
                        fullContent = $"{content}\n\n{tagsSuffix}";
                    }

                    var req = new CreateNoteRequest(title, fullContent, false);
                    var note = await _noteService.CreateNoteAsync(userId, req, ct);
                    return new AiToolExecutionResult(request.CallId, request.ToolName, true, note);
                }

                case "create_academic_milestone":
                {
                    var subjectId = GetGuid(args, "subjectId");
                    var subjectName = GetString(args, "subjectName") ?? GetString(args, "subject");
                    var title = GetString(args, "title");
                    var milestoneType = GetString(args, "milestoneType") ?? "entrega";
                    var dueDate = GetDateOnly(args, "dueDate");
                    var weight = GetDecimal(args, "weightPercentage");

                    if (string.IsNullOrWhiteSpace(title) || !dueDate.HasValue)
                        return new AiToolExecutionResult(request.CallId, request.ToolName, false, null, "Los parámetros 'title' y 'dueDate' son requeridos.");

                    // Si no vino subjectId válido, resolver por subjectName o buscar la materia
                    if (!subjectId.HasValue)
                    {
                        if (string.IsNullOrWhiteSpace(subjectName))
                        {
                            var rawSubject = GetString(args, "subjectId");
                            if (!string.IsNullOrWhiteSpace(rawSubject) && !Guid.TryParse(rawSubject, out _))
                            {
                                subjectName = rawSubject;
                            }
                        }

                        if (!string.IsNullOrWhiteSpace(subjectName))
                        {
                            var cleanName = subjectName.Trim().ToLowerInvariant();
                            var existingSubject = await _dbContext.AcademicSubjects
                                .FirstOrDefaultAsync(s => s.UserId == userId && s.Name.ToLower().Contains(cleanName), ct);

                            if (existingSubject != null)
                            {
                                subjectId = existingSubject.Id;
                            }
                            else
                            {
                                // Crear la materia automáticamente para que la acción nunca falle
                                var newSub = new AcademicSubject(userId, subjectName.Trim(), "Actual", null, null, Domain.Academics.SubjectStatus.EnCurso, "#6366f1");
                                _dbContext.AcademicSubjects.Add(newSub);
                                await _dbContext.SaveChangesAsync(ct);
                                subjectId = newSub.Id;
                            }
                        }
                        else
                        {
                            var firstSubject = await _dbContext.AcademicSubjects
                                .FirstOrDefaultAsync(s => s.UserId == userId, ct);

                            if (firstSubject != null)
                            {
                                subjectId = firstSubject.Id;
                            }
                            else
                            {
                                var defaultSub = new AcademicSubject(userId, "Facultad / Universidad", "Actual", null, null, Domain.Academics.SubjectStatus.EnCurso, "#6366f1");
                                _dbContext.AcademicSubjects.Add(defaultSub);
                                await _dbContext.SaveChangesAsync(ct);
                                subjectId = defaultSub.Id;
                            }
                        }
                    }

                    var req = new CreateAcademicMilestoneRequest(subjectId.Value, title, milestoneType, dueDate.Value, weight, null, null);
                    var milestone = await _academicService.CreateMilestoneAsync(userId, req, ct);
                    return new AiToolExecutionResult(request.CallId, request.ToolName, true, milestone);
                }

                case "get_finance_summary":
                {
                    var month = GetInt(args, "month");
                    var year = GetInt(args, "year");

                    var accounts = await _financeService.GetAccountsAsync(userId, includeArchived: false, ct);
                    var summary = await _financeService.GetCashflowSummaryAsync(userId, month, year, ct);

                    return new AiToolExecutionResult(request.CallId, request.ToolName, true, new
                    {
                        month = summary.Month,
                        year = summary.Year,
                        ars = new
                        {
                            summary.Ars.TotalLiquidity,
                            summary.Ars.TotalIncome,
                            summary.Ars.TotalExpense,
                            summary.Ars.NetSavings,
                            summary.Ars.SavingsRatePercentage,
                            topExpenses = summary.Ars.ExpensesByCategory.Take(5)
                        },
                        usd = new
                        {
                            summary.Usd.TotalLiquidity,
                            summary.Usd.TotalIncome,
                            summary.Usd.TotalExpense,
                            summary.Usd.NetSavings,
                            summary.Usd.SavingsRatePercentage,
                            topExpenses = summary.Usd.ExpensesByCategory.Take(5)
                        },
                        accounts = accounts.Select(a => new
                        {
                            a.Id,
                            a.Name,
                            Type = a.AccountType.ToString(),
                            a.Currency,
                            a.CurrentBalance
                        })
                    });
                }

                case "log_finance_transaction":
                {
                    var amount = GetDecimal(args, "amount") ?? 0m;
                    if (amount <= 0)
                        return new AiToolExecutionResult(request.CallId, request.ToolName, false, null, "El monto debe ser mayor a cero.");

                    var description = GetString(args, "description");
                    if (string.IsNullOrWhiteSpace(description))
                        return new AiToolExecutionResult(request.CallId, request.ToolName, false, null, "La descripción es requerida.");

                    var typeStr = (GetString(args, "type") ?? "expense").Trim().ToLowerInvariant();
                    var type = typeStr switch
                    {
                        "income" => TransactionType.Income,
                        "transfer" => TransactionType.Transfer,
                        _ => TransactionType.Expense
                    };

                    var accounts = await _financeService.GetAccountsAsync(userId, includeArchived: false, ct);
                    if (accounts.Count == 0)
                        return new AiToolExecutionResult(request.CallId, request.ToolName, false, null, "El usuario no tiene cuentas financieras registradas.");

                    var accountId = GetGuid(args, "accountId");
                    var accountName = GetString(args, "accountName");
                    FinancialAccountDto? sourceAccount = null;

                    if (accountId.HasValue)
                        sourceAccount = accounts.FirstOrDefault(a => a.Id == accountId.Value);
                    if (sourceAccount == null && !string.IsNullOrWhiteSpace(accountName))
                        sourceAccount = accounts.FirstOrDefault(a => a.Name.Contains(accountName, StringComparison.OrdinalIgnoreCase));
                    sourceAccount ??= accounts.First();

                    Guid? destinationAccountId = GetGuid(args, "destinationAccountId");
                    var destAccountName = GetString(args, "destinationAccountName");
                    if (type == TransactionType.Transfer)
                    {
                        if (!destinationAccountId.HasValue && !string.IsNullOrWhiteSpace(destAccountName))
                        {
                            var dest = accounts.FirstOrDefault(a => a.Name.Contains(destAccountName, StringComparison.OrdinalIgnoreCase) && a.Id != sourceAccount.Id);
                            destinationAccountId = dest?.Id;
                        }
                        if (!destinationAccountId.HasValue)
                            return new AiToolExecutionResult(request.CallId, request.ToolName, false, null, "Transferencia requiere una cuenta destino válida.");
                    }

                    Guid? categoryId = null;
                    var categoryName = GetString(args, "categoryName");
                    if (!string.IsNullOrWhiteSpace(categoryName))
                    {
                        var categories = await _financeService.GetCategoriesAsync(userId, ct);
                        var cat = categories.FirstOrDefault(c => c.Name.Contains(categoryName, StringComparison.OrdinalIgnoreCase));
                        categoryId = cat?.Id;
                    }

                    var date = GetDateOnly(args, "date") ?? DateOnly.FromDateTime(DateTime.UtcNow);
                    var destinationAmount = GetDecimal(args, "destinationAmount");
                    var exchangeRate = GetDecimal(args, "exchangeRate");
                    var notes = GetString(args, "notes");

                    var tx = await _financeService.CreateTransactionAsync(userId, new CreateTransactionRequest(
                        sourceAccount.Id,
                        type,
                        amount,
                        description,
                        date,
                        DateTimeOffset.UtcNow,
                        destinationAccountId,
                        destinationAmount,
                        exchangeRate,
                        categoryId,
                        notes
                    ), ct);

                    var updatedAccount = await _financeService.GetAccountByIdAsync(userId, sourceAccount.Id, ct);

                    return new AiToolExecutionResult(request.CallId, request.ToolName, true, new
                    {
                        transactionId = tx.Id,
                        accountName = sourceAccount.Name,
                        type = tx.Type.ToString().ToLowerInvariant(),
                        amount = tx.Amount,
                        currency = sourceAccount.Currency,
                        newBalance = updatedAccount?.CurrentBalance ?? sourceAccount.CurrentBalance,
                        description = tx.Description,
                        date = tx.Date.ToString("yyyy-MM-dd"),
                        message = $"Transacción registrada exitosamente. Nuevo saldo en {sourceAccount.Name}: {sourceAccount.Currency} {updatedAccount?.CurrentBalance:N2}"
                    });
                }

                default:
                    return new AiToolExecutionResult(request.CallId, request.ToolName, false, null, $"Herramienta '{request.ToolName}' desconocida.");
            }
        }
        catch (Exception ex)
        {
            return new AiToolExecutionResult(request.CallId, request.ToolName, false, null, ex.Message);
        }
    }

    private static string? GetString(Dictionary<string, object?> args, string key)
    {
        if (!args.TryGetValue(key, out var val) || val == null)
            return null;
        if (val is JsonElement el)
            return el.ValueKind == JsonValueKind.String ? el.GetString() : el.ToString();
        return val.ToString();
    }

    private static Guid? GetGuid(Dictionary<string, object?> args, string key)
    {
        var str = GetString(args, key);
        return Guid.TryParse(str, out var g) ? g : null;
    }

    private static DateOnly? GetDateOnly(Dictionary<string, object?> args, string key)
    {
        var str = GetString(args, key);
        return DateOnly.TryParse(str, out var d) ? d : null;
    }

    private static int? GetInt(Dictionary<string, object?> args, string key)
    {
        if (!args.TryGetValue(key, out var val) || val == null)
            return null;
        if (val is JsonElement el)
        {
            if (el.ValueKind == JsonValueKind.Number && el.TryGetInt32(out var i))
                return i;
            if (int.TryParse(el.GetString(), out var si))
                return si;
            return null;
        }
        if (val is int intVal) return intVal;
        if (int.TryParse(val.ToString(), out var parsed)) return parsed;
        return null;
    }

    private static decimal? GetDecimal(Dictionary<string, object?> args, string key)
    {
        if (!args.TryGetValue(key, out var val) || val == null)
            return null;
        if (val is JsonElement el)
        {
            if (el.ValueKind == JsonValueKind.Number && el.TryGetDecimal(out var d))
                return d;
            if (decimal.TryParse(el.GetString(), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var sd))
                return sd;
            return null;
        }
        if (val is decimal decVal) return decVal;
        if (val is double dblVal) return (decimal)dblVal;
        if (decimal.TryParse(val.ToString(), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var parsed)) return parsed;
        return null;
    }

    private static List<string>? GetStringList(Dictionary<string, object?> args, string key)
    {
        if (!args.TryGetValue(key, out var val) || val == null)
            return null;
        if (val is JsonElement el && el.ValueKind == JsonValueKind.Array)
        {
            return el.EnumerateArray().Select(item => item.GetString() ?? item.ToString()).ToList();
        }
        if (val is IEnumerable<string> list)
            return list.ToList();
        if (val is IEnumerable<object> objList)
            return objList.Select(o => o.ToString() ?? "").ToList();
        return null;
    }
}
