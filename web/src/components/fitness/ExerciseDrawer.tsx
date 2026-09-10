"use client";

import React from "react";
import { X, ExternalLink, Dumbbell, Flame, CheckCircle, Info } from "lucide-react";
import { type Exercise } from "@/lib/api-client";

interface ExerciseDrawerProps {
  exercise: Exercise | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ExerciseDrawer({ exercise, isOpen, onClose }: ExerciseDrawerProps) {
  if (!isOpen || !exercise) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-neutral-900 border-l border-neutral-800 h-full flex flex-col shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between sticky top-0 bg-neutral-900/90 backdrop-blur-md z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {exercise.discipline}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-neutral-800 text-neutral-300 border border-neutral-700">
                {exercise.equipment}
              </span>
              {exercise.isCustom && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Personalizado
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-neutral-100">{exercise.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6 flex-1">
          {/* Visual Demonstration (GIF / Image) */}
          <div className="w-full h-64 bg-neutral-950 rounded-2xl border border-neutral-800 overflow-hidden flex items-center justify-center relative">
            {exercise.gifUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={exercise.gifUrl}
                alt={exercise.name}
                className="w-full h-full object-contain p-2"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-neutral-500">
                <Dumbbell className="w-10 h-10 stroke-1" />
                <span className="text-xs">Demostración visual no disponible</span>
              </div>
            )}
          </div>

          {/* Muscle Stimulation Ponderation (1-100%) */}
          <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Estímulo Muscular Biomecánico</span>
              </h3>
              <span className="text-[11px] text-neutral-500">Escala 1 - 100%</span>
            </div>

            <div className="space-y-3">
              {exercise.muscleStimulus.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="capitalize font-medium text-neutral-300">
                      {item.muscle.replace("_", " ")}
                    </span>
                    <span className="font-mono text-neutral-400 tabular-nums font-semibold">
                      {item.stimulus_pct}%
                    </span>
                  </div>
                  <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.stimulus_pct === 100
                          ? "bg-amber-500"
                          : item.stimulus_pct >= 60
                          ? "bg-amber-500/70"
                          : "bg-neutral-600"
                      }`}
                      style={{ width: `${item.stimulus_pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          {exercise.instructions && exercise.instructions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-sky-400" />
                <span>Instrucciones Técnicas</span>
              </h3>
              <ol className="space-y-2.5">
                {exercise.instructions.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-xs text-neutral-300 leading-relaxed bg-neutral-950/40 p-3 rounded-xl border border-neutral-800/60">
                    <span className="w-5 h-5 rounded-full bg-neutral-800 text-amber-400 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* External Video Link */}
          {exercise.videoUrl && (
            <div className="pt-2">
              <a
                href={exercise.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-neutral-700 transition active:scale-98"
              >
                <ExternalLink className="w-4 h-4 text-amber-400" />
                <span>Ver video explicativo extendido</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
