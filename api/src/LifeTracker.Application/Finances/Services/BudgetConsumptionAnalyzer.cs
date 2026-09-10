using LifeTracker.Application.Finances.Dtos;
using LifeTracker.Domain.Finances;

namespace LifeTracker.Application.Finances.Services;

public class BudgetConsumptionAnalyzer : IBudgetConsumptionAnalyzer
{
    public BudgetExecutionDto Analyze(Budget budget, decimal spentAmount, TransactionCategory? category = null)
    {
        var limit = budget.LimitAmount;
        var remaining = limit - spentAmount;
        var percentage = limit > 0 ? Math.Round((spentAmount / limit) * 100m, 2) : 0m;

        var status = percentage >= 100m
            ? BudgetAlertStatus.Exceeded
            : (percentage >= 80m ? BudgetAlertStatus.Warning : BudgetAlertStatus.Normal);

        var name = category?.Name ?? (budget.CategoryId == null ? "Presupuesto General" : "Categoría no encontrada");
        var color = category?.Color ?? "zinc";
        var icon = category?.Icon ?? (budget.CategoryId == null ? "wallet" : "tag");

        return new BudgetExecutionDto(
            budget.Id,
            budget.UserId,
            budget.CategoryId,
            name,
            color,
            icon,
            budget.Month,
            budget.Year,
            limit,
            spentAmount,
            remaining,
            percentage,
            status,
            budget.Currency
        );
    }

    public IReadOnlyList<BudgetExecutionDto> AnalyzeAll(
        IEnumerable<Budget> budgets,
        IEnumerable<Transaction> monthlyExpenses,
        IReadOnlyDictionary<Guid, string>? accountCurrencies = null,
        IReadOnlyDictionary<Guid, TransactionCategory>? categories = null)
    {
        var expenseList = monthlyExpenses.Where(t => t.Type == TransactionType.Expense).ToList();
        var result = new List<BudgetExecutionDto>();

        foreach (var budget in budgets)
        {
            var spent = expenseList
                .Where(t =>
                {
                    // Chequear categoría
                    if (budget.CategoryId.HasValue && t.CategoryId != budget.CategoryId.Value)
                        return false;

                    // Chequear moneda de la transacción mediante la cuenta
                    if (accountCurrencies != null && accountCurrencies.TryGetValue(t.AccountId, out var currency))
                    {
                        if (!string.Equals(currency, budget.Currency, StringComparison.OrdinalIgnoreCase))
                            return false;
                    }

                    return true;
                })
                .Sum(t => t.Amount);

            TransactionCategory? cat = null;
            if (budget.CategoryId.HasValue && categories != null)
            {
                categories.TryGetValue(budget.CategoryId.Value, out cat);
            }

            result.Add(Analyze(budget, spent, cat));
        }

        return result;
    }
}
