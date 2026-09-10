"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  GraduationCap, 
  UploadCloud, 
  Sparkles, 
  Layers, 
  Grid3X3, 
  Network, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  Lock, 
  Unlock, 
  Trash2, 
  ChevronDown, 
  AlertCircle, 
  Loader2, 
  Check, 
  Award,
  Info,
  Calendar,
  X
} from "lucide-react";
import { 
  LifeTrackerApiClient, 
  type CareerPlanSummary, 
  type CareerPlanDetail, 
  type CareerPlanDraft,
  type CurriculumSubjectItem,
  type CurriculumPrerequisiteItem
} from "@/lib/api-client";
import { CareerPlanUploadModal } from "./CareerPlanUploadModal";
import { CurriculumReviewModal } from "./CurriculumReviewModal";
import { NextTermRecommendationCard } from "./NextTermRecommendationCard";
import { CurriculumGraphView } from "./CurriculumGraphView";

interface CareerPlanDashboardProps {
  onSubjectEnrolled?: () => void;
}

export function CareerPlanDashboard({ onSubjectEnrolled }: CareerPlanDashboardProps) {
  const [plans, setPlans] = useState<CareerPlanSummary[]>([]);
  const [activePlan, setActivePlan] = useState<CareerPlanDetail | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<"grid" | "recommendations" | "graph">("grid");

  // Modals for AI Extraction & Human-in-the-Loop Review
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [extractedDraft, setExtractedDraft] = useState<CareerPlanDraft | null>(null);

  // Popover for viewing subject detail in the Grid
  const [activeSubjectPopover, setActiveSubjectPopover] = useState<CurriculumSubjectItem | null>(null);

  // Load all plans and active plan
  const loadPlans = useCallback(async (preferredPlanId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const userPlans = await LifeTrackerApiClient.getCareerPlans().catch(() => []);
      setPlans(userPlans);

      if (userPlans.length > 0) {
        const targetId = preferredPlanId 
          || userPlans.find((p) => p.isActive)?.id 
          || userPlans[0].id;

        setSelectedPlanId(targetId);
        const detail = await LifeTrackerApiClient.getCareerPlanDetail(targetId);
        setActivePlan(detail);
      } else {
        setSelectedPlanId(null);
        setActivePlan(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cargar los planes de carrera.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // Switch selected plan
  const handleSelectPlan = async (planId: string) => {
    try {
      setLoading(true);
      setSelectedPlanId(planId);
      const detail = await LifeTrackerApiClient.getCareerPlanDetail(planId);
      setActivePlan(detail);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cargar el detalle del plan.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Set selected plan as active
  const handleSetActivePlan = async (planId: string) => {
    try {
      await LifeTrackerApiClient.setActiveCareerPlan(planId);
      await loadPlans(planId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al activar el plan.";
      setError(msg);
    }
  };

  // Delete plan
  const handleDeletePlan = async (planId: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este plan de estudio y su malla curricular?")) {
      return;
    }
    try {
      await LifeTrackerApiClient.deleteCareerPlan(planId);
      await loadPlans();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al eliminar el plan.";
      setError(msg);
    }
  };

  // Handle Draft Extracted from Upload Modal
  const handleDraftExtracted = (draft: CareerPlanDraft) => {
    setExtractedDraft(draft);
    setIsReviewModalOpen(true);
  };

  // Handle Plan Created from Review Modal
  const handlePlanCreated = async (created: CareerPlanDetail) => {
    await loadPlans(created.id);
  };

  // Computed metrics from activePlan subjects
  const metrics = useMemo(() => {
    if (!activePlan || !activePlan.subjects) {
      return {
        total: 0,
        approved: 0,
        regularized: 0,
        inProgress: 0,
        eligible: 0,
        blocked: 0,
        percentage: 0,
        earnedCredits: 0,
        totalCredits: 0,
      };
    }

    const total = activePlan.subjects.length;
    let approved = 0;
    let regularized = 0;
    let inProgress = 0;
    let eligible = 0;
    let blocked = 0;
    let earnedCredits = 0;
    let totalCredits = activePlan.totalCredits || 0;

    activePlan.subjects.forEach((s) => {
      const st = s.status.toLowerCase();
      if (st === "aprobada") {
        approved++;
        if (s.credits) earnedCredits += s.credits;
      } else if (st === "regularizada") {
        regularized++;
      } else if (st === "en_curso") {
        inProgress++;
      } else if (st === "habilitada") {
        eligible++;
      } else {
        blocked++;
      }
    });

    const percentage = total > 0 ? Math.round((approved / total) * 1000) / 10 : 0;

    return {
      total,
      approved,
      regularized,
      inProgress,
      eligible,
      blocked,
      percentage,
      earnedCredits,
      totalCredits,
    };
  }, [activePlan]);

  // Group subjects by Year and Period for the Grid View
  const gridYears = useMemo(() => {
    if (!activePlan || !activePlan.subjects) return [];
    const yearsSet = Array.from(new Set(activePlan.subjects.map((s) => s.yearLevel))).sort((a, b) => a - b);
    return yearsSet.map((year) => {
      const yearSubjects = activePlan.subjects.filter((s) => s.yearLevel === year);
      const p1 = yearSubjects.filter((s) => s.periodNumber === 1);
      const p2 = yearSubjects.filter((s) => s.periodNumber === 2);
      const other = yearSubjects.filter((s) => s.periodNumber > 2);
      return { year, p1, p2, other, count: yearSubjects.length };
    });
  }, [activePlan]);

  if (loading && !activePlan && plans.length === 0) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-neutral-400">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
        <p className="text-sm">Cargando planes de estudio...</p>
      </div>
    );
  }

  // EMPTY STATE: No career plans yet
  if (!loading && (!activePlan || plans.length === 0)) {
    return (
      <div className="space-y-6">
        <div className="p-8 sm:p-12 rounded-3xl bg-neutral-900/60 border border-neutral-800 text-center space-y-6 max-w-2xl mx-auto shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto">
            <GraduationCap className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Configura tu Plan de Carrera Universitario
            </h2>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Sube la foto o PDF oficial de tu plan de estudio. Nuestra Inteligencia Artificial detectará automáticamente las asignaturas, cuatrimestres y el árbol de correlatividades para sugerirte las materias clave a cursar.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800/80 space-y-1">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h4 className="text-xs font-semibold text-white">Extracción Asistida</h4>
              <p className="text-[11px] text-neutral-400">Gemini 2.5 Flash extrae la malla con verificación previa.</p>
            </div>
            <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800/80 space-y-1">
              <Network className="w-5 h-5 text-emerald-400" />
              <h4 className="text-xs font-semibold text-white">Motor DAG</h4>
              <p className="text-[11px] text-neutral-400">Valida que no existan ciclos y evalúa desbloqueos futuros.</p>
            </div>
            <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800/80 space-y-1">
              <Award className="w-5 h-5 text-amber-400" />
              <h4 className="text-xs font-semibold text-white">Camino Crítico</h4>
              <p className="text-[11px] text-neutral-400">Prioriza materias troncales para evitar cuellos de botella.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="px-6 py-3 rounded-2xl text-sm font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-xl shadow-sky-600/25 active:scale-95 transition inline-flex items-center gap-2"
          >
            <UploadCloud className="w-5 h-5" />
            <span>Subir Malla Curricular con IA</span>
          </button>
        </div>

        {/* Modals */}
        <CareerPlanUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onDraftExtracted={handleDraftExtracted}
        />

        <CurriculumReviewModal
          isOpen={isReviewModalOpen}
          draft={extractedDraft}
          onClose={() => setIsReviewModalOpen(false)}
          onPlanCreated={handlePlanCreated}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-neutral-900/70 border border-neutral-800 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  {activePlan?.name}
                </h2>
                {activePlan?.isActive ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Plan Activo
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => activePlan && handleSetActivePlan(activePlan.id)}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 transition"
                  >
                    Marcar como activo
                  </button>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {activePlan?.university || "Universidad"} • {metrics.total} asignaturas • {activePlan?.totalCredits ? `${activePlan.totalCredits} créditos totales` : "Plan canónico"}
              </p>
            </div>
          </div>

          {/* Plan Selector & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {plans.length > 1 && (
              <select
                value={selectedPlanId || ""}
                onChange={(e) => handleSelectPlan(e.target.value)}
                className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs font-medium focus:outline-none focus:border-sky-500 transition"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.isActive ? "(Activo)" : ""}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition flex items-center gap-1.5 shrink-0"
            >
              <UploadCloud className="w-4 h-4 text-sky-400" />
              <span>Subir Nuevo Plan</span>
            </button>

            {activePlan && (
              <button
                type="button"
                onClick={() => handleDeletePlan(activePlan.id)}
                className="p-2 text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                title="Eliminar este plan"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Metrics Grid */}
        <div className="pt-4 border-t border-neutral-800/80 grid grid-cols-2 sm:grid-cols-6 gap-3">
          {/* Completion % */}
          <div className="p-3.5 rounded-2xl bg-neutral-950/60 border border-neutral-800/80 space-y-1">
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Avance Carrera
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-white">{metrics.percentage}%</span>
              <span className="text-[10px] text-neutral-500">completado</span>
            </div>
            <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(metrics.percentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Approved */}
          <div className="p-3.5 rounded-2xl bg-neutral-950/60 border border-neutral-800/80 space-y-1">
            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Aprobadas
            </span>
            <div className="text-xl font-bold text-white">
              {metrics.approved}{" "}
              <span className="text-xs font-normal text-neutral-500">/ {metrics.total}</span>
            </div>
          </div>

          {/* Regularized */}
          <div className="p-3.5 rounded-2xl bg-neutral-950/60 border border-neutral-800/80 space-y-1">
            <span className="text-[10px] font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3" /> Regulares
            </span>
            <div className="text-xl font-bold text-white">{metrics.regularized}</div>
          </div>

          {/* In Progress */}
          <div className="p-3.5 rounded-2xl bg-neutral-950/60 border border-neutral-800/80 space-y-1">
            <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> En Curso
            </span>
            <div className="text-xl font-bold text-white">{metrics.inProgress}</div>
          </div>

          {/* Eligible */}
          <div className="p-3.5 rounded-2xl bg-neutral-950/60 border border-neutral-800/80 space-y-1">
            <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
              <Unlock className="w-3 h-3" /> Habilitadas
            </span>
            <div className="text-xl font-bold text-white">{metrics.eligible}</div>
          </div>

          {/* Blocked */}
          <div className="p-3.5 rounded-2xl bg-neutral-950/60 border border-neutral-800/80 space-y-1">
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
              <Lock className="w-3 h-3" /> Bloqueadas
            </span>
            <div className="text-xl font-bold text-white">{metrics.blocked}</div>
          </div>
        </div>
      </div>

      {/* Internal Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("grid")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 shrink-0 ${
            activeTab === "grid"
              ? "bg-neutral-800 text-white border border-neutral-700 shadow"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900"
          }`}
        >
          <Grid3X3 className="w-4 h-4 text-sky-400" />
          <span>Malla Curricular (Grilla)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("recommendations")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 shrink-0 ${
            activeTab === "recommendations"
              ? "bg-neutral-800 text-white border border-neutral-700 shadow"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900"
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Recomendador de Cursada</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("graph")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 shrink-0 ${
            activeTab === "graph"
              ? "bg-neutral-800 text-white border border-neutral-700 shadow"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900"
          }`}
        >
          <Network className="w-4 h-4 text-emerald-400" />
          <span>Grafo de Dependencias</span>
        </button>
      </div>

      {/* TAB 1: CURRICULUM GRID VIEW */}
      {activeTab === "grid" && (
        <div className="space-y-6">
          {/* Legend */}
          <div className="p-3 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-neutral-400">Estados de la malla canónica:</span>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Aprobada (Final)
              </span>
              <span className="inline-flex items-center gap-1 text-sky-400">
                <span className="w-2 h-2 rounded-full bg-sky-500" /> Regularizada (Cursada)
              </span>
              <span className="inline-flex items-center gap-1 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Cursando Ahora
              </span>
              <span className="inline-flex items-center gap-1 text-indigo-400">
                <span className="w-2 h-2 rounded-full bg-indigo-500" /> Habilitada
              </span>
              <span className="inline-flex items-center gap-1 text-neutral-500">
                <span className="w-2 h-2 rounded-full bg-neutral-600" /> Bloqueada
              </span>
            </div>
          </div>

          {/* Years Container */}
          <div className="space-y-6">
            {gridYears.map(({ year, p1, p2, other }) => (
              <div
                key={year}
                className="bg-neutral-900/40 border border-neutral-800 rounded-3xl p-5 space-y-4"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-neutral-800 text-neutral-200 border border-neutral-700 flex items-center justify-center font-bold text-xs">
                    {year}°
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{year}° Año</h3>
                    <p className="text-[11px] text-neutral-500">
                      {p1.length + p2.length + other.length} materias en este ciclo
                    </p>
                  </div>
                </div>

                {/* 1C and 2C Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 1° Cuatrimestre */}
                  <div className="space-y-2.5">
                    <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-400" />
                      <span>1° Cuatrimestre ({p1.length})</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {p1.map((subj) => (
                        <GridSubjectCard
                          key={subj.id}
                          subject={subj}
                          onClick={() => setActiveSubjectPopover(subj)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 2° Cuatrimestre */}
                  <div className="space-y-2.5">
                    <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      <span>2° Cuatrimestre ({p2.length})</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {p2.map((subj) => (
                        <GridSubjectCard
                          key={subj.id}
                          subject={subj}
                          onClick={() => setActiveSubjectPopover(subj)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: RECOMMENDATIONS */}
      {activeTab === "recommendations" && activePlan && (
        <NextTermRecommendationCard
          planId={activePlan.id}
          onEnrolled={() => {
            loadPlans(activePlan.id);
            if (onSubjectEnrolled) onSubjectEnrolled();
          }}
        />
      )}

      {/* TAB 3: GRAPH VIEW */}
      {activeTab === "graph" && activePlan && (
        <CurriculumGraphView subjects={activePlan.subjects} />
      )}

      {/* Popover / Modal for Subject in Grid */}
      {activeSubjectPopover && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
          onClick={() => setActiveSubjectPopover(null)}
        >
          <div 
            className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                    {activeSubjectPopover.code || `${activeSubjectPopover.yearLevel}°A-${activeSubjectPopover.periodNumber}C`}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-neutral-800 text-neutral-300">
                    {activeSubjectPopover.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">
                  {activeSubjectPopover.name}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {activeSubjectPopover.yearLevel}° Año • {activeSubjectPopover.periodNumber}° Cuatrimestre • {activeSubjectPopover.credits ?? 0} Créditos
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveSubjectPopover(null)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Prerequisites */}
            <div className="space-y-2 pt-2 border-t border-neutral-800">
              <h4 className="text-xs font-semibold text-neutral-300">
                Correlatividades Requeridas ({activeSubjectPopover.prerequisites.length})
              </h4>
              {activeSubjectPopover.prerequisites.length === 0 ? (
                <p className="text-xs text-neutral-500 italic">No requiere ninguna correlativa.</p>
              ) : (
                <div className="space-y-1.5">
                  {activeSubjectPopover.prerequisites.map((p) => (
                    <div
                      key={p.prerequisiteId}
                      className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {p.isSatisfied ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <span className="text-neutral-200 truncate font-medium">
                          {p.requiredSubjectName}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                          p.requirementType === "requiere_aprobada"
                            ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                            : "bg-sky-500/10 text-sky-300 border-sky-500/30"
                        }`}
                      >
                        {p.requirementType === "requiere_aprobada" ? "Final" : "Regular"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveSubjectPopover(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-white transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload & Review Modals */}
      <CareerPlanUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onDraftExtracted={handleDraftExtracted}
      />

      <CurriculumReviewModal
        isOpen={isReviewModalOpen}
        draft={extractedDraft}
        onClose={() => setIsReviewModalOpen(false)}
        onPlanCreated={handlePlanCreated}
      />
    </div>
  );
}

// Subcomponent: GridSubjectCard for the curriculum matrix
interface GridSubjectCardProps {
  subject: CurriculumSubjectItem;
  onClick: () => void;
}

function GridSubjectCard({ subject, onClick }: GridSubjectCardProps) {
  const getCardStyle = () => {
    switch (subject.status.toLowerCase()) {
      case "aprobada":
        return {
          card: "bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50",
          statusText: "Aprobada",
          badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
        };
      case "regularizada":
        return {
          card: "bg-sky-950/20 border-sky-500/30 hover:border-sky-500/50",
          statusText: "Regularizada",
          badge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
          icon: <Clock className="w-3.5 h-3.5 text-sky-400" />,
        };
      case "en_curso":
        return {
          card: "bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50",
          statusText: "En Curso",
          badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
          icon: <BookOpen className="w-3.5 h-3.5 text-amber-400" />,
        };
      case "habilitada":
        return {
          card: "bg-neutral-900/90 border-indigo-500/30 hover:border-indigo-500/60 shadow-md shadow-indigo-500/5",
          statusText: "Habilitada",
          badge: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
          icon: <Unlock className="w-3.5 h-3.5 text-indigo-400" />,
        };
      case "bloqueada":
      default:
        return {
          card: "bg-neutral-950/40 border-neutral-800/80 hover:border-neutral-700 opacity-70",
          statusText: "Bloqueada",
          badge: "bg-neutral-800 text-neutral-500 border-neutral-700",
          icon: <Lock className="w-3.5 h-3.5 text-neutral-500" />,
        };
    }
  };

  const style = getCardStyle();

  return (
    <div
      onClick={onClick}
      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${style.card}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono font-semibold text-neutral-400">
          {subject.code || `${subject.yearLevel}°A`}
        </span>
        <div className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border">
          {style.icon}
          <span className="capitalize">{style.statusText}</span>
        </div>
      </div>

      <h4 
        className="text-xs font-semibold text-white truncate-2-lines leading-snug"
        title={subject.name}
      >
        {subject.name}
      </h4>

      <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1 border-t border-neutral-800/50">
        <span>{subject.credits ? `${subject.credits} créditos` : "Troncal"}</span>
        <span>{subject.prerequisites.length} correlat.</span>
      </div>
    </div>
  );
}
