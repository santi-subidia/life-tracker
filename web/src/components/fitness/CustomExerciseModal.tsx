"use client";

import React, { useState } from "react";
import { X, Plus, Trash2, AlertCircle, Dumbbell } from "lucide-react";
import {
  LifeTrackerApiClient,
  type CreateCustomExerciseRequest,
  type MuscleStimulus,
  type Exercise,
} from "@/lib/api-client";

interface CustomExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (exercise: Exercise) => void;
}

const MUSCLE_OPTIONS = [
  { value: "chest", label: "Pecho (Pectoral Mayor)" },
  { value: "upper_chest", label: "Pecho Superior (Clavicular)" },
  { value: "lats", label: "Dorsal Ancho" },
  { value: "rhomboids", label: "Romboides y Espalda Media" },
  { value: "traps", label: "Trapecio" },
  { value: "lower_back", label: "Espalda Baja (Lumbares)" },
  { value: "anterior_deltoid", label: "Hombro Frontal (Deltoides Ant.)" },
  { value: "lateral_deltoid", label: "Hombro Lateral (Deltoides Lat.)" },
  { value: "posterior_deltoid", label: "Hombro Posterior" },
  { value: "biceps", label: "Bíceps" },
  { value: "triceps", label: "Tríceps" },
  { value: "forearms", label: "Antebrazo" },
  { value: "quadriceps", label: "Cuádriceps" },
  { value: "hamstrings", label: "Isquiosurales / Femoral" },
  { value: "glutes", label: "Glúteos" },
  { value: "calves", label: "Gemelos / Pantorrillas" },
  { value: "abs", label: "Abdomen (Core)" },
  { value: "obliques", label: "Oblicuos" },
];

