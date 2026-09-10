using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Domain.Finances;
using LifeTracker.Domain.Timeline;

namespace LifeTracker.Application.Finances.Services;

public class FinanceTimelineProjector : IFinanceTimelineProjector
{
    private readonly ILifeTrackerDbContext _context;

    public FinanceTimelineProjector(ILifeTrackerDbContext context)
    {
        _context = context;
    }

    public async Task ProjectTransactionAsync(
        Transaction transaction,
        FinancialAccount account,
        TransactionCategory? category = null,
        CancellationToken ct = default)
    {
        var isSalary = transaction.Type == TransactionType.Income && (
            (category != null && category.Name.Contains("sueldo", StringComparison.OrdinalIgnoreCase)) ||
            transaction.Description.Contains("sueldo", StringComparison.OrdinalIgnoreCase) ||
            transaction.Description.Contains("salary", StringComparison.OrdinalIgnoreCase) ||
            transaction.Description.Contains("haberes", StringComparison.OrdinalIgnoreCase));

        var isSignificant = string.Equals(account.Currency, "USD", StringComparison.OrdinalIgnoreCase)
            ? transaction.Amount >= 50m
            : transaction.Amount >= 50000m;

        if (!isSalary && !isSignificant)
        {
            await RemoveTransactionProjectionAsync(transaction.UserId, transaction.Id, ct);
            return;
        }

        var eventType = isSalary
            ? "salary_received"
            : (transaction.Type switch
            {
                TransactionType.Expense => "significant_expense",
                TransactionType.Income => "significant_income",
                _ => "significant_transfer"
            });

        var sign = transaction.Type == TransactionType.Expense ? "-" : "+";
        var title = isSalary
            ? $"Ingreso de Sueldo: {transaction.Description} (+{account.Currency} {transaction.Amount:N2})"
            : (transaction.Type switch
            {
                TransactionType.Expense => $"Gasto relevante: {transaction.Description} ({sign}{account.Currency} {transaction.Amount:N2})",
                TransactionType.Income => $"Ingreso relevante: {transaction.Description} ({sign}{account.Currency} {transaction.Amount:N2})",
                _ => $"Transferencia relevante: {transaction.Description} ({account.Currency} {transaction.Amount:N2})"
            });

        var summary = !string.IsNullOrWhiteSpace(transaction.Notes)
            ? transaction.Notes.Trim()
            : (category != null ? $"Categoría: {category.Name}" : $"Cuenta: {account.Name}");

        var metadata = JsonSerializer.Serialize(new
        {
            transactionId = transaction.Id,
            accountId = transaction.AccountId,
            accountName = account.Name,
            currency = account.Currency,
            amount = transaction.Amount,
            destinationAmount = transaction.DestinationAmount,
            type = transaction.Type.ToString().ToLowerInvariant(),
            categoryId = transaction.CategoryId,
            categoryName = category?.Name
        });

        // Limpiar proyección anterior si existía para evitar duplicados
        var existingItems = await _context.TimelineItems
            .Where(t => t.UserId == transaction.UserId && t.SourceModule == "finances" && t.SourceId == transaction.Id)
            .ToListAsync(ct);

        if (existingItems.Count > 0)
        {
            _context.TimelineItems.RemoveRange(existingItems);
        }

        var item = new TimelineItem(
            userId: transaction.UserId,
            date: transaction.Date,
            sourceModule: "finances",
            sourceId: transaction.Id,
            eventType: eventType,
            title: title,
            summary: summary,
            metadataJson: metadata
        );

        _context.TimelineItems.Add(item);
        await _context.SaveChangesAsync(ct);
    }

    public async Task RemoveTransactionProjectionAsync(
        Guid userId,
        Guid transactionId,
        CancellationToken ct = default)
    {
        var existingItems = await _context.TimelineItems
            .Where(t => t.UserId == userId && t.SourceModule == "finances" && t.SourceId == transactionId)
            .ToListAsync(ct);

        if (existingItems.Count > 0)
        {
            _context.TimelineItems.RemoveRange(existingItems);
            await _context.SaveChangesAsync(ct);
        }
    }
}
