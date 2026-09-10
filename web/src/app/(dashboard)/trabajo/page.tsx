"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Plus, 
  Briefcase, 
  Flame, 
  CheckCircle2, 
  Clock, 
  Zap, 
  Settings,
  Sparkles,
  Layers
} from "lucide-react";
import { 
  LifeTrackerApiClient, 
  type WorkProject, 
  type WorkTask, 
  type WorkMetrics, 
  type WorkSession,
  type CreateWorkTaskPayload,
  type UpdateWorkTaskPayload,
  type CreateWorkProjectPayload,
  type UpdateWorkProjectPayload
} from "@/lib/api-client";
import { KanbanBoard } from "@/components/work/KanbanBoard";
import { DeepWorkTimer } from "@/components/work/DeepWorkTimer";
import { CreateTaskModal } from "@/components/work/CreateTaskModal";
import { ProjectManagerModal } from "@/components/work/ProjectManagerModal";

// Fallback initial data for static prerendering / offline demo
const DEMO_PROJECTS: WorkProject[] = [
  {
    id: "00000000-0000-0000-0000-000000000301",
    name: "Life Tracker Core",
    description: "Plataforma web con .NET 10 y Next.js 16",
    status: "active",
    color: "indigo",
    activeTasksCount: 3,
    completedTasksCount: 5,
    createdAt: new Date().toISOString(),
  },
  {
    id: "00000000-0000-0000-0000-000000000302",
    name: "Segundo Cerebro",
    description: "Sistema de grafos y notas Markdown",
    status: "active",
    color: "amber",
    activeTasksCount: 2,
    completedTasksCount: 2,
    createdAt: new Date().toISOString(),
  },
];

