using LifeTracker.Domain.Finances;

namespace LifeTracker.Application.Finances.Services;

public interface IFinanceTimelineProjector
{
    Task ProjectTransactionAsync(
        Transaction transaction,
        FinancialAccount account,
        TransactionCategory? category = null,
        CancellationToken ct = default);

    Task RemoveTransactionProjectionAsync(
        Guid userId,
        Guid transactionId,
        CancellationToken ct = default);
}
