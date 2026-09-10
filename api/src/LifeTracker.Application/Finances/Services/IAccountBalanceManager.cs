using LifeTracker.Domain.Finances;

namespace LifeTracker.Application.Finances.Services;

public interface IAccountBalanceManager
{
    Task ApplyTransactionAsync(Transaction transaction, CancellationToken ct = default);
    Task RevertTransactionAsync(Transaction transaction, CancellationToken ct = default);
    Task UpdateTransactionAsync(Transaction oldTransaction, Transaction newTransaction, CancellationToken ct = default);
}
