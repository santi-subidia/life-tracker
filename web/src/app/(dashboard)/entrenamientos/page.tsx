"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Dumbbell,
  Play,
  Flame,
  Plus,
  Calendar,
  Clock,
  TrendingUp,
  ChevronRight,
  Sparkles,
  Layers,
  History,
  Activity,
  AlertCircle,
} from "lucide-react";
import {
  LifeTrackerApiClient,
  type WorkoutSession,
  type Routine,
} from "@/lib/api-client";

export default function FitnessHubPage() {
  const router = useRouter();

  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingQuickSession, setStartingQuickSession] = useState(false);
  const [startingRoutineId, setStartingRoutineId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [active, routineList, history] = await Promise.all([
        LifeTrackerApiClient.getActiveWorkoutSession().catch(() => null),
        LifeTrackerApiClient.getRoutines().catch(() => []),
        LifeTrackerApiClient.getWorkoutSessionsHistory(5).catch(() => []),
      ]);

      setActiveSession(active);
      setRoutines(routineList.filter((r) => !r.isArchived));
      setRecentSessions(history);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar datos del módulo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Start Quick Ad-Hoc Workout
  const handleStartQuickWorkout = async () => {
    if (activeSession) {
      router.push("/entrenamientos/sesion/activa");
      return;
    }

    try {
      setStartingQuickSession(true);
      setError(null);
      const today = new Date().toLocaleDateString("es-ES", { weekday: "long" });
      const capitalized = today.charAt(0).toUpperCase() + today.slice(1);
      await LifeTrackerApiClient.startWorkoutSession({
        name: `Entrenamiento ${capitalized}`,
      });
      router.push("/entrenamientos/sesion/activa");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar el entrenamiento.");
      setStartingQuickSession(false);
    }
  };

  // Start Workout From Routine
  const handleStartRoutine = async (routine: Routine) => {
    if (activeSession) {
      router.push("/entrenamientos/sesion/activa");
      return;
    }

    try {
      setStartingRoutineId(routine.id);
      setError(null);
      await LifeTrackerApiClient.startWorkoutSession({
        name: routine.name,
        routineId: routine.id,
      });
      router.push("/entrenamientos/sesion/activa");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar la rutina.");
      setStartingRoutineId(null);
    }
  };

  // Aggregated quick stats
  const totalTonnageKg = recentSessions.reduce((acc, s) => acc + (s.totalVolumeKg || 0), 0);
  const totalCompletedSets = recentSessions.reduce((acc, s) => acc + (s.totalSetsCompleted || 0), 0);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-20">
      {/* Top Header */}
      <header className="border-b border-neutral-800/80 bg-neutral-900/60 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="w-10 h-10 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300 hover:text-white transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Dumbbell className="w-3.5 h-3.5" />
                  </div>
                  <h1 className="text-xl font-bold tracking-tight text-white">Entrenamientos</h1>
                </div>
                <p className="text-xs text-neutral-400">
                  Sobrecarga progresiva, rutinas de hipertrofia y estímulo muscular
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/entrenamientos/ejercicios"
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 hover:text-white flex items-center gap-2 transition"
              >
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Ejercicios</span>
              </Link>
              <Link
                href="/entrenamientos/rutinas"
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 hover:text-white flex items-center gap-2 transition"
              >
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Rutinas</span>
              </Link>
              <Link
                href="/entrenamientos/historial"
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 hover:text-white flex items-center gap-2 transition"
              >
                <History className="w-4 h-4 text-neutral-400" />
                <span>Historial</span>
              </Link>
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
            <button
              onClick={() => setError(null)}
              className="text-xs font-semibold text-red-300 hover:text-red-100"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* ACTIVE SESSION HERO CARD */}
        {activeSession && (
          <div className="relative overflow-hidden rounded-3xl border border-amber-500/50 bg-gradient-to-br from-amber-500/15 via-neutral-900 to-neutral-950 p-6 shadow-2xl backdrop-blur-xl animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  Sesión en curso
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {activeSession.name}
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-300">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Iniciada a las {new Date(activeSession.startedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-amber-400" />
                    <span>{activeSession.sets.length} series registradas</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/entrenamientos/sesion/activa"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition active:scale-95"
                >
                  <Play className="w-4 h-4 fill-neutral-950" />
                  <span>Reanudar Entrenamiento</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* QUICK START HERO (When no active workout) */}
        {!activeSession && (
          <div className="relative overflow-hidden rounded-3xl border border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-900/90 to-neutral-950 p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="max-w-xl space-y-3">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-300 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Modo Operar Táctil</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  ¿Listo para entrenar hoy?
                </h2>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  Inicia un entrenamiento libre o elige una de tus rutinas. El tracker registrará tus series con cargas fantasma del entrenamiento previo y un temporizador automático de descanso.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  onClick={handleStartQuickWorkout}
                  disabled={startingQuickSession}
                  className="px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition active:scale-95"
                >
                  <Play className="w-4 h-4 fill-neutral-950" />
                  <span>{startingQuickSession ? "Iniciando..." : "Entrenamiento Libre"}</span>
                </button>
                <Link
                  href="/entrenamientos/rutinas"
                  className="px-5 py-3.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700/80 border border-neutral-700 text-neutral-200 font-semibold text-sm flex items-center justify-center gap-2 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ver Rutinas</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-neutral-400">Sesiones recientes</span>
              <div className="w-7 h-7 rounded-xl bg-neutral-800 flex items-center justify-center text-neutral-400">
                <Calendar className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-white">
              {recentSessions.length}
            </p>
            <p className="text-[11px] text-neutral-500 mt-1">Últimos registros</p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-neutral-400">Volumen Levantado</span>
              <div className="w-7 h-7 rounded-xl bg-neutral-800 flex items-center justify-center text-amber-400">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-white">
              {totalTonnageKg.toLocaleString("es-ES")} <span className="text-xs font-normal text-neutral-400 font-sans">kg</span>
            </p>
            <p className="text-[11px] text-neutral-500 mt-1">Tonelaje acumulado reciente</p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-neutral-400">Series Completadas</span>
              <div className="w-7 h-7 rounded-xl bg-neutral-800 flex items-center justify-center text-green-400">
                <Activity className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-white">
              {totalCompletedSets}
            </p>
            <p className="text-[11px] text-neutral-500 mt-1">Series de trabajo</p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-neutral-400">Rutinas Creadas</span>
              <div className="w-7 h-7 rounded-xl bg-neutral-800 flex items-center justify-center text-purple-400">
                <Flame className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-white">
              {routines.length}
            </p>
            <p className="text-[11px] text-neutral-500 mt-1">Plantillas activas</p>
          </div>
        </div>

        {/* MAIN SECTION: ROUTINES & RECENT ACTIVITY */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Routines Quick Launch (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-white">Tus Rutinas</h3>
              </div>
              <Link
                href="/entrenamientos/rutinas"
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                <span>Administrar</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-36 rounded-2xl bg-neutral-900/60 border border-neutral-800 animate-pulse" />
                ))}
              </div>
            ) : routines.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/30 p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-neutral-800/80 text-amber-400 mx-auto flex items-center justify-center">
                  <Dumbbell className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-white">Sin rutinas creadas todavía</h4>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  Crea tu primera plantilla de empuje, tirón, pierna o cuerpo completo para iniciar tus entrenamientos con 1 solo clic.
                </p>
                <Link
                  href="/entrenamientos/rutinas"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Primera Rutina</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {routines.slice(0, 4).map((routine) => (
                  <div
                    key={routine.id}
                    className="p-5 rounded-2xl border border-neutral-800 hover:border-neutral-700 bg-neutral-900/60 hover:bg-neutral-900 flex flex-col justify-between gap-4 transition group"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                          {routine.estimatedDurationMinutes} min
                        </span>
                        <span className="text-xs text-neutral-400">
                          {routine.exercises.length} ejercicios
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white group-hover:text-amber-400 transition">
                        {routine.name}
                      </h4>
                      {routine.description && (
                        <p className="text-xs text-neutral-400 line-clamp-2">
                          {routine.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {routine.exercises.slice(0, 3).map((ex, idx) => (
                          <div
                            key={idx}
                            className="inline-block h-6 w-6 rounded-full ring-2 ring-neutral-900 bg-neutral-800 text-[10px] font-bold text-neutral-300 flex items-center justify-center uppercase"
                            title={ex.exerciseName}
                          >
                            {ex.exerciseName.charAt(0)}
                          </div>
                        ))}
                        {routine.exercises.length > 3 && (
                          <div className="inline-block h-6 w-6 rounded-full ring-2 ring-neutral-900 bg-neutral-800 text-[9px] font-semibold text-neutral-400 flex items-center justify-center">
                            +{routine.exercises.length - 3}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleStartRoutine(routine)}
                        disabled={startingRoutineId === routine.id}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>{startingRoutineId === routine.id ? "Iniciando..." : "Iniciar"}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Workouts (1 col) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-neutral-400" />
                <h3 className="text-base font-bold text-white">Últimos Entrenamientos</h3>
              </div>
              <Link
                href="/entrenamientos/historial"
                className="text-xs font-semibold text-neutral-400 hover:text-neutral-200"
              >
                Ver todos
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-2xl bg-neutral-900/60 border border-neutral-800 animate-pulse" />
                ))}
              </div>
            ) : recentSessions.length === 0 ? (
              <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/30 p-6 text-center space-y-2">
                <p className="text-xs text-neutral-400">Aún no has registrado entrenamientos finalizados.</p>
                <p className="text-[11px] text-neutral-500">
                  Comienza uno hoy y visualiza aquí tu tonelaje y desglose de hipertrofia.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-900 transition flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">{session.name}</p>
                      <div className="flex items-center gap-3 text-xs text-neutral-400">
                        <span>{new Date(session.startedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</span>
                        <span>•</span>
                        <span>{Math.round(session.durationSeconds / 60)} min</span>
                        <span>•</span>
                        <span className="font-mono text-amber-400 font-semibold">{session.totalVolumeKg} kg</span>
                      </div>
                    </div>

                    <Link
                      href="/entrenamientos/historial"
                      className="w-8 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-300 transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
