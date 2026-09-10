using LifeTracker.Domain.Common;

namespace LifeTracker.Domain.Finances;

public class TransactionCategory : BaseEntity
{
    public Guid UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public CategoryType Type { get; private set; } = CategoryType.Expense;
    public string Color { get; private set; } = "zinc";
    public string Icon { get; private set; } = "tag";
    public bool IsSystem { get; private set; }
    public int DisplayOrder { get; private set; }

    private TransactionCategory() { }

    public TransactionCategory(
        Guid userId,
        string name,
        CategoryType type = CategoryType.Expense,
        string color = "zinc",
        string icon = "tag",
        bool isSystem = false,
        int displayOrder = 0)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("El ID de usuario no puede estar vacío.", nameof(userId));

        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("El nombre de la categoría no puede estar vacío.", nameof(name));

        UserId = userId;
        Name = name.Trim();
        Type = type;
        Color = string.IsNullOrWhiteSpace(color) ? "zinc" : color.Trim();
        Icon = string.IsNullOrWhiteSpace(icon) ? "tag" : icon.Trim();
        IsSystem = isSystem;
        DisplayOrder = displayOrder;
    }

    public void UpdateDetails(string name, CategoryType type, string color, string icon, int displayOrder)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("El nombre de la categoría no puede estar vacío.", nameof(name));

        Name = name.Trim();
        Type = type;
        Color = string.IsNullOrWhiteSpace(color) ? "zinc" : color.Trim();
        Icon = string.IsNullOrWhiteSpace(icon) ? "tag" : icon.Trim();
        DisplayOrder = displayOrder;
    }
}
