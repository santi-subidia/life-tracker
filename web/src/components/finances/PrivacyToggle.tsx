"use client";

import React from "react";
import { Eye, EyeOff } from "lucide-react";

interface PrivacyToggleProps {
  isPrivate: boolean;
  onToggle: () => void;
  className?: string;
}

export function PrivacyToggle({ isPrivate, onToggle, className = "" }: PrivacyToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={isPrivate ? "Mostrar cifras monetarias" : "Modo Privacidad (ocultar cifras)"}
      aria-label={isPrivate ? "Mostrar cifras monetarias" : "Modo Privacidad (ocultar cifras)"}
      className={`relative inline-flex items-center justify-center p-2 rounded-xl border text-xs font-medium transition-all select-none ${
        isPrivate
          ? "bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25 shadow-sm shadow-amber-500/10"
          : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/80"
      } ${className}`}
    >
      {isPrivate ? (
        <EyeOff className="w-4 h-4 transition-transform duration-150" />
      ) : (
        <Eye className="w-4 h-4 transition-transform duration-150" />
      )}
      <span className="sr-only">
        {isPrivate ? "Modo Privacidad Activado" : "Modo Privacidad Desactivado"}
      </span>
    </button>
  );
}
