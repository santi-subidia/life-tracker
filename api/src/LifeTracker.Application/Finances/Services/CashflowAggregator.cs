using LifeTracker.Application.Finances.Dtos;
using LifeTracker.Domain.Finances;

namespace LifeTracker.Application.Finances.Services;

public class CashflowAggregator : ICashflowAggregator
{
    public CashflowSummaryDto Aggregate(
        int month,
        int year,
        IEnumerable<FinancialAccount> accounts,
        IEnumerable<Transaction> monthlyTransactions,
        IReadOnlyDictionary<Guid, TransactionCategory>? categories = null)
    {
        var accountList = accounts.ToList();
        var txList = monthlyTransactions.ToList();
        var accountMap = accountList.ToDictionary(a => a.Id, a => a);

        var arsSummary = BuildCurrencySummary("ARS", accountList, txList, accountMap, categories);
        var usdSummary = BuildCurrencySummary("USD", accountList, txList, accountMap, categories);

        // Otras divisas si las hubiera
        var knownCurrencies = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "ARS", "USD" };
        var otherCurrencies = accountList
            .Select(a => a.Currency)
            .Concat(txList.Where(t => accountMap.ContainsKey(t.AccountId)).Select(t => accountMap[t.AccountId].Currency))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Where(c => !knownCurrencies.Contains(c))
            .Select(c => BuildCurrencySummary(c, accountList, txList, accountMap, categories))
            .ToList();

        return new CashflowSummaryDto(month, year, arsSummary, usdSummary, otherCurrencies);
    }

    private static CurrencyCashflowSummaryDto BuildCurrencySummary(
        string currency,
        List<FinancialAccount> accounts,
        List<Transaction> transactions,
        Dictionary<Guid, FinancialAccount> accountMap,
        IReadOnlyDictionary<Guid, TransactionCategory>? categories)
    {
        var totalLiquidity = accounts
            .Where(a => !a.IsArchived && string.Equals(a.Currency, currency, StringComparison.OrdinalIgnoreCase))
            .Sum(a => a.CurrentBalance);

        var currencyTransactions = transactions
            .Where(t => accountMap.TryGetValue(t.AccountId, out var acc) &&
                        string.Equals(acc.Currency, currency, StringComparison.OrdinalIgnoreCase))
            .ToList();

        var totalIncome = currencyTransactions
            .Where(t => t.Type == TransactionType.Income)
            .Sum(t => t.Amount);

        var totalExpense = currencyTransactions
            .Where(t => t.Type == TransactionType.Expense)
            .Sum(t => t.Amount);

        var netSavings = totalIncome - totalExpense;

        var savingsRate = totalIncome > 0
            ? Math.Round((netSavings / totalIncome) * 100m, 2)
            : 0m;

        // Distribución por categoría para egresos
        var expenses = currencyTransactions.Where(t => t.Type == TransactionType.Expense).ToList();
        var expensesByCategory = expenses
            .GroupBy(t => t.CategoryId)
            .Select(g =>
            {
                var categoryId = g.Key;
                TransactionCategory? cat = null;
                if (categoryId.HasValue && categories != null)
                {
                    categories.TryGetValue(categoryId.Value, out cat);
                }

                var catAmount = g.Sum(t => t.Amount);
                var pct = totalExpense > 0 ? Math.Round((catAmount / totalExpense) * 100m, 2) : 0m;

                return new CategoryExpenseSummaryDto(
                    categoryId,
                    cat?.Name ?? (categoryId == null ? "Sin categoría" : "Categoría eliminada"),
                    cat?.Color ?? "zinc",
                    cat?.Icon ?? "tag",
                    catAmount,
                    pct
                );
            })
            .OrderByDescending(c => c.Amount)
            .ToList();

        return new CurrencyCashflowSummaryDto(
            currency.ToUpperInvariant(),
            totalLiquidity,
            totalIncome,
            totalExpense,
            netSavings,
            savingsRate,
            expensesByCategory
        );
    }
}
