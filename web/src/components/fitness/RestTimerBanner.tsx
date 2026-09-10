"use client";

import React from "react";
import { Timer, Plus, X } from "lucide-react";

interface RestTimerBannerProps {
  isRunning: boolean;
  remainingSeconds: number;
  totalSeconds: number;
  onAddSeconds: (seconds?: number) => void;
  onStop: () => void;
}

export function RestTimerBanner({
  isRunning,
  remainingSeconds,
  totalSeconds,
  onAddSeconds,
  onStop,
}: RestTimerBannerProps) {
  if (!isRunning || remainingSeconds <= 0) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

  const progressPct = totalSeconds > 0
    ? Math.max(0, Math.min(100, (remainingSeconds / totalSeconds) * 100))
    : 0;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className="bg-neutral-900/95 border border-amber-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center animate-pulse">
              <Timer className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-wide uppercase text-amber-400/80">Descanso entre series</p>
              <p className="text-2xl font-bold font-mono text-neutral-100 tabular-nums leading-none">
                {timeFormatted}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onAddSeconds(30)}
              className="h-10 px-3.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1 border border-neutral-700 transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>30s</span>
            </button>
            <button
              onClick={onStop}
              aria-label="Cerrar temporizador"
              className="h-10 w-10 flex items-center justify-center text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/80 rounded-xl transition active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-amber-500 h-full rounded-full transition-all duration-300 ease-linear"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
