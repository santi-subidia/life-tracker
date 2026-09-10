using LifeTracker.Application.Finances.Dtos;
using LifeTracker.Domain.Finances;

namespace LifeTracker.Application.Finances.Services;

public interface IBudgetConsumptionAnalyzer
{
    BudgetExecutionDto Analyze(Budget budget, decimal spentAmount, TransactionCategory? category = null);

    IReadOnlyList<BudgetExecutionDto> AnalyzeAll(
        IEnumerable<Budget> budgets,
        IEnumerable<Transaction> monthlyExpenses,
        IReadOnlyDictionary<Guid, string>? accountCurrencies = null,
        IReadOnlyDictionary<Guid, TransactionCategory>? categories = null);
}
