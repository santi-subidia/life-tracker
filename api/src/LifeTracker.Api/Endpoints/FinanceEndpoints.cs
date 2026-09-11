using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using LifeTracker.Application.Finances.Dtos;
using LifeTracker.Application.Finances.Services;
using LifeTracker.Domain.Finances;

namespace LifeTracker.Api.Endpoints;

public static class FinanceEndpoints
{
    public static RouteGroupBuilder MapFinanceEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/finances")
            .WithTags("Finanzas Personales");

        // --- Cuentas Financieras ---
        group.MapGet("/accounts", async (
            [FromQuery] bool includeArchived,
            [FromServices] IFinanceService financeService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var accounts = await financeService.GetAccountsAsync(userId, includeArchived, ct);
            return Results.Ok(accounts);
        });

        group.MapGet("/accounts/{id:guid}", async (
            Guid id,
            [FromServices] IFinanceService financeService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var account = await financeService.GetAccountByIdAsync(userId, id, ct);
            return account != null ? Results.Ok(account) : Results.NotFound(new { error = "Cuenta no encontrada." });
        });

        group.MapPost("/accounts", async (
            [FromBody] CreateFinancialAccountRequest request,
            [FromServices] IFinanceService financeService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var account = await financeService.CreateAccountAsync(userId, request, ct);
            return Results.Created($"/api/finances/accounts/{account.Id}", account);
        });

        group.MapPut("/accounts/{id:guid}", async (
            Guid id,
            [FromBody] UpdateFinancialAccountRequest request,
            [FromServices] IFinanceService financeService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var updated = await financeService.UpdateAccountAsync(userId, id, request, ct);
            return updated != null ? Results.Ok(updated) : Results.NotFound(new { error = "Cuenta no encontrada." });
        });

        group.MapDelete("/accounts/{id:guid}", async (
            Guid id,
            [FromServices] IFinanceService financeService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var success = await financeService.DeleteAccountAsync(userId, id, ct);
            return success ? Results.NoContent() : Results.NotFound(new { error = "Cuenta no encontrada." });
        });

        group.MapPost("/accounts/{id:guid}/archive", async (
            Guid id,
            [FromServices] IFinanceService financeService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var success = await financeService.ArchiveAccountAsync(userId, id, ct);
            return success ? Results.Ok(new { message = "Cuenta archivada exitosamente." }) : Results.NotFound(new { error = "Cuenta no encontrada." });
        });

        group.MapPost("/accounts/{id:guid}/restore", async (
            Guid id,
            [FromServices] IFinanceService financeService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var success = await financeService.RestoreAccountAsync(userId, id, ct);
            return success ? Results.Ok(new { message = "Cuenta restaurada exitosamente." }) : Results.NotFound(new { error = "Cuenta no encontrada." });
        });

        // --- Categorías ---
        group.MapGet("/categories", async (
            [FromServices] IFinanceService financeService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var categories = await financeService.GetCategoriesAsync(userId, ct);
            return Results.Ok(categories);
        });

        group.MapPost("/categories", async (
            [FromBody] CreateTransactionCategoryRequest request,
            [FromServices] IFinanceService financeService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var category = await financeService.CreateCategoryAsync(userId, request, ct);
            return Results.Created($"/api/finances/categories/{category.Id}", category);
        });

        group.MapPut("/categories/{id:guid}", async (
            Guid id,
            [FromBody] UpdateTransactionCategoryRequest request,
            [FromServices] IFinanceService financeService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var updated = await financeService.UpdateCategoryAsync(userId, id, request, ct);
            return updated != null ? Results.Ok(updated) : Results.NotFound(new { error = "Categoría no encontrada." });
        });

        group.MapDelete("/categories/{id:guid}", async (
            Guid id,
            [FromServices] IFinanceService financeService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var success = await financeService.DeleteCategoryAsync(userId, id, ct);
            return success ? Results.NoContent() : Results.NotFound(new { error = "Categoría no encontrada." });
        });

