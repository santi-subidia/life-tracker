"use client";

import React from "react";
import { GraduationCap, Award, BookOpen, Calendar, TrendingUp } from "lucide-react";
import type { AcademicMetrics } from "@/lib/api-client";

interface CareerSummaryCardProps {
  metrics: AcademicMetrics | null;
  loading?: boolean;
}

export function CareerSummaryCard({ metrics, loading = false }: CareerSummaryCardProps) {
  const gpa = metrics?.careerAverage !== undefined && metrics.careerAverage !== null
    ? metrics.careerAverage.toFixed(2)
    : "—";

  const approved = metrics?.approvedSubjectsCount ?? 0;
  const inProgress = metrics?.inProgressSubjectsCount ?? 0;
  const upcomingExams = metrics?.upcomingExamsCount ?? 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950/50 via-neutral-900/80 to-neutral-950 border border-indigo-500/20 p-6 shadow-xl">
      {/* Decorative ambient background blur */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-16 w-48 h-48 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left: Career overview & Title */}
        <div className="space-y-1.5 max-w-md">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              Rendimiento Universitario
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Progreso Académico & Carrera
          </h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Control de materias en curso, materias aprobadas y seguimiento de hitos evaluativos con cálculo de promedio ponderado.
          </p>
        </div>

        {/* Right: Key Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
          {/* Promedio General */}
          <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/90 flex flex-col items-center justify-center text-center min-w-[110px]">
            <div className="flex items-center gap-1 text-[11px] font-medium text-amber-400 mb-1">
              <Award className="w-3.5 h-3.5" />
              <span>Promedio</span>
            </div>
            <div className="text-2xl font-black text-white font-mono tracking-tight">
              {loading ? "..." : gpa}
            </div>
            <span className="text-[10px] text-neutral-500">Escala [0 - 10]</span>
          </div>

          {/* Materias Aprobadas */}
          <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/90 flex flex-col items-center justify-center text-center min-w-[110px]">
            <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 mb-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Aprobadas</span>
            </div>
            <div className="text-2xl font-black text-white font-mono tracking-tight">
              {loading ? "..." : approved}
            </div>
            <span className="text-[10px] text-neutral-500">Materias</span>
          </div>

          {/* En Curso */}
          <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/90 flex flex-col items-center justify-center text-center min-w-[110px]">
            <div className="flex items-center gap-1 text-[11px] font-medium text-sky-400 mb-1">
              <BookOpen className="w-3.5 h-3.5" />
              <span>En Curso</span>
            </div>
            <div className="text-2xl font-black text-white font-mono tracking-tight">
              {loading ? "..." : inProgress}
            </div>
            <span className="text-[10px] text-neutral-500">Materias activas</span>
          </div>

          {/* Exámenes Próximos */}
          <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/90 flex flex-col items-center justify-center text-center min-w-[110px]">
            <div className="flex items-center gap-1 text-[11px] font-medium text-purple-400 mb-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Exámenes</span>
            </div>
            <div className="text-2xl font-black text-white font-mono tracking-tight">
              {loading ? "..." : upcomingExams}
            </div>
            <span className="text-[10px] text-neutral-500">Próximos 7 días</span>
          </div>
        </div>
      </div>
    </div>
  );
}
