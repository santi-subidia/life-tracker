using LifeTracker.Application.Finances.Dtos;
using LifeTracker.Domain.Finances;

namespace LifeTracker.Application.Finances.Services;

public interface ICashflowAggregator
{
    CashflowSummaryDto Aggregate(
        int month,
        int year,
        IEnumerable<FinancialAccount> accounts,
        IEnumerable<Transaction> monthlyTransactions,
        IReadOnlyDictionary<Guid, TransactionCategory>? categories = null);
}
