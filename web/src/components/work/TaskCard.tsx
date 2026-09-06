"use client";

import React from "react";
import { 
  Calendar, 
  Clock, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  MoreVertical, 
  Trash2, 
  Pencil,
  Briefcase
} from "lucide-react";
import type { WorkTask, WorkProject } from "@/lib/api-client";

interface TaskCardProps {
  task: WorkTask;
  projects: WorkProject[];
  onEdit: (task: WorkTask) => void;
  onDelete: (task: WorkTask) => void;
  onMove?: (task: WorkTask, direction: "prev" | "next") => void;
  isPrevDisabled?: boolean;
  isNextDisabled?: boolean;
}

const PRIORITY_CONFIG: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
  urgent: {
    label: "Urgente",
    badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    dotClass: "bg-rose-400",
  },
  high: {
    label: "Alta",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    dotClass: "bg-amber-400",
  },
  medium: {
    label: "Media",
    badgeClass: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    dotClass: "bg-sky-400",
  },
  low: {
    label: "Baja",
    badgeClass: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    dotClass: "bg-slate-400",
  },
};

const PROJECT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  indigo: { bg: "bg-indigo-500/15", text: "text-indigo-300", border: "border-indigo-500/30" },
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/30" },
  amber: { bg: "bg-amber-500/15", text: "text-amber-300", border: "border-amber-500/30" },
  rose: { bg: "bg-rose-500/15", text: "text-rose-300", border: "border-rose-500/30" },
  sky: { bg: "bg-sky-500/15", text: "text-sky-300", border: "border-sky-500/30" },
  purple: { bg: "bg-purple-500/15", text: "text-purple-300", border: "border-purple-500/30" },
  teal: { bg: "bg-teal-500/15", text: "text-teal-300", border: "border-teal-500/30" },
  fuchsia: { bg: "bg-fuchsia-500/15", text: "text-fuchsia-300", border: "border-fuchsia-500/30" },
};

export function TaskCard({
  task,
  projects,
  onEdit,
  onDelete,
  onMove,
  isPrevDisabled = false,
  isNextDisabled = false,
}: TaskCardProps) {
  const [showMenu, setShowMenu] = React.useState(false);

  // Find project info
  const project = projects.find((p) => p.id === task.projectId);
  const projectName = project?.name || task.projectName;
  const projectColorKey = (project?.color || task.projectColor || "indigo").toLowerCase();
  const projectColors = PROJECT_COLORS[projectColorKey] || PROJECT_COLORS.indigo;

  // Priority info
  const priorityKey = (task.priority || "medium").toLowerCase();
  const priority = PRIORITY_CONFIG[priorityKey] || PRIORITY_CONFIG.medium;

  // Due date status
  const todayStr = new Date().toISOString().split("T")[0];
  const isOverdue = task.dueDate ? task.dueDate < todayStr && task.status !== "done" : false;
  const isDueToday = task.dueDate ? task.dueDate === todayStr : false;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/json", JSON.stringify({
      taskId: task.id,
      status: task.status,
      position: task.position,
    }));
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="group relative bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800/80 hover:border-neutral-700/90 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing select-none"
    >
      {/* Top row: Project & Priority badges + Quick action menu */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {projectName && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border truncate max-w-[150px] ${projectColors.bg} ${projectColors.text} ${projectColors.border}`}
              title={projectName}
            >
              <Briefcase className="w-3 h-3 shrink-0 opacity-70" />
              <span className="truncate">{projectName}</span>
            </span>
          )}

          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${priority.badgeClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${priority.dotClass}`} />
            {priority.label}
          </span>
        </div>

        {/* Menu toggle */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            aria-label="Opciones de tarea"
            className="p-1 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-6 z-30 w-32 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl py-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onEdit(task);
                  }}
                  className="w-full px-3 py-1.5 text-left text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center gap-2 transition"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onDelete(task);
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

      {/* Task Title */}
      <h4 className={`text-xs sm:text-sm font-semibold text-neutral-200 leading-snug break-words ${task.status === "done" ? "line-through text-neutral-500" : ""}`}>
        {task.title}
      </h4>

      {/* Optional Description */}
      {task.description && (
        <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2 leading-relaxed break-words">
          {task.description}
        </p>
      )}

      {/* Footer: Due date & Mobile quick movement buttons */}
      <div className="mt-3 pt-2.5 border-t border-neutral-800/60 flex items-center justify-between gap-2">
        {/* Due date badge */}
        <div>
          {task.dueDate ? (
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                isOverdue
                  ? "bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse"
                  : isDueToday
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  : "bg-neutral-800/60 text-neutral-400 border-neutral-700/50"
              }`}
            >
              {isOverdue ? (
                <AlertCircle className="w-3 h-3" />
              ) : isDueToday ? (
                <Clock className="w-3 h-3" />
              ) : (
                <Calendar className="w-3 h-3" />
              )}
              <span>
                {isDueToday ? "Vence hoy" : isOverdue ? "Vencida" : task.dueDate}
              </span>
            </span>
          ) : (
            <span className="text-[10px] text-neutral-600">Sin fecha</span>
          )}
        </div>

        {/* Mobile-accessible navigation buttons (min 44x44px touch area) */}
        {onMove && (
          <div className="flex items-center gap-1 sm:hidden">
            <button
              type="button"
              disabled={isPrevDisabled}
              onClick={(e) => {
                e.stopPropagation();
                onMove(task, "prev");
              }}
              title="Mover a columna anterior"
              className="w-11 h-11 flex items-center justify-center rounded-lg bg-neutral-800/80 text-neutral-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-neutral-700 active:scale-95 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={isNextDisabled}
              onClick={(e) => {
                e.stopPropagation();
                onMove(task, "next");
              }}
              title="Mover a columna siguiente"
              className="w-11 h-11 flex items-center justify-center rounded-lg bg-neutral-800/80 text-neutral-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-neutral-700 active:scale-95 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
