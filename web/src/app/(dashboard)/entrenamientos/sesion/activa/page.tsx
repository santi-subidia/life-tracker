"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Timer,
  Check,
  Plus,
  Trash2,
  Dumbbell,
  Play,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  Info,
  X,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  LifeTrackerApiClient,
  type Exercise,
  type WorkoutSet,
} from "@/lib/api-client";
import { useLiveWorkout } from "@/components/fitness/useLiveWorkout";
import { useRestTimer } from "@/components/fitness/useRestTimer";
import { RestTimerBanner } from "@/components/fitness/RestTimerBanner";
import { ExerciseDrawer } from "@/components/fitness/ExerciseDrawer";

export default function ActiveWorkoutPage() {
  const router = useRouter();

  // Rest Timer Hook with Web Audio API & Vibration
  const restTimer = useRestTimer();

  // Live Workout Hook with Optimistic Updates
  const {
    session,
    loading,
    error,
    saving,
    elapsedSeconds,
    addSet,
    updateSet,
    deleteSet,
    completeSession,
    discardSession,
    refreshSession,
  } = useLiveWorkout((restSeconds) => {
    restTimer.startTimer(restSeconds || 90);
  });

  // Finish Workout Modal State
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [finishing, setFinishing] = useState(false);

  // Exercise Picker Modal State (to add exercise mid-workout)
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [catalogExercises, setCatalogExercises] = useState<Exercise[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Exercise Detail Drawer (to check form mid-workout)
  const [drawerExercise, setDrawerExercise] = useState<Exercise | null>(null);

  // Load catalog on opening picker
  const handleOpenPicker = async () => {
    setIsPickerOpen(true);
    if (catalogExercises.length === 0) {
      try {
        setLoadingCatalog(true);
        const list = await LifeTrackerApiClient.getExercises();
        setCatalogExercises(list);
      } catch {
        // Ignore
      } finally {
        setLoadingCatalog(false);
      }
    }
  };

  // Group sets by exercise
  const exercisesInSession = useMemo(() => {
    if (!session || !session.sets) return [];

    const grouped: {
      exerciseId: string;
      exerciseName: string;
      primaryMuscleGroup: string;
      equipment: string;
      gifUrl: string;
      sets: WorkoutSet[];
    }[] = [];

    session.sets.forEach((set) => {
      let group = grouped.find((g) => g.exerciseId === set.exerciseId);
      if (!group) {
        group = {
          exerciseId: set.exerciseId,
          exerciseName: set.exerciseName,
          primaryMuscleGroup: set.primaryMuscleGroup,
          equipment: set.equipment,
          gifUrl: set.gifUrl,
          sets: [],
        };
        grouped.push(group);
      }
      group.sets.push(set);
    });

    // Sort sets inside each group by setOrder
    grouped.forEach((g) => g.sets.sort((a, b) => a.setOrder - b.setOrder));
    return grouped;
  }, [session]);

  // Compute live session stats
  const totalVolumeKg = useMemo(() => {
    if (!session || !session.sets) return 0;
    return session.sets
      .filter((s) => s.isCompleted && s.setType !== "warmup")
      .reduce((acc, s) => acc + (s.weightKg || 0) * (s.reps || 0), 0);
  }, [session]);

  const completedSetsCount = useMemo(() => {
    if (!session || !session.sets) return 0;
    return session.sets.filter((s) => s.isCompleted).length;
  }, [session]);

  // Add a new set to an existing exercise
  const handleAddSetToExercise = async (exerciseId: string, currentSets: WorkoutSet[]) => {
    const nextOrder = currentSets.length + 1;
    const lastSet = currentSets[currentSets.length - 1];
    const defaultWeight = lastSet ? lastSet.weightKg : 20;
    const defaultReps = lastSet ? lastSet.reps : 10;
    await addSet(exerciseId, nextOrder, "normal", defaultWeight, defaultReps);
  };

  // Add an exercise to the session from the picker
  const handleAddExerciseToSession = async (exercise: Exercise) => {
    await addSet(exercise.id, 1, "normal", 20, 10);
    setIsPickerOpen(false);
    setPickerSearch("");
  };

  // Toggle set completed
  const handleToggleSetCompleted = async (set: WorkoutSet) => {
    await updateSet(
      set.id,
      {
        setType: set.setType,
        weightKg: set.weightKg,
        reps: set.reps,
        rpe: set.rpe,
        rir: set.rir,
        isCompleted: !set.isCompleted,
      },
      90 // Suggested rest seconds
    );
  };

  // Stepper helpers for weight and reps
  const handleAdjustWeight = async (set: WorkoutSet, delta: number) => {
    const newWeight = Math.max(0, Math.round(((set.weightKg || 0) + delta) * 10) / 10);
    await updateSet(set.id, {
      setType: set.setType,
      weightKg: newWeight,
      reps: set.reps,
      rpe: set.rpe,
      rir: set.rir,
      isCompleted: set.isCompleted,
    });
  };

  const handleAdjustReps = async (set: WorkoutSet, delta: number) => {
    const newReps = Math.max(0, (set.reps || 0) + delta);
    await updateSet(set.id, {
      setType: set.setType,
      weightKg: set.weightKg,
      reps: newReps,
      rpe: set.rpe,
      rir: set.rir,
      isCompleted: set.isCompleted,
    });
  };

  const handleChangeSetType = async (set: WorkoutSet, newType: WorkoutSet["setType"]) => {
    await updateSet(set.id, {
      setType: newType,
      weightKg: set.weightKg,
      reps: set.reps,
      rpe: set.rpe,
      rir: set.rir,
      isCompleted: set.isCompleted,
    });
  };

  // Finish Workout
  const handleFinishWorkout = async () => {
    try {
      setFinishing(true);
      await completeSession(workoutNotes.trim() || undefined);
      router.push("/entrenamientos/historial");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al finalizar la sesión.");
      setFinishing(false);
    }
  };

  // Discard Workout
  const handleDiscardWorkout = async () => {
    if (!confirm("¿Estás seguro de descartar este entrenamiento? Los datos no se guardarán.")) return;
    try {
      await discardSession();
      router.push("/entrenamientos");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al descartar la sesión.");
    }
  };

  // Format Elapsed Time (HH:MM:SS or MM:SS)
  const formattedElapsed = useMemo(() => {
    const hrs = Math.floor(elapsedSeconds / 3600);
    const mins = Math.floor((elapsedSeconds % 3600) / 60);
    const secs = elapsedSeconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
    }
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }, [elapsedSeconds]);

  // Filter exercises for modal picker
  const filteredPickerExercises = catalogExercises.filter((ex) =>
    ex.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    ex.primaryMuscleGroup.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center animate-pulse">
            <Dumbbell className="w-5 h-5" />
          </div>
          <p className="text-xs text-neutral-400">Cargando sesión activa...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-800 text-neutral-400 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">No hay ninguna sesión activa</h2>
            <p className="text-xs text-neutral-400">
              Para registrar series en vivo, inicia un entrenamiento libre o selecciona una rutina.
            </p>
          </div>
          <Link
            href="/entrenamientos"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Entrenamientos</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-36">
      {/* Sticky Top Bar (Operate Mode HUD) */}
      <header className="sticky top-0 z-30 bg-neutral-900/90 backdrop-blur-xl border-b border-neutral-800 shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href="/entrenamientos"
              className="w-9 h-9 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition flex-shrink-0"
              title="Volver sin finalizar"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping flex-shrink-0" />
                <h1 className="text-sm font-extrabold text-white truncate">
                  {session.name}
                </h1>
              </div>
              <p className="text-[11px] font-mono text-neutral-400 tabular-nums">
                {formattedElapsed} • {completedSetsCount} series • {totalVolumeKg.toLocaleString("es-ES")} kg
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleDiscardWorkout}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-red-500/20 hover:text-red-300 text-neutral-400 text-xs font-semibold transition"
            >
              Descartar
            </button>
            <button
              onClick={() => setIsFinishModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition active:scale-95"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Finalizar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content: Exercises and Sets */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Exercises List */}
        {exercisesInSession.map((exerciseGroup) => (
          <div
            key={exerciseGroup.exerciseId}
            className="rounded-3xl border border-neutral-800 bg-neutral-900/60 overflow-hidden shadow-sm"
          >
            {/* Exercise Header */}
            <div className="p-4 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() =>
                    setDrawerExercise({
                      id: exerciseGroup.exerciseId,
                      name: exerciseGroup.exerciseName,
                      discipline: "strength",
                      primaryMuscleGroup: exerciseGroup.primaryMuscleGroup,
                      equipment: exerciseGroup.equipment,
                      gifUrl: exerciseGroup.gifUrl,
                      instructions: [],
                      muscleStimulus: [],
                      isCustom: false,
                      slug: "",
                      createdAt: "",
                    })
                  }
                  className="w-10 h-10 rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden flex items-center justify-center flex-shrink-0 hover:border-amber-500 transition"
                  title="Ver demostración técnica"
                >
                  {exerciseGroup.gifUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={exerciseGroup.gifUrl}
                      alt={exerciseGroup.exerciseName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <Dumbbell className="w-5 h-5 text-amber-400" />
                  )}
                </button>

                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-white truncate">
                      {exerciseGroup.exerciseName}
                    </h2>
                    <button
                      onClick={() =>
                        setDrawerExercise({
                          id: exerciseGroup.exerciseId,
                          name: exerciseGroup.exerciseName,
                          discipline: "strength",
                          primaryMuscleGroup: exerciseGroup.primaryMuscleGroup,
                          equipment: exerciseGroup.equipment,
                          gifUrl: exerciseGroup.gifUrl,
                          instructions: [],
                          muscleStimulus: [],
                          isCustom: false,
                          slug: "",
                          createdAt: "",
                        })
                      }
                      className="text-neutral-400 hover:text-amber-400 transition"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-400 capitalize">
                    {exerciseGroup.primaryMuscleGroup} • {exerciseGroup.equipment}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleAddSetToExercise(exerciseGroup.exerciseId, exerciseGroup.sets)}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-400 text-xs font-semibold flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Serie</span>
              </button>
            </div>

            {/* Sets Table / Rows */}
            <div className="p-3 space-y-2">
              {/* Header Row */}
              <div className="grid grid-cols-12 gap-2 px-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500 text-center">
                <div className="col-span-2 text-left">Serie</div>
                <div className="col-span-3 text-left">Anterior</div>
                <div className="col-span-3">kg</div>
                <div className="col-span-2">Reps</div>
                <div className="col-span-2">Listo</div>
              </div>

              {/* Set Rows */}
              {exerciseGroup.sets.map((set, idx) => {
                const isCompleted = set.isCompleted;

                return (
                  <div
                    key={set.id}
                    className={`grid grid-cols-12 gap-2 items-center p-2 rounded-2xl border transition ${
                      isCompleted
                        ? "bg-green-950/15 border-green-500/30 text-neutral-200"
                        : "bg-neutral-950/70 border-neutral-800/80 text-neutral-100"
                    }`}
                  >
                    {/* Set Order & Type */}
                    <div className="col-span-2 flex items-center gap-1.5">
                      <span className="w-6 h-6 rounded-lg bg-neutral-800 font-mono text-xs font-bold flex items-center justify-center text-neutral-300">
                        {idx + 1}
                      </span>
                      <select
                        value={set.setType}
                        onChange={(e) => handleChangeSetType(set, e.target.value as WorkoutSet["setType"])}
                        className="text-[10px] bg-neutral-900 border border-neutral-800 rounded-md px-1 py-0.5 text-neutral-300 focus:outline-none"
                      >
                        <option value="normal">N</option>
                        <option value="warmup">W</option>
                        <option value="drop_set">D</option>
                        <option value="failure">F</option>
                      </select>
                    </div>

                    {/* Ghost Load (Progressive Overload reference) */}
                    <div className="col-span-3 text-left">
                      {set.ghostReference ? (
                        <div className="text-[11px] font-mono text-neutral-400 tabular-nums">
                          <span className="font-semibold text-neutral-300">
                            {set.ghostReference.previousWeightKg}kg
                          </span>{" "}
                          × {set.ghostReference.previousReps}
                        </div>
                      ) : (
                        <span className="text-[10px] text-neutral-600 font-mono">—</span>
                      )}
                    </div>

                    {/* Weight (Kg) Input with Steppers */}
                    <div className="col-span-3 flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleAdjustWeight(set, -2.5)}
                        className="w-6 h-8 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-bold flex items-center justify-center active:scale-95 transition"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        step="0.5"
                        value={set.weightKg}
                        onChange={(e) =>
                          updateSet(set.id, {
                            setType: set.setType,
                            weightKg: Number(e.target.value),
                            reps: set.reps,
                            rpe: set.rpe,
                            rir: set.rir,
                            isCompleted: set.isCompleted,
                          })
                        }
                        className="w-12 h-8 text-center bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-500 tabular-nums"
                      />
                      <button
                        onClick={() => handleAdjustWeight(set, 2.5)}
                        className="w-6 h-8 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-bold flex items-center justify-center active:scale-95 transition"
                      >
                        +
                      </button>
                    </div>

                    {/* Reps Input with Steppers */}
                    <div className="col-span-2 flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleAdjustReps(set, -1)}
                        className="w-5 h-8 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-bold flex items-center justify-center active:scale-95 transition"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={set.reps}
                        onChange={(e) =>
                          updateSet(set.id, {
                            setType: set.setType,
                            weightKg: set.weightKg,
                            reps: Number(e.target.value),
                            rpe: set.rpe,
                            rir: set.rir,
                            isCompleted: set.isCompleted,
                          })
                        }
                        className="w-10 h-8 text-center bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-500 tabular-nums"
                      />
                      <button
                        onClick={() => handleAdjustReps(set, 1)}
                        className="w-5 h-8 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-bold flex items-center justify-center active:scale-95 transition"
                      >
                        +
                      </button>
                    </div>

                    {/* Large Completion Check Button (48x48px touch target) */}
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleToggleSetCompleted(set)}
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center transition active:scale-90 shadow-md ${
                          isCompleted
                            ? "bg-green-500 text-neutral-950 shadow-green-500/20"
                            : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"
                        }`}
                        title={isCompleted ? "Serie completada" : "Marcar como completada"}
                      >
                        <Check className="w-5 h-5 stroke-[3]" />
                      </button>

                      <button
                        onClick={() => deleteSet(set.id)}
                        className="w-7 h-7 text-neutral-600 hover:text-red-400 flex items-center justify-center rounded-lg transition"
                        title="Eliminar serie"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Action: Add Exercise to Session */}
        <button
          onClick={handleOpenPicker}
          className="w-full py-4 rounded-3xl border-2 border-dashed border-neutral-800 hover:border-amber-500/50 bg-neutral-900/30 hover:bg-neutral-900/60 text-neutral-300 hover:text-amber-400 font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Ejercicio a la Sesión</span>
        </button>
      </main>

      {/* Persistent Floating Rest Timer Banner */}
      <RestTimerBanner
        isRunning={restTimer.isRunning}
        remainingSeconds={restTimer.remainingSeconds}
        totalSeconds={restTimer.totalSeconds}
        onAddSeconds={restTimer.addSeconds}
        onStop={restTimer.stopTimer}
      />

      {/* Finish Workout Modal */}
      {isFinishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Finalizar Entrenamiento</h3>
                  <p className="text-xs text-neutral-400">Resumen y notas de la sesión</p>
                </div>
              </div>
              <button
                onClick={() => setIsFinishModalOpen(false)}
                className="w-8 h-8 rounded-xl text-neutral-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Summary */}
            <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-center">
              <div>
                <p className="text-[10px] uppercase font-bold text-neutral-500">Tiempo</p>
                <p className="text-sm font-mono font-bold text-white tabular-nums">{formattedElapsed}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-neutral-500">Series</p>
                <p className="text-sm font-mono font-bold text-white tabular-nums">{completedSetsCount}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-neutral-500">Volumen</p>
                <p className="text-sm font-mono font-bold text-amber-400 tabular-nums">
                  {totalVolumeKg.toLocaleString("es-ES")} kg
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Notas o Sensaciones (opcional)</label>
              <textarea
                rows={3}
                placeholder="Sensación de fatiga, molestias, RPE general o logros del día..."
                value={workoutNotes}
                onChange={(e) => setWorkoutNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsFinishModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
              >
                Continuar entrenando
              </button>
              <button
                onClick={handleFinishWorkout}
                disabled={finishing}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{finishing ? "Guardando..." : "Confirmar y Guardar"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Picker Modal */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Agregar Ejercicio</h3>
              <button
                onClick={() => setIsPickerOpen(false)}
                className="w-7 h-7 rounded-lg text-neutral-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-neutral-800">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Buscar ejercicio en el catálogo..."
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="p-3 space-y-1 overflow-y-auto flex-1">
              {loadingCatalog ? (
                <div className="p-6 text-center text-xs text-neutral-500">Cargando catálogo...</div>
              ) : filteredPickerExercises.length === 0 ? (
                <div className="p-6 text-center text-xs text-neutral-500">No se encontraron ejercicios</div>
              ) : (
                filteredPickerExercises.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => handleAddExerciseToSession(ex)}
                    className="w-full p-3 rounded-xl hover:bg-neutral-800 flex items-center justify-between text-left transition group"
                  >
                    <div className="truncate">
                      <p className="text-xs font-bold text-white group-hover:text-amber-400 truncate">
                        {ex.name}
                      </p>
                      <p className="text-[10px] text-neutral-400 capitalize">
                        {ex.primaryMuscleGroup} • {ex.equipment}
                      </p>
                    </div>
                    <Plus className="w-4 h-4 text-neutral-500 group-hover:text-amber-400 flex-shrink-0 ml-2" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Exercise Technical Demonstration Drawer */}
      <ExerciseDrawer
        exercise={drawerExercise}
        isOpen={Boolean(drawerExercise)}
        onClose={() => setDrawerExercise(null)}
      />
    </div>
  );
}
