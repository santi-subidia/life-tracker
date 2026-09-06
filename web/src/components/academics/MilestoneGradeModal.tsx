"use client";

import React, { useState, useEffect } from "react";
import { X, Award, Check, AlertCircle } from "lucide-react";
import type { AcademicMilestone, AssignGradePayload } from "@/lib/api-client";

interface MilestoneGradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestone: AcademicMilestone | null;
  onGradeAssigned: (milestoneId: string, payload: AssignGradePayload) => Promise<void>;
}

const PRESET_GRADES = [4.0, 6.0, 7.0, 8.0, 9.0, 10.0];

export function MilestoneGradeModal({
  isOpen,
  onClose,
  milestone,
  onGradeAssigned,
}: MilestoneGradeModalProps) {
  const [gradeStr, setGradeStr] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (milestone) {
      setGradeStr(milestone.grade !== undefined && milestone.grade !== null ? String(milestone.grade) : "");
      setNotes(milestone.notes || "");
    } else {
      setGradeStr("");
      setNotes("");
    }
    setError(null);
  }, [milestone, isOpen]);

  if (!isOpen || !milestone) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const gradeNum = parseFloat(gradeStr);

    if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 10) {
      setError("La calificación debe ser un valor numérico entre 0.00 y 10.00.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await onGradeAssigned(milestone.id, {
        grade: gradeNum,
        notes: notes.trim() || undefined,
      });

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al asignar la calificación.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePresetClick = (val: number) => {
    setGradeStr(val.toFixed(2));
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/20">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Asignar Calificación
              </h3>
              <p className="text-xs text-neutral-400 truncate max-w-[260px]">
                {milestone.title}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Grade Number Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300 flex items-center justify-between">
              <span>Nota Obtenida [0.00 - 10.00] <span className="text-amber-400">*</span></span>
              <span className="text-[11px] text-neutral-500">Mínimo para aprobar: 4.00</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                required
                autoFocus
                value={gradeStr}
                onChange={(e) => setGradeStr(e.target.value)}
                placeholder="Ej. 8.50"
                className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 font-mono text-2xl font-bold focus:outline-none focus:border-amber-500 transition placeholder:text-neutral-600"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-sm">
                / 10.00
              </span>
            </div>
          </div>

          {/* 1-Tap Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-neutral-400 font-medium">Accesos rápidos de nota:</span>
            <div className="grid grid-cols-6 gap-1.5">
              {PRESET_GRADES.map((preset) => {
                const isSelected = parseFloat(gradeStr) === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className={`py-2 rounded-xl text-xs font-mono font-bold transition flex items-center justify-center border ${
                      isSelected
                        ? "bg-amber-500 text-neutral-950 border-amber-400 shadow-md shadow-amber-500/20"
                        : "bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700 hover:text-white"
                    }`}
                  >
                    {preset.toFixed(0)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300">
              Observaciones o comentarios
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Examen teórico sobresaliente, tema práctico para reforzar..."
              className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs focus:outline-none focus:border-amber-500 transition placeholder:text-neutral-600 resize-none"
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
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition flex items-center gap-1.5"
            >
              {saving ? "Guardando..." : "Guardar Calificación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
