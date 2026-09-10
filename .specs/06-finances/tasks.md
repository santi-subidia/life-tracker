# Desglose de Tareas: Fase 6 - Finanzas Personales (Cuentas, Transacciones, Presupuestos y Cashflow)

## 1. Dominio y Modelado (LifeTracker.Domain)
- [x] **[TSK-F01]**: Crear Enums `AccountType` (`Cash`, `Bank`, `DigitalWallet`, `Crypto`, `Other`) y `TransactionType` (`Expense`, `Income`, `Transfer`).
- [x] **[TSK-F02]**: Crear entidad `FinancialAccount` con métodos de dominio (`ApplyBalanceDelta`, `Archive`, `Unarchive`).
- [x] **[TSK-F03]**: Crear entidad `TransactionCategory` con tipo (`Expense`, `Income`, `Both`), icono y color.
- [x] **[TSK-F04]**: Crear entidad `Transaction` con soporte de monto destino y tipo de cambio para transferencias bimonetarias.
- [x] **[TSK-F05]**: Crear entidad `Budget` con límite de gasto mensual por categoría o global.
- [x] **[TSK-F06]**: Escribir y validar pruebas unitarias de dominio en `LifeTracker.Domain.Tests` para la matemática de saldos y transferencias bimonetarias.

## 2. Persistencia e Infraestructura (LifeTracker.Infrastructure & Supabase)
- [x] **[TSK-F07]**: Crear migración SQL `supabase/migrations/20260911000000_finances_schema.sql` (actualizar check de `timeline_items`, crear tablas `financial_accounts`, `transaction_categories`, `transactions`, `budgets`, índices y RLS).
- [x] **[TSK-F08]**: Configurar mapeos Fluent API en `FinancesConfigurations.cs` en `LifeTracker.Infrastructure` con precisión decimal `numeric(14,2)`.
- [x] **[TSK-F09]**: Actualizar `LifeTrackerDbContext` e `ILifeTrackerDbContext` con los nuevos `DbSet` de Finanzas.

## 3. Servicios de Aplicación & Deep Modules (LifeTracker.Application)
- [x] **[TSK-F10]**: Implementar Deep Module `AccountBalanceManager` (`IAccountBalanceManager`) para mutación y reversión atómica de saldos en transacciones.
- [x] **[TSK-F11]**: Implementar Deep Module `BudgetConsumptionAnalyzer` (`IBudgetConsumptionAnalyzer`) para cálculo de ejecución y alertas (Normal, Warning >= 80%, Exceeded >= 100%).
- [x] **[TSK-F12]**: Implementar Deep Module `CashflowAggregator` (`ICashflowAggregator`) para totales bimonetarios segregados (ARS / USD).
- [x] **[TSK-F13]**: Implementar Seam `FinanceTimelineProjector` (`IFinanceTimelineProjector`) para proyectar movimientos > $50.000 ARS o sueldo en `timeline_items`.
- [x] **[TSK-F14]**: Implementar `FinanceService` (`IFinanceService`) con DTOs fuertemente tipados para CRUD de cuentas, categorías, transacciones y presupuestos.
- [x] **[TSK-F15]**: Implementar Seam de Asistente IA (`FinanceAiTools` en `AiToolDispatcher`) con `get_finance_summary` y `log_finance_transaction`.

## 4. Endpoints RESTful (LifeTracker.Api)
- [x] **[TSK-F16]**: Crear `FinanceEndpoints.cs` registrando todas las rutas en `/api/finances/*` con validaciones y autenticación Supabase.
- [x] **[TSK-F17]**: Escribir pruebas de integración y verificar compilación limpia de la solución en .NET (`dotnet test`).

## 5. Frontend Next.js PWA (web/)
- [x] **[TSK-F18]**: Extender `api-client.ts` con todos los contratos de API de Finanzas.
- [x] **[TSK-F19]**: Implementar componente `PrivacyToggle` y hook/estado de ofuscación (`••••••`) sin saltos de diseño.
- [x] **[TSK-F20]**: Implementar `QuickTransactionModal` con teclado táctil y carga ultrarrápida (< 5 segundos) en Operate Mode.
- [x] **[TSK-F21]**: Implementar dashboard `/finanzas` (`web/src/app/(dashboard)/finanzas/page.tsx`) con tarjetas de liquidez ARS/USD segregadas, cuentas, flujo del mes, presupuestos y feed cronológico.
- [x] **[TSK-F22]**: Agregar enlace a Finanzas en `pillarsNav` en `web/src/app/page.tsx` con ícono `Wallet`.
- [x] **[TSK-F23]**: Verificar build de producción estricto con `npm run build` en `web/`.

## 6. Verificación y Cierre
- [x] **[TSK-F24]**: Validar todos los criterios de aceptación Gherkin de `spec.md`, registrar evidencias en `verify.md` y preparar commits semánticos.
