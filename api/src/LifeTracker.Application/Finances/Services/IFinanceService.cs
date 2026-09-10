using LifeTracker.Application.Finances.Dtos;

namespace LifeTracker.Application.Finances.Services;

public interface IFinanceService
{
    // Cuentas
    Task<IReadOnlyList<FinancialAccountDto>> GetAccountsAsync(Guid userId, bool includeArchived = false, CancellationToken ct = default);
    Task<FinancialAccountDto?> GetAccountByIdAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task<FinancialAccountDto> CreateAccountAsync(Guid userId, CreateFinancialAccountRequest request, CancellationToken ct = default);
    Task<FinancialAccountDto?> UpdateAccountAsync(Guid userId, Guid id, UpdateFinancialAccountRequest request, CancellationToken ct = default);
    Task<bool> DeleteAccountAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task<bool> ArchiveAccountAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task<bool> RestoreAccountAsync(Guid userId, Guid id, CancellationToken ct = default);

    // Categorías
    Task<IReadOnlyList<TransactionCategoryDto>> GetCategoriesAsync(Guid userId, CancellationToken ct = default);
    Task<TransactionCategoryDto> CreateCategoryAsync(Guid userId, CreateTransactionCategoryRequest request, CancellationToken ct = default);
    Task<TransactionCategoryDto?> UpdateCategoryAsync(Guid userId, Guid id, UpdateTransactionCategoryRequest request, CancellationToken ct = default);
    Task<bool> DeleteCategoryAsync(Guid userId, Guid id, CancellationToken ct = default);

    // Transacciones
    Task<IReadOnlyList<TransactionDto>> GetTransactionsAsync(Guid userId, TransactionFilterRequest filter, CancellationToken ct = default);
    Task<TransactionDto?> GetTransactionByIdAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task<TransactionDto> CreateTransactionAsync(Guid userId, CreateTransactionRequest request, CancellationToken ct = default);
    Task<TransactionDto?> UpdateTransactionAsync(Guid userId, Guid id, UpdateTransactionRequest request, CancellationToken ct = default);
    Task<bool> DeleteTransactionAsync(Guid userId, Guid id, CancellationToken ct = default);

    // Presupuestos
    Task<IReadOnlyList<BudgetExecutionDto>> GetBudgetsAsync(Guid userId, int month, int year, string? currency = null, CancellationToken ct = default);
    Task<BudgetExecutionDto> CreateOrUpdateBudgetAsync(Guid userId, CreateOrUpdateBudgetRequest request, CancellationToken ct = default);
    Task<bool> DeleteBudgetAsync(Guid userId, Guid id, CancellationToken ct = default);

    // Cashflow & Resumen
    Task<CashflowSummaryDto> GetCashflowSummaryAsync(Guid userId, int? month = null, int? year = null, CancellationToken ct = default);
}
