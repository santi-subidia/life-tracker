using LifeTracker.Domain.Finances;
using Xunit;

namespace LifeTracker.Domain.Tests.Finances;

public class FinancesDomainTests
{
    private readonly Guid _userId = Guid.NewGuid();

    [Fact]
    public void FinancialAccount_Creation_InitializesBalancesCorrectly()
    {
        var account = new FinancialAccount(
            _userId,
            "Mercado Pago",
            AccountType.DigitalWallet,
            "ARS",
            initialBalance: 50000m,
            color: "blue",
            icon: "smartphone");

        Assert.Equal(_userId, account.UserId);
        Assert.Equal("Mercado Pago", account.Name);
        Assert.Equal(AccountType.DigitalWallet, account.AccountType);
        Assert.Equal("ARS", account.Currency);
        Assert.Equal(50000m, account.InitialBalance);
        Assert.Equal(50000m, account.CurrentBalance);
        Assert.Equal("blue", account.Color);
        Assert.Equal("smartphone", account.Icon);
        Assert.False(account.IsArchived);
    }

    [Fact]
    public void FinancialAccount_ApplyBalanceDelta_MutatesCurrentBalanceDeterministically()
    {
        var account = new FinancialAccount(_userId, "Efectivo", AccountType.Cash, "ARS", 10000m);
        var beforeTime = account.UpdatedAt;

        // Deduzco 2500
        account.ApplyBalanceDelta(-2500m);
        Assert.Equal(7500m, account.CurrentBalance);
        Assert.True(account.UpdatedAt >= beforeTime);

        // Acredito 5000
        account.ApplyBalanceDelta(5000m);
        Assert.Equal(12500m, account.CurrentBalance);
    }

    [Fact]
    public void FinancialAccount_ArchiveAndRestore_TogglesStatus()
    {
        var account = new FinancialAccount(_userId, "Santander", AccountType.Bank, "ARS", 0m);
        Assert.False(account.IsArchived);

        account.Archive();
        Assert.True(account.IsArchived);

        account.Restore();
        Assert.False(account.IsArchived);

        account.Archive();
        account.Unarchive();
        Assert.False(account.IsArchived);
    }

