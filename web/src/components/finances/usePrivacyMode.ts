"use client";

import { useState, useEffect, useCallback } from "react";

export const PRIVACY_STORAGE_KEY = "lt_finance_privacy_mode";

export function usePrivacyMode() {
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const stored = localStorage.getItem(PRIVACY_STORAGE_KEY);
      if (stored !== null) {
        setIsPrivate(stored === "true");
      }
    } catch {
      // LocalStorage access might fail in restricted environments
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === PRIVACY_STORAGE_KEY) {
        setIsPrivate(e.newValue === "true");
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const togglePrivacy = useCallback(() => {
    setIsPrivate((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(PRIVACY_STORAGE_KEY, String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  return { isPrivate, togglePrivacy, isMounted };
}

/**
 * Formats monetary amounts with strict zero layout shifts.
 * When isPrivate is true, returns "••••••".
 */
export function formatMoney(
  amount: number | null | undefined,
  currency = "ARS",
  isPrivate = false
): string {
  if (isPrivate) {
    return "••••••";
  }

  const val = Number(amount ?? 0);
  const isUsd = currency?.toUpperCase() === "USD";

  const formatted = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);

  return isUsd ? `US$ ${formatted}` : `$ ${formatted}`;
}
