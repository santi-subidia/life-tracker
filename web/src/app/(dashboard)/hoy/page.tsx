"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Check, 
  Flame, 
  Smile, 
  Zap, 
  Clock, 
  Settings, 
  Sparkles,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Activity
} from "lucide-react";
import { 
  LifeTrackerApiClient, 
  type DailyHubData, 
  type TodayHabitItem 
} from "@/lib/api-client";

export default function DailyHubPage() {
  const [hubData, setHubData] = useState<DailyHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [savingCheckin, setSavingCheckin] = useState(false);

  useEffect(() => {
    loadHubData();
  }, []);

  async function loadHubData() {
    try {
      setLoading(true);
      const data: DailyHubData = await LifeTrackerApiClient.getDailyHubToday().catch(() => ({
        date: new Date().toISOString().split("T")[0],
        dailyLog: undefined,
        habits: [
          {
            id: "demo-1",
            name: "Tomar 2L de Agua",
            category: "salud",
            color: "sky",
            isCompletedToday: false,
            currentStreak: 7,
            longestStreak: 21,
            frequencyDescription: "Todos los días",
          },
          {
            id: "demo-2",
            name: "Lectura Técnica (20 min)",
            category: "estudio",
            color: "indigo",
            isCompletedToday: false,
            currentStreak: 3,
            longestStreak: 12,
            frequencyDescription: "4 veces por semana",
          },
          {
            id: "demo-3",
            name: "Caminata al aire libre",
            category: "salud",
            color: "emerald",
            isCompletedToday: true,
            currentStreak: 5,
            longestStreak: 14,
            frequencyDescription: "Todos los días",
          }
        ],
        completionPercentage: 33,
        todayTimeline: [
          {
            id: "tl-1",
            timestamp: new Date().toISOString(),
            sourceModule: "habits",
            eventType: "habit_completed",
            title: "Hábito completado: Caminata al aire libre",
            summary: "Racha de 5 días consecutivos",
          }
        ]
      }));

      setHubData(data);
      if (data.dailyLog) {
        setMood(data.dailyLog.moodScore || null);
        setEnergy(data.dailyLog.energyScore || null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleHabit(habitId: string) {
    if (!hubData) return;

    // Actualización optimista instantánea
    const updatedHabits = hubData.habits.map((h) => {
      if (h.id === habitId) {
        const nextState = !h.isCompletedToday;
        return {
          ...h,
          isCompletedToday: nextState,
          currentStreak: nextState ? h.currentStreak + 1 : Math.max(0, h.currentStreak - 1),
        };
      }
      return h;
    });

    const completedCount = updatedHabits.filter((h) => h.isCompletedToday).length;
    const newPercentage = updatedHabits.length === 0 ? 100 : Math.round((completedCount / updatedHabits.length) * 100);

    setHubData({
      ...hubData,
      habits: updatedHabits,
      completionPercentage: newPercentage,
    });

    try {
      await LifeTrackerApiClient.toggleHabit(habitId);
      // Recargar datos en segundo plano para consolidar timeline
      const freshData = await LifeTrackerApiClient.getDailyHubToday().catch(() => null);
      if (freshData) setHubData(freshData);
    } catch (err) {
      // Revertir si falla
      loadHubData();
    }
  }

  async function handleScoreChange(newMood: number | null, newEnergy: number | null) {
    setMood(newMood);
    setEnergy(newEnergy);

    try {
      setSavingCheckin(true);
      await LifeTrackerApiClient.updateDailyLogToday({
        moodScore: newMood || undefined,
        energyScore: newEnergy || undefined,
      });
    } catch {
      // Ignore
    } finally {
      setSavingCheckin(false);
    }
  }

  const moodOptions = [
    { score: 1, label: "Agotado", emoji: "😞" },
    { score: 2, label: "Bajo", emoji: "🙁" },
    { score: 3, label: "Neutro", emoji: "😐" },
    { score: 4, label: "Bien", emoji: "🙂" },
    { score: 5, label: "Excelente", emoji: "🤩" },
  ];

  const energyOptions = [
    { score: 1, label: "Sin pila", emoji: "🪫" },
    { score: 2, label: "Baja", emoji: "🔋" },
    { score: 3, label: "Media", emoji: "⚡" },
    { score: 4, label: "Alta", emoji: "⚡⚡" },
    { score: 5, label: "Al tope", emoji: "🚀" },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-24">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 -ml-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-semibold text-base flex items-center gap-2">
                Daily Hub
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Hoy
                </span>
              </h1>
              <p className="text-xs text-neutral-400 capitalize">
                {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
          </div>

          <Link 
            href="/habitos" 
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition flex items-center gap-1.5 text-xs font-medium"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Gestionar Hábitos</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Card: Check-in Diario (Ánimo & Energía) */}
        <section className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
              <Smile className="w-4 h-4 text-amber-400" />
              Check-in de la Jornada
            </h2>
            {savingCheckin && (
              <span className="text-[11px] text-neutral-500 animate-pulse">Guardando...</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ánimo */}
            <div className="space-y-2">
              <label className="text-xs text-neutral-400">Estado de Ánimo</label>
              <div className="flex items-center justify-between gap-1 bg-neutral-950/60 p-1.5 rounded-xl border border-neutral-800">
                {moodOptions.map((opt) => (
                  <button
                    key={opt.score}
                    type="button"
                    onClick={() => handleScoreChange(opt.score, energy)}
                    className={`flex-1 py-2 rounded-lg text-sm transition flex flex-col items-center gap-0.5 ${
                      mood === opt.score
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 scale-105 shadow"
                        : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
                    }`}
                  >
                    <span>{opt.emoji}</span>
                    <span className="text-[10px]">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Energía */}
            <div className="space-y-2">
              <label className="text-xs text-neutral-400">Nivel de Energía</label>
              <div className="flex items-center justify-between gap-1 bg-neutral-950/60 p-1.5 rounded-xl border border-neutral-800">
                {energyOptions.map((opt) => (
                  <button
                    key={opt.score}
                    type="button"
                    onClick={() => handleScoreChange(mood, opt.score)}
                    className={`flex-1 py-2 rounded-lg text-sm transition flex flex-col items-center gap-0.5 ${
                      energy === opt.score
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 scale-105 shadow"
                        : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
                    }`}
                  >
                    <span>{opt.emoji}</span>
                    <span className="text-[10px]">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Barra de Progreso Diario */}
        <section className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Progreso de Hábitos Hoy
            </span>
            <span className="font-bold text-emerald-400">
              {hubData?.completionPercentage || 0}% Completado
            </span>
          </div>

          <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
              style={{ width: `${hubData?.completionPercentage || 0}%` }}
            />
          </div>
        </section>

        {/* Checklist de Hábitos de 1-Tap */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              Hábitos Programados para Hoy ({hubData?.habits.length || 0})
            </h2>
            <Link href="/habitos" className="text-xs text-rose-400 hover:text-rose-300 transition">
              + Agregar Hábito
            </Link>
          </div>

          {hubData?.habits.length === 0 ? (
            <div className="p-8 rounded-2xl bg-neutral-900/40 border border-dashed border-neutral-800 text-center text-neutral-500 text-xs space-y-2">
              <p>No tienes hábitos programados para el día de hoy.</p>
              <Link href="/habitos" className="inline-block text-rose-400 hover:underline">
                Configurar tus hábitos aquí
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {hubData?.habits.map((habit) => (
                <div
                  key={habit.id}
                  onClick={() => handleToggleHabit(habit.id)}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between select-none ${
                    habit.isCompletedToday
                      ? "bg-emerald-950/20 border-emerald-500/40 text-neutral-100 shadow-sm"
                      : "bg-neutral-900/60 border-neutral-800/80 hover:border-neutral-700 text-neutral-300"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Big Touch Target Checkbox */}
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                        habit.isCompletedToday
                          ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30 scale-105"
                          : "border-2 border-neutral-700 bg-neutral-950/60"
                      }`}
                    >
                      {habit.isCompletedToday && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>

                    <div>
                      <h3 className={`font-semibold text-sm transition ${habit.isCompletedToday ? "line-through text-neutral-400" : "text-white"}`}>
                        {habit.name}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-0.5">
                        <span className="capitalize">{habit.category}</span>
                        <span>•</span>
                        <span>{habit.frequencyDescription}</span>
                      </div>
                    </div>
                  </div>

                  {/* Streak badge */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-950/60 border border-neutral-800 text-xs">
                    <Flame className={`w-4 h-4 ${habit.currentStreak > 0 ? "text-amber-400 fill-amber-400 animate-pulse" : "text-neutral-600"}`} />
                    <span className="font-bold text-neutral-200">{habit.currentStreak}</span>
                    <span className="text-[10px] text-neutral-500">días</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Timeline Cronológico de Hoy */}
        <section className="space-y-3 pt-4 border-t border-neutral-800">
          <h2 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            Línea de Tiempo de Hoy
          </h2>

          {hubData?.todayTimeline.length === 0 ? (
            <div className="p-6 rounded-2xl bg-neutral-900/30 border border-neutral-800 text-center text-xs text-neutral-500">
              Aún no hay eventos registrados hoy. A medida que completes hábitos o subas estudios médicos, aparecerán aquí.
            </div>
          ) : (
            <div className="divide-y divide-neutral-800 border border-neutral-800 rounded-2xl overflow-hidden bg-neutral-900/40">
              {hubData?.todayTimeline.map((item) => (
                <div key={item.id} className="p-3.5 flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-medium text-neutral-200">{item.title}</span>
                    {item.summary && (
                      <p className="text-[11px] text-neutral-500">{item.summary}</p>
                    )}
                  </div>
                  <span className="text-[11px] text-neutral-500 whitespace-nowrap">
                    {new Date(item.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
