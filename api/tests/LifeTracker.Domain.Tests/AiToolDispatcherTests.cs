using LifeTracker.Application.Academics.Dtos;
using LifeTracker.Application.Academics.Services;
using LifeTracker.Application.Ai.Services;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Application.Finances.Dtos;
using LifeTracker.Application.Finances.Services;
using LifeTracker.Application.Habits.Dtos;
using LifeTracker.Application.Habits.Services;
using LifeTracker.Application.Health.Dtos;
using LifeTracker.Application.Health.Services;
using LifeTracker.Application.Notes.Dtos;
using LifeTracker.Application.Notes.Services;
using LifeTracker.Application.Timeline.Dtos;
using LifeTracker.Application.Timeline.Services;
using LifeTracker.Application.Work.Dtos;
using LifeTracker.Application.Work.Services;
using LifeTracker.Domain.Ai;
using Xunit;

namespace LifeTracker.Domain.Tests;

public class AiToolDispatcherTests
{
    private readonly StubWorkService _workService = new();
    private readonly StubHabitService _habitService = new();
    private readonly StubNoteService _noteService = new();
    private readonly StubHealthService _healthService = new();
    private readonly StubAcademicService _academicService = new();
    private readonly StubDailyHubService _dailyHubService = new();
    private readonly StubFinanceService _financeService = new();

    private AiToolDispatcher CreateDispatcher()
    {
        return new AiToolDispatcher(
            _healthService,
            _habitService,
            _noteService,
            _workService,
            _academicService,
            _dailyHubService,
            _financeService,
            null!
        );
    }

    [Fact]
    public void GetAvailableToolDefinitions_ShouldReturnAllThirteenTools()
    {
        var dispatcher = CreateDispatcher();
        var tools = dispatcher.GetAvailableToolDefinitions();

        Assert.Equal(13, tools.Count);
        Assert.Contains(tools, t => t.Name == "get_health_summary");
        Assert.Contains(tools, t => t.Name == "get_habits_status");
        Assert.Contains(tools, t => t.Name == "create_habit");
        Assert.Contains(tools, t => t.Name == "search_notes");
        Assert.Contains(tools, t => t.Name == "get_work_tasks");
        Assert.Contains(tools, t => t.Name == "get_academic_status");
        Assert.Contains(tools, t => t.Name == "get_timeline_feed");
        Assert.Contains(tools, t => t.Name == "toggle_habit");
        Assert.Contains(tools, t => t.Name == "create_work_task");
        Assert.Contains(tools, t => t.Name == "create_quick_note");
        Assert.Contains(tools, t => t.Name == "create_academic_milestone");
        Assert.Contains(tools, t => t.Name == "get_finance_summary");
        Assert.Contains(tools, t => t.Name == "log_finance_transaction");
    }

    [Fact]
    public async Task DispatchAsync_CreateWorkTask_ShouldCallWorkServiceWithCorrectParameters()
    {
        var dispatcher = CreateDispatcher();
        var userId = Guid.NewGuid();

        var request = new AiToolCallRequest(
            CallId: "call-1",
            ToolName: "create_work_task",
            Arguments: new Dictionary<string, object?>
            {
                ["title"] = "Estudiar para examen",
                ["priority"] = "urgent",
                ["description"] = "Capítulos 1 al 4"
            }
        );

        var result = await dispatcher.DispatchAsync(userId, request);

        Assert.True(result.Success);
        Assert.Equal("call-1", result.CallId);
        Assert.Equal("create_work_task", result.ToolName);
        Assert.NotNull(result.Data);

        Assert.Equal(userId, _workService.LastCreatedUserId);
        Assert.Equal("Estudiar para examen", _workService.LastCreateRequest?.Title);
        Assert.Equal("urgent", _workService.LastCreateRequest?.Priority);
    }

    [Fact]
    public async Task DispatchAsync_ToggleHabit_ShouldInvokeHabitService()
    {
        var dispatcher = CreateDispatcher();
        var userId = Guid.NewGuid();
        var habitId = Guid.NewGuid();

        var request = new AiToolCallRequest(
            CallId: "call-2",
            ToolName: "toggle_habit",
            Arguments: new Dictionary<string, object?>
            {
                ["habitId"] = habitId.ToString(),
                ["date"] = "2026-09-06"
            }
        );

        var result = await dispatcher.DispatchAsync(userId, request);

        Assert.True(result.Success);
        Assert.Equal("call-2", result.CallId);
        Assert.Equal(userId, _habitService.LastUserId);
        Assert.Equal(habitId, _habitService.LastHabitId);
    }

