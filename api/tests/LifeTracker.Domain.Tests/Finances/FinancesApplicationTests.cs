using LifeTracker.Application.Finances.Dtos;
using LifeTracker.Application.Finances.Services;
using LifeTracker.Domain.Finances;
using Xunit;

namespace LifeTracker.Domain.Tests.Finances;

public class FinancesApplicationTests
{
    private readonly Guid _userId = Guid.NewGuid();

    [Fact]
    public void BudgetConsumptionAnalyzer_ComputesNormalWarningAndExceededCorrectly()
    {
        var analyzer = new BudgetConsumptionAnalyzer();
        var categoryId = Guid.NewGuid();
        var category = new TransactionCategory(_userId, "Alimentación", CategoryType.Expense, "emerald", "utensils");

        // Caso 1: Normal (50%)
        var budget1 = new Budget(_userId, 9, 2026, 100000m, "ARS", categoryId);
        var result1 = analyzer.Analyze(budget1, 50000m, category);

        Assert.Equal(50000m, result1.SpentAmount);
        Assert.Equal(50000m, result1.RemainingAmount);
        Assert.Equal(50m, result1.Percentage);
        Assert.Equal(BudgetAlertStatus.Normal, result1.Status);
        Assert.Equal("Alimentación", result1.CategoryName);

        // Caso 2: Warning (85% >= 80%)
        var budget2 = new Budget(_userId, 9, 2026, 100000m, "ARS", categoryId);
        var result2 = analyzer.Analyze(budget2, 85000m, category);

        Assert.Equal(85000m, result2.SpentAmount);
        Assert.Equal(15000m, result2.RemainingAmount);
        Assert.Equal(85m, result2.Percentage);
        Assert.Equal(BudgetAlertStatus.Warning, result2.Status);

        // Caso 3: Exceeded (110% >= 100%)
        var budget3 = new Budget(_userId, 9, 2026, 100000m, "ARS", categoryId);
        var result3 = analyzer.Analyze(budget3, 110000m, category);

        Assert.Equal(110000m, result3.SpentAmount);
        Assert.Equal(-10000m, result3.RemainingAmount);
        Assert.Equal(110m, result3.Percentage);
        Assert.Equal(BudgetAlertStatus.Exceeded, result3.Status);
    }

    [Fact]
    public void BudgetConsumptionAnalyzer_AnalyzeAll_FiltersByCurrencyAndCategory()
    {
        var analyzer = new BudgetConsumptionAnalyzer();
        var catComida = Guid.NewGuid();
        var catTransporte = Guid.NewGuid();

        var accountArsId = Guid.NewGuid();
        var accountUsdId = Guid.NewGuid();

        var currencies = new Dictionary<Guid, string>
        {
            [accountArsId] = "ARS",
            [accountUsdId] = "USD"
        };

        var categories = new Dictionary<Guid, TransactionCategory>
        {
            [catComida] = new TransactionCategory(_userId, "Comida", CategoryType.Expense),
            [catTransporte] = new TransactionCategory(_userId, "Transporte", CategoryType.Expense)
        };

        var budgetComida = new Budget(_userId, 9, 2026, 60000m, "ARS", catComida);
        var budgetUsd = new Budget(_userId, 9, 2026, 500m, "USD", catComida);

        var transactions = new List<Transaction>
        {
            new(_userId, accountArsId, TransactionType.Expense, 40000m, "Supermercado", new DateOnly(2026, 9, 5), categoryId: catComida),
            new(_userId, accountArsId, TransactionType.Expense, 15000m, "Uber", new DateOnly(2026, 9, 6), categoryId: catTransporte),
            new(_userId, accountUsdId, TransactionType.Expense, 100m, "Whole Foods", new DateOnly(2026, 9, 7), categoryId: catComida)
        };

        var results = analyzer.AnalyzeAll([budgetComida, budgetUsd], transactions, currencies, categories);

        Assert.Equal(2, results.Count);

        var resComidaArs = results.First(r => r.Currency == "ARS");
        Assert.Equal(40000m, resComidaArs.SpentAmount);
        Assert.Equal(66.67m, resComidaArs.Percentage);
        Assert.Equal(BudgetAlertStatus.Normal, resComidaArs.Status);

        var resComidaUsd = results.First(r => r.Currency == "USD");
        Assert.Equal(100m, resComidaUsd.SpentAmount);
        Assert.Equal(20m, resComidaUsd.Percentage);
        Assert.Equal(BudgetAlertStatus.Normal, resComidaUsd.Status);
    }

