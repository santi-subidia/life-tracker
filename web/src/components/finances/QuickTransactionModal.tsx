"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Utensils,
  Car,
  ShoppingBag,
  Zap,
  Heart,
  Film,
  GraduationCap,
  Briefcase,
  DollarSign,
  TrendingUp,
  Tag,
  Wallet,
  Check,
  Calendar,
  Layers,
  Sparkles
} from "lucide-react";
import {
  ApiClient,
  type FinancialAccount,
  type TransactionCategory,
  type Transaction,
  type CreateTransactionRequest,
  type TransactionType
} from "@/lib/api-client";

interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tx: Transaction) => void;
  accounts: FinancialAccount[];
  categories?: TransactionCategory[];
  defaultType?: "Expense" | "Income" | "Transfer";
  defaultAccountId?: string;
}

// Preset icon mapping for categories
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  utensils: Utensils,
  food: Utensils,
  car: Car,
  transport: Car,
  shopping: ShoppingBag,
  bag: ShoppingBag,
  services: Zap,
  zap: Zap,
  heart: Heart,
  health: Heart,
  entertainment: Film,
  film: Film,
  education: GraduationCap,
  work: Briefcase,
  salary: DollarSign,
  dollar: DollarSign,
  investment: TrendingUp,
  tag: Tag,
};

const DEFAULT_QUICK_PRESETS_EXPENSE = [
  { name: "Alimentación", icon: "utensils", color: "emerald" },
  { name: "Transporte", icon: "car", color: "sky" },
  { name: "Supermercado", icon: "shopping", color: "indigo" },
  { name: "Servicios", icon: "zap", color: "amber" },
  { name: "Salud", icon: "heart", color: "rose" },
  { name: "Ocio", icon: "film", color: "purple" },
];

const DEFAULT_QUICK_PRESETS_INCOME = [
  { name: "Sueldo", icon: "dollar", color: "emerald" },
  { name: "Honorarios", icon: "briefcase", color: "sky" },
  { name: "Rendimientos", icon: "investment", color: "indigo" },
  { name: "Otros Ingresos", icon: "tag", color: "neutral" },
];

