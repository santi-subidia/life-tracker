using LifeTracker.Domain.Common;

namespace LifeTracker.Domain.Finances;

public class FinancialAccount : BaseEntity
{
    public Guid UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public AccountType AccountType { get; private set; }
    public string Currency { get; private set; } = "ARS";
    public decimal InitialBalance { get; private set; }
    public decimal CurrentBalance { get; private set; }
    public string Color { get; private set; } = "emerald";
    public string Icon { get; private set; } = "wallet";
    public bool IsArchived { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    private FinancialAccount() { }

    public FinancialAccount(
        Guid userId,
        string name,
        AccountType accountType,
        string currency,
        decimal initialBalance = 0m,
        string color = "emerald",
        string icon = "wallet")
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("El ID de usuario no puede estar vacío.", nameof(userId));

        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("El nombre de la cuenta no puede estar vacío.", nameof(name));

        if (string.IsNullOrWhiteSpace(currency))
            throw new ArgumentException("La divisa no puede estar vacía.", nameof(currency));

        UserId = userId;
        Name = name.Trim();
        AccountType = accountType;
        Currency = currency.Trim().ToUpperInvariant();
        InitialBalance = initialBalance;
        CurrentBalance = initialBalance;
        Color = string.IsNullOrWhiteSpace(color) ? "emerald" : color.Trim();
        Icon = string.IsNullOrWhiteSpace(icon) ? "wallet" : icon.Trim();
        IsArchived = false;
        UpdatedAt = DateTime.UtcNow;
    }

    public void ApplyBalanceDelta(decimal delta)
    {
        CurrentBalance += delta;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateMetadata(string name, string color, string icon)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("El nombre de la cuenta no puede estar vacío.", nameof(name));

        Name = name.Trim();
        Color = string.IsNullOrWhiteSpace(color) ? "emerald" : color.Trim();
        Icon = string.IsNullOrWhiteSpace(icon) ? "wallet" : icon.Trim();
        UpdatedAt = DateTime.UtcNow;
    }

    public void Archive()
    {
        IsArchived = true;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Restore()
    {
        IsArchived = false;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Unarchive() => Restore();
}
