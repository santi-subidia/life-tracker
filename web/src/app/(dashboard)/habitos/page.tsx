"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Plus, 
  CheckCircle2, 
  Flame, 
  Archive, 
  Calendar, 
  Tag, 
  X,
  Sparkles
} from "lucide-react";
import { LifeTrackerApiClient, type Habit, type CreateHabitPayload } from "@/lib/api-client";

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("salud");
  const [frequencyType, setFrequencyType] = useState<"daily" | "specific_days" | "times_per_week">("daily");
  const [targetDays, setTargetDays] = useState(3);
  const [specificDays, setSpecificDays] = useState<number[]>([1, 3, 5]); // Lun, Mié, Vie
  const [color, setColor] = useState("emerald");

  const daysOfWeek = [
    { day: 1, label: "Lun" },
    { day: 2, label: "Mar" },
    { day: 3, label: "Mié" },
    { day: 4, label: "Jue" },
    { day: 5, label: "Vie" },
    { day: 6, label: "Sáb" },
    { day: 0, label: "Dom" },
  ];

  useEffect(() => {
    loadHabits();
  }, []);

  async function loadHabits() {
    try {
      setLoading(true);
      const data = await LifeTrackerApiClient.getHabits().catch(() => []);
      setHabits(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateHabit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSaving(true);
      const payload: CreateHabitPayload = {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        frequencyType,
        targetDaysPerWeek: frequencyType === "times_per_week" ? targetDays : undefined,
        specificDays: frequencyType === "specific_days" ? specificDays : undefined,
        color,
      };

      await LifeTrackerApiClient.createHabit(payload);
      setShowModal(false);
      setName("");
      setDescription("");
      await loadHabits();
    } catch {
      // Ignore
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(id: string) {
    try {
      await LifeTrackerApiClient.archiveHabit(id);
      await loadHabits();
    } catch {
      // Ignore
    }
  }

  function toggleSpecificDay(day: number) {
    if (specificDays.includes(day)) {
      if (specificDays.length > 1) {
        setSpecificDays(specificDays.filter((d) => d !== day));
      }
    } else {
      setSpecificDays([...specificDays, day].sort());
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-20">
      {/* Top Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 -ml-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-semibold text-base">Hábitos & Rutinas</h1>
              <p className="text-xs text-neutral-400">Catálogo, metas y configuración de frecuencias</p>
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-lg shadow-emerald-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Hábito</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Banner con acceso a Daily Hub */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-neutral-900/60 to-neutral-900/60 border border-emerald-500/30 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              ¿Listo para registrar tu día?
            </h2>
            <p className="text-xs text-neutral-400">Accede a la vista Hoy para marcar tus hábitos de la jornada en 1 toque.</p>
          </div>
          <Link
            href="/hoy"
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs whitespace-nowrap transition"
          >
            Ir a Vista Hoy
          </Link>
        </div>

        {/* Lista de Hábitos */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Tus Hábitos Registrados ({habits.length})
          </h2>

          {habits.length === 0 ? (
            <div className="p-10 rounded-2xl bg-neutral-900/40 border border-dashed border-neutral-800 text-center text-neutral-500 text-xs space-y-3">
              <p>Aún no tienes hábitos creados en tu Life Tracker.</p>
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs transition"
              >
                Crear tu primer hábito
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {habits.map((habit) => (
                <div key={habit.id} className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm text-white">{habit.name}</h3>
                      <button
                        onClick={() => handleArchive(habit.id)}
                        title="Archivar hábito"
                        className="text-neutral-500 hover:text-neutral-300 transition"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                    {habit.description && (
                      <p className="text-xs text-neutral-400 line-clamp-2">{habit.description}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800/60 text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-[11px] text-neutral-300 capitalize">
                      {habit.category}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-amber-400 font-medium">
                        <Flame className="w-3.5 h-3.5 fill-amber-400" />
                        {habit.currentStreak} días
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        Récord: {habit.longestStreak}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Modal para Crear Hábito */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="font-semibold text-base text-white">Nuevo Hábito</h2>
              <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateHabit} className="space-y-4">
              <div>
                <label className="text-xs text-neutral-400">Nombre del Hábito</label>
                <input
                  type="text"
                  placeholder="ej. Meditar 10 minutos"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400">Descripción o Razón (Opcional)</label>
                <input
                  type="text"
                  placeholder="ej. Para reducir estrés matutino"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="salud">Salud & Físico</option>
                    <option value="mente">Mente & Bienestar</option>
                    <option value="estudio">Estudios & Lectura</option>
                    <option value="trabajo">Trabajo & Foco</option>
                    <option value="finanzas">Finanzas</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-neutral-400">Frecuencia</label>
                  <select
                    value={frequencyType}
                    onChange={(e) => setFrequencyType(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="daily">Todos los días</option>
                    <option value="specific_days">Días específicos</option>
                    <option value="times_per_week">N veces por semana</option>
                  </select>
                </div>
              </div>

              {/* Selector de días específicos */}
              {frequencyType === "specific_days" && (
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-400">Selecciona los días programados</label>
                  <div className="flex items-center gap-1.5">
                    {daysOfWeek.map((d) => (
                      <button
                        type="button"
                        key={d.day}
                        onClick={() => toggleSpecificDay(d.day)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
                          specificDays.includes(d.day)
                            ? "bg-emerald-500 text-neutral-950 font-bold"
                            : "bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selector de veces por semana */}
              {frequencyType === "times_per_week" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span>Meta semanal:</span>
                    <span className="font-bold text-white">{targetDays} días por semana</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={7}
                    value={targetDays}
                    onChange={(e) => setTargetDays(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                >
                  {saving ? "Guardando..." : "Crear Hábito"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