    [Fact]
    public void CashflowAggregator_SegregatesArsAndUsdStrictly()
    {
        var aggregator = new CashflowAggregator();

        var cuentaMp = new FinancialAccount(_userId, "Mercado Pago", AccountType.DigitalWallet, "ARS", 100000m);
        var cuentaGalicia = new FinancialAccount(_userId, "Galicia ARS", AccountType.Bank, "ARS", 500000m);
        var cuentaUsd = new FinancialAccount(_userId, "Galicia USD", AccountType.Bank, "USD", 2500m);

        var catSueldo = Guid.NewGuid();
        var catSuper = Guid.NewGuid();
        var catOcio = Guid.NewGuid();

        var categories = new Dictionary<Guid, TransactionCategory>
        {
            [catSueldo] = new TransactionCategory(_userId, "Sueldo", CategoryType.Income),
            [catSuper] = new TransactionCategory(_userId, "Supermercado", CategoryType.Expense),
            [catOcio] = new TransactionCategory(_userId, "Ocio", CategoryType.Expense)
        };

        var transactions = new List<Transaction>
        {
            // ARS: Ingreso 800.000, Gastos 150.000 + 50.000 = 200.000
            new(_userId, cuentaGalicia.Id, TransactionType.Income, 800000m, "Cobro sueldo", new DateOnly(2026, 9, 1), categoryId: catSueldo),
            new(_userId, cuentaMp.Id, TransactionType.Expense, 150000m, "Coto", new DateOnly(2026, 9, 2), categoryId: catSuper),
            new(_userId, cuentaMp.Id, TransactionType.Expense, 50000m, "Restaurante", new DateOnly(2026, 9, 3), categoryId: catOcio),

            // USD: Ingreso 500, Gasto 100
            new(_userId, cuentaUsd.Id, TransactionType.Income, 500m, "Freelance USD", new DateOnly(2026, 9, 5)),
            new(_userId, cuentaUsd.Id, TransactionType.Expense, 100m, "Suscripción", new DateOnly(2026, 9, 8))
        };

        var summary = aggregator.Aggregate(9, 2026, [cuentaMp, cuentaGalicia, cuentaUsd], transactions, categories);

        Assert.Equal(9, summary.Month);
        Assert.Equal(2026, summary.Year);

        // Verificación ARS
        Assert.Equal(600000m, summary.Ars.TotalLiquidity);
        Assert.Equal(800000m, summary.Ars.TotalIncome);
        Assert.Equal(200000m, summary.Ars.TotalExpense);
        Assert.Equal(600000m, summary.Ars.NetSavings);
        Assert.Equal(75m, summary.Ars.SavingsRatePercentage); // (800000 - 200000) / 800000 = 75%
        Assert.Equal(2, summary.Ars.ExpensesByCategory.Count);
        Assert.Equal("Supermercado", summary.Ars.ExpensesByCategory[0].CategoryName);
        Assert.Equal(150000m, summary.Ars.ExpensesByCategory[0].Amount);
        Assert.Equal(75m, summary.Ars.ExpensesByCategory[0].Percentage);

        // Verificación USD
        Assert.Equal(2500m, summary.Usd.TotalLiquidity);
        Assert.Equal(500m, summary.Usd.TotalIncome);
        Assert.Equal(100m, summary.Usd.TotalExpense);
        Assert.Equal(400m, summary.Usd.NetSavings);
        Assert.Equal(80m, summary.Usd.SavingsRatePercentage); // (500 - 100) / 500 = 80%
    }
}
