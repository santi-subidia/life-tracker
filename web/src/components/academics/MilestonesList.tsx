"use client";

import React from "react";
import { 
  Calendar, 
  Award, 
  AlertCircle, 
  CheckCircle2, 
  Pencil, 
  Trash2, 
  Plus, 
  Clock,
  Sparkles,
  Percent
} from "lucide-react";
import type { AcademicMilestone } from "@/lib/api-client";

interface MilestonesListProps {
  milestones: AcademicMilestone[];
  onOpenGradeModal: (milestone: AcademicMilestone) => void;
  onEditMilestone: (milestone: AcademicMilestone) => void;
  onDeleteMilestone: (milestone: AcademicMilestone) => void;
  onAddMilestone?: () => void;
}

const TYPE_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  parcial: {
    label: "Parcial",
    badgeClass: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  },
  final: {
    label: "Examen Final",
    badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  },
  entrega: {
    label: "Entrega TP",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  recuperatorio: {
    label: "Recuperatorio",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
};

export function MilestonesList({
  milestones,
  onOpenGradeModal,
  onEditMilestone,
  onDeleteMilestone,
  onAddMilestone,
}: MilestonesListProps) {
  const todayStr = new Date().toISOString().split("T")[0];

  // Sort milestones by dueDate ascending
  const sorted = [...milestones].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  if (sorted.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-neutral-950/60 border border-dashed border-neutral-800 text-center space-y-3">
        <p className="text-xs text-neutral-500">
          No hay evaluaciones registradas para esta materia aún.
        </p>
        {onAddMilestone && (
          <button
            type="button"
            onClick={onAddMilestone}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear Primer Hito</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((item) => {
        const typeKey = (item.milestoneType || "parcial").toLowerCase();
        const typeConfig = TYPE_CONFIG[typeKey] || TYPE_CONFIG.parcial;

        const isOverdue = item.dueDate < todayStr && item.grade === null && item.grade === undefined;
        const isDueToday = item.dueDate === todayStr;
        const isGraded = item.grade !== null && item.grade !== undefined;
        const gradeValue = isGraded ? Number(item.grade) : null;
        const isApproved = gradeValue !== null ? gradeValue >= 4 : false;

        return (
          <div
            key={item.id}
            className={`p-4 rounded-xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isGraded
                ? "bg-neutral-900/60 border-neutral-800/80 hover:border-neutral-700"
                : isOverdue
                ? "bg-rose-950/15 border-rose-500/30"
                : "bg-neutral-900/40 border-neutral-800/80"
            }`}
          >
            {/* Left: Info */}
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${typeConfig.badgeClass}`}>
                  {typeConfig.label}
                </span>

                {item.weightPercentage !== undefined && item.weightPercentage !== null && (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-mono bg-neutral-800 text-neutral-300 border border-neutral-700/50">
                    <Percent className="w-2.5 h-2.5" />
                    <span>{item.weightPercentage}% ponderación</span>
                  </span>
                )}

                {item.replacesMilestoneId && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Reemplaza anterior
                  </span>
                )}
              </div>

              <h4 className="text-sm font-semibold text-white truncate">
                {item.title}
              </h4>

              {item.notes && (
                <p className="text-xs text-neutral-400 line-clamp-1">
                  {item.notes}
                </p>
              )}

              {/* Date Badge */}
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 pt-0.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                <span>Fecha: </span>
                <span className={`font-medium ${isOverdue ? "text-rose-400 font-bold" : isDueToday ? "text-amber-400 font-bold" : "text-neutral-200"}`}>
                  {item.dueDate}
                  {isOverdue && " (Vencido sin calificar)"}
                  {isDueToday && " (¡Hoy!)"}
                </span>
              </div>
            </div>

            {/* Right: Grade badge & Actions */}
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              {isGraded ? (
                <button
                  type="button"
                  onClick={() => onOpenGradeModal(item)}
                  title="Modificar calificación"
                  className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-mono font-bold transition hover:scale-105 ${
                    isApproved
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                      : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Nota: {gradeValue?.toFixed(2)}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenGradeModal(item)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition active:scale-95"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Calificar</span>
                </button>
              )}

              {/* Edit milestone */}
              <button
                type="button"
                onClick={() => onEditMilestone(item)}
                title="Editar hito"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>

              {/* Delete milestone */}
              <button
                type="button"
                onClick={() => onDeleteMilestone(item)}
                title="Eliminar hito"
                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
