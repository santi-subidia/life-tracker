"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Flame,
  Clock,
  Play,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Timer,
  AlertCircle,
  X,
  Check,
  Search,
} from "lucide-react";
import {
  LifeTrackerApiClient,
  type Routine,
  type Exercise,
  type CreateRoutineRequest,
} from "@/lib/api-client";

export default function RoutinesPage() {
  const router = useRouter();

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [exercisesCatalog, setExercisesCatalog] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [routineName, setRoutineName] = useState("");
  const [routineDesc, setRoutineDesc] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState(45);
  const [routineExercises, setRoutineExercises] = useState<
    {
      exerciseId: string;
      exerciseName: string;
      primaryMuscle: string;
      equipment: string;
      targetSets: number;
      targetRepsMin: number;
      targetRepsMax: number;
      restTimerSeconds: number;
      notes: string;
    }[]
  >([]);

  // Exercise Picker inside Modal
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  const [saving, setSaving] = useState(false);
  const [startingRoutineId, setStartingRoutineId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [routineList, catalog] = await Promise.all([
        LifeTrackerApiClient.getRoutines().catch(() => []),
        LifeTrackerApiClient.getExercises().catch(() => []),
      ]);
      setRoutines(routineList.filter((r) => !r.isArchived));
      setExercisesCatalog(catalog);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar rutinas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreateModal = () => {
    setEditingRoutineId(null);
    setRoutineName("");
    setRoutineDesc("");
    setEstimatedDuration(45);
    setRoutineExercises([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (routine: Routine) => {
    setEditingRoutineId(routine.id);
    setRoutineName(routine.name);
    setRoutineDesc(routine.description || "");
    setEstimatedDuration(routine.estimatedDurationMinutes);
    setRoutineExercises(
      routine.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        exerciseName: e.exerciseName,
        primaryMuscle: e.primaryMuscleGroup,
        equipment: e.equipment,
        targetSets: e.targetSets,
        targetRepsMin: e.targetRepsMin,
        targetRepsMax: e.targetRepsMax,
        restTimerSeconds: e.restTimerSeconds,
        notes: e.notes || "",
      }))
    );
    setIsModalOpen(true);
  };

  const handleAddExerciseFromPicker = (exercise: Exercise) => {
    setRoutineExercises((prev) => [
      ...prev,
      {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        primaryMuscle: exercise.primaryMuscleGroup,
        equipment: exercise.equipment,
        targetSets: 3,
        targetRepsMin: 8,
        targetRepsMax: 12,
        restTimerSeconds: 90,
        notes: "",
      },
    ]);
    setIsPickerOpen(false);
    setPickerSearch("");
  };

  const handleRemoveExercise = (index: number) => {
    setRoutineExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveExercise = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= routineExercises.length) return;

    setRoutineExercises((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleSaveRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routineName.trim()) {
      alert("El nombre de la rutina es obligatorio.");
      return;
    }
    if (routineExercises.length === 0) {
      alert("Debes agregar al menos un ejercicio a la rutina.");
      return;
    }

    try {
      setSaving(true);
      const payload: CreateRoutineRequest = {
        name: routineName.trim(),
        description: routineDesc.trim() || null,
        estimatedDurationMinutes: Number(estimatedDuration) || 45,
        exercises: routineExercises.map((ex, idx) => ({
          exerciseId: ex.exerciseId,
          orderIndex: idx + 1,
          targetSets: Number(ex.targetSets) || 3,
          targetRepsMin: Number(ex.targetRepsMin) || 8,
          targetRepsMax: Number(ex.targetRepsMax) || 12,
          restTimerSeconds: Number(ex.restTimerSeconds) || 90,
          notes: ex.notes.trim() || null,
        })),
      };

      if (editingRoutineId) {
        await LifeTrackerApiClient.updateRoutine(editingRoutineId, payload);
      } else {
        await LifeTrackerApiClient.createRoutine(payload);
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al guardar la rutina.");
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveRoutine = async (routineId: string) => {
    if (!confirm("¿Seguro que deseas archivar esta rutina?")) return;
    try {
      await LifeTrackerApiClient.archiveRoutine(routineId);
      setRoutines((prev) => prev.filter((r) => r.id !== routineId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al archivar rutina.");
    }
  };

  const handleStartWorkout = async (routine: Routine) => {
    try {
      setStartingRoutineId(routine.id);
      await LifeTrackerApiClient.startWorkoutSession({
        name: routine.name,
        routineId: routine.id,
      });
      router.push("/entrenamientos/sesion/activa");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al iniciar el entrenamiento.");
      setStartingRoutineId(null);
    }
  };

  const filteredPickerExercises = exercisesCatalog.filter((ex) =>
    ex.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    ex.primaryMuscleGroup.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-20">
      {/* Top Header */}
      <header className="border-b border-neutral-800/80 bg-neutral-900/60 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/entrenamientos"
                className="w-10 h-10 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300 hover:text-white transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-white">Rutinas & Plantillas</h1>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {routines.length}
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  Crea y organiza tus rutinas de entrenamiento con series y descansos predefinidos
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/10 transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Rutina</span>
              </button>
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

        {/* Routines List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-64 rounded-3xl bg-neutral-900/40 border border-neutral-800/80 animate-pulse"
              />
            ))}
          </div>
        ) : routines.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-neutral-800 bg-neutral-900/30 p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-neutral-800 text-amber-400 mx-auto flex items-center justify-center">
              <Flame className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No tienes rutinas creadas</h3>
              <p className="text-xs text-neutral-400 max-w-md mx-auto">
                Diseña tu rutina dividida (ej. Empuje, Tirón, Pierna) agregando ejercicios de la biblioteca y tus descansos recomendados.
              </p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear mi primera rutina</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {routines.map((routine) => (
              <div
                key={routine.id}
                className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 flex flex-col justify-between gap-6 hover:border-neutral-700 transition shadow-sm"
              >
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                          {routine.estimatedDurationMinutes} min
                        </span>
                        <span className="text-xs text-neutral-400">
                          {routine.exercises.length} ejercicios
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white">{routine.name}</h3>
                      {routine.description && (
                        <p className="text-xs text-neutral-400">{routine.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(routine)}
                        className="w-8 h-8 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 flex items-center justify-center transition"
                        title="Editar rutina"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleArchiveRoutine(routine.id)}
                        className="w-8 h-8 rounded-xl text-neutral-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition"
                        title="Archivar rutina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Exercises Checklist */}
                  <div className="space-y-2 border-t border-neutral-800/80 pt-4">
                    {routine.exercises.map((ex, idx) => (
                      <div
                        key={ex.id || idx}
                        className="p-2.5 rounded-xl bg-neutral-950/50 border border-neutral-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-lg bg-neutral-800 text-neutral-400 font-mono text-[10px] flex items-center justify-center flex-shrink-0 font-bold">
                            {idx + 1}
                          </span>
                          <div className="truncate">
                            <p className="font-semibold text-neutral-200 truncate">{ex.exerciseName}</p>
                            <p className="text-[10px] text-neutral-500 capitalize truncate">
                              {ex.primaryMuscleGroup} • {ex.equipment}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-right flex-shrink-0">
                          <span className="font-mono text-neutral-300 font-semibold">
                            {ex.targetSets} × {ex.targetRepsMin}-{ex.targetRepsMax}
                          </span>
                          <span className="text-[10px] text-neutral-500 flex items-center gap-0.5">
                            <Timer className="w-3 h-3 text-amber-500/80" />
                            {ex.restTimerSeconds}s
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Routine Card Footer */}
                <div className="pt-4 border-t border-neutral-800 flex items-center justify-end">
                  <button
                    onClick={() => handleStartWorkout(routine)}
                    disabled={startingRoutineId === routine.id}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 transition active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-neutral-950" />
                    <span>{startingRoutineId === routine.id ? "Iniciando..." : "Iniciar Entrenamiento"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Routine Builder / Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {editingRoutineId ? "Editar Rutina" : "Nueva Rutina de Entrenamiento"}
                </h2>
                <p className="text-xs text-neutral-400">
                  Configura los ejercicios, series objetivo y descansos
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveRoutine} className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Nombre de la Rutina *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Empuje A (Pecho, Hombro, Tríceps)"
                    value={routineName}
                    onChange={(e) => setRoutineName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Duración Est. (min)</label>
                  <input
                    type="number"
                    min="10"
                    max="240"
                    value={estimatedDuration}
                    onChange={(e) => setEstimatedDuration(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm font-mono text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Descripción u Objetivo</label>
                <input
                  type="text"
                  placeholder="Ej. Enfoque en pectoral clavicular y tríceps con sobrecarga progresiva"
                  value={routineDesc}
                  onChange={(e) => setRoutineDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Exercises in Routine */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                    Ejercicios en la Rutina ({routineExercises.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsPickerOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-semibold text-xs flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Ejercicio</span>
                  </button>
                </div>

                {routineExercises.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/40 text-center text-xs text-neutral-400">
                    Aún no has agregado ejercicios a esta rutina. Haz clic en &quot;Agregar Ejercicio&quot; para seleccionarlos de la biblioteca.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {routineExercises.map((ex, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-neutral-800 text-neutral-300 font-mono text-xs flex items-center justify-center font-bold">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-sm text-white truncate">{ex.exerciseName}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveExercise(idx, "up")}
                              disabled={idx === 0}
                              className="w-7 h-7 rounded-lg text-neutral-400 hover:text-white disabled:opacity-30 flex items-center justify-center"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveExercise(idx, "down")}
                              disabled={idx === routineExercises.length - 1}
                              className="w-7 h-7 rounded-lg text-neutral-400 hover:text-white disabled:opacity-30 flex items-center justify-center"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveExercise(idx)}
                              className="w-7 h-7 rounded-lg text-neutral-500 hover:text-red-400 flex items-center justify-center ml-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Exercise Parameters Config */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-neutral-900 text-xs">
                          <div>
                            <label className="text-[10px] text-neutral-400 block mb-1">Series</label>
                            <input
                              type="number"
                              min="1"
                              max="15"
                              value={ex.targetSets}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setRoutineExercises((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, targetSets: val } : item))
                                );
                              }}
                              className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg font-mono text-center text-white"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-neutral-400 block mb-1">Reps Mín</label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={ex.targetRepsMin}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setRoutineExercises((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, targetRepsMin: val } : item))
                                );
                              }}
                              className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg font-mono text-center text-white"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-neutral-400 block mb-1">Reps Máx</label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={ex.targetRepsMax}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setRoutineExercises((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, targetRepsMax: val } : item))
                                );
                              }}
                              className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg font-mono text-center text-white"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-neutral-400 block mb-1">Descanso (seg)</label>
                            <input
                              type="number"
                              min="15"
                              max="600"
                              step="15"
                              value={ex.restTimerSeconds}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setRoutineExercises((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, restTimerSeconds: val } : item))
                                );
                              }}
                              className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg font-mono text-center text-amber-400 font-semibold"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 text-xs font-bold shadow-lg shadow-amber-500/20"
                >
                  {saving ? "Guardando..." : "Guardar Rutina"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Exercise Picker Modal */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Seleccionar Ejercicio</h3>
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
                  placeholder="Buscar ejercicio..."
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="p-3 space-y-1 overflow-y-auto flex-1">
              {filteredPickerExercises.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => handleAddExerciseFromPicker(ex)}
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
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
