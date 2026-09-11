"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Check,
  Flame,
  Clock,
  Briefcase,
  BookOpen,
  GraduationCap,
  Activity,
  Calendar,
  Sparkles,
  TrendingUp,
  Award,
  BarChart3,
  CheckCircle2,
  Edit3,
  LogOut,
} from "lucide-react";
import {
  LifeTrackerApiClient,
  type ProfileSummary,
  type UserProfileSettings
} from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";

type PeriodFilter = "week" | "month" | "year";

// Fallback data if backend is offline
const DEMO_SUMMARIES: Record<PeriodFilter, ProfileSummary> = {
  week: {
    period: "week",
    startDate: new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    totalFocusMinutes: 345,
    totalFocusSessions: 8,
    completedHabits: 22,
    longestStreak: 7,
    completedTasks: 6,
    notesCreated: 3,
    approvedMilestones: 1,
    healthStudiesCount: 1,
    activityTimeline: [
      { date: "Lun", focusMinutes: 50, completedHabits: 3, completedTasks: 1, eventsCount: 4 },
      { date: "Mar", focusMinutes: 75, completedHabits: 4, completedTasks: 2, eventsCount: 6 },
      { date: "Mié", focusMinutes: 45, completedHabits: 3, completedTasks: 1, eventsCount: 4 },
      { date: "Jue", focusMinutes: 60, completedHabits: 4, completedTasks: 1, eventsCount: 5 },
      { date: "Vie", focusMinutes: 90, completedHabits: 4, completedTasks: 1, eventsCount: 6 },
      { date: "Sáb", focusMinutes: 25, completedHabits: 2, completedTasks: 0, eventsCount: 2 },
      { date: "Hoy", focusMinutes: 50, completedHabits: 2, completedTasks: 0, eventsCount: 3 },
    ],
  },
  month: {
    period: "month",
    startDate: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    totalFocusMinutes: 1420,
    totalFocusSessions: 32,
    completedHabits: 94,
    longestStreak: 14,
    completedTasks: 24,
    notesCreated: 12,
    approvedMilestones: 3,
    healthStudiesCount: 2,
    activityTimeline: [
      { date: "Sem 1", focusMinutes: 320, completedHabits: 20, completedTasks: 5, eventsCount: 25 },
      { date: "Sem 2", focusMinutes: 410, completedHabits: 26, completedTasks: 8, eventsCount: 34 },
      { date: "Sem 3", focusMinutes: 345, completedHabits: 24, completedTasks: 5, eventsCount: 29 },
      { date: "Sem 4", focusMinutes: 345, completedHabits: 24, completedTasks: 6, eventsCount: 30 },
    ],
  },
  year: {
    period: "year",
    startDate: new Date(Date.now() - 365 * 86400000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    totalFocusMinutes: 12850,
    totalFocusSessions: 260,
    completedHabits: 840,
    longestStreak: 28,
    completedTasks: 180,
    notesCreated: 65,
    approvedMilestones: 12,
    healthStudiesCount: 5,
    activityTimeline: [
      { date: "Ene-Feb", focusMinutes: 1900, completedHabits: 130, completedTasks: 25, eventsCount: 155 },
      { date: "Mar-Abr", focusMinutes: 2400, completedHabits: 160, completedTasks: 35, eventsCount: 195 },
      { date: "May-Jun", focusMinutes: 2100, completedHabits: 145, completedTasks: 30, eventsCount: 175 },
      { date: "Jul-Ago", focusMinutes: 2250, completedHabits: 150, completedTasks: 32, eventsCount: 182 },
      { date: "Sep-Oct", focusMinutes: 2100, completedHabits: 125, completedTasks: 28, eventsCount: 153 },
      { date: "Nov-Dic", focusMinutes: 2100, completedHabits: 130, completedTasks: 30, eventsCount: 160 },
    ],
  },
};

export default function ProfilePage() {
  const { user, fullName, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfileSettings>({
    name: "Subi",
    title: "Software Engineer & Student",
    bio: "Construyendo sistemas de alto rendimiento y hábitos de acero.",
  });

  const [period, setPeriod] = useState<PeriodFilter>("week");
  const [summary, setSummary] = useState<ProfileSummary>(DEMO_SUMMARIES.week);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Edit Mode
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("Subi");
  const [editTitle, setEditTitle] = useState("Software Engineer & Student");
  const [editBio, setEditBio] = useState("Construyendo sistemas de alto rendimiento y hábitos de acero.");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load profile from localStorage or auth on mount
  useEffect(() => {
    const p = LifeTrackerApiClient.getUserProfile();
    const effectiveName = user?.user_metadata?.full_name || fullName || p.name;
    const initialProfile = { ...p, name: effectiveName };
    setProfile(initialProfile);
    setEditName(effectiveName);
    setEditTitle(p.title || "Software Engineer & Student");
    setEditBio(p.bio || "");
  }, [user, fullName]);

  // Fetch summary when period changes
  useEffect(() => {
    async function loadSummary() {
      try {
        setLoadingSummary(true);
        const data = await LifeTrackerApiClient.getProfileSummary(period);
        if (data && data.totalFocusMinutes !== undefined) {
          setSummary(data);
        } else {
          setSummary(DEMO_SUMMARIES[period]);
        }
      } catch {
        setSummary(DEMO_SUMMARIES[period]);
      } finally {
        setLoadingSummary(false);
      }
    }

    loadSummary();
  }, [period]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    const updated: UserProfileSettings = {
      name: editName.trim(),
      title: editTitle.trim(),
      bio: editBio.trim(),
    };

    LifeTrackerApiClient.saveUserProfile(updated);
    setProfile(updated);
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const initials = profile.name
    .split(" ")
    .map((w: string) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "S";

  const formatHours = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0) return `${mins}m`;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  // Safe label formatter so dates never render as "20.."
  const formatPointLabel = (label: string) => {
    if (!label) return "";
    if (!label.includes("-")) return label; // Already formatted (e.g. "Sem 1", "Ene", "Hoy", "Lun 03")
    try {
      const parts = label.split("-");
      if (parts.length === 3) {
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const day = parseInt(parts[2], 10);
        const month = parseInt(parts[1], 10);
        if (!isNaN(day) && !isNaN(month) && month >= 1 && month <= 12) {
          return `${day} ${monthNames[month - 1]}`;
        }
      }
    } catch {
      // ignore
    }
    return label;
  };

  // Find max focus in timeline for relative bar height
  const maxTimelineFocus = Math.max(
    1,
    ...(summary.activityTimeline?.map((p) => p.focusMinutes) || [60])
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-20 selection:bg-neutral-800">
      {/* Top Header */}
      <header className="border-b border-neutral-800/80 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Link
              href="/"
              className="p-2 -ml-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition shrink-0"
              title="Volver al inicio"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="font-semibold text-sm sm:text-base flex items-center gap-2 truncate">
                <span className="truncate">Perfil de Usuario</span>
                <span className="hidden sm:inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                  SOMA OS
                </span>
              </h1>
              <p className="text-xs text-neutral-400 hidden sm:block truncate">Identidad y balance transversal</p>
            </div>
          </div>

          <Link
            href="/asistente"
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-300 hover:text-white flex items-center gap-1.5 transition shrink-0 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Hablar con SOMA AI</span>
            <span className="sm:hidden">SOMA AI</span>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {/* 1. Identity & Profile Card */}
        <section className="p-6 rounded-3xl bg-neutral-900/60 border border-neutral-800/90 shadow-xl relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

          {!isEditing ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                {/* Avatar Badge */}
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-neutral-800 via-neutral-900 to-amber-500/20 border-2 border-amber-500/30 flex items-center justify-center text-2xl font-black tracking-wider text-amber-300 shadow-inner">
                  {initials}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                      {profile.name}
                    </h2>
                    {savedSuccess && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md animate-in fade-in">
                        <Check className="w-3.5 h-3.5" />
                        Guardado
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-400 font-medium">
                    {profile.title || "Software Engineer & Student"}
                  </p>
                  {profile.bio && (
                    <p className="text-xs text-neutral-500 max-w-lg mt-1 italic">
                      &ldquo;{profile.bio}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-start sm:self-center flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setEditName(profile.name);
                    setEditTitle(profile.title || "");
                    setEditBio(profile.bio || "");
                    setIsEditing(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-neutral-800/90 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 hover:text-white border border-neutral-700/60 transition flex items-center gap-2 active:scale-95 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Editar Nombre & Perfil</span>
                </button>

                <button
                  type="button"
                  onClick={() => signOut()}
                  className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-rose-950/30 text-xs font-semibold text-neutral-400 hover:text-rose-300 border border-neutral-800 hover:border-rose-500/40 transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  title="Cerrar sesión en SOMA"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          ) : (
            /* Edit Form */
            <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-400" />
                  Editar Datos de Perfil
                </h3>
                <span className="text-[11px] text-neutral-500">Se sincroniza al instante</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-medium">
                    Nombre o Apodo de Visualización
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Tu nombre (ej: Subi)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-amber-500 transition text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-300 font-medium">
                    Ocupación / Título Principal
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="ej: Desarrollador de Software & Estudiante"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-amber-500 transition text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-300 font-medium">
                    Lema o Enfoque Actual
                  </label>
                  <textarea
                    rows={2}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Breve frase o mantra personal..."
                    className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-amber-500 transition text-sm resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md shadow-amber-500/20 active:scale-95 transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          )}
        </section>

        {/* 2. Tracked Activity Summary Section */}
        <section className="space-y-5">
          {/* Header & Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-800/80">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
                <BarChart3 className="w-5 h-5 text-amber-400" />
                Resumen de lo Traqueado
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Métricas holísticas de productividad, hábitos, estudio y salud
              </p>
            </div>

            {/* Range Selector */}
            <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-2xl border border-neutral-800 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setPeriod("week")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                  period === "week"
                    ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                1 Semana
              </button>
              <button
                type="button"
                onClick={() => setPeriod("month")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                  period === "month"
                    ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Meses
              </button>
              <button
                type="button"
                onClick={() => setPeriod("year")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                  period === "year"
                    ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                1 Año
              </button>
            </div>
          </div>

          {/* Date range subtitle */}
          <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              Período: {summary.startDate} al {summary.endDate}
            </span>
            {loadingSummary && <span className="text-amber-400 animate-pulse ml-2">Actualizando...</span>}
          </div>

          {/* 6 Grid Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Deep Work */}
            <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 space-y-2 hover:border-amber-500/30 transition">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span className="font-medium">Deep Work</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
                {formatHours(summary.totalFocusMinutes)}
              </div>
              <div className="text-[11px] text-neutral-500">
                {summary.totalFocusSessions} sesiones de foco
              </div>
            </div>

            {/* Hábitos */}
            <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 space-y-2 hover:border-emerald-500/30 transition">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span className="font-medium">Hábitos Cumplidos</span>
                <Flame className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-300">
                {summary.completedHabits}
              </div>
              <div className="text-[11px] text-neutral-500">
                Mejor racha: {summary.longestStreak} días
              </div>
            </div>

            {/* Tareas Hechas */}
            <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 space-y-2 hover:border-indigo-500/30 transition">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span className="font-medium">Tareas Kanban</span>
                <Briefcase className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-indigo-300">
                {summary.completedTasks}
              </div>
              <div className="text-[11px] text-neutral-500">
                Finalizadas en tablero
              </div>
            </div>

            {/* Notas del Segundo Cerebro */}
            <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 space-y-2 hover:border-purple-500/30 transition">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span className="font-medium">Segundo Cerebro</span>
                <BookOpen className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-purple-300">
                {summary.notesCreated}
              </div>
              <div className="text-[11px] text-neutral-500">
                Notas creadas o ampliadas
              </div>
            </div>

            {/* Academia */}
            <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 space-y-2 hover:border-sky-500/30 transition">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span className="font-medium">Hitos & Exámenes</span>
                <GraduationCap className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-sky-300">
                {summary.approvedMilestones}
              </div>
              <div className="text-[11px] text-neutral-500">
                Evaluaciones aprobadas
              </div>
            </div>

            {/* Salud */}
            <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 space-y-2 hover:border-rose-500/30 transition">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span className="font-medium">Estudios Clínicos</span>
                <Activity className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-rose-300">
                {summary.healthStudiesCount}
              </div>
              <div className="text-[11px] text-neutral-500">
                Análisis médicos guardados
              </div>
            </div>
          </div>

          {/* 3. Activity Timeline Chart */}
          <div className="p-6 rounded-3xl bg-neutral-900/50 border border-neutral-800/80 space-y-4 overflow-hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                Intensidad de Foco & Actividad en el Período
              </h3>
              <span className="text-[11px] text-neutral-500">
                Minutos de foco por intervalo
              </span>
            </div>

            <div className="pt-4 pb-2 w-full overflow-x-auto overflow-y-hidden">
              <div className="h-44 w-full min-w-[320px] flex items-end gap-2 sm:gap-3 justify-between px-1">
                {summary.activityTimeline?.map((point, idx) => {
                  const heightPercent = Math.max(
                    8,
                    Math.round((point.focusMinutes / maxTimelineFocus) * 100)
                  );

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center gap-2 h-full justify-end group min-w-[24px]"
                    >
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -translate-y-14 bg-neutral-950 border border-neutral-800 px-2.5 py-1.5 rounded-xl text-[10px] text-neutral-200 pointer-events-none whitespace-nowrap shadow-2xl z-30 font-mono">
                        <strong className="text-amber-300">{point.focusMinutes}m</strong> foco • <strong className="text-emerald-300">{point.completedHabits}</strong> hábitos
                      </div>

                      {/* Bar */}
                      <div className="w-full max-w-[56px] min-w-[20px] bg-neutral-950 rounded-xl overflow-hidden p-1 flex flex-col justify-end h-full border border-neutral-800/50">
                        <div
                          className="w-full bg-gradient-to-t from-amber-500 to-amber-400/80 rounded-lg transition-all duration-500 group-hover:brightness-110 shadow-sm shadow-amber-500/10"
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>

                      {/* Label */}
                      <span className="text-[10px] sm:text-xs text-neutral-300 font-medium whitespace-nowrap text-center">
                        {formatPointLabel(point.date)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
