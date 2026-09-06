"use client";

import React, { useState, useEffect } from "react";
import { X, BookOpen, AlertCircle, Check } from "lucide-react";
import type { 
  AcademicSubject, 
  CreateAcademicSubjectPayload, 
  UpdateAcademicSubjectPayload 
} from "@/lib/api-client";

interface CreateSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateAcademicSubjectPayload | UpdateAcademicSubjectPayload, subjectId?: string) => Promise<void>;
  subjectToEdit?: AcademicSubject | null;
  defaultTerm?: string;
}

const COLOR_OPTIONS = [
  { id: "indigo", name: "Índigo", class: "bg-indigo-500" },
  { id: "sky", name: "Cielo", class: "bg-sky-500" },
  { id: "emerald", name: "Esmeralda", class: "bg-emerald-500" },
  { id: "amber", name: "Ámbar", class: "bg-amber-500" },
  { id: "rose", name: "Rosa", class: "bg-rose-500" },
  { id: "purple", name: "Púrpura", class: "bg-purple-500" },
  { id: "teal", name: "Turquesa", class: "bg-teal-500" },
];

export function CreateSubjectModal({
  isOpen,
  onClose,
  onSubmit,
  subjectToEdit,
  defaultTerm = "2026-1C",
}: CreateSubjectModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [term, setTerm] = useState(defaultTerm);
  const [professor, setProfessor] = useState("");
  const [status, setStatus] = useState("en_curso");
  const [color, setColor] = useState("indigo");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (subjectToEdit) {
      setName(subjectToEdit.name);
      setCode(subjectToEdit.code || "");
      setTerm(subjectToEdit.term);
      setProfessor(subjectToEdit.professor || "");
      setStatus(subjectToEdit.status || "en_curso");
      setColor(subjectToEdit.color || "indigo");
    } else {
      setName("");
      setCode("");
      setTerm(defaultTerm);
      setProfessor("");
      setStatus("en_curso");
      setColor("indigo");
    }
    setError(null);
  }, [subjectToEdit, defaultTerm, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre de la materia es obligatorio.");
      return;
    }
    if (!term.trim()) {
      setError("El período o cuatrimestre es obligatorio (ej. 2026-1C).");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (subjectToEdit) {
        const payload: UpdateAcademicSubjectPayload = {
          name: name.trim(),
          code: code.trim() || undefined,
          term: term.trim(),
          professor: professor.trim() || undefined,
          status,
          color,
        };
        await onSubmit(payload, subjectToEdit.id);
      } else {
        const payload: CreateAcademicSubjectPayload = {
          name: name.trim(),
          code: code.trim() || undefined,
          term: term.trim(),
          professor: professor.trim() || undefined,
          status,
          color,
        };
        await onSubmit(payload);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar la materia.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/20">
              <BookOpen className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold text-white">
              {subjectToEdit ? "Editar Materia" : "Nueva Materia Universitaria"}
            </h2>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300">
              Nombre de la materia <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Algoritmos y Estructuras de Datos"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm focus:outline-none focus:border-indigo-500 transition placeholder:text-neutral-600"
            />
          </div>

          {/* Code & Term */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">
                Código de cátedra (Opcional)
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ej. MAT-101 / COMP-20"
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm focus:outline-none focus:border-indigo-500 transition font-mono placeholder:text-neutral-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">
                Período / Cuatrimestre <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Ej. 2026-1C"
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm focus:outline-none focus:border-indigo-500 transition placeholder:text-neutral-600"
              />
            </div>
          </div>

          {/* Professor & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">
                Profesor o Equipo Docente
              </label>
              <input
                type="text"
                value={professor}
                onChange={(e) => setProfessor(e.target.value)}
                placeholder="Ej. Dr. Alan Turing"
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm focus:outline-none focus:border-indigo-500 transition placeholder:text-neutral-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">
                Estado de Cursada
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 text-sm focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="en_curso">En Curso</option>
                <option value="aprobada">Aprobada</option>
                <option value="regularizada">Regularizada</option>
                <option value="recursar">Recursar</option>
              </select>
            </div>
          </div>

          {/* Color theme */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300">
              Color identificador
            </label>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  className={`w-7 h-7 rounded-full ${c.class} flex items-center justify-center transition ${
                    color === c.id
                      ? "ring-2 ring-white ring-offset-2 ring-offset-neutral-950 scale-110"
                      : "opacity-70 hover:opacity-100"
                  }`}
                  title={c.name}
                >
                  {color === c.id && <Check className="w-4 h-4 text-white stroke-[3]" />}
                </button>
              ))}
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
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/20 disabled:opacity-50 transition flex items-center gap-1.5"
            >
              {saving ? "Guardando..." : subjectToEdit ? "Actualizar Materia" : "Crear Materia"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
