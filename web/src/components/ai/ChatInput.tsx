"use client";

import React, { useRef, useEffect } from "react";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Pregúntale a Gemini sobre tus hábitos, notas, salud, materias o proyectos...",
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSubmit(value.trim());
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled) {
      onSubmit(value.trim());
    }
  };

  return (
    <form onSubmit={handleFormSubmit} className="relative w-full max-w-4xl mx-auto">
      {/* Loading banner above input when disabled */}
      {disabled && (
        <div className="absolute -top-9 left-4 flex items-center gap-2 text-xs text-indigo-400 bg-indigo-950/80 border border-indigo-500/30 px-3 py-1 rounded-full shadow-lg backdrop-blur-sm animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
          <span>Pensando y consultando tus módulos de vida...</span>
        </div>
      )}

      <div className="relative flex items-end rounded-2xl bg-zinc-900/90 border border-zinc-800 focus-within:border-indigo-500/60 shadow-xl transition-all duration-200">
        <textarea
          ref={textareaRef}
          rows={1}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-4 py-3.5 bg-transparent text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none resize-none max-h-48 overflow-y-auto leading-relaxed disabled:opacity-50"
        />

        <div className="p-2.5 flex items-center gap-2 shrink-0">
          <button
            type="submit"
            disabled={!value.trim() || disabled}
            aria-label="Enviar mensaje"
            className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white disabled:text-zinc-500 flex items-center justify-center transition-all duration-150 active:scale-95 shadow-md shadow-indigo-600/20 disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
          >
            {disabled ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
            ) : (
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between px-2 pt-1.5 text-[11px] text-zinc-400">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-purple-400" />
          <span>Acceso transversal a Salud, Hábitos, Notas, Kanban & Academia</span>
        </span>
        <span className="hidden sm:inline">Presiona <kbd className="font-mono bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded text-[10px] text-zinc-400">Enter</kbd> para enviar</span>
      </div>
    </form>
  );
}