    [Fact]
    public async Task DispatchAsync_CreateHabit_ShouldInvokeHabitService()
    {
        var dispatcher = CreateDispatcher();
        var userId = Guid.NewGuid();

        var request = new AiToolCallRequest(
            CallId: "call-create-habit-1",
            ToolName: "create_habit",
            Arguments: new Dictionary<string, object?>
            {
                ["name"] = "Lectura nocturna",
                ["description"] = "Leer 20 páginas antes de dormir",
                ["category"] = "Estudio",
                ["frequencyType"] = "daily",
                ["color"] = "#10b981",
                ["icon"] = "book-open"
            }
        );

        var result = await dispatcher.DispatchAsync(userId, request);

        Assert.True(result.Success);
        Assert.Equal("call-create-habit-1", result.CallId);
        Assert.Equal(userId, _habitService.LastCreatedUserId);
        Assert.NotNull(_habitService.LastCreateRequest);
        Assert.Equal("Lectura nocturna", _habitService.LastCreateRequest?.Name);
        Assert.Equal("Leer 20 páginas antes de dormir", _habitService.LastCreateRequest?.Description);
        Assert.Equal("Estudio", _habitService.LastCreateRequest?.Category);
        Assert.Equal("daily", _habitService.LastCreateRequest?.FrequencyType);
    }

    [Fact]
    public async Task DispatchAsync_SearchNotes_ShouldInvokeNoteService()
    {
        var dispatcher = CreateDispatcher();
        var userId = Guid.NewGuid();

        var request = new AiToolCallRequest(
            CallId: "call-3",
            ToolName: "search_notes",
            Arguments: new Dictionary<string, object?>
            {
                ["query"] = "Arquitectura",
                ["tag"] = "backend"
            }
        );

        var result = await dispatcher.DispatchAsync(userId, request);

        Assert.True(result.Success);
        Assert.Equal("call-3", result.CallId);
        Assert.Equal(userId, _noteService.LastUserId);
        Assert.Equal("Arquitectura", _noteService.LastQuery);
        Assert.Equal("backend", _noteService.LastTag);
    }

    [Fact]
    public async Task DispatchAsync_UnknownTool_ShouldReturnFailureWithoutException()
    {
        var dispatcher = CreateDispatcher();
        var userId = Guid.NewGuid();

        var request = new AiToolCallRequest("call-4", "non_existing_tool", []);

        var result = await dispatcher.DispatchAsync(userId, request);

        Assert.False(result.Success);
        Assert.Contains("desconocida", result.ErrorMessage);
    }

    [Fact]
    public async Task DispatchAsync_MissingRequiredArgument_ShouldReturnFailureControlled()
    {
        var dispatcher = CreateDispatcher();
        var userId = Guid.NewGuid();

        // create_work_task sin title
        var request = new AiToolCallRequest("call-5", "create_work_task", new Dictionary<string, object?>());

        var result = await dispatcher.DispatchAsync(userId, request);

        Assert.False(result.Success);
        Assert.Contains("requerido", result.ErrorMessage);
    }

    [Fact]
    public async Task DispatchAsync_GetFinanceSummary_ShouldReturnSegregatedCashflowAndAccounts()
    {
        var dispatcher = CreateDispatcher();
        var userId = Guid.NewGuid();

        var request = new AiToolCallRequest(
            CallId: "call-fin-1",
            ToolName: "get_finance_summary",
            Arguments: new Dictionary<string, object?>
            {
                ["month"] = 9,
                ["year"] = 2026
            }
        );

        var result = await dispatcher.DispatchAsync(userId, request);

        Assert.True(result.Success);
        Assert.NotNull(result.Data);
    }

    [Fact]
    public async Task DispatchAsync_LogFinanceTransaction_ShouldCreateTransactionAndReturnNewBalance()
    {
        var dispatcher = CreateDispatcher();
        var userId = Guid.NewGuid();

        var request = new AiToolCallRequest(
            CallId: "call-fin-2",
            ToolName: "log_finance_transaction",
            Arguments: new Dictionary<string, object?>
            {
                ["accountName"] = "Mercado Pago",
                ["type"] = "expense",
                ["amount"] = 4500m,
                ["description"] = "Almuerzo rápido",
                ["categoryName"] = "Alimentación"
            }
        );

        var result = await dispatcher.DispatchAsync(userId, request);

        Assert.True(result.Success);
        Assert.NotNull(result.Data);
        Assert.NotNull(_financeService.LastCreateTransactionRequest);
        Assert.Equal(4500m, _financeService.LastCreateTransactionRequest.Amount);
        Assert.Equal("Almuerzo rápido", _financeService.LastCreateTransactionRequest.Description);
    }

