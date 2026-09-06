"use client";

import React from "react";
import { Sparkles, BarChart2, Target, Zap, FileEdit, ArrowUpRight } from "lucide-react";

interface EmptyStatePromptsProps {
  onSelectPrompt: (prompt: string) => void;
}

const SUGGESTED_PROMPTS = [
  {
    icon: BarChart2,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    title: "Correlación Hábitos & Salud",
    prompt: "¿Cómo influyen mis hábitos en mi productividad y salud?",
    description: "Analiza la constancia de tus rutinas con tus marcadores y estado de ánimo.",
  },
  {
    icon: Target,
    color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    title: "Tareas & Exámenes Pendientes",
    prompt: "¿Qué tareas y exámenes tengo pendientes esta semana?",
    description: "Consolida las entregas universitarias con tu tablero Kanban.",
  },
  {
    icon: Zap,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    title: "Resumen Holístico de Hoy",
    prompt: "Resumen holístico de mi día de hoy",
    description: "Revisa check-in diario, hábitos cumplidos y eventos registrados.",
  },
  {
    icon: FileEdit,
    color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    title: "Acción Cruzada: Kanban + Notas",
    prompt: "Crear una tarea en el Kanban y una nota rápida para mi próximo proyecto",
    description: "Pídele a Gemini que coordine acciones en múltiples módulos.",
  },
];

export function EmptyStatePrompts({ onSelectPrompt }: EmptyStatePromptsProps) {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4 flex flex-col items-center text-center space-y-6 animate-in fade-in duration-300">
      {/* Hero Badge & Title */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-pink-500/15 border border-purple-500/30 text-xs font-semibold text-purple-300 shadow-lg shadow-purple-500/10">
          <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          <span>Google Gemini 2.5 Flash</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Inteligencia Holística Personal
        </h2>

        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
          Tu asistente transversal con acceso unificado a tu salud, hábitos, notas, proyectos y academia.
        </p>
      </div>

      {/* Suggested 1-Click Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
        {SUGGESTED_PROMPTS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              className="group p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700/80 transition-all duration-200 flex flex-col justify-between gap-3 text-left shadow-sm hover:shadow-md cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>

              <div>
                <h3 className="text-xs font-semibold text-zinc-200 group-hover:text-white transition">
                  {item.title}
                </h3>
                <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                  {item.description}
                </p>
              </div>

              <span className="text-[11px] text-indigo-400/80 font-medium line-clamp-1 italic">
                "{item.prompt}"
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