const DEMO_TASKS: WorkTask[] = [
  {
    id: "00000000-0000-0000-0000-000000000401",
    projectId: "00000000-0000-0000-0000-000000000301",
    projectName: "Life Tracker Core",
    projectColor: "indigo",
    title: "Optimizar consultas EF Core en endpoints de trabajo",
    description: "Revisar índices y AsNoTracking en las queries de Kanban y métricas semanales.",
    status: "backlog",
    priority: "medium",
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
    position: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "00000000-0000-0000-0000-000000000402",
    projectId: "00000000-0000-0000-0000-000000000301",
    projectName: "Life Tracker Core",
    projectColor: "indigo",
    title: "Diseñar tarjeta accesible con soporte táctil para móvil",
    description: "Controles directos de avance con área táctil >= 44px.",
    status: "todo",
    priority: "high",
    dueDate: new Date().toISOString().split("T")[0],
    position: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "00000000-0000-0000-0000-000000000403",
    projectId: "00000000-0000-0000-0000-000000000302",
    projectName: "Segundo Cerebro",
    projectColor: "amber",
    title: "Simulación Canvas 2D a 60 FPS para notas",
    description: "Ajuste de fuerzas elásticas y repulsión de nodos.",
    status: "in_progress",
    priority: "urgent",
    dueDate: new Date().toISOString().split("T")[0],
    position: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "00000000-0000-0000-0000-000000000404",
    projectId: "00000000-0000-0000-0000-000000000301",
    projectName: "Life Tracker Core",
    projectColor: "indigo",
    title: "Implementar DTOs y Servicios de Dominio en .NET 10",
    description: "Verificado con 48 tests unitarios en verde.",
    status: "done",
    priority: "high",
    dueDate: new Date(Date.now() - 86400000).toISOString().split("T")[0],
    position: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEMO_METRICS: WorkMetrics = {
  focusMinutesThisWeek: 345,
  focusMinutesToday: 75,
  completedTasksThisWeek: 7,
  completedTasksToday: 2,
  sessionsCountThisWeek: 6,
};

export default function WorkDashboardPage() {
  const [projects, setProjects] = useState<WorkProject[]>([]);
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [metrics, setMetrics] = useState<WorkMetrics | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<WorkTask | null>(null);
  const [defaultTaskStatus, setDefaultTaskStatus] = useState("todo");
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [fetchedProjects, fetchedTasks, fetchedMetrics] = await Promise.all([
        LifeTrackerApiClient.getProjects().catch(() => null),
        LifeTrackerApiClient.getTasks().catch(() => null),
        LifeTrackerApiClient.getWorkMetrics().catch(() => null),
      ]);

      if (fetchedProjects !== null) setProjects(fetchedProjects);
      else setProjects(DEMO_PROJECTS);

      if (fetchedTasks !== null) setTasks(fetchedTasks);
      else setTasks(DEMO_TASKS);

      setMetrics(fetchedMetrics || null);
    } catch {
      setProjects([]);
      setTasks([]);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Task creation & update handler
  const handleTaskSubmit = async (
    payload: CreateWorkTaskPayload | UpdateWorkTaskPayload,
    taskId?: string
  ) => {
    if (taskId) {
      // Edit
      try {
        const updated = await LifeTrackerApiClient.updateTask(taskId, payload as UpdateWorkTaskPayload);
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      } catch {
        // Optimistic local update fallback
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  title: payload.title,
                  description: payload.description,
                  projectId: payload.projectId,
                  priority: payload.priority || t.priority,
                  dueDate: payload.dueDate,
                  updatedAt: new Date().toISOString(),
                }
              : t
          )
        );
      }
    } else {
      // Create
      try {
        const created = await LifeTrackerApiClient.createTask(payload as CreateWorkTaskPayload);
        setTasks((prev) => [...prev, created]);
      } catch {
        // Optimistic local fallback
        const newLocalTask: WorkTask = {
          id: `task-${Date.now()}`,
          projectId: payload.projectId,
          projectName: projects.find((p) => p.id === payload.projectId)?.name,
          title: payload.title,
          description: payload.description,
          status: (payload as CreateWorkTaskPayload).status || "todo",
          priority: payload.priority || "medium",
          dueDate: payload.dueDate,
          position: tasks.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setTasks((prev) => [...prev, newLocalTask]);
      }
    }
  };

  // Move task (Drag & Drop or Mobile buttons)
  const handleMoveTask = async (taskId: string, newStatus: string, newPosition: number) => {
    // Optimistic local state update
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            status: newStatus,
            position: newPosition,
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );

    try {
      await LifeTrackerApiClient.moveTask(taskId, {
        newStatus,
        newPosition,
      });
      // If task moved to "done", refresh metrics
      if (newStatus === "done") {
        const freshMetrics = await LifeTrackerApiClient.getWorkMetrics().catch(() => null);
        if (freshMetrics) setMetrics(freshMetrics);
      }
    } catch {
      // Reload on failure to restore exact backend state
      loadData();
    }
  };

  // Delete task
  const handleDeleteTask = async (task: WorkTask) => {
    if (window.confirm(`¿Eliminar la tarea "${task.title}"?`)) {
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      try {
        await LifeTrackerApiClient.deleteTask(task.id);
      } catch {
        loadData();
      }
    }
  };

  // Project handlers
  const handleCreateProject = async (payload: CreateWorkProjectPayload) => {
    try {
      const created = await LifeTrackerApiClient.createProject(payload);
      setProjects((prev) => [...prev, created]);
    } catch {
      const demoP: WorkProject = {
        id: `proj-${Date.now()}`,
        name: payload.name,
        description: payload.description,
        status: payload.status || "active",
        color: payload.color || "indigo",
        activeTasksCount: 0,
        completedTasksCount: 0,
        createdAt: new Date().toISOString(),
      };
      setProjects((prev) => [...prev, demoP]);
    }
  };

  const handleUpdateProject = async (id: string, payload: UpdateWorkProjectPayload) => {
    try {
      const updated = await LifeTrackerApiClient.updateProject(id, payload);
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch {
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...payload } : p))
      );
    }
  };

  const handleDeleteProject = async (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (selectedProjectId === id) setSelectedProjectId("");
    try {
      await LifeTrackerApiClient.deleteProject(id);
    } catch {
      loadData();
    }
  };

  // Session recorded callback
  const handleSessionRecorded = (session: WorkSession) => {
    // Refresh metrics
    LifeTrackerApiClient.getWorkMetrics()
      .then((m) => setMetrics(m))
      .catch(() => {
        if (metrics) {
          setMetrics({
            ...metrics,
            focusMinutesThisWeek: metrics.focusMinutesThisWeek + session.durationMinutes,
            focusMinutesToday: metrics.focusMinutesToday + session.durationMinutes,
            sessionsCountThisWeek: metrics.sessionsCountThisWeek + 1,
          });
        }
      });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-24">
      {/* Top Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Link
              href="/"
              className="p-2 -ml-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition shrink-0"
              title="Volver al Inicio"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Briefcase className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h1 className="font-semibold text-sm sm:text-base flex items-center gap-2 truncate">
                  <span className="truncate">Trabajo & Foco</span>
                  <span className="hidden sm:inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                    Kanban + Deep Work
                  </span>
                </h1>
                <p className="text-xs text-neutral-400 hidden sm:block truncate">
                  Organización ágil de proyectos y bloques de alta concentración
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsProjectModalOpen(true)}
              className="px-2.5 sm:px-3 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition flex items-center gap-1.5 shrink-0"
              title="Gestionar proyectos"
            >
              <Settings className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden sm:inline">Proyectos</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTaskToEdit(null);
                setDefaultTaskStatus("todo");
                setIsTaskModalOpen(true);
              }}
              className="px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-95 transition flex items-center gap-1.5 shrink-0 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva Tarea</span>
              <span className="sm:hidden">Tarea</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Quick Weekly Metrics Ribbon */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Foco Esta Semana */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-neutral-400 font-medium">Foco Esta Semana</span>
              <div className="text-xl font-bold text-white font-mono leading-tight">
                {metrics ? `${metrics.focusMinutesThisWeek}m` : "—"}
              </div>
              <span className="text-[10px] text-neutral-500">
                {metrics ? `${Math.round(metrics.focusMinutesThisWeek / 60 * 10) / 10} horas` : ""}
              </span>
            </div>
          </div>

          {/* Foco Hoy */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-neutral-400 font-medium">Foco Hoy</span>
              <div className="text-xl font-bold text-white font-mono leading-tight">
                {metrics ? `${metrics.focusMinutesToday}m` : "—"}
              </div>
              <span className="text-[10px] text-neutral-500">
                {metrics?.sessionsCountThisWeek || 0} sesiones esta semana
              </span>
            </div>
          </div>

          {/* Tareas Hechas Esta Semana */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-neutral-400 font-medium">Tareas Semana</span>
              <div className="text-xl font-bold text-white font-mono leading-tight">
                {metrics ? metrics.completedTasksThisWeek : "—"}
              </div>
              <span className="text-[10px] text-neutral-500">
                {metrics?.completedTasksToday || 0} completadas hoy
              </span>
            </div>
          </div>

          {/* Proyectos Activos */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-neutral-400 font-medium">Proyectos Activos</span>
              <div className="text-xl font-bold text-white font-mono leading-tight">
                {projects.filter((p) => p.status === "active").length}
              </div>
              <span className="text-[10px] text-neutral-500">
                {tasks.length} tareas totales
              </span>
            </div>
          </div>
        </section>

        {/* Deep Work Interactive Focus Timer */}
        <DeepWorkTimer
          projects={projects}
          tasks={tasks}
          onSessionRecorded={handleSessionRecorded}
        />

        {/* Kanban Board with Drag & Drop */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              Tablero de Tareas Kanban
            </h2>
            <button
              type="button"
              onClick={() => {
                setTaskToEdit(null);
                setDefaultTaskStatus("todo");
                setIsTaskModalOpen(true);
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition"
            >
              + Añadir Tarea
            </button>
          </div>

          <KanbanBoard
            tasks={tasks}
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={setSelectedProjectId}
            onAddTask={(columnStatus) => {
              setTaskToEdit(null);
              setDefaultTaskStatus(columnStatus);
              setIsTaskModalOpen(true);
            }}
            onEditTask={(task) => {
              setTaskToEdit(task);
              setIsTaskModalOpen(true);
            }}
            onDeleteTask={handleDeleteTask}
            onMoveTask={handleMoveTask}
          />
        </section>
      </main>

      {/* Modals */}
      <CreateTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={handleTaskSubmit}
        projects={projects}
        taskToEdit={taskToEdit}
        defaultStatus={defaultTaskStatus}
        defaultProjectId={selectedProjectId}
      />

      <ProjectManagerModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        projects={projects}
        onCreateProject={handleCreateProject}
        onUpdateProject={handleUpdateProject}
        onDeleteProject={handleDeleteProject}
      />
    </div>
  );
}
