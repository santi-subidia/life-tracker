"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar, AlertCircle, Award, Percent, RefreshCw } from "lucide-react";
import type { 
  AcademicSubject, 
  AcademicMilestone, 
  CreateAcademicMilestonePayload, 
  UpdateAcademicMilestonePayload 
} from "@/lib/api-client";

interface CreateMilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateAcademicMilestonePayload | UpdateAcademicMilestonePayload, milestoneId?: string) => Promise<void>;
  subjects: AcademicSubject[];
  defaultSubjectId?: string;
  existingMilestonesForSubject?: AcademicMilestone[];
  milestoneToEdit?: AcademicMilestone | null;
}

export function CreateMilestoneModal({
  isOpen,
  onClose,
  onSubmit,
  subjects,
  defaultSubjectId,
  existingMilestonesForSubject = [],
  milestoneToEdit,
}: CreateMilestoneModalProps) {
  const [subjectId, setSubjectId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [milestoneType, setMilestoneType] = useState("parcial");
  const [dueDate, setDueDate] = useState("");
  const [weightPercentage, setWeightPercentage] = useState<string>("");
  const [replacesMilestoneId, setReplacesMilestoneId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (milestoneToEdit) {
      setSubjectId(milestoneToEdit.subjectId);
      setTitle(milestoneToEdit.title);
      setMilestoneType(milestoneToEdit.milestoneType || "parcial");
      setDueDate(milestoneToEdit.dueDate);
      setWeightPercentage(
        milestoneToEdit.weightPercentage !== undefined && milestoneToEdit.weightPercentage !== null
          ? String(milestoneToEdit.weightPercentage)
          : ""
      );
      setReplacesMilestoneId(milestoneToEdit.replacesMilestoneId || "");
      setNotes(milestoneToEdit.notes || "");
    } else {
      setSubjectId(defaultSubjectId || (subjects.length > 0 ? subjects[0].id : ""));
      setTitle("");
      setMilestoneType("parcial");
      setDueDate("");
      setWeightPercentage("");
      setReplacesMilestoneId("");
      setNotes("");
    }
    setError(null);
  }, [milestoneToEdit, defaultSubjectId, subjects, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) {
      setError("Debes seleccionar una materia.");
      return;
    }
    if (!title.trim()) {
      setError("El título de la evaluación es obligatorio.");
      return;
    }
    if (!dueDate) {
      setError("La fecha programada es obligatoria.");
      return;
    }

    const weightNum = weightPercentage ? parseFloat(weightPercentage) : undefined;
    if (weightNum !== undefined && (isNaN(weightNum) || weightNum < 0 || weightNum > 100)) {
      setError("El porcentaje de ponderación debe estar entre 0 y 100.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (milestoneToEdit) {
        const payload: UpdateAcademicMilestonePayload = {
          title: title.trim(),
          milestoneType,
          dueDate,
          weightPercentage: weightNum,
          replacesMilestoneId: replacesMilestoneId || undefined,
          notes: notes.trim() || undefined,
        };
        await onSubmit(payload, milestoneToEdit.id);
      } else {
        const payload: CreateAcademicMilestonePayload = {
          subjectId,
          title: title.trim(),
          milestoneType,
          dueDate,
          weightPercentage: weightNum,
          replacesMilestoneId: replacesMilestoneId || undefined,
          notes: notes.trim() || undefined,
        };
        await onSubmit(payload);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar el hito evaluativo.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Filter possible replacement milestones (exclude current one if editing)
  const candidateReplacements = existingMilestonesForSubject.filter(
    (m) => m.id !== milestoneToEdit?.id
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/20">
              <Award className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold text-white">
              {milestoneToEdit ? "Editar Hito Evaluativo" : "Nuevo Hito Evaluativo"}
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

          {/* Subject Selector (locked if defaultSubjectId is set and we're in subject view) */}
          {!milestoneToEdit && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">
                Materia <span className="text-rose-400">*</span>
              </label>
              <select
                disabled={Boolean(defaultSubjectId)}
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 text-sm focus:outline-none focus:border-indigo-500 transition disabled:opacity-75"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.term})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300">
              Título de la evaluación <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Primer Parcial Teórico / TP Integrador"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm focus:outline-none focus:border-indigo-500 transition placeholder:text-neutral-600"
            />
          </div>

          {/* Type & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">
                Tipo de Evaluación
              </label>
              <select
                value={milestoneType}
                onChange={(e) => setMilestoneType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 text-sm focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="parcial">Parcial</option>
                <option value="final">Examen Final</option>
                <option value="entrega">Entrega TP / Proyecto</option>
                <option value="recuperatorio">Recuperatorio</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                Fecha Programada <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 text-sm focus:outline-none focus:border-indigo-500 transition [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Weight Percentage & Replaces Milestone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 flex items-center gap-1">
                <Percent className="w-3 h-3 text-neutral-400" />
                <span>Ponderación % (Opcional)</span>
              </label>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                value={weightPercentage}
                onChange={(e) => setWeightPercentage(e.target.value)}
                placeholder="Ej. 30"
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm focus:outline-none focus:border-indigo-500 transition font-mono placeholder:text-neutral-600"
              />
            </div>

            {milestoneType === "recuperatorio" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 text-amber-400" />
                  <span>Reemplaza a Hito</span>
                </label>
                <select
                  value={replacesMilestoneId}
                  onChange={(e) => setReplacesMilestoneId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="">(Ninguno / Examen Independiente)</option>
                  {candidateReplacements.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} ({m.dueDate})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300">
              Temas o notas adicionales
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Unidades 1 a 4, material de estudio o enlaces a guías..."
              className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs focus:outline-none focus:border-indigo-500 transition placeholder:text-neutral-600 resize-none"
            />
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
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 disabled:opacity-50 transition flex items-center gap-1.5"
            >
              {saving ? "Guardando..." : milestoneToEdit ? "Actualizar Hito" : "Crear Hito"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
