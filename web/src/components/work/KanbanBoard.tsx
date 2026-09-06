"use client";

import React, { useState } from "react";
import { 
  Plus, 
  Inbox, 
  ListTodo, 
  Zap, 
  CheckCircle2, 
  Filter,
  Layers
} from "lucide-react";
import type { WorkTask, WorkProject } from "@/lib/api-client";
import { TaskCard } from "./TaskCard";

interface KanbanBoardProps {
  tasks: WorkTask[];
  projects: WorkProject[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  onAddTask: (columnStatus: string) => void;
  onEditTask: (task: WorkTask) => void;
  onDeleteTask: (task: WorkTask) => void;
  onMoveTask: (taskId: string, newStatus: string, newPosition: number) => Promise<void>;
}

interface ColumnDefinition {
  id: string;
  title: string;
  icon: React.ElementType;
  headerColor: string;
  dotColor: string;
}

const COLUMNS: ColumnDefinition[] = [
  {
    id: "backlog",
    title: "Backlog",
    icon: Inbox,
    headerColor: "text-slate-400",
    dotColor: "bg-slate-400",
  },
  {
    id: "todo",
    title: "Por Hacer",
    icon: ListTodo,
    headerColor: "text-sky-400",
    dotColor: "bg-sky-400",
  },
  {
    id: "in_progress",
    title: "En Progreso",
    icon: Zap,
    headerColor: "text-amber-400",
    dotColor: "bg-amber-400",
  },
  {
    id: "done",
    title: "Completado",
    icon: CheckCircle2,
    headerColor: "text-emerald-400",
    dotColor: "bg-emerald-400",
  },
];

export function KanbanBoard({
  tasks,
  projects,
  selectedProjectId,
  onSelectProject,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onMoveTask,
}: KanbanBoardProps) {
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Filter tasks by project if a project is selected
  const filteredTasks = selectedProjectId
    ? tasks.filter((t) => t.projectId === selectedProjectId)
    : tasks;

  // Group tasks by column status and sort by position ascending
  const tasksByColumn: Record<string, WorkTask[]> = {
    backlog: [],
    todo: [],
    in_progress: [],
    done: [],
  };

  filteredTasks.forEach((t) => {
    const col = t.status.toLowerCase();
    if (tasksByColumn[col]) {
      tasksByColumn[col].push(t);
    } else {
      // Default fallback if unknown status
      tasksByColumn.todo.push(t);
    }
  });

  // Sort each column by position
  Object.keys(tasksByColumn).forEach((col) => {
    tasksByColumn[col].sort((a, b) => a.position - b.position);
  });

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, columnId: string) => {
    // Only clear if leaving the column container entirely
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverColumn === columnId) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Target position is at the end of the column if dropped on column container
    const columnTasks = tasksByColumn[targetColumnId] || [];
    const newPosition = columnTasks.length;

    if (task.status === targetColumnId && task.position === newPosition - 1) {
      // No movement needed
      return;
    }

    await onMoveTask(taskId, targetColumnId, newPosition);
  };

  // Mobile sequential move
  const handleMobileMove = async (task: WorkTask, direction: "prev" | "next") => {
    const colOrder = ["backlog", "todo", "in_progress", "done"];
    const currentIndex = colOrder.indexOf(task.status);
    if (currentIndex === -1) return;

    const targetIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= colOrder.length) return;

    const targetColumnId = colOrder[targetIndex];
    const targetColTasks = tasksByColumn[targetColumnId] || [];
    const newPosition = targetColTasks.length;

    await onMoveTask(task.id, targetColumnId, newPosition);
  };

  return (
    <div className="space-y-4">
      {/* Board Controls Bar: Project Filter & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl">
        {/* Project selector dropdown */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400">
            <Filter className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-neutral-400">Filtrar por proyecto:</span>
          <select
            value={selectedProjectId}
            onChange={(e) => onSelectProject(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs font-medium focus:outline-none focus:border-indigo-500 transition cursor-pointer"
          >
            <option value="">Todos los proyectos ({tasks.length} tareas)</option>
            {projects.map((p) => {
              const count = tasks.filter((t) => t.projectId === p.id).length;
              return (
                <option key={p.id} value={p.id}>
                  {p.name} ({count})
                </option>
              );
            })}
          </select>
        </div>

        {/* Total Tasks Count Badge */}
        <div className="flex items-center gap-2 text-xs text-neutral-400 self-end sm:self-auto">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>
            Mostrando <strong className="text-white">{filteredTasks.length}</strong> tareas
          </span>
        </div>
      </div>

      {/* Kanban 4-Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {COLUMNS.map((col, colIdx) => {
          const colTasks = tasksByColumn[col.id] || [];
          const isOver = dragOverColumn === col.id;
          const Icon = col.icon;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={(e) => handleDragLeave(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`rounded-2xl border transition-all duration-200 flex flex-col min-h-[500px] ${
                isOver
                  ? "bg-indigo-950/20 border-indigo-500/50 shadow-lg shadow-indigo-950/40"
                  : "bg-neutral-900/40 border-neutral-800/80"
              }`}
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-neutral-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                  <Icon className={`w-4 h-4 ${col.headerColor}`} />
                  <h3 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
                    {col.title}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-300">
                    {colTasks.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onAddTask(col.id)}
                  title={`Añadir tarea a ${col.title}`}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 active:scale-95 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Tasks List */}
              <div className="p-3 space-y-2.5 flex-1 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div 
                    onClick={() => onAddTask(col.id)}
                    className="h-32 rounded-xl border border-dashed border-neutral-800/80 hover:border-neutral-700 flex flex-col items-center justify-center gap-1.5 text-neutral-600 hover:text-neutral-400 cursor-pointer transition p-4 text-center"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-xs font-medium">Añadir tarea</span>
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      projects={projects}
                      onEdit={onEditTask}
                      onDelete={onDeleteTask}
                      onMove={handleMobileMove}
                      isPrevDisabled={colIdx === 0}
                      isNextDisabled={colIdx === COLUMNS.length - 1}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
