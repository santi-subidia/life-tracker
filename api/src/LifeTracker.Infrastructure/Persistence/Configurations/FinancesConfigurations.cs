using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using LifeTracker.Domain.Finances;

namespace LifeTracker.Infrastructure.Persistence.Configurations;

public class FinancialAccountConfiguration : IEntityTypeConfiguration<FinancialAccount>
{
    public void Configure(EntityTypeBuilder<FinancialAccount> builder)
    {
        builder.ToTable("financial_accounts");

        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).HasColumnName("id");
        builder.Property(a => a.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(a => a.Name).HasColumnName("name").IsRequired();
        builder.Property(a => a.Currency).HasColumnName("currency").IsRequired();
        builder.Property(a => a.InitialBalance).HasColumnName("initial_balance").HasPrecision(14, 2).IsRequired();
        builder.Property(a => a.CurrentBalance).HasColumnName("current_balance").HasPrecision(14, 2).IsRequired();
        builder.Property(a => a.Color).HasColumnName("color").IsRequired();
        builder.Property(a => a.Icon).HasColumnName("icon").IsRequired();
        builder.Property(a => a.IsArchived).HasColumnName("is_archived").IsRequired();
        builder.Property(a => a.CreatedAt).HasColumnName("created_at");
        builder.Property(a => a.UpdatedAt).HasColumnName("updated_at");

        builder.Property(a => a.AccountType)
            .HasColumnName("account_type")
            .HasConversion(
                v => FormatAccountType(v),
                v => ParseAccountType(v))
            .IsRequired();

        builder.HasIndex(a => a.UserId);
    }

    private static string FormatAccountType(AccountType type) => type switch
    {
        AccountType.Cash => "cash",
        AccountType.Bank => "bank",
        AccountType.DigitalWallet => "digital_wallet",
        AccountType.Crypto => "crypto",
        _ => "other"
    };

    private static AccountType ParseAccountType(string type) => type switch
    {
        "cash" => AccountType.Cash,
        "bank" => AccountType.Bank,
        "digital_wallet" => AccountType.DigitalWallet,
        "crypto" => AccountType.Crypto,
        _ => AccountType.Other
    };
}

public class TransactionCategoryConfiguration : IEntityTypeConfiguration<TransactionCategory>
{
    public void Configure(EntityTypeBuilder<TransactionCategory> builder)
    {
        builder.ToTable("transaction_categories");

        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id");
        builder.Property(c => c.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(c => c.Name).HasColumnName("name").IsRequired();
        builder.Property(c => c.Color).HasColumnName("color").IsRequired();
        builder.Property(c => c.Icon).HasColumnName("icon").IsRequired();
        builder.Property(c => c.IsSystem).HasColumnName("is_system").IsRequired();
        builder.Property(c => c.DisplayOrder).HasColumnName("display_order").IsRequired();
        builder.Property(c => c.CreatedAt).HasColumnName("created_at");

        builder.Property(c => c.Type)
            .HasColumnName("type")
            .HasConversion(
                v => FormatCategoryType(v),
                v => ParseCategoryType(v))
            .IsRequired();

        builder.HasIndex(c => c.UserId);
    }

    private static string FormatCategoryType(CategoryType type) => type switch
    {
        CategoryType.Income => "income",
        CategoryType.Both => "both",
        _ => "expense"
    };

    private static CategoryType ParseCategoryType(string type) => type switch
    {
        "income" => CategoryType.Income,
        "both" => CategoryType.Both,
        _ => CategoryType.Expense
    };
}

public class TransactionConfiguration : IEntityTypeConfiguration<Transaction>
{
    public void Configure(EntityTypeBuilder<Transaction> builder)
    {
        builder.ToTable("transactions");

        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).HasColumnName("id");
        builder.Property(t => t.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(t => t.AccountId).HasColumnName("account_id").IsRequired();
        builder.Property(t => t.DestinationAccountId).HasColumnName("destination_account_id");
        builder.Property(t => t.CategoryId).HasColumnName("category_id");
        builder.Property(t => t.Amount).HasColumnName("amount").HasPrecision(14, 2).IsRequired();
        builder.Property(t => t.DestinationAmount).HasColumnName("destination_amount").HasPrecision(14, 2);
        builder.Property(t => t.ExchangeRate).HasColumnName("exchange_rate").HasPrecision(14, 4);
        builder.Property(t => t.Date).HasColumnName("date").IsRequired();
        builder.Property(t => t.Timestamp).HasColumnName("timestamp").IsRequired();
        builder.Property(t => t.Description).HasColumnName("description").IsRequired();
        builder.Property(t => t.Notes).HasColumnName("notes");
        builder.Property(t => t.Tags).HasColumnName("tags").HasColumnType("text[]");
        builder.Property(t => t.IsCleared).HasColumnName("is_cleared").IsRequired();
        builder.Property(t => t.CreatedAt).HasColumnName("created_at");
        builder.Property(t => t.UpdatedAt).HasColumnName("updated_at");

        builder.Property(t => t.Type)
            .HasColumnName("type")
            .HasConversion(
                v => FormatTransactionType(v),
                v => ParseTransactionType(v))
            .IsRequired();

        builder.HasOne<FinancialAccount>()
            .WithMany()
            .HasForeignKey(t => t.AccountId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<FinancialAccount>()
            .WithMany()
            .HasForeignKey(t => t.DestinationAccountId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<TransactionCategory>()
            .WithMany()
            .HasForeignKey(t => t.CategoryId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(t => new { t.UserId, t.Date });
        builder.HasIndex(t => t.AccountId);
        builder.HasIndex(t => t.CategoryId);
    }

    private static string FormatTransactionType(TransactionType type) => type switch
    {
        TransactionType.Income => "income",
        TransactionType.Transfer => "transfer",
        _ => "expense"
    };

    private static TransactionType ParseTransactionType(string type) => type switch
    {
        "income" => TransactionType.Income,
        "transfer" => TransactionType.Transfer,
        _ => TransactionType.Expense
    };
}

public class BudgetConfiguration : IEntityTypeConfiguration<Budget>
{
    public void Configure(EntityTypeBuilder<Budget> builder)
    {
        builder.ToTable("budgets");

        builder.HasKey(b => b.Id);
        builder.Property(b => b.Id).HasColumnName("id");
        builder.Property(b => b.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(b => b.CategoryId).HasColumnName("category_id");
        builder.Property(b => b.Month).HasColumnName("month").IsRequired();
        builder.Property(b => b.Year).HasColumnName("year").IsRequired();
        builder.Property(b => b.LimitAmount).HasColumnName("limit_amount").HasPrecision(14, 2).IsRequired();
        builder.Property(b => b.Currency).HasColumnName("currency").IsRequired();
        builder.Property(b => b.CreatedAt).HasColumnName("created_at");
        builder.Property(b => b.UpdatedAt).HasColumnName("updated_at");

        builder.HasOne<TransactionCategory>()
            .WithMany()
            .HasForeignKey(b => b.CategoryId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(b => new { b.UserId, b.CategoryId, b.Month, b.Year, b.Currency }).IsUnique();
        builder.HasIndex(b => new { b.UserId, b.Year, b.Month });
    }
}