    [Fact]
    public void FinancialAccount_UpdateMetadata_ModifiesFieldsAndValidates()
    {
        var account = new FinancialAccount(_userId, "Caja Fuerte", AccountType.Cash, "USD", 100m);
        account.UpdateMetadata("Caja Fuerte Casa", "zinc", "lock");

        Assert.Equal("Caja Fuerte Casa", account.Name);
        Assert.Equal("zinc", account.Color);
        Assert.Equal("lock", account.Icon);

        Assert.Throws<ArgumentException>(() => account.UpdateMetadata("   ", "zinc", "lock"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void FinancialAccount_InvalidNameOrCurrency_ThrowsArgumentException(string? invalidValue)
    {
        Assert.Throws<ArgumentException>(() =>
            new FinancialAccount(_userId, invalidValue!, AccountType.Cash, "ARS", 0m));

        Assert.Throws<ArgumentException>(() =>
            new FinancialAccount(_userId, "Cuenta", AccountType.Cash, invalidValue!, 0m));
    }

    [Fact]
    public void TransactionCategory_CreationAndUpdate_WorksCorrectly()
    {
        var category = new TransactionCategory(_userId, "Alimentación", CategoryType.Expense, "emerald", "utensils", false, 1);

        Assert.Equal("Alimentación", category.Name);
        Assert.Equal(CategoryType.Expense, category.Type);
        Assert.Equal("emerald", category.Color);
        Assert.Equal(1, category.DisplayOrder);

        category.UpdateDetails("Supermercado y Alimentos", CategoryType.Expense, "green", "shopping-cart", 2);
        Assert.Equal("Supermercado y Alimentos", category.Name);
        Assert.Equal("green", category.Color);
        Assert.Equal("shopping-cart", category.Icon);
        Assert.Equal(2, category.DisplayOrder);

        Assert.Throws<ArgumentException>(() =>
            category.UpdateDetails("   ", CategoryType.Expense, "zinc", "tag", 1));
    }

    [Fact]
    public void Transaction_Creation_StandardExpense_Succeeds()
    {
        var accountId = Guid.NewGuid();
        var categoryId = Guid.NewGuid();
        var date = new DateOnly(2026, 9, 10);

        var tx = new Transaction(
            _userId,
            accountId,
            TransactionType.Expense,
            4500m,
            "Almuerzo rápido",
            date,
            categoryId: categoryId,
            tags: ["comida", "trabajo"]);

        Assert.Equal(_userId, tx.UserId);
        Assert.Equal(accountId, tx.AccountId);
        Assert.Null(tx.DestinationAccountId);
        Assert.Equal(TransactionType.Expense, tx.Type);
        Assert.Equal(4500m, tx.Amount);
        Assert.Equal("Almuerzo rápido", tx.Description);
        Assert.Equal(date, tx.Date);
        Assert.True(tx.IsCleared);
        Assert.Equal(2, tx.Tags.Count);
        Assert.Contains("comida", tx.Tags);
        Assert.Contains("trabajo", tx.Tags);
    }

    [Fact]
    public void Transaction_Creation_BimonetaryTransfer_Succeeds()
    {
        var sourceAccountId = Guid.NewGuid();
        var destAccountId = Guid.NewGuid();
        var date = new DateOnly(2026, 9, 10);

        var tx = new Transaction(
            _userId,
            sourceAccountId,
            TransactionType.Transfer,
            1200000m,
            "Compra USD ahorro",
            date,
            destinationAccountId: destAccountId,
            destinationAmount: 1000m,
            exchangeRate: 1200.0000m);

        Assert.Equal(TransactionType.Transfer, tx.Type);
        Assert.Equal(sourceAccountId, tx.AccountId);
        Assert.Equal(destAccountId, tx.DestinationAccountId);
        Assert.Equal(1200000m, tx.Amount);
        Assert.Equal(1000m, tx.DestinationAmount);
        Assert.Equal(1200.0000m, tx.ExchangeRate);
    }

    [Fact]
    public void Transaction_TransferToSameAccount_ThrowsArgumentException()
    {
        var accountId = Guid.NewGuid();

        Assert.Throws<ArgumentException>(() =>
            new Transaction(
                _userId,
                accountId,
                TransactionType.Transfer,
                1000m,
                "Transferencia inválida",
                new DateOnly(2026, 9, 10),
                destinationAccountId: accountId));
    }

    [Fact]
    public void Transaction_TransferWithoutDestination_ThrowsArgumentException()
    {
        var accountId = Guid.NewGuid();

        Assert.Throws<ArgumentException>(() =>
            new Transaction(
                _userId,
                accountId,
                TransactionType.Transfer,
                1000m,
                "Transferencia sin destino",
                new DateOnly(2026, 9, 10),
                destinationAccountId: null));
    }

    [Fact]
    public void Transaction_NegativeAmount_ThrowsArgumentException()
    {
        var accountId = Guid.NewGuid();

        Assert.Throws<ArgumentException>(() =>
            new Transaction(
                _userId,
                accountId,
                TransactionType.Expense,
                -500m,
                "Gasto negativo",
                new DateOnly(2026, 9, 10)));
    }

    [Fact]
    public void Transaction_UpdateDetailsAndMarkCleared_WorksCorrectly()
    {
        var accountId = Guid.NewGuid();
        var tx = new Transaction(
            _userId,
            accountId,
            TransactionType.Expense,
            1500m,
            "Café",
            new DateOnly(2026, 9, 10));

        tx.UpdateDetails(
            accountId,
            TransactionType.Expense,
            1800m,
            "Café de especialidad + medialuna",
            new DateOnly(2026, 9, 10),
            notes: "Pagado con débito",
            tags: ["café"]);

        Assert.Equal(1800m, tx.Amount);
        Assert.Equal("Café de especialidad + medialuna", tx.Description);
        Assert.Equal("Pagado con débito", tx.Notes);
        Assert.Single(tx.Tags);

        tx.MarkAsCleared(false);
        Assert.False(tx.IsCleared);
    }

    [Fact]
    public void Budget_Creation_ValidatesMonthAndYear()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() =>
            new Budget(_userId, 0, 2026, 100000m));

        Assert.Throws<ArgumentOutOfRangeException>(() =>
            new Budget(_userId, 13, 2026, 100000m));

        Assert.Throws<ArgumentOutOfRangeException>(() =>
            new Budget(_userId, 5, 2019, 100000m));

        Assert.Throws<ArgumentOutOfRangeException>(() =>
            new Budget(_userId, 5, 2101, 100000m));
    }

    [Fact]
    public void Budget_CreationAndUpdate_EnforcesPositiveLimit()
    {
        var budget = new Budget(_userId, 9, 2026, 75000m, "ARS");
        Assert.Equal(75000m, budget.LimitAmount);
        Assert.Equal("ARS", budget.Currency);

        budget.UpdateLimit(85000m);
        Assert.Equal(85000m, budget.LimitAmount);

        Assert.Throws<ArgumentException>(() => budget.UpdateLimit(0m));
        Assert.Throws<ArgumentException>(() => budget.UpdateLimit(-1000m));
    }
}
