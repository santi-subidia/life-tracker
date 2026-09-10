"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Plus,
  Dumbbell,
  Filter,
  Flame,
  ExternalLink,
  Sparkles,
  Trash2,
  Info,
} from "lucide-react";
import {
  LifeTrackerApiClient,
  type Exercise,
} from "@/lib/api-client";
import { ExerciseDrawer } from "@/components/fitness/ExerciseDrawer";
import { CustomExerciseModal } from "@/components/fitness/CustomExerciseModal";

const MUSCLE_FILTER_CHIPS = [
  { label: "Todos los grupos", value: "" },
  { label: "Pecho", value: "chest" },
  { label: "Espalda", value: "lats" },
  { label: "Cuádriceps", value: "quadriceps" },
  { label: "Isquiosurales", value: "hamstrings" },
  { label: "Hombros", value: "deltoid" },
  { label: "Bíceps", value: "biceps" },
  { label: "Tríceps", value: "triceps" },
  { label: "Glúteos", value: "glutes" },
  { label: "Core / Abdomen", value: "abs" },
];

const EQUIPMENT_OPTIONS = [
  { label: "Todo equipamiento", value: "" },
  { label: "Barra", value: "barbell" },
  { label: "Mancuernas", value: "dumbbell" },
  { label: "Polea / Cable", value: "cable" },
  { label: "Máquina", value: "machine" },
  { label: "Peso Corporal", value: "bodyweight" },
];

export default function ExerciseCatalogPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMuscle, setSelectedMuscle] = useState<string>("");
  const [selectedEquipment, setSelectedEquipment] = useState<string>("");

  // Modals / Drawers
  const [selectedExerciseForDrawer, setSelectedExerciseForDrawer] = useState<Exercise | null>(null);
  const [customModalOpen, setCustomModalOpen] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadExercises = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await LifeTrackerApiClient.getExercises({
        search: searchQuery || undefined,
        muscle: selectedMuscle || undefined,
        equipment: selectedEquipment || undefined,
      });
      setExercises(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar ejercicios.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedMuscle, selectedEquipment]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadExercises();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadExercises]);

  const handleCustomExerciseCreated = (newExercise: Exercise) => {
    setExercises((prev) => [newExercise, ...prev]);
    setSelectedExerciseForDrawer(newExercise);
  };

  const handleDeleteCustomExercise = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Eliminar este ejercicio personalizado?")) return;

    try {
      setDeletingId(id);
      await LifeTrackerApiClient.deleteCustomExercise(id);
      setExercises((prev) => prev.filter((item) => item.id !== id));
      if (selectedExerciseForDrawer?.id === id) {
        setSelectedExerciseForDrawer(null);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al eliminar ejercicio.");
    } finally {
      setDeletingId(null);
    }
  };

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
                  <h1 className="text-xl font-bold tracking-tight text-white">Catálogo de Ejercicios</h1>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {exercises.length}
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  Biblioteca con guías paso a paso y ponderación de hipertrofia por músculo
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCustomModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/10 transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Ejercicio</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Search & Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar ejercicio por nombre o músculo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition"
              />
            </div>

            {/* Equipment Dropdown */}
            <div className="sm:w-56">
              <select
                value={selectedEquipment}
                onChange={(e) => setSelectedEquipment(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-neutral-200 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition"
              >
                {EQUIPMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Muscle Group Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {MUSCLE_FILTER_CHIPS.map((chip) => {
              const active = selectedMuscle === chip.value;
              return (
                <button
                  key={chip.value}
                  onClick={() => setSelectedMuscle(chip.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    active
                      ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                      : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Exercises Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 animate-pulse"
              />
            ))}
          </div>
        ) : exercises.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-neutral-800 bg-neutral-900/30 p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-neutral-800 text-neutral-400 mx-auto flex items-center justify-center">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No se encontraron ejercicios</h3>
              <p className="text-xs text-neutral-400 max-w-md mx-auto">
                No hay coincidencias para los filtros aplicados. Puedes crear un ejercicio personalizado con su propia curva de estímulo muscular.
              </p>
            </div>
            <button
              onClick={() => setCustomModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear Ejercicio</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {exercises.map((exercise) => (
              <div
                key={exercise.id}
                onClick={() => setSelectedExerciseForDrawer(exercise)}
                className="p-4 rounded-2xl border border-neutral-800/90 hover:border-amber-500/50 bg-neutral-900/60 hover:bg-neutral-900 flex flex-col justify-between gap-3 transition cursor-pointer group shadow-sm"
              >
                {/* Visual Thumbnail */}
                <div className="w-full h-36 rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden flex items-center justify-center relative">
                  {exercise.gifUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={exercise.gifUrl}
                      alt={exercise.name}
                      loading="lazy"
                      className="w-full h-full object-contain p-1 group-hover:scale-105 transition duration-300"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-neutral-600">
                      <Dumbbell className="w-6 h-6" />
                      <span className="text-[10px]">Sin imagen</span>
                    </div>
                  )}

                  {exercise.isCustom && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-purple-500/80 backdrop-blur-md text-[10px] font-bold text-white shadow">
                      Personalizado
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span className="font-semibold text-amber-400/90 uppercase tracking-wider text-[10px]">
                      {exercise.primaryMuscleGroup}
                    </span>
                    <span className="capitalize">{exercise.equipment}</span>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition line-clamp-1">
                    {exercise.name}
                  </h3>

                  {/* Muscle Stimulus Bars (Subi's Innovation) */}
                  <div className="pt-2 space-y-1.5">
                    {exercise.muscleStimulus?.slice(0, 2).map((stim, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-neutral-400 truncate max-w-[120px]">{stim.muscle}</span>
                          <span className="font-mono text-neutral-300 font-semibold">{stim.stimulus_pct}%</span>
                        </div>
                        <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              stim.stimulus_pct === 100
                                ? "bg-amber-500"
                                : stim.stimulus_pct >= 50
                                ? "bg-amber-400/70"
                                : "bg-neutral-600"
                            }`}
                            style={{ width: `${stim.stimulus_pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-neutral-400 group-hover:text-amber-300 flex items-center gap-1 transition">
                    <Info className="w-3 h-3" />
                    <span>Ver detalles</span>
                  </span>

                  {exercise.isCustom && (
                    <button
                      onClick={(e) => handleDeleteCustomExercise(exercise.id, e)}
                      disabled={deletingId === exercise.id}
                      className="w-7 h-7 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition"
                      title="Eliminar ejercicio personalizado"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Exercise Detail Drawer */}
      <ExerciseDrawer
        exercise={selectedExerciseForDrawer}
        isOpen={Boolean(selectedExerciseForDrawer)}
        onClose={() => setSelectedExerciseForDrawer(null)}
      />

      {/* Create Custom Exercise Modal */}
      <CustomExerciseModal
        isOpen={customModalOpen}
        onClose={() => setCustomModalOpen(false)}
        onCreated={handleCustomExerciseCreated}
      />
    </div>
  );
}
