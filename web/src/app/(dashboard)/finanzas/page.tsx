"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Wallet,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Percent,
  Trash2,
  Archive,
  ArchiveRestore,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Landmark,
  Coins,
  Smartphone,
  Layers,
  Target,
  RefreshCw,
} from "lucide-react";
import {
  ApiClient,
  type FinancialAccount,
  type TransactionCategory,
  type Transaction,
  type BudgetExecution,
  type CashflowSummary,
  type TransactionType,
} from "@/lib/api-client";
import { usePrivacyMode, formatMoney } from "@/components/finances/usePrivacyMode";
import { PrivacyToggle } from "@/components/finances/PrivacyToggle";
import { QuickTransactionModal } from "@/components/finances/QuickTransactionModal";
import { AccountModal } from "@/components/finances/AccountModal";
import { BudgetModal } from "@/components/finances/BudgetModal";

export default function FinancesDashboardPage() {
  const { isPrivate, togglePrivacy } = usePrivacyMode();

  // Current Period (Month & Year)
  const now = useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  // Data state
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<BudgetExecution[]>([]);
  const [summary, setSummary] = useState<CashflowSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showArchivedAccounts, setShowArchivedAccounts] = useState(false);

  // Filter state for transactions
  const [filterType, setFilterType] = useState<"ALL" | "EXPENSE" | "INCOME" | "TRANSFER">("ALL");
  const [filterAccount, setFilterAccount] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [quickTxOpen, setQuickTxOpen] = useState(false);
  const [quickTxType, setQuickTxType] = useState<"Expense" | "Income" | "Transfer">("Expense");
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<FinancialAccount | null>(null);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState<BudgetExecution | null>(null);

  // Action status notification
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const showNotification = (text: string) => {
    setStatusNotice(text);
    setTimeout(() => {
      setStatusNotice(null);
    }, 4000);
  };

  // Keyboard shortcut "N" for quick transaction
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        (e.key === "n" || e.key === "N") &&
        !quickTxOpen &&
        !accountModalOpen &&
        !budgetModalOpen &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        e.preventDefault();
        setQuickTxType("Expense");
        setQuickTxOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [quickTxOpen, accountModalOpen, budgetModalOpen]);

  // Load all finance data
  const loadFinanceData = useCallback(async () => {
    try {
      setLoading(true);
      const [accs, cats, txs, bdgs, sum] = await Promise.all([
        ApiClient.getFinanceAccounts(showArchivedAccounts).catch(() => []),
        ApiClient.getFinanceCategories().catch(() => []),
        ApiClient.getFinanceTransactions({
          month: selectedMonth,
          year: selectedYear,
          limit: 100,
        }).catch(() => []),
        ApiClient.getFinanceBudgets(selectedMonth, selectedYear).catch(() => []),
        ApiClient.getFinanceSummary(selectedMonth, selectedYear).catch(() => null),
      ]);

      setAccounts(accs);
      setCategories(cats);
      setTransactions(txs);
      setBudgets(bdgs);
      setSummary(sum);
    } catch (err) {
      console.error("Error loading finances data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, showArchivedAccounts]);

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  // Period navigation
  const goToPrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const goToCurrentMonth = () => {
    setSelectedMonth(now.getMonth() + 1);
    setSelectedYear(now.getFullYear());
  };

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const currentMonthLabel = `${monthNames[selectedMonth - 1]} ${selectedYear}`;

  // Liquidity totals computed from accounts
  const totalArsLiquidity = useMemo(() => {
    return accounts
      .filter((a) => !a.isArchived && a.currency.toUpperCase() === "ARS")
      .reduce((acc, a) => acc + (Number(a.currentBalance) || 0), 0);
  }, [accounts]);

  const totalUsdLiquidity = useMemo(() => {
    return accounts
      .filter((a) => !a.isArchived && a.currency.toUpperCase() === "USD")
      .reduce((acc, a) => acc + (Number(a.currentBalance) || 0), 0);
  }, [accounts]);

  // Cashflow summary figures fallback
  const arsIncome = summary?.ars?.totalIncome ?? 0;
  const arsExpense = summary?.ars?.totalExpense ?? 0;
  const arsSavings = summary?.ars?.netSavings ?? (arsIncome - arsExpense);
  const arsSavingsRate = summary?.ars?.savingsRatePercentage ?? (arsIncome > 0 ? (arsSavings / arsIncome) * 100 : 0);

  const usdIncome = summary?.usd?.totalIncome ?? 0;
  const usdExpense = summary?.usd?.totalExpense ?? 0;
  const usdSavings = summary?.usd?.netSavings ?? (usdIncome - usdExpense);

  // Deleting a transaction with atomic balance reversal
  async function handleDeleteTransaction(txId: string) {
    if (!confirm("¿Deseas anular esta transacción? Los saldos de las cuentas se revertirán automáticamente.")) {
      return;
    }
    try {
      await ApiClient.deleteFinanceTransaction(txId);
      showNotification("Transacción anulada y saldo revertido exitosamente.");
      loadFinanceData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al revertir la transacción.");
    }
  }

  // Archiving/Restoring account
  async function handleToggleArchiveAccount(account: FinancialAccount) {
    try {
      if (account.isArchived) {
        await ApiClient.restoreFinanceAccount(account.id);
        showNotification(`Cuenta "${account.name}" restaurada.`);
      } else {
        await ApiClient.archiveFinanceAccount(account.id);
        showNotification(`Cuenta "${account.name}" archivada.`);
      }
      loadFinanceData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al actualizar la cuenta.");
    }
  }

  // Deleting budget
  async function handleDeleteBudget(budgetId: string) {
    if (!confirm("¿Eliminar este presupuesto mensual?")) return;
    try {
      await ApiClient.deleteFinanceBudget(budgetId);
      showNotification("Presupuesto eliminado.");
      loadFinanceData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al eliminar presupuesto.");
    }
  }

  // Filtered transactions feed
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Type filter
      const tType = String(t.type).toLowerCase();
      if (filterType === "EXPENSE" && tType !== "expense" && tType !== "0") return false;
      if (filterType === "INCOME" && tType !== "income" && tType !== "1") return false;
      if (filterType === "TRANSFER" && tType !== "transfer" && tType !== "2") return false;

      // Account filter
      if (filterAccount !== "ALL" && t.accountId !== filterAccount && t.destinationAccountId !== filterAccount) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = t.description.toLowerCase().includes(q);
        const matchNotes = t.notes?.toLowerCase().includes(q) ?? false;
        const matchCat = t.categoryName?.toLowerCase().includes(q) ?? false;
        const matchAcc = t.accountName.toLowerCase().includes(q);
        if (!matchDesc && !matchNotes && !matchCat && !matchAcc) return false;
      }

      return true;
    });
  }, [transactions, filterType, filterAccount, searchQuery]);

  // Account Type Icon Helper
  const getAccountIcon = (type: number | string) => {
    const t = String(type).toLowerCase();
    if (t === "0" || t === "cash") return Coins;
    if (t === "1" || t === "bank") return Landmark;
    if (t === "2" || t === "digitalwallet" || t === "digital_wallet") return Smartphone;
    return Wallet;
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-24">
      {/* Top App Header */}
      <header className="border-b border-neutral-800/80 bg-neutral-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Back link & Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Link
              href="/"
              className="p-2 -ml-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition shrink-0"
              title="Volver a Inicio"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-sm sm:text-base truncate">Finanzas</h1>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Bimonetario
                </span>
              </div>
              <p className="text-xs text-neutral-400 hidden sm:block truncate">
                Liquidez disponible, presupuestos y control patrimonial
              </p>
            </div>
          </div>

          {/* Right Header Actions: Privacy Eye + Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <PrivacyToggle isPrivate={isPrivate} onToggle={togglePrivacy} />

            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setQuickTxType("Expense");
                  setQuickTxOpen(true);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold transition"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>+ Gasto</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setQuickTxType("Income");
                  setQuickTxOpen(true);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+ Ingreso</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setQuickTxType("Transfer");
                  setQuickTxOpen(true);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-semibold transition"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>⇄ Transferir</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setAccountToEdit(null);
                setAccountModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-medium text-white transition"
              title="Crear nueva cuenta o billetera"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Nueva Cuenta</span>
            </button>
          </div>
        </div>
      </header>

      {/* Floating Notification Banner */}
      {statusNotice && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-neutral-900 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-2xl backdrop-blur-md">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{statusNotice}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-7">
        {/* Month Selector Bar & Operate Mode Quick Shortcut info */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-neutral-900/60 border border-neutral-800/80 p-3 sm:p-4 rounded-2xl">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToPrevMonth}
              className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white transition"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-semibold text-white">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>{currentMonthLabel}</span>
            </div>

            <button
              type="button"
              onClick={goToNextMonth}
              className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white transition"
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {(selectedMonth !== now.getMonth() + 1 || selectedYear !== now.getFullYear()) && (
              <button
                type="button"
                onClick={goToCurrentMonth}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium hover:bg-emerald-500/20 transition"
              >
                Mes Actual
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span className="hidden md:inline">Operate Mode:</span>
            <kbd className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-neutral-300">
              N
            </kbd>
            <span className="text-neutral-500">para registrar movimiento en &lt; 5s</span>
          </div>
        </div>

        {/* 1. LIQUIDITY CARDS (ARS & USD SEGREGATED) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
              Liquidez Segregada Bimonetaria
            </h2>
            <span className="text-[11px] text-neutral-500">Saldos libres consolidados</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ARS CARD */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/30 via-neutral-900 to-neutral-900 border border-emerald-500/30 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    $
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-white">Pesos Argentinos (ARS)</h3>
                    <p className="text-[10px] text-neutral-400">Liquidez disponible</p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ARS
                </span>
              </div>

              <div className="pt-4 space-y-3">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">
                    Total Disponible
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums tracking-tight">
                    {formatMoney(totalArsLiquidity, "ARS", isPrivate)}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-800/60 text-xs">
                  <div>
                    <div className="flex items-center gap-1 text-[11px] text-neutral-400 mb-0.5">
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                      <span>Ingresos</span>
                    </div>
                    <p className="font-semibold text-emerald-400 tabular-nums truncate">
                      {formatMoney(arsIncome, "ARS", isPrivate)}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[11px] text-neutral-400 mb-0.5">
                      <TrendingDown className="w-3 h-3 text-rose-400" />
                      <span>Gastos</span>
                    </div>
                    <p className="font-semibold text-rose-400 tabular-nums truncate">
                      {formatMoney(arsExpense, "ARS", isPrivate)}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[11px] text-neutral-400 mb-0.5">
                      <Percent className="w-3 h-3 text-sky-400" />
                      <span>Ahorro</span>
                    </div>
                    <p className="font-semibold text-sky-300 tabular-nums truncate">
                      {isPrivate ? "••••" : `${arsSavingsRate.toFixed(1)}%`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* USD CARD */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-950/30 via-neutral-900 to-neutral-900 border border-sky-500/30 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                    US$
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-white">Dólares Estadounidenses (USD)</h3>
                    <p className="text-[10px] text-neutral-400">Liquidez disponible</p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  USD
                </span>
              </div>

              <div className="pt-4 space-y-3">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">
                    Total Disponible
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums tracking-tight">
                    {formatMoney(totalUsdLiquidity, "USD", isPrivate)}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-800/60 text-xs">
                  <div>
                    <div className="flex items-center gap-1 text-[11px] text-neutral-400 mb-0.5">
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                      <span>Ingresos</span>
                    </div>
                    <p className="font-semibold text-emerald-400 tabular-nums truncate">
                      {formatMoney(usdIncome, "USD", isPrivate)}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[11px] text-neutral-400 mb-0.5">
                      <TrendingDown className="w-3 h-3 text-rose-400" />
                      <span>Gastos</span>
                    </div>
                    <p className="font-semibold text-rose-400 tabular-nums truncate">
                      {formatMoney(usdExpense, "USD", isPrivate)}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[11px] text-neutral-400 mb-0.5">
                      <Sparkles className="w-3 h-3 text-sky-400" />
                      <span>Neto</span>
                    </div>
                    <p className="font-semibold text-sky-300 tabular-nums truncate">
                      {formatMoney(usdSavings, "USD", isPrivate)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. CUENTAS Y BILLETERAS */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Landmark className="w-3.5 h-3.5 text-emerald-400" />
              Cuentas & Billeteras ({accounts.filter((a) => !a.isArchived).length})
            </h2>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowArchivedAccounts((prev) => !prev)}
                className="text-[11px] text-neutral-500 hover:text-neutral-300 transition"
              >
                {showArchivedAccounts ? "Ocultar archivadas" : "Ver archivadas"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountToEdit(null);
                  setAccountModalOpen(true);
                }}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar</span>
              </button>
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="p-8 rounded-2xl bg-neutral-900/40 border border-dashed border-neutral-800 text-center text-xs text-neutral-500 space-y-3">
              <p>Aún no tienes cuentas creadas para tus finanzas.</p>
              <button
                type="button"
                onClick={() => {
                  setAccountToEdit(null);
                  setAccountModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition"
              >
                Crear primera cuenta
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {accounts.map((acc) => {
                const IconComp = getAccountIcon(acc.accountType);
                return (
                  <div
                    key={acc.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      acc.isArchived
                        ? "bg-neutral-950/50 border-neutral-800/40 opacity-60"
                        : "bg-neutral-900/70 hover:bg-neutral-900 border-neutral-800 hover:border-neutral-700 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            acc.currency === "USD"
                              ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                            {acc.name}
                            {acc.isArchived && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400">
                                Archivada
                              </span>
                            )}
                          </h4>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {acc.currency}
                          </span>
                        </div>
                      </div>

                      {/* Account Options */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setAccountToEdit(acc);
                            setAccountModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition"
                          title="Editar cuenta"
                        >
                          <span className="text-[11px]">Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleArchiveAccount(acc)}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition"
                          title={acc.isArchived ? "Restaurar cuenta" : "Archivar cuenta"}
                        >
                          {acc.isArchived ? (
                            <ArchiveRestore className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Archive className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-800/60 flex items-baseline justify-between">
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Saldo</span>
                      <span className="text-base font-bold text-white tabular-nums">
                        {formatMoney(acc.currentBalance, acc.currency, isPrivate)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 3. CONTROL PREVENTIVO DE PRESUPUESTOS */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-indigo-400" />
              Presupuestos del Mes ({budgets.length})
            </h2>

            <button
              type="button"
              onClick={() => {
                setBudgetToEdit(null);
                setBudgetModalOpen(true);
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Fijar Presupuesto</span>
            </button>
          </div>

          {budgets.length === 0 ? (
            <div className="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800 text-center text-xs text-neutral-500 space-y-2">
              <p>No tienes límites presupuestarios configurados para este mes.</p>
              <p className="text-[11px] text-neutral-600">
                Fija límites por categoría para recibir alertas preventivas en 80% y 100%.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {budgets.map((b) => {
                const percent = Math.min(Math.round(b.percentage), 100);
                const isExceeded = b.percentage >= 100;
                const isWarning = b.percentage >= 80 && !isExceeded;

                const colorClass = isExceeded
                  ? "bg-rose-500"
                  : isWarning
                  ? "bg-amber-500"
                  : "bg-emerald-500";

                return (
                  <div
                    key={b.id}
                    className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 transition flex flex-col justify-between gap-3 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold text-white truncate">
                          {b.categoryName || "Gasto Total Mensual"}
                        </h4>
                        <div className="flex items-center gap-1">
                          {isExceeded && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Excedido
                            </span>
                          )}
                          {isWarning && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Atención
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteBudget(b.id)}
                            className="p-1 rounded text-neutral-500 hover:text-rose-400 transition"
                            title="Eliminar presupuesto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1.5 mt-3">
                        <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${colorClass} transition-all duration-300 rounded-full`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] tabular-nums">
                          <span className="text-neutral-400 font-medium">
                            {formatMoney(b.spentAmount, b.currency, isPrivate)}{" "}
                            <span className="text-neutral-500 font-normal">gastado</span>
                          </span>
                          <span className="text-white font-semibold">
                            {formatMoney(b.limitAmount, b.currency, isPrivate)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[10px] text-neutral-400">
                      <span>Restante: {formatMoney(b.remainingAmount, b.currency, isPrivate)}</span>
                      <span className="font-mono font-semibold text-neutral-300">
                        {isPrivate ? "•••%" : `${b.percentage.toFixed(0)}%`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 4. DISTRIBUCIÓN DE GASTOS POR CATEGORÍA */}
        {summary?.ars?.expensesByCategory && summary.ars.expensesByCategory.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Distribución de Gastos (ARS)
            </h2>

            <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-3">
              {summary.ars.expensesByCategory.map((cat) => (
                <div key={cat.categoryId || cat.categoryName} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-200 font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                      {cat.categoryName}
                    </span>
                    <div className="flex items-center gap-3 tabular-nums text-xs">
                      <span className="text-neutral-400">{cat.percentage.toFixed(1)}%</span>
                      <span className="font-semibold text-white">
                        {formatMoney(cat.amount, "ARS", isPrivate)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 5. HISTORIAL DE MOVIMIENTOS & FEED */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Historial de Movimientos ({filteredTransactions.length})
            </h2>

            {/* Quick Filter Bar */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Type Filter */}
              <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setFilterType("ALL")}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    filterType === "ALL" ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("EXPENSE")}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    filterType === "EXPENSE" ? "bg-rose-500/20 text-rose-300" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Gastos
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("INCOME")}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    filterType === "INCOME" ? "bg-emerald-500/20 text-emerald-300" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Ingresos
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("TRANSFER")}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    filterType === "TRANSFER" ? "bg-sky-500/20 text-sky-300" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Transferencias
                </button>
              </div>

              {/* Account Dropdown Filter */}
              <select
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 focus:outline-none"
              >
                <option value="ALL">Todas las cuentas</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por detalle, categoría o notas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:border-neutral-600 focus:outline-none transition"
            />
          </div>

          {/* Transactions List */}
          {filteredTransactions.length === 0 ? (
            <div className="p-10 rounded-2xl bg-neutral-900/40 border border-neutral-800 text-center text-xs text-neutral-500 space-y-2">
              <p>No se encontraron movimientos registrados en este período.</p>
              <button
                type="button"
                onClick={() => {
                  setQuickTxType("Expense");
                  setQuickTxOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition"
              >
                Registrar primer movimiento
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((tx) => {
                const tType = String(tx.type).toLowerCase();
                const isExpense = tType === "expense" || tType === "0";
                const isIncome = tType === "income" || tType === "1";
                const isTransfer = tType === "transfer" || tType === "2";

                return (
                  <div
                    key={tx.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800/80 hover:border-neutral-700 transition flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Icon */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isExpense
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : isIncome
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                        }`}
                      >
                        {isExpense ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : isIncome ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowRightLeft className="w-4 h-4" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-semibold text-white truncate">
                            {tx.description}
                          </h4>
                          {tx.categoryName && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 truncate">
                              {tx.categoryName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-400 pt-0.5 truncate">
                          <span>{tx.accountName}</span>
                          {isTransfer && tx.destinationAccountName && (
                            <>
                              <span>➔</span>
                              <span>{tx.destinationAccountName}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{tx.date}</span>
                          {tx.notes && (
                            <>
                              <span>•</span>
                              <span className="italic text-neutral-500 truncate">{tx.notes}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Amount & Delete */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <div
                          className={`text-sm sm:text-base font-bold tabular-nums ${
                            isExpense
                              ? "text-rose-400"
                              : isIncome
                              ? "text-emerald-400"
                              : "text-sky-300"
                          }`}
                        >
                          {isExpense ? "-" : isIncome ? "+" : ""}
                          {formatMoney(tx.amount, tx.accountCurrency, isPrivate)}
                        </div>
                        {isTransfer && tx.destinationAmount && (
                          <div className="text-[10px] text-neutral-400 tabular-nums font-mono">
                            ➔ {formatMoney(tx.destinationAmount, tx.destinationAccountCurrency || "USD", isPrivate)}
                          </div>
                        )}
                      </div>

                      {/* Delete button (with atomic reversal) */}
                      <button
                        type="button"
                        onClick={() => handleDeleteTransaction(tx.id)}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition opacity-80 group-hover:opacity-100"
                        title="Anular y revertir saldo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Floating Action Button on Mobile */}
      <div className="sm:hidden fixed bottom-5 right-5 z-40">
        <button
          type="button"
          onClick={() => {
            setQuickTxType("Expense");
            setQuickTxOpen(true);
          }}
          className="w-13 h-13 rounded-full bg-emerald-500 text-neutral-950 flex items-center justify-center shadow-2xl font-bold transition-transform active:scale-95"
          title="Registrar movimiento"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* MODALS */}
      <QuickTransactionModal
        isOpen={quickTxOpen}
        onClose={() => setQuickTxOpen(false)}
        onSuccess={() => {
          showNotification("Transacción registrada con éxito.");
          loadFinanceData();
        }}
        accounts={accounts.filter((a) => !a.isArchived)}
        categories={categories}
        defaultType={quickTxType}
      />

      <AccountModal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        onSuccess={() => {
          showNotification("Cuenta guardada exitosamente.");
          loadFinanceData();
        }}
        accountToEdit={accountToEdit}
      />

      <BudgetModal
        isOpen={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        onSuccess={() => {
          showNotification("Presupuesto fijado exitosamente.");
          loadFinanceData();
        }}
        categories={categories.filter((c) => String(c.type).toLowerCase() !== "income" && String(c.type) !== "1")}
        currentMonth={selectedMonth}
        currentYear={selectedYear}
        initialBudget={budgetToEdit}
      />
    </div>
  );
}
