"use client";

import React, { useState, useEffect } from "react";
import { X, Wallet, Check, Landmark, Smartphone, Coins, HelpCircle } from "lucide-react";
import {
  ApiClient,
  type FinancialAccount,
  type CreateFinancialAccountRequest,
  type UpdateFinancialAccountRequest,
  type AccountType,
} from "@/lib/api-client";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (acc: FinancialAccount) => void;
  accountToEdit?: FinancialAccount | null;
}

const ACCOUNT_TYPES: { type: AccountType; label: string; icon: React.ElementType }[] = [
  { type: 0, label: "Efectivo", icon: Coins },
  { type: 1, label: "Banco", icon: Landmark },
  { type: 2, label: "Billetera Virtual", icon: Smartphone },
  { type: 3, label: "Cripto / Inversión", icon: Wallet },
  { type: 4, label: "Otro", icon: HelpCircle },
];

const COLORS = [
  { name: "emerald", label: "Esmeralda", class: "bg-emerald-500" },
  { name: "sky", label: "Azul / Cielo", class: "bg-sky-500" },
  { name: "indigo", label: "Índigo", class: "bg-indigo-500" },
  { name: "purple", label: "Púrpura", class: "bg-purple-500" },
  { name: "amber", label: "Ámbar", class: "bg-amber-500" },
  { name: "rose", label: "Rosa", class: "bg-rose-500" },
  { name: "neutral", label: "Gris neutro", class: "bg-neutral-500" },
];

export function AccountModal({ isOpen, onClose, onSuccess, accountToEdit }: AccountModalProps) {
  const isEditing = !!accountToEdit;

  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>(2); // DigitalWallet default
  const [currency, setCurrency] = useState("ARS");
  const [initialBalanceStr, setInitialBalanceStr] = useState("0");
  const [color, setColor] = useState("emerald");
  const [icon, setIcon] = useState("wallet");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      if (accountToEdit) {
        setName(accountToEdit.name);
        setAccountType(accountToEdit.accountType);
        setCurrency(accountToEdit.currency);
        setInitialBalanceStr(String(accountToEdit.initialBalance));
        setColor(accountToEdit.color || "emerald");
        setIcon(accountToEdit.icon || "wallet");
      } else {
        setName("");
        setAccountType(2);
        setCurrency("ARS");
        setInitialBalanceStr("0");
        setColor("emerald");
        setIcon("wallet");
      }
    }
  }, [isOpen, accountToEdit]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg("Ingresa un nombre representativo para la cuenta.");
      return;
    }

    try {
      setSubmitting(true);
      if (isEditing && accountToEdit) {
        const payload: UpdateFinancialAccountRequest = {
          name: name.trim(),
          color,
          icon,
        };
        const updated = await ApiClient.updateFinanceAccount(accountToEdit.id, payload);
        onSuccess(updated);
      } else {
        const initBal = parseFloat(initialBalanceStr.replace(",", ".")) || 0;
        const payload: CreateFinancialAccountRequest = {
          name: name.trim(),
          accountType,
          currency: currency.toUpperCase(),
          initialBalance: initBal,
          color,
          icon,
        };
        const created = await ApiClient.createFinanceAccount(payload);
        onSuccess(created);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al procesar la cuenta.";
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
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-white">
              {isEditing ? "Editar Cuenta" : "Nueva Cuenta o Billetera"}
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

          {/* Account Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300">Nombre de la Cuenta</label>
            <input
              type="text"
              placeholder="Ej. Mercado Pago, Banco Galicia, Efectivo..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:border-neutral-600 focus:outline-none placeholder-neutral-600 transition"
              autoFocus
            />
          </div>

          {/* Account Type (Only if creating) */}
          {!isEditing && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Tipo de Cuenta</label>
              <div className="grid grid-cols-3 gap-2">
                {ACCOUNT_TYPES.map((t) => {
                  const IconComp = t.icon;
                  const isSelected = accountType === t.type;
                  return (
                    <button
                      key={String(t.type)}
                      type="button"
                      onClick={() => setAccountType(t.type)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition ${
                        isSelected
                          ? "bg-neutral-100 text-neutral-950 border-white font-semibold"
                          : "bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800"
                      }`}
                    >
                      <IconComp className="w-4 h-4 mb-1" />
                      <span className="text-[10px] leading-tight truncate w-full">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Currency & Initial Balance */}
          {!isEditing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Divisa</label>
                <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setCurrency("ARS")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                      currency === "ARS"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    ARS ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency("USD")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                      currency === "USD"
                        ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    USD (US$)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Saldo Inicial</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={initialBalanceStr}
                  onChange={(e) => setInitialBalanceStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:border-neutral-600 focus:outline-none tabular-nums transition"
                />
              </div>
            </div>
          )}

          {/* Color Scheme */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300">Color Distintivo</label>
            <div className="flex items-center gap-2 pt-0.5">
              {COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c.name)}
                  title={c.label}
                  className={`w-6 h-6 rounded-full ${c.class} transition-transform ${
                    color === c.name ? "ring-2 ring-white ring-offset-2 ring-offset-neutral-900 scale-110" : "opacity-70 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>

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
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? "Guardar Cambios" : "Crear Cuenta"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
