"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, GraduationCap, Network, Sparkles } from "lucide-react";
import { CareerPlanDashboard } from "@/components/academics/plan/CareerPlanDashboard";

export default function CareerPlanPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-24">
      {/* Top Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Link
              href="/academia"
              className="p-2 -ml-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition shrink-0"
              title="Volver a Cursadas"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                <Network className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h1 className="font-semibold text-sm sm:text-base flex items-center gap-2 truncate">
                  <span className="truncate">Plan de Carrera & Malla Curricular</span>
                  <span className="hidden sm:inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 shrink-0">
                    Motor DAG & IA
                  </span>
                </h1>
                <p className="text-xs text-neutral-400 hidden sm:block truncate">
                  Grafo de dependencias, cálculo de camino crítico y recomendador de cursada
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/academia"
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition"
            >
              Ver Cursadas Activas
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <CareerPlanDashboard />
      </main>
    </div>
  );
}