export function CustomExerciseModal({ isOpen, onClose, onCreated }: CustomExerciseModalProps) {
  const [name, setName] = useState("");
  const [discipline, setDiscipline] = useState<string>("strength");
  const [primaryMuscle, setPrimaryMuscle] = useState<string>("chest");
  const [equipment, setEquipment] = useState<string>("barbell");
  const [gifUrl, setGifUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [instructionInput, setInstructionInput] = useState("");
  const [instructions, setInstructions] = useState<string[]>([]);
  const [stimuli, setStimuli] = useState<MuscleStimulus[]>([
    { muscle: "chest", stimulus_pct: 100 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleAddStimulus = () => {
    const available = MUSCLE_OPTIONS.find(
      (m) => !stimuli.some((s) => s.muscle === m.value)
    );
    if (available) {
      setStimuli([...stimuli, { muscle: available.value, stimulus_pct: 50 }]);
    }
  };

  const handleRemoveStimulus = (idx: number) => {
    if (stimuli.length <= 1) {
      setError("Debe existir al menos un grupo muscular.");
      return;
    }
    setStimuli(stimuli.filter((_, i) => i !== idx));
  };

  const handleStimulusChange = (idx: number, muscle: string, pct: number) => {
    setStimuli(
      stimuli.map((s, i) => (i === idx ? { muscle, stimulus_pct: pct } : s))
    );
  };

  const handleAddInstruction = () => {
    if (!instructionInput.trim()) return;
    setInstructions([...instructions, instructionInput.trim()]);
    setInstructionInput("");
  };

  const handleRemoveInstruction = (idx: number) => {
    setInstructions(instructions.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("El nombre del ejercicio es obligatorio.");
      return;
    }

    // Invariante 8: Al menos un motor primario al 100%
    const hasPrimary100 = stimuli.some((s) => s.stimulus_pct === 100);
    if (!hasPrimary100) {
      setError("Invariante 8: Debe existir al menos un grupo muscular con estímulo al 100% (motor primario).");
      return;
    }

    try {
      setSaving(true);
      const req: CreateCustomExerciseRequest = {
        name: name.trim(),
        discipline,
        primaryMuscleGroup: primaryMuscle,
        muscleStimulus: stimuli,
        equipment,
        instructions,
        gifUrl: gifUrl.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
      };

      const created = await LifeTrackerApiClient.createCustomExercise(req);
      onCreated(created);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar el ejercicio.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-100">Crear Ejercicio Personalizado</h2>
              <p className="text-xs text-neutral-400">Agrega variantes específicas de tu gimnasio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name & Discipline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Nombre del Ejercicio *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej. Press Guillotina en Máquina Smith"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs focus:outline-none focus:border-amber-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Disciplina
              </label>
              <select
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs focus:outline-none focus:border-amber-500 transition"
              >
                <option value="strength">Fuerza / Hipertrofia</option>
                <option value="calisthenics">Calistenia / Peso Corporal</option>
                <option value="cardio">Cardio</option>
                <option value="mobility">Movilidad / Estiramiento</option>
              </select>
            </div>
          </div>

          {/* Primary Muscle & Equipment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Músculo Principal (Filtro) *
              </label>
              <select
                value={primaryMuscle}
                onChange={(e) => {
                  setPrimaryMuscle(e.target.value);
                  if (stimuli.length > 0 && stimuli[0].stimulus_pct === 100) {
                    handleStimulusChange(0, e.target.value, 100);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs focus:outline-none focus:border-amber-500 transition"
              >
                {MUSCLE_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Equipamiento Requerido
              </label>
              <select
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs focus:outline-none focus:border-amber-500 transition"
              >
                <option value="barbell">Barra</option>
                <option value="dumbbell">Mancuernas</option>
                <option value="machine">Máquina</option>
                <option value="cable">Polea</option>
                <option value="bodyweight">Peso Corporal</option>
                <option value="kettlebell">Pesa Rusa (Kettlebell)</option>
                <option value="smith_machine">Máquina Smith</option>
                <option value="bands">Bandas Elásticas</option>
                <option value="other">Otro</option>
              </select>
            </div>
          </div>

          {/* Muscle Ponderation (1-100%) - Subi's innovation */}
          <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-neutral-200">Ponderación de Estímulo Muscular</p>
                <p className="text-[11px] text-neutral-500">Debe tener al menos un motor primario al 100%</p>
              </div>
              <button
                type="button"
                onClick={handleAddStimulus}
                className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Músculo</span>
              </button>
            </div>

            <div className="space-y-3 pt-1">
              {stimuli.map((st, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/80">
                  <select
                    value={st.muscle}
                    onChange={(e) => handleStimulusChange(idx, e.target.value, st.stimulus_pct)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs focus:outline-none focus:border-amber-500"
                  >
                    {MUSCLE_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2 w-36">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={st.stimulus_pct}
                      onChange={(e) => handleStimulusChange(idx, st.muscle, parseInt(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                    <span className="w-9 font-mono text-xs text-neutral-300 font-bold tabular-nums">
                      {st.stimulus_pct}%
                    </span>
                  </div>

                  {stimuli.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStimulus(idx)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Media Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                URL de Demostración (GIF o Imagen)
              </label>
              <input
                type="url"
                value={gifUrl}
                onChange={(e) => setGifUrl(e.target.value)}
                placeholder="https://ejemplo.com/demo.gif"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                URL de Video (YouTube / Shorts)
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          </div>

          {/* Step Instructions */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-300">
              Instrucciones Técnicas Paso a Paso
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={instructionInput}
                onChange={(e) => setInstructionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddInstruction();
                  }
                }}
                placeholder="ej. Mantener los codos a 45 grados..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs focus:outline-none focus:border-amber-500 transition"
              />
              <button
                type="button"
                onClick={handleAddInstruction}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold transition"
              >
                Agregar
              </button>
            </div>

            {instructions.length > 0 && (
              <ul className="space-y-1.5 pt-1">
                {instructions.map((inst, i) => (
                  <li key={i} className="flex items-center justify-between text-xs bg-neutral-950/60 p-2 rounded-lg border border-neutral-800">
                    <span className="text-neutral-300">{i + 1}. {inst}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveInstruction(i)}
                      className="text-neutral-500 hover:text-rose-400 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-neutral-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Crear Ejercicio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
