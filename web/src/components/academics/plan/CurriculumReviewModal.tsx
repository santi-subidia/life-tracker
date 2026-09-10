"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  X, 
  Check, 
  Sparkles, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  BookOpen, 
  Link as LinkIcon, 
  ShieldCheck, 
  GraduationCap, 
  Loader2,
  ChevronDown,
  ChevronRight,
  Layers
} from "lucide-react";
import { 
  LifeTrackerApiClient, 
  type CareerPlanDraft, 
  type CareerPlanDetail,
  type ExtractedSubjectDraft,
  type CreateCareerPlanPayload,
  type CreateCurriculumSubjectPayload
} from "@/lib/api-client";

interface EditableSubject extends ExtractedSubjectDraft {
  tempId: string;
}

interface CurriculumReviewModalProps {
  isOpen: boolean;
  draft: CareerPlanDraft | null;
  onClose: () => void;
  onPlanCreated: (createdPlan: CareerPlanDetail) => void;
}

export function CurriculumReviewModal({
  isOpen,
  draft,
  onClose,
  onPlanCreated,
}: CurriculumReviewModalProps) {
  const [planName, setPlanName] = useState("");
  const [university, setUniversity] = useState("");
  const [totalCredits, setTotalCredits] = useState<number | undefined>(undefined);
  const [isActive, setIsActive] = useState(true);
  const [subjects, setSubjects] = useState<EditableSubject[]>([]);
  const [selectedYearFilter, setSelectedYearFilter] = useState<number | "all">("all");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Initialize from draft when opened
  useEffect(() => {
    if (isOpen && draft) {
      setPlanName(draft.suggestedPlanName || "Plan de Carrera Universitario");
      setUniversity(draft.suggestedUniversity || "");
      setTotalCredits(draft.totalCredits ?? undefined);
      setIsActive(true);
      setSaveError(null);

      // Ensure every subject has a unique tempId
      const mapped = draft.subjects.map((s, idx) => ({
        ...s,
        tempId: s.tempId || `subj-${idx + 1}-${Date.now()}`,
        prerequisites: [...(s.prerequisites || [])],
      }));
      setSubjects(mapped);
    }
  }, [isOpen, draft]);

  // Year levels in current subjects
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(subjects.map((s) => s.yearLevel))).sort((a, b) => a - b);
    return years.length > 0 ? years : [1];
  }, [subjects]);

  // Client-side cycle detection
  const detectedCycles = useMemo(() => {
    const graph = new Map<string, string[]>();
    const codeOrTempToTemp = new Map<string, string>();

    // Map both tempId and code to tempId
    subjects.forEach((s) => {
      codeOrTempToTemp.set(s.tempId, s.tempId);
      if (s.code) codeOrTempToTemp.set(s.code.trim().toUpperCase(), s.tempId);
    });

    subjects.forEach((s) => {
      const neighbors: string[] = [];
      s.prerequisites.forEach((p) => {
        const targetId = codeOrTempToTemp.get(p.requiredSubjectCode.trim().toUpperCase()) 
          || codeOrTempToTemp.get(p.requiredSubjectCode);
        if (targetId && targetId !== s.tempId) {
          neighbors.push(targetId);
        }
      });
      graph.set(s.tempId, neighbors);
    });

    const visited = new Set<string>();
    const recStack = new Set<string>();
    const cycleNodes: string[] = [];

    function hasCycle(nodeId: string): boolean {
      visited.add(nodeId);
      recStack.add(nodeId);

      const neighbors = graph.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          cycleNodes.push(nodeId, neighbor);
          return true;
        }
      }

      recStack.delete(nodeId);
      return false;
    }

    for (const s of subjects) {
      if (!visited.has(s.tempId)) {
        if (hasCycle(s.tempId)) break;
      }
    }

    if (cycleNodes.length > 0) {
      const names = subjects
        .filter((s) => cycleNodes.includes(s.tempId))
        .map((s) => s.code ? `${s.code} (${s.name})` : s.name);
      return Array.from(new Set(names));
    }

    return null;
  }, [subjects]);

  // Subject manipulation handlers
  const handleUpdateSubject = (tempId: string, field: keyof EditableSubject, value: any) => {
    setSubjects((prev) =>
      prev.map((s) => (s.tempId === tempId ? { ...s, [field]: value } : s))
    );
  };

  const handleAddSubject = (year = 1, period = 1) => {
    const newSubject: EditableSubject = {
      tempId: `custom-subj-${Date.now()}`,
      code: "",
      name: "Nueva Materia",
      yearLevel: year,
      periodNumber: period,
      credits: 4,
      isOptional: false,
      prerequisites: [],
    };
    setSubjects((prev) => [...prev, newSubject]);
  };

  const handleRemoveSubject = (tempId: string) => {
    const subjectToRemove = subjects.find((s) => s.tempId === tempId);
    setSubjects((prev) =>
      prev
        .filter((s) => s.tempId !== tempId)
        .map((s) => ({
          ...s,
          prerequisites: s.prerequisites.filter(
            (p) =>
              p.requiredSubjectCode !== tempId &&
              (!subjectToRemove?.code || p.requiredSubjectCode !== subjectToRemove.code)
          ),
        }))
    );
  };

  const handleAddPrerequisite = (subjectTempId: string, requiredTempIdOrCode: string) => {
    if (!requiredTempIdOrCode) return;
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.tempId !== subjectTempId) return s;
        // Check if already exists
        const exists = s.prerequisites.some(
          (p) => p.requiredSubjectCode === requiredTempIdOrCode
        );
        if (exists) return s;
        return {
          ...s,
          prerequisites: [
            ...s.prerequisites,
            {
              requiredSubjectCode: requiredTempIdOrCode,
              requirementType: "requiere_regularizada",
            },
          ],
        };
      })
    );
  };

  const handleTogglePrerequisiteType = (subjectTempId: string, reqCode: string) => {
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.tempId !== subjectTempId) return s;
        return {
          ...s,
          prerequisites: s.prerequisites.map((p) => {
            if (p.requiredSubjectCode !== reqCode) return p;
            return {
              ...p,
              requirementType:
                p.requirementType === "requiere_regularizada"
                  ? "requiere_aprobada"
                  : "requiere_regularizada",
            };
          }),
        };
      })
    );
  };

  const handleRemovePrerequisite = (subjectTempId: string, reqCode: string) => {
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.tempId !== subjectTempId) return s;
        return {
          ...s,
          prerequisites: s.prerequisites.filter((p) => p.requiredSubjectCode !== reqCode),
        };
      })
    );
  };

  const handleSave = async () => {
    if (!planName.trim()) {
      setSaveError("Por favor ingrese un nombre para el plan de carrera.");
      return;
    }

    if (subjects.length === 0) {
      setSaveError("El plan de carrera debe contener al menos una materia.");
      return;
    }

    if (detectedCycles && detectedCycles.length > 0) {
      setSaveError(
        `No se puede guardar: se detectó una dependencia circular entre [${detectedCycles.join(
          ", "
        )}]. Corrija las correlativas antes de continuar.`
      );
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);

      // Build payload
      const payload: CreateCareerPlanPayload = {
        name: planName.trim(),
        university: university.trim() || undefined,
        totalCredits: totalCredits || undefined,
        isActive,
        subjects: subjects.map((s, idx) => ({
          tempId: s.tempId,
          code: s.code?.trim() || undefined,
          name: s.name.trim(),
          yearLevel: s.yearLevel,
          periodNumber: s.periodNumber,
          credits: s.credits ?? undefined,
          isOptional: s.isOptional,
          orderIndex: idx,
          prerequisites: s.prerequisites.map((p) => ({
            requiredCodeOrTempId: p.requiredSubjectCode,
            requirementType: p.requirementType,
          })),
        })),
      };

      const created = await LifeTrackerApiClient.createCareerPlan(payload);
      onPlanCreated(created);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar el plan de carrera.";
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !draft) return null;

  const filteredSubjects = selectedYearFilter === "all"
    ? subjects
    : subjects.filter((s) => s.yearLevel === selectedYearFilter);

  // Group by year and period
  const groupedByYear = availableYears
    .filter((y) => selectedYearFilter === "all" || y === selectedYearFilter)
    .map((year) => {
      const yearSubjects = filteredSubjects.filter((s) => s.yearLevel === year);
      const p1 = yearSubjects.filter((s) => s.periodNumber === 1);
      const p2 = yearSubjects.filter((s) => s.periodNumber === 2);
      const other = yearSubjects.filter((s) => s.periodNumber > 2);
      return { year, p1, p2, other, count: yearSubjects.length };
    });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-6xl h-[92vh] bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <header className="p-4 sm:p-6 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Revisar y Validar Malla Curricular
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Human-in-the-Loop
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Ajusta los datos detectados por la IA antes de confirmar la persistencia.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Extraction Confidence Badge */}
            <div 
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-medium text-neutral-300"
              title="Confianza del análisis de documento por IA"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Confianza IA: {(draft.extractionConfidence * 100).toFixed(0)}%</span>
            </div>

            <button
              onClick={onClose}
              disabled={isSaving}
              className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition"
              aria-label="Cerrar modal de revisión"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Global Warnings Banner */}
        {draft.warnings && draft.warnings.length > 0 && (
          <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex-1 truncate">
              <strong>Avisos de la extracción:</strong> {draft.warnings.join(" • ")}
            </div>
          </div>
        )}

        {/* Cycle Detection Alert */}
        {detectedCycles && detectedCycles.length > 0 && (
          <div className="px-6 py-2.5 bg-rose-500/15 border-b border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
            <div className="flex-1">
              <strong>¡Ciclo de correlatividades detectado!</strong> Existe una dependencia circular entre:{" "}
              <span className="font-semibold text-rose-100">{detectedCycles.join(" ⇄ ")}</span>.
              Elimina o corrige la relación previa para que la carrera sea un Grafo Acíclico válido.
            </div>
          </div>
        )}

        {/* Error Banner */}
        {saveError && (
          <div className="px-6 py-2.5 bg-rose-500/15 border-b border-rose-500/30 text-rose-200 text-xs flex items-center justify-between gap-2">
            <span>{saveError}</span>
            <button onClick={() => setSaveError(null)} className="text-rose-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Plan Metadata Form Bar */}
        <div className="p-4 sm:px-6 bg-neutral-950/60 border-b border-neutral-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Nombre de la Carrera / Plan
            </label>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="Ej: Licenciatura en Informática"
              className="w-full px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Universidad / Institución
            </label>
            <input
              type="text"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              placeholder="Ej: UBA, UTN, UNLP"
              className="w-full px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Créditos Totales
            </label>
            <input
              type="number"
              value={totalCredits ?? ""}
              onChange={(e) => setTotalCredits(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="Opcional"
              className="w-full px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div className="sm:col-span-3 flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-4">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300 select-none">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 focus:ring-0 focus:ring-offset-0 bg-neutral-900 border-neutral-700"
              />
              <span>Plan activo principal</span>
            </label>

            <button
              type="button"
              onClick={() => handleAddSubject(1, 1)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-sky-400" />
              <span>Agregar Materia</span>
            </button>
          </div>
        </div>

        {/* Year Filter Tabs */}
        <div className="px-6 py-2 bg-neutral-950/40 border-b border-neutral-800/80 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-neutral-500 font-medium shrink-0">Filtrar por año:</span>
          <button
            onClick={() => setSelectedYearFilter("all")}
            className={`px-3 py-1 rounded-lg transition font-medium ${
              selectedYearFilter === "all"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            Todos ({subjects.length})
          </button>
          {availableYears.map((yr) => (
            <button
              key={yr}
              onClick={() => setSelectedYearFilter(yr)}
              className={`px-3 py-1 rounded-lg transition font-medium ${
                selectedYearFilter === yr
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              }`}
            >
              {yr}° Año ({subjects.filter((s) => s.yearLevel === yr).length})
            </button>
          ))}
        </div>

        {/* Scrollable Main Content */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
          {groupedByYear.map(({ year, p1, p2, other }) => (
            <section 
              key={year} 
              className="bg-neutral-950/40 border border-neutral-800/80 rounded-2xl p-4 sm:p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-xs">
                    {year}°
                  </div>
                  <h3 className="font-semibold text-sm text-white">
                    {year}° Año del Plan
                  </h3>
                  <span className="text-xs text-neutral-500">
                    ({p1.length + p2.length + other.length} materias)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddSubject(year, 1)}
                    className="text-xs text-sky-400 hover:text-sky-300 transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ En 1C</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddSubject(year, 2)}
                    className="text-xs text-sky-400 hover:text-sky-300 transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ En 2C</span>
                  </button>
                </div>
              </div>

              {/* Grid 1C vs 2C */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 1st Cuatrimestre */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    <span>1° Cuatrimestre ({p1.length})</span>
                  </div>
                  {p1.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-neutral-800 text-center text-xs text-neutral-600">
                      Sin materias en 1C
                    </div>
                  ) : (
                    p1.map((subject) => (
                      <SubjectEditorCard
                        key={subject.tempId}
                        subject={subject}
                        allSubjects={subjects}
                        onUpdate={(field, val) => handleUpdateSubject(subject.tempId, field, val)}
                        onDelete={() => handleRemoveSubject(subject.tempId)}
                        onAddPrereq={(req) => handleAddPrerequisite(subject.tempId, req)}
                        onTogglePrereqType={(req) => handleTogglePrerequisiteType(subject.tempId, req)}
                        onRemovePrereq={(req) => handleRemovePrerequisite(subject.tempId, req)}
                      />
                    ))
                  )}
                </div>

                {/* 2nd Cuatrimestre */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    <span>2° Cuatrimestre ({p2.length})</span>
                  </div>
                  {p2.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-neutral-800 text-center text-xs text-neutral-600">
                      Sin materias en 2C
                    </div>
                  ) : (
                    p2.map((subject) => (
                      <SubjectEditorCard
                        key={subject.tempId}
                        subject={subject}
                        allSubjects={subjects}
                        onUpdate={(field, val) => handleUpdateSubject(subject.tempId, field, val)}
                        onDelete={() => handleRemoveSubject(subject.tempId)}
                        onAddPrereq={(req) => handleAddPrerequisite(subject.tempId, req)}
                        onTogglePrereqType={(req) => handleTogglePrerequisiteType(subject.tempId, req)}
                        onRemovePrereq={(req) => handleRemovePrerequisite(subject.tempId, req)}
                      />
                    ))
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* Footer Actions */}
        <footer className="p-4 sm:p-6 border-t border-neutral-800 bg-neutral-900/80 backdrop-blur-md flex items-center justify-between gap-4">
          <div className="text-xs text-neutral-400">
            Total: <strong className="text-white">{subjects.length}</strong> materias registradas
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || Boolean(detectedCycles && detectedCycles.length > 0)}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:pointer-events-none text-white shadow-lg shadow-sky-600/20 active:scale-95 transition flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando y Validando Grafo...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Guardar y Activar Plan</span>
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

// Subcomponent for editing a single subject within the review modal
interface SubjectEditorCardProps {
  subject: EditableSubject;
  allSubjects: EditableSubject[];
  onUpdate: (field: keyof EditableSubject, value: any) => void;
  onDelete: () => void;
  onAddPrereq: (reqCodeOrTemp: string) => void;
  onTogglePrereqType: (reqCode: string) => void;
  onRemovePrereq: (reqCode: string) => void;
}

function SubjectEditorCard({
  subject,
  allSubjects,
  onUpdate,
  onDelete,
  onAddPrereq,
  onTogglePrereqType,
  onRemovePrereq,
}: SubjectEditorCardProps) {
  const [isAddingPrereq, setIsAddingPrereq] = useState(false);
  const [selectedPrereqTarget, setSelectedPrereqTarget] = useState("");

  // Subjects available as prerequisites (exclude self)
  const availablePrereqOptions = useMemo(() => {
    return allSubjects.filter(
      (s) =>
        s.tempId !== subject.tempId &&
        !subject.prerequisites.some(
          (p) => p.requiredSubjectCode === s.tempId || (s.code && p.requiredSubjectCode === s.code)
        )
    );
  }, [allSubjects, subject]);

  const handleConfirmAddPrereq = () => {
    if (selectedPrereqTarget) {
      onAddPrereq(selectedPrereqTarget);
      setSelectedPrereqTarget("");
      setIsAddingPrereq(false);
    }
  };

  // Helper to find name of prerequisite
  const resolveSubjectLabel = (codeOrTempId: string) => {
    const found = allSubjects.find(
      (s) => s.tempId === codeOrTempId || (s.code && s.code.toLowerCase() === codeOrTempId.toLowerCase())
    );
    return found ? `${found.code ? found.code + " - " : ""}${found.name}` : codeOrTempId;
  };

  return (
    <div className="p-3.5 bg-neutral-900/90 border border-neutral-800 rounded-xl space-y-2.5 hover:border-neutral-700 transition">
      {/* Top line: Name & Delete */}
      <div className="flex items-start gap-2">
        <input
          type="text"
          value={subject.name}
          onChange={(e) => onUpdate("name", e.target.value)}
          placeholder="Nombre de la materia"
          className="flex-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-sky-500"
        />
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
          title="Eliminar materia"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Second line: Code, Period, Year, Credits, Elective */}
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <input
          type="text"
          value={subject.code || ""}
          onChange={(e) => onUpdate("code", e.target.value)}
          placeholder="Código (ej: COMP-101)"
          className="w-28 px-2 py-0.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-sky-500"
        />

        <select
          value={subject.yearLevel}
          onChange={(e) => onUpdate("yearLevel", Number(e.target.value))}
          className="px-2 py-0.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300 focus:outline-none focus:border-sky-500"
        >
          {[1, 2, 3, 4, 5, 6].map((y) => (
            <option key={y} value={y}>
              {y}° Año
            </option>
          ))}
        </select>

        <select
          value={subject.periodNumber}
          onChange={(e) => onUpdate("periodNumber", Number(e.target.value))}
          className="px-2 py-0.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300 focus:outline-none focus:border-sky-500"
        >
          <option value={1}>1° Cuatrimestre</option>
          <option value={2}>2° Cuatrimestre</option>
          <option value={3}>Anual / Verano</option>
        </select>

        <div className="flex items-center gap-1">
          <span className="text-neutral-500">Créditos:</span>
          <input
            type="number"
            value={subject.credits ?? ""}
            onChange={(e) => onUpdate("credits", e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
            className="w-12 px-1.5 py-0.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-sky-500"
          />
        </div>

        <label className="flex items-center gap-1 text-neutral-400 ml-auto cursor-pointer select-none">
          <input
            type="checkbox"
            checked={subject.isOptional}
            onChange={(e) => onUpdate("isOptional", e.target.checked)}
            className="w-3.5 h-3.5 rounded text-sky-600 bg-neutral-950 border-neutral-800"
          />
          <span>Electiva</span>
        </label>
      </div>

      {/* Prerequisites Section */}
      <div className="pt-2 border-t border-neutral-800/80 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-neutral-400">
          <span className="flex items-center gap-1 font-medium text-neutral-300">
            <LinkIcon className="w-3 h-3 text-sky-400" />
            Correlativas ({subject.prerequisites.length})
          </span>
          {!isAddingPrereq && (
            <button
              type="button"
              onClick={() => setIsAddingPrereq(true)}
              className="text-sky-400 hover:text-sky-300 transition"
            >
              + Agregar
            </button>
          )}
        </div>

        {/* List of prerequisites */}
        {subject.prerequisites.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {subject.prerequisites.map((p) => {
              const isAprobada = p.requirementType === "requiere_aprobada";
              return (
                <div
                  key={p.requiredSubjectCode}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] border transition ${
                    isAprobada
                      ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                      : "bg-sky-500/10 text-sky-300 border-sky-500/30"
                  }`}
                >
                  <span className="max-w-[160px] truncate" title={resolveSubjectLabel(p.requiredSubjectCode)}>
                    {resolveSubjectLabel(p.requiredSubjectCode)}
                  </span>
                  {/* Toggle Requirement Type */}
                  <button
                    type="button"
                    onClick={() => onTogglePrereqType(p.requiredSubjectCode)}
                    className="px-1 py-0.2 rounded text-[9px] font-bold uppercase hover:bg-neutral-800 transition"
                    title={`Exigencia actual: ${
                      isAprobada ? "Final Aprobado" : "Cursada Regularizada"
                    }. Clic para cambiar.`}
                  >
                    {isAprobada ? "Aprobada" : "Regular"}
                  </button>
                  {/* Remove Prereq */}
                  <button
                    type="button"
                    onClick={() => onRemovePrereq(p.requiredSubjectCode)}
                    className="text-neutral-400 hover:text-rose-400 transition ml-0.5"
                    title="Quitar correlativa"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[10px] text-neutral-600 italic">Sin correlativas previas</p>
        )}

        {/* Add prerequisite form */}
        {isAddingPrereq && (
          <div className="flex items-center gap-1.5 pt-1">
            <select
              value={selectedPrereqTarget}
              onChange={(e) => setSelectedPrereqTarget(e.target.value)}
              className="flex-1 px-2 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] text-white focus:outline-none focus:border-sky-500"
            >
              <option value="">Seleccione materia requerida...</option>
              {availablePrereqOptions.map((s) => (
                <option key={s.tempId} value={s.code || s.tempId}>
                  {s.code ? `[${s.code}] ` : ""}
                  {s.name} ({s.yearLevel}° año)
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleConfirmAddPrereq}
              disabled={!selectedPrereqTarget}
              className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-[11px] font-medium transition"
            >
              OK
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedPrereqTarget("");
                setIsAddingPrereq(false);
              }}
              className="px-2 py-1 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white text-[11px] transition"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
