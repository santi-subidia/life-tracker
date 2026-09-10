using Microsoft.EntityFrameworkCore;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Application.Finances.Dtos;
using LifeTracker.Domain.Finances;

namespace LifeTracker.Application.Finances.Services;

public class FinanceService : IFinanceService
{
    private readonly ILifeTrackerDbContext _context;
    private readonly IAccountBalanceManager _balanceManager;
    private readonly IBudgetConsumptionAnalyzer _budgetAnalyzer;
    private readonly ICashflowAggregator _cashflowAggregator;
    private readonly IFinanceTimelineProjector _timelineProjector;

    public FinanceService(
        ILifeTrackerDbContext context,
        IAccountBalanceManager balanceManager,
        IBudgetConsumptionAnalyzer budgetAnalyzer,
        ICashflowAggregator cashflowAggregator,
        IFinanceTimelineProjector timelineProjector)
    {
        _context = context;
        _balanceManager = balanceManager;
        _budgetAnalyzer = budgetAnalyzer;
        _cashflowAggregator = cashflowAggregator;
        _timelineProjector = timelineProjector;
    }

    #region Cuentas

    public async Task<IReadOnlyList<FinancialAccountDto>> GetAccountsAsync(Guid userId, bool includeArchived = false, CancellationToken ct = default)
    {
        var query = _context.FinancialAccounts.Where(a => a.UserId == userId);
        if (!includeArchived)
        {
            query = query.Where(a => !a.IsArchived);
        }

        var accounts = await query.OrderBy(a => a.Name).ToListAsync(ct);
        return accounts.Select(MapAccountToDto).ToList();
    }