export function QuickTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  categories = [],
  defaultType = "Expense",
  defaultAccountId,
}: QuickTransactionModalProps) {
  const [type, setType] = useState<"Expense" | "Income" | "Transfer">(defaultType);
  const [amountStr, setAmountStr] = useState("");
  const [description, setDescription] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedDestAccountId, setSelectedDestAccountId] = useState<string>("");
  const [destinationAmountStr, setDestinationAmountStr] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const amountInputRef = useRef<HTMLInputElement>(null);

  // Sync initial props when opened
  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setAmountStr("");
      setDestinationAmountStr("");
      setDescription("");
      setNotes("");
      setErrorMsg(null);
      setDate(new Date().toISOString().split("T")[0]);

      // Choose account
      if (defaultAccountId && accounts.some((a) => a.id === defaultAccountId)) {
        setSelectedAccountId(defaultAccountId);
      } else if (accounts.length > 0) {
        setSelectedAccountId(accounts[0].id);
      }

      // Default dest account for transfer
      if (accounts.length > 1) {
        const otherAcc = accounts.find((a) => a.id !== (defaultAccountId || accounts[0]?.id));
        if (otherAcc) setSelectedDestAccountId(otherAcc.id);
      }

      setSelectedCategoryId(null);
      setSelectedCategoryName("");

      // Focus input with slight delay for smooth drawer animation
      const timer = setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, defaultType, defaultAccountId, accounts]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentAccount = accounts.find((a) => a.id === selectedAccountId);
  const destinationAccount = accounts.find((a) => a.id === selectedDestAccountId);
  const isBiMonetary =
    type === "Transfer" &&
    currentAccount &&
    destinationAccount &&
    currentAccount.currency !== destinationAccount.currency;

  const parsedAmount = parseFloat(amountStr.replace(",", "."));
  const parsedDestAmount = parseFloat(destinationAmountStr.replace(",", "."));

  // Calculate implicit FX rate if bi-monetary
  const computedExchangeRate =
    isBiMonetary && parsedAmount > 0 && parsedDestAmount > 0
      ? parsedAmount / parsedDestAmount
      : undefined;

  // Filter categories by type
  const relevantCategories = categories.filter((c) => {
    const cType = String(c.type).toLowerCase();
    if (type === "Expense") return cType === "expense" || cType === "both" || cType === "0";
    if (type === "Income") return cType === "income" || cType === "both" || cType === "1";
    return false;
  });

  const quickPresets = type === "Expense" ? DEFAULT_QUICK_PRESETS_EXPENSE : DEFAULT_QUICK_PRESETS_INCOME;

  // Quick amount adder
  const addAmount = (delta: number) => {
    const current = parseFloat(amountStr.replace(",", ".")) || 0;
    const next = current + delta;
    setAmountStr(String(next));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("Ingresa un monto mayor a cero.");
      amountInputRef.current?.focus();
      return;
    }

    if (!selectedAccountId) {
      setErrorMsg("Selecciona una cuenta de origen.");
      return;
    }

    if (type === "Transfer") {
      if (!selectedDestAccountId) {
        setErrorMsg("Selecciona la cuenta de destino.");
        return;
      }
      if (selectedAccountId === selectedDestAccountId) {
        setErrorMsg("La cuenta de destino debe ser diferente a la de origen.");
        return;
      }
      if (isBiMonetary && (isNaN(parsedDestAmount) || parsedDestAmount <= 0)) {
        setErrorMsg("Ingresa el monto de destino para la transferencia bimonetaria.");
        return;
      }
    }

    // Determine final description
    let finalDescription = description.trim();
    if (!finalDescription) {
      if (type === "Transfer") {
        finalDescription = `Transferencia a ${destinationAccount?.name || "otra cuenta"}`;
      } else if (selectedCategoryName) {
        finalDescription = selectedCategoryName;
      } else {
        finalDescription = type === "Expense" ? "Gasto rápido" : "Ingreso rápido";
      }
    }

    // Map type to API enum
    const txType: TransactionType = type === "Expense" ? 0 : type === "Income" ? 1 : 2;

    const payload: CreateTransactionRequest = {
      accountId: selectedAccountId,
      type: txType,
      amount: parsedAmount,
      description: finalDescription,
      date: date || null,
      categoryId: type !== "Transfer" ? selectedCategoryId : null,
      notes: notes.trim() || null,
      destinationAccountId: type === "Transfer" ? selectedDestAccountId : null,
      destinationAmount: isBiMonetary ? parsedDestAmount : null,
      exchangeRate: computedExchangeRate || null,
      isCleared: true,
    };

    try {
      setSubmitting(true);
      const createdTx = await ApiClient.createFinanceTransaction(payload);
      onSuccess(createdTx);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar el movimiento.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/80 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-tx-title"
      >
        {/* Header with Type Selector & Close Button */}
        <div className="p-4 sm:p-5 border-b border-neutral-800/80 flex items-center justify-between gap-3">
          {/* Segmented Control */}
          <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800/80 text-xs font-medium">
            <button
              type="button"
              onClick={() => setType("Expense")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                type === "Expense"
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Gasto</span>
            </button>
            <button
              type="button"
              onClick={() => setType("Income")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                type === "Income"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Ingreso</span>
            </button>
            <button
              type="button"
              onClick={() => setType("Transfer")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                type === "Transfer"
                  ? "bg-sky-500/20 text-sky-400 border border-sky-500/30 font-semibold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Transferir</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 sm:p-6 space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Amount Big Hero Input */}
          <div className="space-y-1.5 text-center sm:text-left">
            <label className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
              {type === "Transfer" ? "Monto a Transferir" : "Monto del Movimiento"}
            </label>
            <div className="relative flex items-center justify-center sm:justify-start">
              <span className="text-2xl sm:text-3xl font-bold text-neutral-400 mr-2 select-none">
                {currentAccount?.currency === "USD" ? "US$" : "$"}
              </span>
              <input
                ref={amountInputRef}
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                placeholder="0"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="bg-transparent text-3xl sm:text-4xl font-extrabold text-white placeholder-neutral-700 outline-none w-full max-w-[280px] tabular-nums"
                autoFocus
              />
            </div>

            {/* Quick Add Amount Badges */}
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto pb-1 text-xs">
              <span className="text-[10px] text-neutral-500 font-medium mr-1 uppercase">Rápido:</span>
              <button
                type="button"
                onClick={() => addAmount(1000)}
                className="px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 font-mono text-[11px] transition"
              >
                +1.000
              </button>
              <button
                type="button"
                onClick={() => addAmount(5000)}
                className="px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 font-mono text-[11px] transition"
              >
                +5.000
              </button>
              <button
                type="button"
                onClick={() => addAmount(10000)}
                className="px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 font-mono text-[11px] transition"
              >
                +10.000
              </button>
              <button
                type="button"
                onClick={() => addAmount(20000)}
                className="px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 font-mono text-[11px] transition"
              >
                +20.000
              </button>
            </div>
          </div>

          {/* Account Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-neutral-400" />
                <span>{type === "Transfer" ? "Cuenta Origen" : "Cuenta"}</span>
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:border-neutral-600 focus:outline-none transition"
              >
                {accounts.length === 0 && <option value="">Sin cuentas creadas</option>}
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </option>
                ))}
              </select>
            </div>

            {/* Destination Account (Only for Transfers) */}
            {type === "Transfer" && (
              <div className="space-y-1.5 animate-fadeIn">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400" />
                  <span>Cuenta Destino</span>
                </label>
                <select
                  value={selectedDestAccountId}
                  onChange={(e) => setSelectedDestAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:border-neutral-600 focus:outline-none transition"
                >
                  {accounts
                    .filter((a) => a.id !== selectedAccountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.currency})
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {/* Bi-monetary Transfer Destination Amount */}
          {isBiMonetary && (
            <div className="p-3.5 rounded-xl bg-sky-950/20 border border-sky-500/30 space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-sky-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  Transferencia Bimonetaria ({currentAccount?.currency} ➔ {destinationAccount?.currency})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-sky-300 select-none">
                  {destinationAccount?.currency === "USD" ? "US$" : "$"}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={`Monto exacto en ${destinationAccount?.currency}`}
                  value={destinationAmountStr}
                  onChange={(e) => setDestinationAmountStr(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-neutral-950 border border-sky-500/30 text-white text-sm focus:border-sky-400 outline-none tabular-nums"
                />
              </div>
              {computedExchangeRate && (
                <p className="text-[11px] text-sky-400/80 font-mono">
                  Tipo de cambio pactado: 1 {destinationAccount?.currency} ={" "}
                  {computedExchangeRate.toFixed(2)} {currentAccount?.currency}
                </p>
              )}
            </div>
          )}

          {/* Quick Categories (Only for Expense & Income) */}
          {type !== "Transfer" && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Categoría Rápida</span>
                </label>
                {selectedCategoryName && (
                  <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    {selectedCategoryName}
                  </span>
                )}
              </div>

              {/* Dynamic categories or presets */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {relevantCategories.length > 0
                  ? relevantCategories.map((cat) => {
                      const IconComp = CATEGORY_ICONS[cat.icon.toLowerCase()] || Tag;
                      const isSelected = selectedCategoryId === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategoryId(cat.id);
                            setSelectedCategoryName(cat.name);
                          }}
                          className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                            isSelected
                              ? "bg-neutral-100 text-neutral-950 border-white font-semibold shadow-md"
                              : "bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800/80 hover:border-neutral-700"
                          }`}
                        >
                          <IconComp className="w-4 h-4 mb-1" />
                          <span className="text-[11px] truncate w-full">{cat.name}</span>
                        </button>
                      );
                    })
                  : quickPresets.map((preset) => {
                      const IconComp = CATEGORY_ICONS[preset.icon] || Tag;
                      const isSelected = selectedCategoryName === preset.name;
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            setSelectedCategoryName(preset.name);
                            setSelectedCategoryId(null);
                          }}
                          className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                            isSelected
                              ? "bg-neutral-100 text-neutral-950 border-white font-semibold shadow-md"
                              : "bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800/80 hover:border-neutral-700"
                          }`}
                        >
                          <IconComp className="w-4 h-4 mb-1" />
                          <span className="text-[11px] truncate w-full">{preset.name}</span>
                        </button>
                      );
                    })}
              </div>
            </div>
          )}

          {/* Description & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Detalle / Concepto</label>
              <input
                type="text"
                placeholder={selectedCategoryName || "Ej. Almuerzo rápido, Café, Supermercado..."}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:border-neutral-600 focus:outline-none placeholder-neutral-600 transition"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                <span>Fecha</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:border-neutral-600 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Notes (Optional expandable or clean input) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-400">Notas / Etiquetas (opcional)</label>
            <input
              type="text"
              placeholder="Ej. #almuerzo #reunión con clientes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 focus:border-neutral-600 focus:outline-none placeholder-neutral-700 transition"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-neutral-800 text-xs text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs shadow-lg transition-all ${
                type === "Expense"
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20"
                  : type === "Income"
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                  : "bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20"
              } ${submitting ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {submitting ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>
                    {type === "Expense"
                      ? "Registrar Gasto"
                      : type === "Income"
                      ? "Registrar Ingreso"
                      : "Completar Transferencia"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
