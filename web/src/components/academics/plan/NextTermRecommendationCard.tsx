"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Sparkles, 
  Flame, 
  Layers, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Lock, 
  Unlock, 
  ArrowRight, 
  Loader2, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Calendar
} from "lucide-react";
import { 
  LifeTrackerApiClient, 
  type CareerRecommendationResult, 
  type SubjectRecommendation,
  type BlockedSubjectEligibility
} from "@/lib/api-client";

interface NextTermRecommendationCardProps {
  planId: string;
  onEnrolled?: () => void;
}

export function NextTermRecommendationCard({
  planId,
  onEnrolled,
}: NextTermRecommendationCardProps) {
  const [quota, setQuota] = useState<number>(4);
  const [recommendationsData, setRecommendationsData] = useState<CareerRecommendationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected subject IDs for enrollment
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  
  // Term for enrollment (default based on current month)
  const defaultTerm = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    return month <= 7 ? `${year}-2C` : `${year + 1}-1C`;
  })();
  const [targetTerm, setTargetTerm] = useState(defaultTerm);

  // Enrollment state
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollSuccessMessage, setEnrollSuccessMessage] = useState<string | null>(null);

  // Accordion for other subjects
  const [showOtherEligible, setShowOtherEligible] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);

  const fetchRecommendations = useCallback(async (currentQuota: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await LifeTrackerApiClient.getCareerPlanRecommendations(planId, currentQuota);
      setRecommendationsData(res);
      // Preselect top recommended subjects
      setSelectedSubjectIds(res.recommendations.map((r) => r.subjectId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cargar recomendaciones de cursada.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    fetchRecommendations(quota);
  }, [fetchRecommendations, quota]);

  const handleToggleSelect = (id: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleEnroll = async () => {
    if (selectedSubjectIds.length === 0 || !targetTerm.trim()) return;

    try {
      setIsEnrolling(true);
      setError(null);
      setEnrollSuccessMessage(null);

      const result = await LifeTrackerApiClient.enrollSuggestedSubjects(planId, {
        term: targetTerm.trim(),
        curriculumSubjectIds: selectedSubjectIds,
      });

      setEnrollSuccessMessage(
        `¡Se inscribieron con éxito ${result.enrolledCount} materias para el período ${result.term}!`
      );
      
      // Notify parent to refresh
      if (onEnrolled) {
        onEnrolled();
      }

      // Re-fetch recommendations
      await fetchRecommendations(quota);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al inscribir las materias.";
      setError(msg);
    } finally {
      setIsEnrolling(false);
    }
  };

  const getBadgeStyle = (badge: string) => {
    const b = badge.toLowerCase();
    if (b.includes("crítico") || b.includes("critico")) {
      return "bg-rose-500/10 text-rose-300 border-rose-500/30";
    }
    if (b.includes("desbloqueo")) {
      return "bg-purple-500/10 text-purple-300 border-purple-500/30";
    }
    if (b.includes("troncal") || b.includes("pendiente")) {
      return "bg-amber-500/10 text-amber-300 border-amber-500/30";
    }
    if (b.includes("terminal")) {
      return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
    }
    return "bg-sky-500/10 text-sky-300 border-sky-500/30";
  };

  return (
    <div className="bg-neutral-900/70 border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Recomendador Inteligente de Cursada</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Motor DAG
              </span>
            </h2>
            <p className="text-xs text-neutral-400">
              Priorización óptima basada en Camino Crítico, Desbloqueo y Retraso Curricular
            </p>
          </div>
        </div>

        {/* Quota Selector */}
        <div className="flex items-center gap-2 bg-neutral-950 p-1.5 rounded-2xl border border-neutral-800 self-start sm:self-auto">
          <span className="text-xs text-neutral-400 px-2 font-medium">Cupo objetivo:</span>
          {[3, 4, 5, 6].map((q) => (
            <button
              key={q}
              onClick={() => setQuota(q)}
              disabled={loading}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                quota === q
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              }`}
            >
              {q} mat.
            </button>
          ))}
        </div>
      </div>

      {/* Success Notification */}
      {enrollSuccessMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{enrollSuccessMessage}</span>
          </div>
          <button
            onClick={() => setEnrollSuccessMessage(null)}
            className="text-emerald-400 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-neutral-400">
          <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
          <p className="text-xs">Calculando orden topológico y caminos críticos...</p>
        </div>
      ) : !recommendationsData || recommendationsData.recommendations.length === 0 ? (
        <div className="py-10 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto opacity-80" />
          <h4 className="text-sm font-semibold text-white">¡No hay materias pendientes para cursar!</h4>
          <p className="text-xs text-neutral-400 max-w-md mx-auto">
            Todas las materias de tu plan están aprobadas o no tienen correlativas habilitadas actualmente.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Top Recommendations List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
              <span>
                Recomendadas para el cupo ({recommendationsData.recommendations.length} de {recommendationsData.totalEligibleSubjects} habilitadas)
              </span>
              <span>Prioridad ponderada</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {recommendationsData.recommendations.map((subject, idx) => {
                const isSelected = selectedSubjectIds.includes(subject.subjectId);
                return (
                  <div
                    key={subject.subjectId}
                    onClick={() => handleToggleSelect(subject.subjectId)}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-neutral-800/80 border-sky-500/50 shadow-md shadow-sky-500/5"
                        : "bg-neutral-950/40 border-neutral-800/80 hover:border-neutral-700 opacity-80"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="pt-0.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // handled by parent onClick
                          className="w-4 h-4 rounded text-sky-600 focus:ring-0 bg-neutral-900 border-neutral-700 cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-xs text-neutral-400">
                            #{idx + 1}
                          </span>
                          {subject.code && (
                            <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                              {subject.code}
                            </span>
                          )}
                          <h4 className="text-sm font-semibold text-white">
                            {subject.name}
                          </h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeStyle(
                              subject.recommendationBadge
                            )}`}
                          >
                            {subject.recommendationBadge}
                          </span>
                        </div>

                        <p className="text-xs text-neutral-300">
                          {subject.justification}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-neutral-400 pt-0.5">
                          <span>{subject.yearLevel}° Año • {subject.periodNumber}° Cuat.</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Layers className="w-3 h-3 text-sky-400" />
                            Prof. crítica: {subject.criticalPathDepth} niveles
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Unlock className="w-3 h-3 text-emerald-400" />
                            Desbloquea {subject.unlockedFutureSubjectsCount} materias
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:self-center shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-bold text-sky-400">
                          {subject.priorityScore.toFixed(1)}
                        </div>
                        <div className="text-[10px] text-neutral-500 uppercase tracking-wider">
                          score
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Bar: Target Term & Enroll Button */}
          <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400">Período de cursada:</span>
                <input
                  type="text"
                  value={targetTerm}
                  onChange={(e) => setTargetTerm(e.target.value)}
                  placeholder="Ej: 2026-2C"
                  className="w-28 px-2.5 py-1 rounded-xl bg-neutral-900 border border-neutral-700 text-xs font-semibold text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-400">
                <strong className="text-white">{selectedSubjectIds.length}</strong> materias seleccionadas
              </span>

              <button
                type="button"
                onClick={handleEnroll}
                disabled={selectedSubjectIds.length === 0 || isEnrolling}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:pointer-events-none text-white shadow-lg shadow-sky-600/20 active:scale-95 transition flex items-center gap-2"
              >
                {isEnrolling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Inscribiendo...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Inscribir a Cursadas Activas</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Other Eligible Subjects Accordion */}
          {recommendationsData.otherEligibleSubjects && recommendationsData.otherEligibleSubjects.length > 0 && (
            <div className="pt-2 border-t border-neutral-800/60">
              <button
                type="button"
                onClick={() => setShowOtherEligible(!showOtherEligible)}
                className="w-full flex items-center justify-between text-xs font-semibold text-neutral-400 hover:text-white py-1 transition"
              >
                <span className="flex items-center gap-2">
                  <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                  Otras materias también habilitadas ({recommendationsData.otherEligibleSubjects.length})
                </span>
                {showOtherEligible ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showOtherEligible && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3">
                  {recommendationsData.otherEligibleSubjects.map((s) => {
                    const isSelected = selectedSubjectIds.includes(s.subjectId);
                    return (
                      <div
                        key={s.subjectId}
                        onClick={() => handleToggleSelect(s.subjectId)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between gap-2 transition ${
                          isSelected
                            ? "bg-neutral-800 border-sky-500 text-white"
                            : "bg-neutral-950/40 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-3.5 h-3.5 rounded text-sky-600 bg-neutral-900 border-neutral-700"
                          />
                          <span className="truncate font-medium">{s.name}</span>
                        </div>
                        <span className="text-[10px] text-neutral-500 font-mono shrink-0">
                          Score: {s.priorityScore.toFixed(0)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Blocked Subjects Accordion */}
          {recommendationsData.blockedSubjects && recommendationsData.blockedSubjects.length > 0 && (
            <div className="pt-2 border-t border-neutral-800/60">
              <button
                type="button"
                onClick={() => setShowBlocked(!showBlocked)}
                className="w-full flex items-center justify-between text-xs font-semibold text-neutral-400 hover:text-white py-1 transition"
              >
                <span className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-neutral-500" />
                  Materias actualmente bloqueadas por correlatividad ({recommendationsData.blockedSubjects.length})
                </span>
                {showBlocked ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showBlocked && (
                <div className="space-y-2 pt-3">
                  {recommendationsData.blockedSubjects.slice(0, 10).map((b) => (
                    <div
                      key={b.subjectId}
                      className="p-3 rounded-xl bg-neutral-950/40 border border-neutral-800/70 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-semibold text-neutral-300">{b.subjectName}</span>
                        <span className="text-neutral-500 text-[11px] ml-2">
                          ({b.yearLevel}° Año • {b.periodNumber}° Cuat.)
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="text-rose-400 font-medium">Adeuda:</span>
                        {b.missingPrerequisites.map((m) => (
                          <span
                            key={m.requiredSubjectId}
                            className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20"
                          >
                            {m.requiredSubjectName} ({m.requirementType.includes("aprobada") ? "Final" : "Cursada"})
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {recommendationsData.blockedSubjects.length > 10 && (
                    <p className="text-[11px] text-neutral-500 text-center italic">
                      + {recommendationsData.blockedSubjects.length - 10} materias bloqueadas adicionales
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