    #region Stubs para pruebas unitarias
    private class StubWorkService : IWorkService
    {
        public Guid LastCreatedUserId { get; private set; }
        public CreateWorkTaskRequest? LastCreateRequest { get; private set; }

        public Task<WorkTaskDto> CreateTaskAsync(Guid userId, CreateWorkTaskRequest req, CancellationToken ct = default)
        {
            LastCreatedUserId = userId;
            LastCreateRequest = req;
            return Task.FromResult(new WorkTaskDto(
                Guid.NewGuid(), req.ProjectId, null, null, req.Title, req.Description,
                "todo", req.Priority, req.DueDate, 0, DateTime.UtcNow, DateTime.UtcNow
            ));
        }

        public Task<List<WorkProjectDto>> GetProjectsAsync(Guid userId, CancellationToken ct = default) => Task.FromResult(new List<WorkProjectDto>());
        public Task<WorkProjectDto> CreateProjectAsync(Guid userId, CreateWorkProjectRequest req, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<WorkProjectDto?> UpdateProjectAsync(Guid userId, Guid id, UpdateWorkProjectRequest req, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<bool> DeleteProjectAsync(Guid userId, Guid id, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<List<WorkTaskDto>> GetTasksAsync(Guid userId, Guid? projectId, string? status, CancellationToken ct = default) => Task.FromResult(new List<WorkTaskDto>());
        public Task<WorkTaskDto?> UpdateTaskAsync(Guid userId, Guid id, UpdateWorkTaskRequest req, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<WorkTaskDto?> MoveTaskAsync(Guid userId, Guid id, MoveWorkTaskRequest req, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<bool> DeleteTaskAsync(Guid userId, Guid id, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<WorkSessionDto> RecordSessionAsync(Guid userId, RecordWorkSessionRequest req, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<List<WorkSessionDto>> GetSessionsAsync(Guid userId, int limit = 20, CancellationToken ct = default) => Task.FromResult(new List<WorkSessionDto>());
        public Task<WorkMetricsDto> GetMetricsAsync(Guid userId, CancellationToken ct = default) => Task.FromResult(new WorkMetricsDto(100, 50, 2, 1, 3));
    }

    private class StubHabitService : IHabitService
    {
        public Guid LastUserId { get; private set; }
        public Guid LastHabitId { get; private set; }
        public Guid LastCreatedUserId { get; private set; }
        public CreateHabitRequest? LastCreateRequest { get; private set; }

        public Task<ToggleHabitResultDto> ToggleHabitCompletionAsync(Guid userId, Guid habitId, ToggleHabitRequest request, CancellationToken cancellationToken = default)
        {
            LastUserId = userId;
            LastHabitId = habitId;
            return Task.FromResult(new ToggleHabitResultDto(habitId, DateOnly.FromDateTime(DateTime.UtcNow), "completed", 5, 10));
        }

        public Task<List<HabitDto>> GetHabitsAsync(Guid userId, bool includeArchived = false, CancellationToken cancellationToken = default) => Task.FromResult(new List<HabitDto>());

        public Task<HabitDto> CreateHabitAsync(Guid userId, CreateHabitRequest request, CancellationToken cancellationToken = default)
        {
            LastCreatedUserId = userId;
            LastCreateRequest = request;
            return Task.FromResult(new HabitDto(
                Guid.NewGuid(), userId, request.Name, request.Description, request.Category,
                new HabitFrequencyDto(request.FrequencyType, request.TargetDaysPerWeek, request.SpecificDays),
                request.Color, request.Icon, false, 0, 0, false, DateTime.UtcNow
            ));
        }

        public Task<HabitDto?> UpdateHabitAsync(Guid userId, Guid habitId, UpdateHabitRequest request, CancellationToken cancellationToken = default) => throw new NotImplementedException();
        public Task<bool> ArchiveHabitAsync(Guid userId, Guid habitId, CancellationToken cancellationToken = default) => throw new NotImplementedException();
    }

    private class StubNoteService : INoteService
    {
        public Guid LastUserId { get; private set; }
        public string? LastQuery { get; private set; }
        public string? LastTag { get; private set; }

        public Task<List<NoteListItemDto>> GetNotesAsync(Guid userId, string? search, string? tag, bool includeArchived, bool includeStubs, CancellationToken ct = default)
        {
            LastUserId = userId;
            LastQuery = search;
            LastTag = tag;
            return Task.FromResult(new List<NoteListItemDto>
            {
                new(Guid.NewGuid(), "nota-test", "Nota Test", "Contenido...", new List<string> { "backend" }, false, false, 0, 0, DateTime.UtcNow)
            });
        }

        public Task<NoteDetailDto?> GetNoteByIdOrSlugAsync(Guid userId, string idOrSlug, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<NoteDetailDto> CreateNoteAsync(Guid userId, CreateNoteRequest request, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<NoteDetailDto?> UpdateNoteAsync(Guid userId, Guid noteId, UpdateNoteRequest request, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<bool> DeleteNoteAsync(Guid userId, Guid noteId, bool permanent = false, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<GraphDataDto> GetGraphDataAsync(Guid userId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<List<NoteAutocompleteDto>> AutocompleteAsync(Guid userId, string query, CancellationToken ct = default) => throw new NotImplementedException();
    }

    private class StubHealthService : IHealthService
    {
        public Task<MetricComparisonDto> CompareMetricHistoryAsync(Guid userId, string metricName, CancellationToken cancellationToken = default) =>
            Task.FromResult(new MetricComparisonDto(metricName, null, new List<MetricDataPointDto>()));

        public Task<List<HealthStudyDto>> GetUserStudiesAsync(Guid userId, int? year = null, CancellationToken cancellationToken = default) =>
            Task.FromResult(new List<HealthStudyDto>());

        public Task<HealthStudyDto?> GetStudyByIdAsync(Guid userId, Guid studyId, CancellationToken cancellationToken = default) => throw new NotImplementedException();
        public Task<HealthStudyDto> SaveStudyAsync(Guid userId, SaveHealthStudyRequest request, CancellationToken cancellationToken = default) => throw new NotImplementedException();
        public Task<bool> DeleteStudyAsync(Guid userId, Guid studyId, CancellationToken cancellationToken = default) => throw new NotImplementedException();
        public Task<ExtractedStudyDto> ExtractStudyDataAsync(Stream fileStream, string mimeType, CancellationToken cancellationToken = default) => throw new NotImplementedException();
        public Task<DuplicateStudySummaryDto?> FindExactDuplicateByHashAsync(Guid userId, string fileHash, CancellationToken cancellationToken = default) => Task.FromResult<DuplicateStudySummaryDto?>(null);
        public Task<DuplicateStudySummaryDto?> FindSemanticDuplicateAsync(Guid userId, string studyType, DateOnly studyDate, CancellationToken cancellationToken = default) => Task.FromResult<DuplicateStudySummaryDto?>(null);
        public Task<List<string>> GetAvailableMetricsAsync(Guid userId, CancellationToken cancellationToken = default) => Task.FromResult(new List<string>());
    }

    private class StubAcademicService : IAcademicService
    {
        public Task<List<AcademicSubjectDto>> GetSubjectsAsync(Guid userId, string? term, CancellationToken ct = default) =>
            Task.FromResult(new List<AcademicSubjectDto>());

        public Task<AcademicMetricsDto> GetMetricsAsync(Guid userId, CancellationToken ct = default) =>
            Task.FromResult(new AcademicMetricsDto(8.5m, 10, 3, 2));

        public Task<AcademicSubjectDetailDto?> GetSubjectDetailAsync(Guid userId, Guid id, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<AcademicSubjectDto> CreateSubjectAsync(Guid userId, CreateAcademicSubjectRequest req, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<AcademicSubjectDto?> UpdateSubjectAsync(Guid userId, Guid id, UpdateAcademicSubjectRequest req, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<bool> DeleteSubjectAsync(Guid userId, Guid id, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<AcademicMilestoneDto> CreateMilestoneAsync(Guid userId, CreateAcademicMilestoneRequest req, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<AcademicMilestoneDto?> UpdateMilestoneAsync(Guid userId, Guid id, UpdateAcademicMilestoneRequest req, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<AcademicMilestoneDto?> AssignGradeAsync(Guid userId, Guid id, AssignGradeRequest req, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<bool> DeleteMilestoneAsync(Guid userId, Guid id, CancellationToken ct = default) => throw new NotImplementedException();
    }

    private class StubDailyHubService : IDailyHubService
    {
        public Task<DailyHubDto> GetTodayHubAsync(Guid userId, CancellationToken cancellationToken = default) =>
            Task.FromResult(new DailyHubDto(DateOnly.FromDateTime(DateTime.UtcNow), null, [], 100, []));

        public Task<DailyLogDto> UpdateDailyLogTodayAsync(Guid userId, UpdateDailyLogRequest request, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();
    }

    private class StubFinanceService : IFinanceService
    {
        public List<FinancialAccountDto> Accounts { get; } = new()
        {
            new(Guid.Parse("11111111-1111-1111-1111-111111111111"), Guid.NewGuid(), "Mercado Pago", Domain.Finances.AccountType.DigitalWallet, "ARS", 50000m, 50000m, "blue", "wallet", false, DateTime.UtcNow, DateTime.UtcNow)
        };

        public CreateTransactionRequest? LastCreateTransactionRequest { get; private set; }

        public Task<IReadOnlyList<FinancialAccountDto>> GetAccountsAsync(Guid userId, bool includeArchived = false, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<FinancialAccountDto>>(Accounts);

        public Task<FinancialAccountDto?> GetAccountByIdAsync(Guid userId, Guid id, CancellationToken ct = default) =>
            Task.FromResult(Accounts.FirstOrDefault(a => a.Id == id));

        public Task<FinancialAccountDto> CreateAccountAsync(Guid userId, CreateFinancialAccountRequest request, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<FinancialAccountDto?> UpdateAccountAsync(Guid userId, Guid id, UpdateFinancialAccountRequest request, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<bool> DeleteAccountAsync(Guid userId, Guid id, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<bool> ArchiveAccountAsync(Guid userId, Guid id, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<bool> RestoreAccountAsync(Guid userId, Guid id, CancellationToken ct = default) => throw new NotImplementedException();

        public Task<IReadOnlyList<TransactionCategoryDto>> GetCategoriesAsync(Guid userId, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<TransactionCategoryDto>>(new List<TransactionCategoryDto>
            {
                new(Guid.NewGuid(), userId, "Alimentación", Domain.Finances.CategoryType.Expense, "emerald", "utensils", true, 1, DateTime.UtcNow)
            });

        public Task<TransactionCategoryDto> CreateCategoryAsync(Guid userId, CreateTransactionCategoryRequest request, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<TransactionCategoryDto?> UpdateCategoryAsync(Guid userId, Guid id, UpdateTransactionCategoryRequest request, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<bool> DeleteCategoryAsync(Guid userId, Guid id, CancellationToken ct = default) => throw new NotImplementedException();

        public Task<IReadOnlyList<TransactionDto>> GetTransactionsAsync(Guid userId, TransactionFilterRequest filter, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<TransactionDto>>(new List<TransactionDto>());

        public Task<TransactionDto?> GetTransactionByIdAsync(Guid userId, Guid id, CancellationToken ct = default) => throw new NotImplementedException();

        public Task<TransactionDto> CreateTransactionAsync(Guid userId, CreateTransactionRequest request, CancellationToken ct = default)
        {
            LastCreateTransactionRequest = request;
            var acc = Accounts.First(a => a.Id == request.AccountId);
            return Task.FromResult(new TransactionDto(
                Guid.NewGuid(), userId, request.AccountId, acc.Name, acc.Currency,
                request.DestinationAccountId, null, null, request.CategoryId, "Alimentación", "emerald", "utensils",
                request.Type, request.Amount, request.DestinationAmount, request.ExchangeRate,
                request.Date ?? DateOnly.FromDateTime(DateTime.UtcNow),
                DateTimeOffset.UtcNow, request.Description, request.Notes, request.Tags ?? [], request.IsCleared,
                DateTime.UtcNow, DateTime.UtcNow
            ));
        }

        public Task<TransactionDto?> UpdateTransactionAsync(Guid userId, Guid id, UpdateTransactionRequest request, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<bool> DeleteTransactionAsync(Guid userId, Guid id, CancellationToken ct = default) => throw new NotImplementedException();

        public Task<IReadOnlyList<BudgetExecutionDto>> GetBudgetsAsync(Guid userId, int month, int year, string? currency = null, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<BudgetExecutionDto>>(new List<BudgetExecutionDto>());

        public Task<BudgetExecutionDto> CreateOrUpdateBudgetAsync(Guid userId, CreateOrUpdateBudgetRequest request, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<bool> DeleteBudgetAsync(Guid userId, Guid id, CancellationToken ct = default) => throw new NotImplementedException();

        public Task<CashflowSummaryDto> GetCashflowSummaryAsync(Guid userId, int? month = null, int? year = null, CancellationToken ct = default)
        {
            var ars = new CurrencyCashflowSummaryDto("ARS", 50000m, 120000m, 45000m, 75000m, 62.5m, []);
            var usd = new CurrencyCashflowSummaryDto("USD", 1500m, 0m, 0m, 0m, 0m, []);
            return Task.FromResult(new CashflowSummaryDto(month ?? 9, year ?? 2026, ars, usd, []));
        }
    }
    #endregion
}
