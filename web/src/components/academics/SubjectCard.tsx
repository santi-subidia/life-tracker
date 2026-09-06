"use client";

import React from "react";
import { 
  BookOpen, 
  User, 
  Award, 
  Calendar, 
  CheckCircle2, 
  MoreVertical, 
  Pencil, 
  Trash2,
  ChevronRight
} from "lucide-react";
import type { AcademicSubject } from "@/lib/api-client";

interface SubjectCardProps {
  subject: AcademicSubject;
  onSelect: (subject: AcademicSubject) => void;
  onEdit: (subject: AcademicSubject) => void;
  onDelete: (subject: AcademicSubject) => void;
}

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
  en_curso: {
    label: "En Curso",
    badgeClass: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    dotClass: "bg-sky-400",
  },
  aprobada: {
    label: "Aprobada",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dotClass: "bg-emerald-400",
  },
  regularizada: {
    label: "Regularizada",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    dotClass: "bg-amber-400",
  },
  recursar: {
    label: "Recursar",
    badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    dotClass: "bg-rose-400",
  },
};

const COLOR_ACCENTS: Record<string, { border: string; glow: string; text: string; bg: string }> = {
  indigo: { border: "border-indigo-500/30", glow: "from-indigo-500/10", text: "text-indigo-400", bg: "bg-indigo-500/15" },
  sky: { border: "border-sky-500/30", glow: "from-sky-500/10", text: "text-sky-400", bg: "bg-sky-500/15" },
  emerald: { border: "border-emerald-500/30", glow: "from-emerald-500/10", text: "text-emerald-400", bg: "bg-emerald-500/15" },
  amber: { border: "border-amber-500/30", glow: "from-amber-500/10", text: "text-amber-400", bg: "bg-amber-500/15" },
  rose: { border: "border-rose-500/30", glow: "from-rose-500/10", text: "text-rose-400", bg: "bg-rose-500/15" },
  purple: { border: "border-purple-500/30", glow: "from-purple-500/10", text: "text-purple-400", bg: "bg-purple-500/15" },
  teal: { border: "border-teal-500/30", glow: "from-teal-500/10", text: "text-teal-400", bg: "bg-teal-500/15" },
};

export function SubjectCard({
  subject,
  onSelect,
  onEdit,
  onDelete,
}: SubjectCardProps) {
  const [showMenu, setShowMenu] = React.useState(false);

  const statusKey = (subject.status || "en_curso").toLowerCase();
  const statusConfig = STATUS_CONFIG[statusKey] || STATUS_CONFIG.en_curso;

  const colorKey = (subject.color || "indigo").toLowerCase();
  const colorAccent = COLOR_ACCENTS[colorKey] || COLOR_ACCENTS.indigo;

  // Percentage of milestones completed
  const total = subject.totalMilestones || 0;
  const completed = subject.completedMilestones || 0;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Average display
  const hasAverage = subject.average !== undefined && subject.average !== null;
  const formattedAverage = hasAverage ? Number(subject.average).toFixed(2) : null;

  return (
    <div 
      onClick={() => onSelect(subject)}
      className={`group relative rounded-2xl bg-neutral-900/60 hover:bg-neutral-900/90 border ${colorAccent.border} p-5 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden`}
    >
      {/* Top subtle gradient glow */}
      <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${colorAccent.glow} to-transparent blur-2xl pointer-events-none`} />

      <div>
        {/* Header row: Code/Term & Status & Actions */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {subject.code && (
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold ${colorAccent.bg} ${colorAccent.text} border ${colorAccent.border}`}>
                {subject.code}
              </span>
            )}
            <span className="text-[11px] text-neutral-400 font-medium">
              {subject.term}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Status Badge */}
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusConfig.badgeClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
              {statusConfig.label}
            </span>

            {/* Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                aria-label="Opciones de materia"
                className="p-1 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                    }}
                  />
                  <div className="absolute right-0 top-6 z-30 w-32 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl py-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onEdit(subject);
                      }}
                      className="w-full px-3 py-1.5 text-left text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center gap-2 transition"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onDelete(subject);
                      }}
                      className="w-full px-3 py-1.5 text-left text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-2 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Subject Name */}
        <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
          {subject.name}
        </h3>

        {/* Professor */}
        {subject.professor && (
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-1">
            <User className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <span className="truncate">{subject.professor}</span>
          </div>
        )}
      </div>

      {/* Stats & Progress Section */}
      <div className="mt-4 pt-4 border-t border-neutral-800/80 space-y-3">
        {/* Average & Milestones Count */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" />
            <span className="text-neutral-400">Promedio:</span>
            {hasAverage ? (
              <span className="font-bold text-white font-mono text-sm">
                {formattedAverage}
              </span>
            ) : (
              <span className="text-neutral-500 text-[11px]">Sin notas aún</span>
            )}
          </div>

          <div className="flex items-center gap-1 text-[11px] text-neutral-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{completed} / {total} hitos</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progressPercent === 100
                ? "bg-emerald-500"
                : "bg-gradient-to-r from-indigo-500 to-sky-400"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* View Details Link Callout */}
        <div className="flex items-center justify-between pt-1 text-xs text-neutral-400 group-hover:text-neutral-200 transition">
          <span className="text-[11px]">Ver evaluaciones e hitos</span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
}