        // --- Transacciones ---
        group.MapGet("/transactions", async (
            [FromQuery] Guid? accountId,
            [FromQuery] Guid? categoryId,
            [FromQuery] TransactionType? type,
            [FromQuery] DateOnly? startDate,
            [FromQuery] DateOnly? endDate,
            [FromQuery] string? search,
            [FromQuery] string? currency,
            [FromQuery] int? month,
            [FromQuery] int? year,
            [FromQuery] int? limit,
            [FromQuery] int? offset,
            [FromServices] IFinanceService financeService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var filter = new TransactionFilterRequest(
                AccountId: accountId,
                CategoryId: categoryId,
                Type: type,
                StartDate: startDate,
                EndDate: endDate,
                Search: search,
                Currency: currency,
                Month: month,
                Year: year,
                Limit: limit ?? 50,
                Offset: offset ?? 0
            );

            var transactions = await financeService.GetTransactionsAsync(userId, filter, ct);
            return Results.Ok(transactions);
        });

        group.MapGet("/transactions/{id:guid}", async (
            Guid id,
            [FromServices] IFinanceService financeService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var tx = await financeService.GetTransactionByIdAsync(userId, id, ct);
            return tx != null ? Results.Ok(tx) : Results.NotFound(new { error = "Transacción no encontrada." });
        });

        group.MapPost("/transactions", async (
            [FromBody] CreateTransactionRequest request,
            [FromServices] IFinanceService financeService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            try
            {
                var tx = await financeService.CreateTransactionAsync(userId, request, ct);
                return Results.Created($"/api/finances/transactions/{tx.Id}", tx);
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapPut("/transactions/{id:guid}", async (
            Guid id,
            [FromBody] UpdateTransactionRequest request,
            [FromServices] IFinanceService financeService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            try
            {
                var updated = await financeService.UpdateTransactionAsync(userId, id, request, ct);
                return updated != null ? Results.Ok(updated) : Results.NotFound(new { error = "Transacción no encontrada." });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapDelete("/transactions/{id:guid}", async (
            Guid id,
            [FromServices] IFinanceService financeService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var success = await financeService.DeleteTransactionAsync(userId, id, ct);
            return success ? Results.NoContent() : Results.NotFound(new { error = "Transacción no encontrada." });
        });

        // --- Resumen y Cashflow ---
        group.MapGet("/summary", async (
            [FromQuery] string? currency,
            [FromQuery] int? month,
            [FromQuery] int? year,
            [FromServices] IFinanceService financeService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var summary = await financeService.GetCashflowSummaryAsync(userId, month, year, ct);
            return Results.Ok(summary);
        });

        // --- Presupuestos ---
        group.MapGet("/budgets", async (
            [FromQuery] int? month,
            [FromQuery] int? year,
            [FromQuery] string? currency,
            [FromServices] IFinanceService financeService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var now = DateTime.UtcNow;
            var targetMonth = month ?? now.Month;
            var targetYear = year ?? now.Year;

            var budgets = await financeService.GetBudgetsAsync(userId, targetMonth, targetYear, currency, ct);
            return Results.Ok(budgets);
        });

        group.MapPost("/budgets", async (
            [FromBody] CreateOrUpdateBudgetRequest request,
            [FromServices] IFinanceService financeService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            try
            {
                var budget = await financeService.CreateOrUpdateBudgetAsync(userId, request, ct);
                return Results.Ok(budget);
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        group.MapDelete("/budgets/{id:guid}", async (
            Guid id,
            [FromServices] IFinanceService financeService,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var userId = GetUserId(httpContext);
            var success = await financeService.DeleteBudgetAsync(userId, id, ct);
            return success ? Results.NoContent() : Results.NotFound(new { error = "Presupuesto no encontrado." });
        });

        return group;
    }

    private static Guid GetUserId(HttpContext context) => EndpointAuthHelper.GetUserId(context);
}