    public async Task<FinancialAccountDto?> GetAccountByIdAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var account = await _context.FinancialAccounts.FirstOrDefaultAsync(a => a.UserId == userId && a.Id == id, ct);
        return account != null ? MapAccountToDto(account) : null;
    }

    public async Task<FinancialAccountDto> CreateAccountAsync(Guid userId, CreateFinancialAccountRequest request, CancellationToken ct = default)
    {
        var account = new FinancialAccount(
            userId,
            request.Name,
            request.AccountType,
            request.Currency,
            request.InitialBalance,
            request.Color,
            request.Icon
        );

        _context.FinancialAccounts.Add(account);
        await _context.SaveChangesAsync(ct);

        return MapAccountToDto(account);
    }

    public async Task<FinancialAccountDto?> UpdateAccountAsync(Guid userId, Guid id, UpdateFinancialAccountRequest request, CancellationToken ct = default)
    {
        var account = await _context.FinancialAccounts.FirstOrDefaultAsync(a => a.UserId == userId && a.Id == id, ct);
        if (account == null)
            return null;

        account.UpdateMetadata(request.Name, request.Color, request.Icon);
        await _context.SaveChangesAsync(ct);

        return MapAccountToDto(account);
    }

    public async Task<bool> DeleteAccountAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var account = await _context.FinancialAccounts.FirstOrDefaultAsync(a => a.UserId == userId && a.Id == id, ct);
        if (account == null)
            return false;

        var hasTransactions = await _context.Transactions.AnyAsync(t => t.AccountId == id || t.DestinationAccountId == id, ct);
        if (hasTransactions)
        {
            // Si tiene transacciones históricas, archivamos para preservar consistencia
            account.Archive();
        }
        else
        {
            _context.FinancialAccounts.Remove(account);
        }

        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> ArchiveAccountAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var account = await _context.FinancialAccounts.FirstOrDefaultAsync(a => a.UserId == userId && a.Id == id, ct);
        if (account == null)
            return false;

        account.Archive();
        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> RestoreAccountAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var account = await _context.FinancialAccounts.FirstOrDefaultAsync(a => a.UserId == userId && a.Id == id, ct);
        if (account == null)
            return false;

        account.Restore();
        await _context.SaveChangesAsync(ct);
        return true;
    }

    #endregion

    #region Categorías

    public async Task<IReadOnlyList<TransactionCategoryDto>> GetCategoriesAsync(Guid userId, CancellationToken ct = default)
    {
        var categories = await _context.TransactionCategories
            .Where(c => c.UserId == userId || c.IsSystem)
            .OrderBy(c => c.DisplayOrder)
            .ThenBy(c => c.Name)
            .ToListAsync(ct);

        if (categories.Count == 0)
        {
            categories = await SeedDefaultCategoriesAsync(userId, ct);
        }

        return categories.Select(MapCategoryToDto).ToList();
    }

    public async Task<TransactionCategoryDto> CreateCategoryAsync(Guid userId, CreateTransactionCategoryRequest request, CancellationToken ct = default)
    {
        var category = new TransactionCategory(
            userId,
            request.Name,
            request.Type,
            request.Color,
            request.Icon,
            false,
            request.DisplayOrder
        );

        _context.TransactionCategories.Add(category);
        await _context.SaveChangesAsync(ct);

        return MapCategoryToDto(category);
    }

    public async Task<TransactionCategoryDto?> UpdateCategoryAsync(Guid userId, Guid id, UpdateTransactionCategoryRequest request, CancellationToken ct = default)
    {
        var category = await _context.TransactionCategories.FirstOrDefaultAsync(c => c.Id == id && (c.UserId == userId || c.IsSystem), ct);
        if (category == null)
            return null;

        category.UpdateDetails(request.Name, request.Type, request.Color, request.Icon, request.DisplayOrder);
        await _context.SaveChangesAsync(ct);

        return MapCategoryToDto(category);
    }

    public async Task<bool> DeleteCategoryAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var category = await _context.TransactionCategories.FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId, ct);
        if (category == null)
            return false;

        _context.TransactionCategories.Remove(category);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    private async Task<List<TransactionCategory>> SeedDefaultCategoriesAsync(Guid userId, CancellationToken ct)
    {
        var defaults = new List<TransactionCategory>
        {
            new(userId, "Alimentación", CategoryType.Expense, "emerald", "utensils", false, 1),
            new(userId, "Transporte", CategoryType.Expense, "blue", "bus", false, 2),
            new(userId, "Servicios", CategoryType.Expense, "amber", "zap", false, 3),
            new(userId, "Ocio", CategoryType.Expense, "purple", "smile", false, 4),
            new(userId, "Salud", CategoryType.Expense, "rose", "heart-pulse", false, 5),
            new(userId, "Educación", CategoryType.Expense, "indigo", "graduation-cap", false, 6),
            new(userId, "Vivienda", CategoryType.Expense, "teal", "home", false, 7),
            new(userId, "Sueldo", CategoryType.Income, "emerald", "banknote", false, 8),
            new(userId, "Rendimientos", CategoryType.Income, "cyan", "trending-up", false, 9)
        };

        _context.TransactionCategories.AddRange(defaults);
        await _context.SaveChangesAsync(ct);
        return defaults;
    }

    #endregion

    #region Transacciones

    public async Task<IReadOnlyList<TransactionDto>> GetTransactionsAsync(Guid userId, TransactionFilterRequest filter, CancellationToken ct = default)
    {
        var query = _context.Transactions.Where(t => t.UserId == userId);

        if (filter.AccountId.HasValue)
        {
            query = query.Where(t => t.AccountId == filter.AccountId.Value || t.DestinationAccountId == filter.AccountId.Value);
        }

        if (filter.CategoryId.HasValue)
        {
            query = query.Where(t => t.CategoryId == filter.CategoryId.Value);
        }

        if (filter.Type.HasValue)
        {
            query = query.Where(t => t.Type == filter.Type.Value);
        }

        if (filter.StartDate.HasValue)
        {
            query = query.Where(t => t.Date >= filter.StartDate.Value);
        }

        if (filter.EndDate.HasValue)
        {
            query = query.Where(t => t.Date <= filter.EndDate.Value);
        }

        if (filter.Year.HasValue && filter.Month.HasValue)
        {
            var start = new DateOnly(filter.Year.Value, filter.Month.Value, 1);
            var end = start.AddMonths(1).AddDays(-1);
            query = query.Where(t => t.Date >= start && t.Date <= end);
        }
        else if (filter.Year.HasValue)
        {
            var start = new DateOnly(filter.Year.Value, 1, 1);
            var end = new DateOnly(filter.Year.Value, 12, 31);
            query = query.Where(t => t.Date >= start && t.Date <= end);
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim().ToLower();
            query = query.Where(t => t.Description.ToLower().Contains(term) || (t.Notes != null && t.Notes.ToLower().Contains(term)));
        }

        query = query.OrderByDescending(t => t.Date).ThenByDescending(t => t.Timestamp);

        if (filter.Offset > 0)
        {
            query = query.Skip(filter.Offset);
        }

        var limit = filter.Limit > 0 ? Math.Min(filter.Limit, 200) : 50;
        var transactions = await query.Take(limit).ToListAsync(ct);

        var accountIds = transactions.Select(t => t.AccountId)
            .Concat(transactions.Where(t => t.DestinationAccountId.HasValue).Select(t => t.DestinationAccountId!.Value))
            .Distinct()
            .ToList();

        var accounts = await _context.FinancialAccounts
            .Where(a => accountIds.Contains(a.Id))
            .ToDictionaryAsync(a => a.Id, ct);

        var categoryIds = transactions.Where(t => t.CategoryId.HasValue).Select(t => t.CategoryId!.Value).Distinct().ToList();
        var categories = await _context.TransactionCategories
            .Where(c => categoryIds.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, ct);

        // Si se pidió filtrar por moneda de la cuenta origen
        if (!string.IsNullOrWhiteSpace(filter.Currency))
        {
            var cur = filter.Currency.Trim().ToUpperInvariant();
            transactions = transactions
                .Where(t => accounts.TryGetValue(t.AccountId, out var acc) && acc.Currency == cur)
                .ToList();
        }

        return transactions.Select(t => MapTransactionToDto(t, accounts, categories)).ToList();
    }

    public async Task<TransactionDto?> GetTransactionByIdAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var tx = await _context.Transactions.FirstOrDefaultAsync(t => t.UserId == userId && t.Id == id, ct);
        if (tx == null)
            return null;

        var accountIds = new List<Guid> { tx.AccountId };
        if (tx.DestinationAccountId.HasValue)
            accountIds.Add(tx.DestinationAccountId.Value);

        var accounts = await _context.FinancialAccounts
            .Where(a => accountIds.Contains(a.Id))
            .ToDictionaryAsync(a => a.Id, ct);

        Dictionary<Guid, TransactionCategory> categories = new();
        if (tx.CategoryId.HasValue)
        {
            categories = await _context.TransactionCategories
                .Where(c => c.Id == tx.CategoryId.Value)
                .ToDictionaryAsync(c => c.Id, ct);
        }

        return MapTransactionToDto(tx, accounts, categories);
    }

    public async Task<TransactionDto> CreateTransactionAsync(Guid userId, CreateTransactionRequest request, CancellationToken ct = default)
    {
        var account = await _context.FinancialAccounts.FirstOrDefaultAsync(a => a.Id == request.AccountId && a.UserId == userId, ct);
        if (account == null)
            throw new InvalidOperationException("La cuenta financiera de origen no existe o no pertenece al usuario.");

        FinancialAccount? destAccount = null;
        if (request.Type == TransactionType.Transfer)
        {
            if (!request.DestinationAccountId.HasValue)
                throw new InvalidOperationException("Una transferencia requiere una cuenta de destino.");

            destAccount = await _context.FinancialAccounts.FirstOrDefaultAsync(a => a.Id == request.DestinationAccountId.Value && a.UserId == userId, ct);
            if (destAccount == null)
                throw new InvalidOperationException("La cuenta financiera de destino no existe o no pertenece al usuario.");
        }

        TransactionCategory? category = null;
        if (request.CategoryId.HasValue)
        {
            category = await _context.TransactionCategories.FirstOrDefaultAsync(c => c.Id == request.CategoryId.Value, ct);
        }

        var date = request.Date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var timestamp = request.Timestamp ?? DateTimeOffset.UtcNow;

        var tx = new Transaction(
            userId,
            request.AccountId,
            request.Type,
            request.Amount,
            request.Description,
            date,
            timestamp,
            request.DestinationAccountId,
            request.DestinationAmount,
            request.ExchangeRate,
            request.CategoryId,
            request.Notes,
            request.Tags,
            request.IsCleared
        );

        // 1. Aplicar mutación atómica de saldos
        await _balanceManager.ApplyTransactionAsync(tx, ct);

        // 2. Persistir transacción
        _context.Transactions.Add(tx);

        // 3. Proyectar al Spine (Timeline diario) si califica
        await _timelineProjector.ProjectTransactionAsync(tx, account, category, ct);

        await _context.SaveChangesAsync(ct);

        var accountDict = new Dictionary<Guid, FinancialAccount> { [account.Id] = account };
        if (destAccount != null) accountDict[destAccount.Id] = destAccount;
        var categoryDict = category != null ? new Dictionary<Guid, TransactionCategory> { [category.Id] = category } : new();

        return MapTransactionToDto(tx, accountDict, categoryDict);
    }

    public async Task<TransactionDto?> UpdateTransactionAsync(Guid userId, Guid id, UpdateTransactionRequest request, CancellationToken ct = default)
    {
        var tx = await _context.Transactions.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId, ct);
        if (tx == null)
            return null;

        var account = await _context.FinancialAccounts.FirstOrDefaultAsync(a => a.Id == request.AccountId && a.UserId == userId, ct);
        if (account == null)
            throw new InvalidOperationException("La cuenta de origen no existe o no pertenece al usuario.");

        FinancialAccount? destAccount = null;
        if (request.Type == TransactionType.Transfer)
        {
            if (!request.DestinationAccountId.HasValue)
                throw new InvalidOperationException("Una transferencia requiere una cuenta de destino.");

            destAccount = await _context.FinancialAccounts.FirstOrDefaultAsync(a => a.Id == request.DestinationAccountId.Value && a.UserId == userId, ct);
            if (destAccount == null)
                throw new InvalidOperationException("La cuenta de destino no existe o no pertenece al usuario.");
        }

        TransactionCategory? category = null;
        if (request.CategoryId.HasValue)
        {
            category = await _context.TransactionCategories.FirstOrDefaultAsync(c => c.Id == request.CategoryId.Value, ct);
        }

        // Revertir efecto previo de la transacción en los saldos
        await _balanceManager.RevertTransactionAsync(tx, ct);

        // Actualizar datos de la transacción
        tx.UpdateDetails(
            request.AccountId,
            request.Type,
            request.Amount,
            request.Description,
            request.Date,
            request.Timestamp,
            request.DestinationAccountId,
            request.DestinationAmount,
            request.ExchangeRate,
            request.CategoryId,
            request.Notes,
            request.Tags,
            request.IsCleared
        );

        // Aplicar nuevo impacto en los saldos
        await _balanceManager.ApplyTransactionAsync(tx, ct);

        // Actualizar proyección en el Spine
        await _timelineProjector.ProjectTransactionAsync(tx, account, category, ct);

        await _context.SaveChangesAsync(ct);

        var accountDict = new Dictionary<Guid, FinancialAccount> { [account.Id] = account };
        if (destAccount != null) accountDict[destAccount.Id] = destAccount;
        var categoryDict = category != null ? new Dictionary<Guid, TransactionCategory> { [category.Id] = category } : new();

        return MapTransactionToDto(tx, accountDict, categoryDict);
    }

    public async Task<bool> DeleteTransactionAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var tx = await _context.Transactions.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId, ct);
        if (tx == null)
            return false;

        // 1. Revertir saldo
        await _balanceManager.RevertTransactionAsync(tx, ct);

        // 2. Remover proyección en Timeline si existía
        await _timelineProjector.RemoveTransactionProjectionAsync(userId, id, ct);

        // 3. Eliminar transacción
        _context.Transactions.Remove(tx);
        await _context.SaveChangesAsync(ct);

        return true;
    }

    #endregion

    #region Presupuestos

    public async Task<IReadOnlyList<BudgetExecutionDto>> GetBudgetsAsync(Guid userId, int month, int year, string? currency = null, CancellationToken ct = default)
    {
        var query = _context.Budgets.Where(b => b.UserId == userId && b.Month == month && b.Year == year);
        if (!string.IsNullOrWhiteSpace(currency))
        {
            var cur = currency.Trim().ToUpperInvariant();
            query = query.Where(b => b.Currency == cur);
        }

        var budgets = await query.ToListAsync(ct);

        var startDate = new DateOnly(year, month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var monthlyExpenses = await _context.Transactions
            .Where(t => t.UserId == userId && t.Date >= startDate && t.Date <= endDate && t.Type == TransactionType.Expense)
            .ToListAsync(ct);

        var accounts = await _context.FinancialAccounts
            .Where(a => a.UserId == userId)
            .ToDictionaryAsync(a => a.Id, a => a.Currency, ct);

        var categoryIds = budgets.Where(b => b.CategoryId.HasValue).Select(b => b.CategoryId!.Value).Distinct().ToList();
        var categories = await _context.TransactionCategories
            .Where(c => categoryIds.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, ct);

        return _budgetAnalyzer.AnalyzeAll(budgets, monthlyExpenses, accounts, categories);
    }

    public async Task<BudgetExecutionDto> CreateOrUpdateBudgetAsync(Guid userId, CreateOrUpdateBudgetRequest request, CancellationToken ct = default)
    {
        var currency = string.IsNullOrWhiteSpace(request.Currency) ? "ARS" : request.Currency.Trim().ToUpperInvariant();

        var existing = await _context.Budgets.FirstOrDefaultAsync(b =>
            b.UserId == userId &&
            b.CategoryId == request.CategoryId &&
            b.Month == request.Month &&
            b.Year == request.Year &&
            b.Currency == currency, ct);

        Budget budget;
        if (existing != null)
        {
            existing.UpdateLimit(request.LimitAmount);
            budget = existing;
        }
        else
        {
            budget = new Budget(userId, request.Month, request.Year, request.LimitAmount, currency, request.CategoryId);
            _context.Budgets.Add(budget);
        }

        await _context.SaveChangesAsync(ct);

        TransactionCategory? category = null;
        if (budget.CategoryId.HasValue)
        {
            category = await _context.TransactionCategories.FirstOrDefaultAsync(c => c.Id == budget.CategoryId.Value, ct);
        }

        var startDate = new DateOnly(budget.Year, budget.Month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var spent = await _context.Transactions
            .Where(t => t.UserId == userId &&
                        t.Type == TransactionType.Expense &&
                        t.Date >= startDate && t.Date <= endDate &&
                        (budget.CategoryId == null || t.CategoryId == budget.CategoryId))
            .SumAsync(t => t.Amount, ct);

        return _budgetAnalyzer.Analyze(budget, spent, category);
    }

    public async Task<bool> DeleteBudgetAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var budget = await _context.Budgets.FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId, ct);
        if (budget == null)
            return false;

        _context.Budgets.Remove(budget);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    #endregion

    #region Cashflow & Resumen

    public async Task<CashflowSummaryDto> GetCashflowSummaryAsync(Guid userId, int? month = null, int? year = null, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var targetMonth = month ?? now.Month;
        var targetYear = year ?? now.Year;

        var accounts = await _context.FinancialAccounts
            .Where(a => a.UserId == userId)
            .ToListAsync(ct);

        var startDate = new DateOnly(targetYear, targetMonth, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var transactions = await _context.Transactions
            .Where(t => t.UserId == userId && t.Date >= startDate && t.Date <= endDate)
            .ToListAsync(ct);

        var categories = await _context.TransactionCategories
            .Where(c => c.UserId == userId || c.IsSystem)
            .ToDictionaryAsync(c => c.Id, ct);

        return _cashflowAggregator.Aggregate(targetMonth, targetYear, accounts, transactions, categories);
    }

    #endregion

    #region Helpers de Mapeo

    private static FinancialAccountDto MapAccountToDto(FinancialAccount a) => new(
        a.Id,
        a.UserId,
        a.Name,
        a.AccountType,
        a.Currency,
        a.InitialBalance,
        a.CurrentBalance,
        a.Color,
        a.Icon,
        a.IsArchived,
        a.CreatedAt,
        a.UpdatedAt
    );

    private static TransactionCategoryDto MapCategoryToDto(TransactionCategory c) => new(
        c.Id,
        c.UserId,
        c.Name,
        c.Type,
        c.Color,
        c.Icon,
        c.IsSystem,
        c.DisplayOrder,
        c.CreatedAt
    );

    private static TransactionDto MapTransactionToDto(
        Transaction t,
        Dictionary<Guid, FinancialAccount> accounts,
        Dictionary<Guid, TransactionCategory> categories)
    {
        accounts.TryGetValue(t.AccountId, out var srcAccount);
        FinancialAccount? destAccount = null;
        if (t.DestinationAccountId.HasValue)
        {
            accounts.TryGetValue(t.DestinationAccountId.Value, out destAccount);
        }

        TransactionCategory? category = null;
        if (t.CategoryId.HasValue)
        {
            categories.TryGetValue(t.CategoryId.Value, out category);
        }

        return new TransactionDto(
            t.Id,
            t.UserId,
            t.AccountId,
            srcAccount?.Name ?? "Cuenta desconocida",
            srcAccount?.Currency ?? "ARS",
            t.DestinationAccountId,
            destAccount?.Name,
            destAccount?.Currency,
            t.CategoryId,
            category?.Name,
            category?.Color,
            category?.Icon,
            t.Type,
            t.Amount,
            t.DestinationAmount,
            t.ExchangeRate,
            t.Date,
            t.Timestamp,
            t.Description,
            t.Notes,
            t.Tags,
            t.IsCleared,
            t.CreatedAt,
            t.UpdatedAt
        );
    }

    #endregion
}
