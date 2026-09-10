using LifeTracker.Domain.Common;

namespace LifeTracker.Domain.Finances;

public class Transaction : BaseEntity
{
    public Guid UserId { get; private set; }
    public Guid AccountId { get; private set; }
    public Guid? DestinationAccountId { get; private set; }
    public Guid? CategoryId { get; private set; }
    public TransactionType Type { get; private set; }
    public decimal Amount { get; private set; }
    public decimal? DestinationAmount { get; private set; }
    public decimal? ExchangeRate { get; private set; }
    public DateOnly Date { get; private set; }
    public DateTimeOffset Timestamp { get; private set; } = DateTimeOffset.UtcNow;
    public string Description { get; private set; } = string.Empty;
    public string? Notes { get; private set; }
    public List<string> Tags { get; private set; } = [];
    public bool IsCleared { get; private set; } = true;
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    private Transaction() { }

    public Transaction(
        Guid userId,
        Guid accountId,
        TransactionType type,
        decimal amount,
        string description,
        DateOnly date,
        DateTimeOffset? timestamp = null,
        Guid? destinationAccountId = null,
        decimal? destinationAmount = null,
        decimal? exchangeRate = null,
        Guid? categoryId = null,
        string? notes = null,
        List<string>? tags = null,
        bool isCleared = true)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("El ID de usuario no puede estar vacío.", nameof(userId));

        if (accountId == Guid.Empty)
            throw new ArgumentException("La cuenta de origen no puede estar vacía.", nameof(accountId));

        if (amount <= 0)
            throw new ArgumentException("El monto de la transacción debe ser mayor a cero.", nameof(amount));

        if (string.IsNullOrWhiteSpace(description))
            throw new ArgumentException("La descripción no puede estar vacía.", nameof(description));

        if (type == TransactionType.Transfer)
        {
            if (!destinationAccountId.HasValue || destinationAccountId.Value == Guid.Empty)
                throw new ArgumentException("Una transferencia requiere una cuenta de destino válida.", nameof(destinationAccountId));

            if (destinationAccountId.Value == accountId)
                throw new ArgumentException("La cuenta de destino no puede ser idéntica a la de origen.", nameof(destinationAccountId));

            if (destinationAmount.HasValue && destinationAmount.Value <= 0)
                throw new ArgumentException("El monto de destino debe ser mayor a cero.", nameof(destinationAmount));

            if (exchangeRate.HasValue && exchangeRate.Value <= 0)
                throw new ArgumentException("El tipo de cambio debe ser mayor a cero.", nameof(exchangeRate));
        }
        else
        {
            destinationAccountId = null;
            destinationAmount = null;
            exchangeRate = null;
        }

        UserId = userId;
        AccountId = accountId;
        Type = type;
        Amount = amount;
        Description = description.Trim();
        Date = date;
        Timestamp = timestamp ?? DateTimeOffset.UtcNow;
        DestinationAccountId = destinationAccountId;
        DestinationAmount = destinationAmount;
        ExchangeRate = exchangeRate;
        CategoryId = categoryId;
        Notes = notes?.Trim();
        Tags = tags?.Where(t => !string.IsNullOrWhiteSpace(t)).Select(t => t.Trim()).Distinct().ToList() ?? [];
        IsCleared = isCleared;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateDetails(
        Guid accountId,
        TransactionType type,
        decimal amount,
        string description,
        DateOnly date,
        DateTimeOffset? timestamp = null,
        Guid? destinationAccountId = null,
        decimal? destinationAmount = null,
        decimal? exchangeRate = null,
        Guid? categoryId = null,
        string? notes = null,
        List<string>? tags = null,
        bool isCleared = true)
    {
        if (accountId == Guid.Empty)
            throw new ArgumentException("La cuenta de origen no puede estar vacía.", nameof(accountId));

        if (amount <= 0)
            throw new ArgumentException("El monto de la transacción debe ser mayor a cero.", nameof(amount));

        if (string.IsNullOrWhiteSpace(description))
            throw new ArgumentException("La descripción no puede estar vacía.", nameof(description));

        if (type == TransactionType.Transfer)
        {
            if (!destinationAccountId.HasValue || destinationAccountId.Value == Guid.Empty)
                throw new ArgumentException("Una transferencia requiere una cuenta de destino válida.", nameof(destinationAccountId));

            if (destinationAccountId.Value == accountId)
                throw new ArgumentException("La cuenta de destino no puede ser idéntica a la de origen.", nameof(destinationAccountId));

            if (destinationAmount.HasValue && destinationAmount.Value <= 0)
                throw new ArgumentException("El monto de destino debe ser mayor a cero.", nameof(destinationAmount));

            if (exchangeRate.HasValue && exchangeRate.Value <= 0)
                throw new ArgumentException("El tipo de cambio debe ser mayor a cero.", nameof(exchangeRate));
        }
        else
        {
            destinationAccountId = null;
            destinationAmount = null;
            exchangeRate = null;
        }

        AccountId = accountId;
        Type = type;
        Amount = amount;
        Description = description.Trim();
        Date = date;
        if (timestamp.HasValue)
            Timestamp = timestamp.Value;
        DestinationAccountId = destinationAccountId;
        DestinationAmount = destinationAmount;
        ExchangeRate = exchangeRate;
        CategoryId = categoryId;
        Notes = notes?.Trim();
        Tags = tags?.Where(t => !string.IsNullOrWhiteSpace(t)).Select(t => t.Trim()).Distinct().ToList() ?? [];
        IsCleared = isCleared;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkAsCleared(bool isCleared)
    {
        IsCleared = isCleared;
        UpdatedAt = DateTime.UtcNow;
    }
}
