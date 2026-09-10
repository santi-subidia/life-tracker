using LifeTracker.Domain.Common;

namespace LifeTracker.Domain.Finances;

public class Budget : BaseEntity
{
    public Guid UserId { get; private set; }
    public Guid? CategoryId { get; private set; }
    public int Month { get; private set; }
    public int Year { get; private set; }
    public decimal LimitAmount { get; private set; }
    public string Currency { get; private set; } = "ARS";
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    private Budget() { }

    public Budget(
        Guid userId,
        int month,
        int year,
        decimal limitAmount,
        string currency = "ARS",
        Guid? categoryId = null)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("El ID de usuario no puede estar vacío.", nameof(userId));

        if (month < 1 || month > 12)
            throw new ArgumentOutOfRangeException(nameof(month), "El mes debe estar comprendido entre 1 y 12.");

        if (year < 2020 || year > 2100)
            throw new ArgumentOutOfRangeException(nameof(year), "El año debe estar comprendido entre 2020 y 2100.");

        if (limitAmount <= 0)
            throw new ArgumentException("El límite de presupuesto debe ser mayor a cero.", nameof(limitAmount));

        if (string.IsNullOrWhiteSpace(currency))
            throw new ArgumentException("La divisa no puede estar vacía.", nameof(currency));

        UserId = userId;
        CategoryId = categoryId;
        Month = month;
        Year = year;
        LimitAmount = limitAmount;
        Currency = currency.Trim().ToUpperInvariant();
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateLimit(decimal newLimit)
    {
        if (newLimit <= 0)
            throw new ArgumentException("El límite de presupuesto debe ser mayor a cero.", nameof(newLimit));

        LimitAmount = newLimit;
        UpdatedAt = DateTime.UtcNow;
    }
}
