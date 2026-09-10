"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  TrendingUp,
  Dumbbell,
  Activity,
  ChevronDown,
  ChevronUp,
  Flame,
  FileText,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import {
  LifeTrackerApiClient,
  type WorkoutSession,
  type WorkoutSet,
  type Exercise,
} from "@/lib/api-client";

export default function WorkoutHistoryPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [exercisesCatalog, setExercisesCatalog] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [history, catalog] = await Promise.all([
        LifeTrackerApiClient.getWorkoutSessionsHistory(50).catch(() => []),
        LifeTrackerApiClient.getExercises().catch(() => []),
      ]);
      setSessions(history);
      setExercisesCatalog(catalog);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar historial.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Overall Statistics
  const totalVolumeAllTime = useMemo(() => {
    return sessions.reduce((acc, s) => acc + (s.totalVolumeKg || 0), 0);
  }, [sessions]);

  const totalMinutesAllTime = useMemo(() => {
    return Math.round(sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0) / 60);
  }, [sessions]);

  const totalSetsAllTime = useMemo(() => {
    return sessions.reduce((acc, s) => acc + (s.totalSetsCompleted || 0), 0);
  }, [sessions]);

  const avgVolumePerSession = useMemo(() => {
    if (sessions.length === 0) return 0;
    return Math.round(totalVolumeAllTime / sessions.length);
  }, [sessions, totalVolumeAllTime]);

  const toggleExpand = (id: string) => {
    setExpandedSessionId((prev) => (prev === id ? null : id));
  };

  // Compute muscle stimulus breakdown for a session
  const getSessionMuscleBreakdown = (session: WorkoutSession) => {
    const stimulusMap = new Map<string, number>();

    // For each completed non-warmup set, add its exercise's muscle stimulus
    session.sets
      .filter((s) => s.isCompleted && s.setType !== "warmup")
      .forEach((set) => {
        const exercise = exercisesCatalog.find((e) => e.id === set.exerciseId);
        if (exercise && exercise.muscleStimulus) {
          exercise.muscleStimulus.forEach((item) => {
            const current = stimulusMap.get(item.muscle) || 0;
            stimulusMap.set(current > 0 ? item.muscle : item.muscle, current + item.stimulus_pct / 100);
          });
        } else {
          // Fallback: primary muscle gets 1.0 effective set
          const current = stimulusMap.get(set.primaryMuscleGroup) || 0;
          stimulusMap.set(set.primaryMuscleGroup, current + 1.0);
        }
      });

    return Array.from(stimulusMap.entries())
      .map(([muscle, effectiveSets]) => ({
        muscle,
        effectiveSets: Math.round(effectiveSets * 10) / 10,
      }))
      .sort((a, b) => b.effectiveSets - a.effectiveSets);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-20">
      {/* Top Header */}
      <header className="border-b border-neutral-800/80 bg-neutral-900/60 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/entrenamientos"
                className="w-10 h-10 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300 hover:text-white transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-white">Historial de Entrenamientos</h1>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {sessions.length}
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  Registro de sobrecarga progresiva, tonelaje acumulado y series efectivas
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-between text-red-400 text-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-xs font-semibold text-red-300 hover:text-red-100">
              Cerrar
            </button>
          </div>
        )}

        {/* Global Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-neutral-400">Entrenamientos</span>
              <div className="w-7 h-7 rounded-xl bg-neutral-800 flex items-center justify-center text-amber-400">
                <Dumbbell className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-white">{sessions.length}</p>
            <p className="text-[11px] text-neutral-500 mt-1">Sesiones concluidas</p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-neutral-400">Tonelaje Total</span>
              <div className="w-7 h-7 rounded-xl bg-neutral-800 flex items-center justify-center text-amber-400">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-white">
              {totalVolumeAllTime.toLocaleString("es-ES")} <span className="text-xs font-normal text-neutral-400">kg</span>
            </p>
            <p className="text-[11px] text-neutral-500 mt-1">Volumen acumulado</p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-neutral-400">Series Efectivas</span>
              <div className="w-7 h-7 rounded-xl bg-neutral-800 flex items-center justify-center text-green-400">
                <Activity className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-white">{totalSetsAllTime}</p>
            <p className="text-[11px] text-neutral-500 mt-1">Series de trabajo realizadas</p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-neutral-400">Tiempo Invertido</span>
              <div className="w-7 h-7 rounded-xl bg-neutral-800 flex items-center justify-center text-purple-400">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-white">
              {totalMinutesAllTime} <span className="text-xs font-normal text-neutral-400">min</span>
            </p>
            <p className="text-[11px] text-neutral-500 mt-1">En el gimnasio</p>
          </div>
        </div>

        {/* Sessions Timeline List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Sesiones Completadas</h2>
            <span className="text-xs text-neutral-400">Orden cronológico inverso</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 rounded-3xl bg-neutral-900/40 border border-neutral-800/80 animate-pulse" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-neutral-800 bg-neutral-900/30 p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-neutral-800 text-neutral-400 mx-auto flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">No hay entrenamientos en el historial</h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  Cuando finalices una sesión activa, aparecerá aquí con su desglose de carga y series efectivas.
                </p>
              </div>
              <Link
                href="/entrenamientos"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition"
              >
                <span>Ir al Hub de Entrenamientos</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => {
                const isExpanded = expandedSessionId === session.id;
                const muscleBreakdown = isExpanded ? getSessionMuscleBreakdown(session) : [];

                return (
                  <div
                    key={session.id}
                    className="rounded-3xl border border-neutral-800 bg-neutral-900/60 overflow-hidden hover:border-neutral-700 transition shadow-sm"
                  >
                    {/* Session Summary Bar */}
                    <div
                      onClick={() => toggleExpand(session.id)}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-neutral-900/80 transition"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-neutral-400 capitalize">
                            {new Date(session.startedAt).toLocaleDateString("es-ES", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                          {session.routineName && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              {session.routineName}
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-white">{session.name}</h3>
                        {session.notes && (
                          <p className="text-xs text-neutral-400 italic flex items-center gap-1.5 line-clamp-1">
                            <FileText className="w-3 h-3 text-neutral-500 flex-shrink-0" />
                            <span>&quot;{session.notes}&quot;</span>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-5">
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-neutral-500">Duración</p>
                            <p className="text-xs font-mono font-bold text-white tabular-nums">
                              {Math.round(session.durationSeconds / 60)} min
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-neutral-500">Series</p>
                            <p className="text-xs font-mono font-bold text-white tabular-nums">
                              {session.totalSetsCompleted}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-neutral-500">Volumen</p>
                            <p className="text-xs font-mono font-bold text-amber-400 tabular-nums">
                              {session.totalVolumeKg.toLocaleString("es-ES")} kg
                            </p>
                          </div>
                        </div>

                        <button
                          className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition"
                          aria-label={isExpanded ? "Colapsar detalle" : "Expandir detalle"}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Section: Sets and Muscle Breakdown */}
                    {isExpanded && (
                      <div className="p-5 border-t border-neutral-800/80 bg-neutral-950/40 space-y-6 animate-in fade-in duration-200">
                        {/* Muscle Stimulus Breakdown (Subi's Weighted Model) */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-amber-400" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                              Estímulo Muscular Efectivo Ponderado
                            </h4>
                          </div>

                          {muscleBreakdown.length === 0 ? (
                            <p className="text-xs text-neutral-500">Sin series efectivas computadas.</p>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                              {muscleBreakdown.map((item) => (
                                <div
                                  key={item.muscle}
                                  className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between"
                                >
                                  <span className="text-xs font-medium text-neutral-300 capitalize truncate max-w-[110px]">
                                    {item.muscle}
                                  </span>
                                  <span className="text-xs font-mono font-bold text-amber-400 tabular-nums">
                                    {item.effectiveSets} series
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Logged Sets Details */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                            Detalle de Series Registradas
                          </h4>

                          <div className="space-y-2">
                            {session.sets.map((set, idx) => (
                              <div
                                key={set.id || idx}
                                className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="w-6 h-6 rounded-lg bg-neutral-800 font-mono text-xs flex items-center justify-center font-bold text-neutral-400">
                                    {set.setOrder}
                                  </span>
                                  <div className="truncate">
                                    <p className="font-semibold text-white truncate">{set.exerciseName}</p>
                                    <p className="text-[10px] text-neutral-400 capitalize">
                                      {set.primaryMuscleGroup} • {set.equipment}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 font-mono tabular-nums">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-neutral-800 text-neutral-400">
                                    {set.setType}
                                  </span>
                                  <span className="font-bold text-neutral-200">
                                    {set.weightKg} kg × {set.reps} reps
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
