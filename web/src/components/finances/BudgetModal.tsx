"use client";

import React, { useState, useEffect } from "react";
import { X, Check, Target, Layers } from "lucide-react";
import {
  ApiClient,
  type TransactionCategory,
  type BudgetExecution,
  type CreateOrUpdateBudgetRequest,
} from "@/lib/api-client";

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (budget: BudgetExecution) => void;
  categories: TransactionCategory[];
  currentMonth: number;
  currentYear: number;
  initialBudget?: BudgetExecution | null;
}

export function BudgetModal({
  isOpen,
  onClose,
  onSuccess,
  categories,
  currentMonth,
  currentYear,
  initialBudget,
}: BudgetModalProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [limitStr, setLimitStr] = useState("");
  const [currency, setCurrency] = useState("ARS");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      if (initialBudget) {
        setSelectedCategoryId(initialBudget.categoryId || "");
        setLimitStr(String(initialBudget.limitAmount));
        setCurrency(initialBudget.currency || "ARS");
      } else {
        setSelectedCategoryId(categories[0]?.id || "");
        setLimitStr("");
        setCurrency("ARS");
      }
    }
  }, [isOpen, initialBudget, categories]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const parsedLimit = parseFloat(limitStr.replace(",", "."));
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      setErrorMsg("Ingresa un monto de límite presupuestario mayor a cero.");
      return;
    }

    try {
      setSubmitting(true);
      const payload: CreateOrUpdateBudgetRequest = {
        month: currentMonth,
        year: currentYear,
        limitAmount: parsedLimit,
        currency,
        categoryId: selectedCategoryId || null,
      };

      const result = await ApiClient.setFinanceBudget(payload);
      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al fijar el presupuesto.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/80 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-white">
              {initialBudget ? "Modificar Presupuesto" : "Fijar Presupuesto Mensual"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-neutral-400" />
              <span>Categoría de Gasto</span>
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:border-neutral-600 focus:outline-none transition"
            >
              <option value="">-- Presupuesto Global Mensual --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Limit Amount & Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Límite Mensual</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ej. 150000"
                value={limitStr}
                onChange={(e) => setLimitStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:border-neutral-600 focus:outline-none tabular-nums transition"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Moneda</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:border-neutral-600 focus:outline-none transition"
              >
                <option value="ARS">ARS ($)</option>
                <option value="USD">USD (US$)</option>
              </select>
            </div>
          </div>

          <p className="text-[11px] text-neutral-500">
            Período de aplicación: Mes {currentMonth} / {currentYear}. Se activarán alertas de consumo en 80% (ámbar) y 100% (rojo).
          </p>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-neutral-800 text-xs text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Presupuesto</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
