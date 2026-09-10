using LifeTracker.Domain.Finances;

namespace LifeTracker.Application.Finances.Dtos;

public record FinancialAccountDto(
    Guid Id,
    Guid UserId,
    string Name,
    AccountType AccountType,
    string Currency,
    decimal InitialBalance,
    decimal CurrentBalance,
    string Color,
    string Icon,
    bool IsArchived,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateFinancialAccountRequest(
    string Name,
    AccountType AccountType,
    string Currency,
    decimal InitialBalance = 0m,
    string Color = "emerald",
    string Icon = "wallet"
);

public record UpdateFinancialAccountRequest(
    string Name,
    string Color = "emerald",
    string Icon = "wallet"
);

public record TransactionCategoryDto(
    Guid Id,
    Guid UserId,
    string Name,
    CategoryType Type,
    string Color,
    string Icon,
    bool IsSystem,
    int DisplayOrder,
    DateTime CreatedAt
);

public record CreateTransactionCategoryRequest(
    string Name,
    CategoryType Type = CategoryType.Expense,
    string Color = "zinc",
    string Icon = "tag",
    int DisplayOrder = 0
);

public record UpdateTransactionCategoryRequest(
    string Name,
    CategoryType Type,
    string Color,
    string Icon,
    int DisplayOrder
);

public record TransactionDto(
    Guid Id,
    Guid UserId,
    Guid AccountId,
    string AccountName,
    string AccountCurrency,
    Guid? DestinationAccountId,
    string? DestinationAccountName,
    string? DestinationAccountCurrency,
    Guid? CategoryId,
    string? CategoryName,
    string? CategoryColor,
    string? CategoryIcon,
    TransactionType Type,
    decimal Amount,
    decimal? DestinationAmount,
    decimal? ExchangeRate,
    DateOnly Date,
    DateTimeOffset Timestamp,
    string Description,
    string? Notes,
    List<string> Tags,
    bool IsCleared,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateTransactionRequest(
    Guid AccountId,
    TransactionType Type,
    decimal Amount,
    string Description,
    DateOnly? Date = null,
    DateTimeOffset? Timestamp = null,
    Guid? DestinationAccountId = null,
    decimal? DestinationAmount = null,
    decimal? ExchangeRate = null,
    Guid? CategoryId = null,
    string? Notes = null,
    List<string>? Tags = null,
    bool IsCleared = true
);

public record UpdateTransactionRequest(
    Guid AccountId,
    TransactionType Type,
    decimal Amount,
    string Description,
    DateOnly Date,
    DateTimeOffset? Timestamp = null,
    Guid? DestinationAccountId = null,
    decimal? DestinationAmount = null,
    decimal? ExchangeRate = null,
    Guid? CategoryId = null,
    string? Notes = null,
    List<string>? Tags = null,
    bool IsCleared = true
);

public record TransactionFilterRequest(
    Guid? AccountId = null,
    Guid? CategoryId = null,
    TransactionType? Type = null,
    DateOnly? StartDate = null,
    DateOnly? EndDate = null,
    string? Search = null,
    string? Currency = null,
    int? Month = null,
    int? Year = null,
    int Limit = 50,
    int Offset = 0
);

public enum BudgetAlertStatus
{
    Normal,
    Warning,
    Exceeded
}

public record BudgetExecutionDto(
    Guid Id,
    Guid UserId,
    Guid? CategoryId,
    string? CategoryName,
    string? CategoryColor,
    string? CategoryIcon,
    int Month,
    int Year,
    decimal LimitAmount,
    decimal SpentAmount,
    decimal RemainingAmount,
    decimal Percentage,
    BudgetAlertStatus Status,
    string Currency
);

public record CreateOrUpdateBudgetRequest(
    int Month,
    int Year,
    decimal LimitAmount,
    string Currency = "ARS",
    Guid? CategoryId = null
);

public record CategoryExpenseSummaryDto(
    Guid? CategoryId,
    string CategoryName,
    string Color,
    string Icon,
    decimal Amount,
    decimal Percentage
);

public record CurrencyCashflowSummaryDto(
    string Currency,
    decimal TotalLiquidity,
    decimal TotalIncome,
    decimal TotalExpense,
    decimal NetSavings,
    decimal SavingsRatePercentage,
    IReadOnlyList<CategoryExpenseSummaryDto> ExpensesByCategory
);

public record CashflowSummaryDto(
    int Month,
    int Year,
    CurrencyCashflowSummaryDto Ars,
    CurrencyCashflowSummaryDto Usd,
    IReadOnlyList<CurrencyCashflowSummaryDto> OtherCurrencies
);
