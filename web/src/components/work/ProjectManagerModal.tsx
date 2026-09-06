"use client";

import React, { useState } from "react";
import { 
  X, 
  Plus, 
  Trash2, 
  Pencil, 
  Briefcase, 
  Check, 
  AlertCircle, 
  Archive 
} from "lucide-react";
import type { 
  WorkProject, 
  CreateWorkProjectPayload, 
  UpdateWorkProjectPayload 
} from "@/lib/api-client";

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: WorkProject[];
  onCreateProject: (payload: CreateWorkProjectPayload) => Promise<void>;
  onUpdateProject: (id: string, payload: UpdateWorkProjectPayload) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
}

const AVAILABLE_COLORS = [
  { id: "indigo", name: "Índigo", class: "bg-indigo-500" },
  { id: "emerald", name: "Esmeralda", class: "bg-emerald-500" },
  { id: "amber", name: "Ámbar", class: "bg-amber-500" },
  { id: "rose", name: "Rosa", class: "bg-rose-500" },
  { id: "sky", name: "Cielo", class: "bg-sky-500" },
  { id: "purple", name: "Púrpura", class: "bg-purple-500" },
  { id: "teal", name: "Turquesa", class: "bg-teal-500" },
  { id: "fuchsia", name: "Fucsia", class: "bg-fuchsia-500" },
];

export function ProjectManagerModal({
  isOpen,
  onClose,
  projects,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
}: ProjectManagerModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [color, setColor] = useState("indigo");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const startCreate = () => {
    setEditingId(null);
    setIsCreating(true);
    setName("");
    setDescription("");
    setStatus("active");
    setColor("indigo");
    setError(null);
  };

  const startEdit = (p: WorkProject) => {
    setIsCreating(false);
    setEditingId(p.id);
    setName(p.name);
    setDescription(p.description || "");
    setStatus(p.status || "active");
    setColor(p.color || "indigo");
    setError(null);
  };

  const cancelForm = () => {
    setIsCreating(false);
    setEditingId(null);
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre del proyecto es requerido.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (editingId) {
        await onUpdateProject(editingId, {
          name: name.trim(),
          description: description.trim() || undefined,
          status,
          color,
        });
      } else {
        await onCreateProject({
          name: name.trim(),
          description: description.trim() || undefined,
          status,
          color,
        });
      }
      cancelForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar el proyecto.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, projectName: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el proyecto "${projectName}"?`)) {
      try {
        await onDeleteProject(id);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al eliminar el proyecto.";
        setError(msg);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white leading-tight">
                Gestor de Proyectos
              </h2>
              <p className="text-xs text-neutral-400">
                Organiza tus iniciativas y clasifica tus tableros
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form (for creating or editing) */}
          {(isCreating || editingId) ? (
            <form onSubmit={handleSave} className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
                  {editingId ? "Editar Proyecto" : "Nuevo Proyecto"}
                </h3>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="text-xs text-neutral-400 hover:text-white"
                >
                  Cancelar
                </button>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">
                  Nombre del proyecto <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Replatforming Next.js 16"
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-100 text-sm focus:outline-none focus:border-indigo-500 transition placeholder:text-neutral-600"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Objetivos o alcance del proyecto..."
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-100 text-sm focus:outline-none focus:border-indigo-500 transition placeholder:text-neutral-600 resize-none"
                />
              </div>

              {/* Status & Color Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300">
                    Estado
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-200 text-sm focus:outline-none focus:border-indigo-500 transition"
                  >
                    <option value="active">Activo</option>
                    <option value="archived">Archivado</option>
                    <option value="completed">Completado</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300">
                    Color distintivo
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {AVAILABLE_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setColor(c.id)}
                        className={`w-6 h-6 rounded-full ${c.class} flex items-center justify-center transition ${
                          color === c.id ? "ring-2 ring-white ring-offset-2 ring-offset-neutral-950 scale-110" : "opacity-70 hover:opacity-100"
                        }`}
                        title={c.name}
                      >
                        {color === c.id && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={cancelForm}
                  className="px-3 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition"
                >
                  {saving ? "Guardando..." : "Guardar Proyecto"}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={startCreate}
              className="w-full py-2.5 px-4 rounded-xl border border-dashed border-neutral-700 hover:border-indigo-500/60 hover:bg-indigo-950/20 text-indigo-400 hover:text-indigo-300 text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Nuevo Proyecto</span>
            </button>
          )}

          {/* List of projects */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Proyectos Registrados ({projects.length})
            </h3>

            {projects.length === 0 ? (
              <div className="p-6 rounded-xl bg-neutral-950/60 border border-neutral-800/80 text-center text-xs text-neutral-500">
                No hay proyectos creados aún. ¡Crea el primero para organizar tus tareas!
              </div>
            ) : (
              <div className="space-y-2">
                {projects.map((p) => {
                  const colorObj = AVAILABLE_COLORS.find((c) => c.id === p.color) || AVAILABLE_COLORS[0];
                  return (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 hover:border-neutral-700 flex items-center justify-between gap-3 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-3 h-3 rounded-full shrink-0 ${colorObj.class}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white truncate">
                              {p.name}
                            </h4>
                            {p.status !== "active" && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-400 capitalize">
                                {p.status}
                              </span>
                            )}
                          </div>
                          {p.description && (
                            <p className="text-xs text-neutral-400 truncate max-w-sm mt-0.5">
                              {p.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-[11px] text-neutral-500 mt-1">
                            <span>{p.activeTasksCount} activas</span>
                            <span>•</span>
                            <span>{p.completedTasksCount} completadas</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
                          title="Editar proyecto"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id, p.name)}
                          className="p-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
                          title="Eliminar proyecto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-white transition"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
