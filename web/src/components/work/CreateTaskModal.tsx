"use client";

import React, { useState, useEffect } from "react";
import { X, Check, Calendar, AlertCircle, Briefcase } from "lucide-react";
import type { 
  WorkTask, 
  WorkProject, 
  CreateWorkTaskPayload, 
  UpdateWorkTaskPayload 
} from "@/lib/api-client";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateWorkTaskPayload | UpdateWorkTaskPayload, taskId?: string) => Promise<void>;
  projects: WorkProject[];
  taskToEdit?: WorkTask | null;
  defaultStatus?: string;
  defaultProjectId?: string;
}

export function CreateTaskModal({
  isOpen,
  onClose,
  onSubmit,
  projects,
  taskToEdit,
  defaultStatus = "todo",
  defaultProjectId,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [status, setStatus] = useState("todo");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || "");
      setProjectId(taskToEdit.projectId || "");
      setStatus(taskToEdit.status);
      setPriority(taskToEdit.priority);
      setDueDate(taskToEdit.dueDate || "");
    } else {
      setTitle("");
      setDescription("");
      setProjectId(defaultProjectId || "");
      setStatus(defaultStatus);
      setPriority("medium");
      setDueDate("");
    }
    setError(null);
  }, [taskToEdit, defaultStatus, defaultProjectId, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("El título de la tarea es obligatorio.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (taskToEdit) {
        const payload: UpdateWorkTaskPayload = {
          title: title.trim(),
          description: description.trim() || undefined,
          projectId: projectId || undefined,
          priority,
          dueDate: dueDate || undefined,
        };
        await onSubmit(payload, taskToEdit.id);
      } else {
        const payload: CreateWorkTaskPayload = {
          title: title.trim(),
          description: description.trim() || undefined,
          projectId: projectId || undefined,
          status,
          priority,
          dueDate: dueDate || undefined,
        };
        await onSubmit(payload);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar la tarea.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <h2 className="text-base font-semibold text-white">
            {taskToEdit ? "Editar Tarea" : "Nueva Tarea"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300">
              Título de la tarea <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Diseñar arquitectura de base de datos"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm focus:outline-none focus:border-indigo-500 transition placeholder:text-neutral-600"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300">
              Descripción o notas
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles adicionales, criterios de aceptación o enlaces..."
              className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm focus:outline-none focus:border-indigo-500 transition placeholder:text-neutral-600 resize-none"
            />
          </div>

          {/* Project & Priority row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Project Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-neutral-400" />
                Proyecto
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 text-sm focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="">(Sin proyecto asociado)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">
                Prioridad
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 text-sm focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
          </div>

          {/* Column / Status & Due Date row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!taskToEdit && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">
                  Columna inicial
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 text-sm focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="backlog">Backlog</option>
                  <option value="todo">Por Hacer</option>
                  <option value="in_progress">En Progreso</option>
                  <option value="done">Completado</option>
                </select>
              </div>
            )}

            {/* Due Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                Fecha de vencimiento
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 text-sm focus:outline-none focus:border-indigo-500 transition [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition flex items-center gap-1.5"
            >
              {saving ? "Guardando..." : taskToEdit ? "Actualizar Tarea" : "Crear Tarea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
