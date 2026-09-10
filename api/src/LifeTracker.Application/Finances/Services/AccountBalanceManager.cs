using Microsoft.EntityFrameworkCore;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Domain.Finances;

namespace LifeTracker.Application.Finances.Services;

public class AccountBalanceManager : IAccountBalanceManager
{
    private readonly ILifeTrackerDbContext _context;

    public AccountBalanceManager(ILifeTrackerDbContext context)
    {
        _context = context;
    }

    public async Task ApplyTransactionAsync(Transaction transaction, CancellationToken ct = default)
    {
        switch (transaction.Type)
        {
            case TransactionType.Expense:
            {
                var account = await GetAccountOrThrowAsync(transaction.AccountId, ct);
                account.ApplyBalanceDelta(-transaction.Amount);
                break;
            }

            case TransactionType.Income:
            {
                var account = await GetAccountOrThrowAsync(transaction.AccountId, ct);
                account.ApplyBalanceDelta(transaction.Amount);
                break;
            }

            case TransactionType.Transfer:
            {
                if (!transaction.DestinationAccountId.HasValue)
                    throw new InvalidOperationException("La transferencia requiere una cuenta destino.");

                var sourceAccount = await GetAccountOrThrowAsync(transaction.AccountId, ct);
                var destinationAccount = await GetAccountOrThrowAsync(transaction.DestinationAccountId.Value, ct);

                sourceAccount.ApplyBalanceDelta(-transaction.Amount);

                var destAmount = transaction.DestinationAmount ?? transaction.Amount;
                destinationAccount.ApplyBalanceDelta(destAmount);
                break;
            }
        }
    }

    public async Task RevertTransactionAsync(Transaction transaction, CancellationToken ct = default)
    {
        switch (transaction.Type)
        {
            case TransactionType.Expense:
            {
                var account = await _context.FinancialAccounts.FirstOrDefaultAsync(a => a.Id == transaction.AccountId, ct);
                account?.ApplyBalanceDelta(transaction.Amount);
                break;
            }

            case TransactionType.Income:
            {
                var account = await _context.FinancialAccounts.FirstOrDefaultAsync(a => a.Id == transaction.AccountId, ct);
                account?.ApplyBalanceDelta(-transaction.Amount);
                break;
            }

            case TransactionType.Transfer:
            {
                if (!transaction.DestinationAccountId.HasValue)
                    return;

                var sourceAccount = await _context.FinancialAccounts.FirstOrDefaultAsync(a => a.Id == transaction.AccountId, ct);
                var destinationAccount = await _context.FinancialAccounts.FirstOrDefaultAsync(a => a.Id == transaction.DestinationAccountId.Value, ct);

                sourceAccount?.ApplyBalanceDelta(transaction.Amount);

                var destAmount = transaction.DestinationAmount ?? transaction.Amount;
                destinationAccount?.ApplyBalanceDelta(-destAmount);
                break;
            }
        }
    }

    public async Task UpdateTransactionAsync(Transaction oldTransaction, Transaction newTransaction, CancellationToken ct = default)
    {
        await RevertTransactionAsync(oldTransaction, ct);
        await ApplyTransactionAsync(newTransaction, ct);
    }

    private async Task<FinancialAccount> GetAccountOrThrowAsync(Guid accountId, CancellationToken ct)
    {
        var account = await _context.FinancialAccounts.FirstOrDefaultAsync(a => a.Id == accountId, ct);
        if (account == null)
            throw new InvalidOperationException($"La cuenta financiera con ID '{accountId}' no existe.");

        return account;
    }
}
