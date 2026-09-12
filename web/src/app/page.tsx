"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  BookOpen,
  Briefcase,
  GraduationCap,
  ArrowRight,
  Flame,
  Smile,
  Zap,
  Clock,
  Check,
  ChevronRight,
  Sparkles,
  User,
  Menu,
  X,
  Wallet,
  Dumbbell,
  LogOut,
} from "lucide-react";
import {
  LifeTrackerApiClient,
  type DailyHubData,
} from "@/lib/api-client";
import { SomaLogo } from "@/components/ui/SomaLogo";
import { useAuth } from "@/contexts/AuthContext";

export default function SomaDashboardPage() {
  const { user, fullName, signOut } = useAuth();
  const [hubData, setHubData] = useState<DailyHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [savingCheckin, setSavingCheckin] = useState(false);
  const [greeting, setGreeting] = useState("Buen día");
  const [userName, setUserName] = useState("Subi");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Buen día");
    else if (hour < 20) setGreeting("Buenas tardes");
    else setGreeting("Buenas noches");

    const authName = user?.user_metadata?.full_name || fullName;
    if (authName) {
      setUserName(authName);
    } else {
      const p = LifeTrackerApiClient.getUserProfile();
      if (p.name) setUserName(p.name);
    }

    const handleProfileUpdate = () => {
      const authUpdated = user?.user_metadata?.full_name || fullName;
      if (authUpdated) {
        setUserName(authUpdated);
      } else {
        const updated = LifeTrackerApiClient.getUserProfile();
        if (updated.name) setUserName(updated.name);
      }
    };

    window.addEventListener("user_profile_updated", handleProfileUpdate);
    loadHubData();

    return () => {
      window.removeEventListener("user_profile_updated", handleProfileUpdate);
    };
  }, [user, fullName]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setMobileMenuOpen(false);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [mobileMenuOpen]);

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
          },
          {
            id: "demo-4",
            name: "Sesión Deep Work (45m)",
            category: "trabajo",
            color: "amber",
            isCompletedToday: false,
            currentStreak: 4,
            longestStreak: 10,
            frequencyDescription: "Lunes a Viernes",
          },
        ],
        completionPercentage: 25,
        todayTimeline: [
          {
            id: "tl-1",
            timestamp: new Date().toISOString(),
            sourceModule: "habits",
            eventType: "habit_completed",
            title: "Hábito completado: Caminata al aire libre",
            summary: "Racha de 5 días consecutivos",
          },
        ],
        workSummary: {
          completedTasksToday: 2,
          focusMinutesToday: 50,
        },
        upcomingExams: [
          {
            milestoneId: "demo-m1",
            subjectId: "demo-s1",
            subjectName: "Algoritmos y Estructuras de Datos",
            subjectColor: "indigo",
            milestoneTitle: "Segundo Parcial Teórico-Práctico",
            milestoneType: "parcial",
            dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
            daysRemaining: 3,
          },
        ],
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
    const newPercentage =
      updatedHabits.length === 0 ? 100 : Math.round((completedCount / updatedHabits.length) * 100);

    setHubData({
      ...hubData,
      habits: updatedHabits,
      completionPercentage: newPercentage,
    });

    try {
      await LifeTrackerApiClient.toggleHabit(habitId);
      const freshData = await LifeTrackerApiClient.getDailyHubToday().catch(() => null);
      if (freshData) setHubData(freshData);
    } catch {
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
      // Silencioso en modo local
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

  const pillarsNav = [
    {
      name: "Salud",
      shortName: "Salud",
      desc: "Métricas de sueño, peso y energía",
      href: "/salud",
      icon: Activity,
      accent: "hover:text-rose-400",
      colorBg: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    },
    {
      name: "Hábitos",
      shortName: "Hábitos",
      desc: "Rutinas y consistencia diaria",
      href: "/habitos",
      icon: CheckCircle2,
      accent: "hover:text-emerald-400",
      colorBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    {
      name: "Segundo Cerebro",
      shortName: "Notas",
      desc: "Notas, ideas y base de conocimiento",
      href: "/notas",
      icon: BookOpen,
      accent: "hover:text-indigo-400",
      colorBg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    },
    {
      name: "Trabajo & Foco",
      shortName: "Trabajo",
      desc: "Pomodoro, proyectos y tareas",
      href: "/trabajo",
      icon: Briefcase,
      accent: "hover:text-amber-400",
      colorBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
    {
      name: "Academia",
      shortName: "Academia",
      desc: "Cursos, exámenes y progreso",
      href: "/academia",
      icon: GraduationCap,
      accent: "hover:text-sky-400",
      colorBg: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    },
    {
      name: "Finanzas",
      shortName: "Finanzas",
      desc: "Control de gastos y presupuestos",
      href: "/finanzas",
      icon: Wallet,
      accent: "hover:text-emerald-400",
      colorBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    {
      name: "Entrenamientos",
      shortName: "Fitness",
      desc: "Gimnasio, rutinas y sobrecarga progresiva",
      href: "/entrenamientos",
      icon: Dumbbell,
      accent: "hover:text-amber-400",
      colorBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
    {
      name: "Asistente AI",
      shortName: "Asistente",
      desc: "Copiloto inteligente del sistema",
      href: "/asistente",
      icon: Sparkles,
      accent: "hover:text-purple-400 font-medium",
      colorBg: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    },
  ];

  const completedHabitsCount = hubData?.habits.filter((h) => h.isCompletedToday).length || 0;
  const totalHabitsCount = hubData?.habits.length || 0;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-neutral-800">
      {/* Top Navigation Bar */}
      <header className="border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <SomaLogo href="/" size="sm" />
          </div>

          {/* Module Links (Desktop - Clean Typography, No Icons) */}
          <nav className="hidden md:flex items-center gap-0.5 lg:gap-1">
            {pillarsNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-2.5 py-1 rounded-md text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-900/90 transition-colors"
              >
                {item.shortName}
              </Link>
            ))}
          </nav>

          {/* Right Actions: User Profile, Logout & Mobile Menu Toggle */}
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Link
              href="/perfil"
              className="px-2.5 py-1.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 hover:text-white flex items-center gap-1.5 transition text-xs font-medium shrink-0"
              title="Ir a Perfil & Resumen"
            >
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline font-semibold">{userName}</span>
            </Link>

            <button
              type="button"
              onClick={() => signOut()}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-900/90 hover:bg-rose-950/30 border border-neutral-800 hover:border-rose-500/40 text-neutral-400 hover:text-rose-300 transition text-xs font-medium shrink-0 cursor-pointer active:scale-95"
              title="Cerrar Sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition flex items-center justify-center shrink-0 active:scale-95"
              aria-label={mobileMenuOpen ? "Cerrar menú de módulos" : "Abrir menú de módulos"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu-drawer"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer (Rendered outside header to escape backdrop-filter containing block) */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu-drawer"
          className="md:hidden fixed inset-x-0 top-16 bottom-0 z-40 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 flex flex-col"
        >
          <div className="bg-neutral-950 border-b border-neutral-800/80 shadow-2xl flex flex-col max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain">
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between px-2 pt-1 pb-1">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Módulos del Sistema
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">Soma OS</span>
              </div>

              {/* Navigation Items List */}
              <div className="space-y-1">
                {pillarsNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="group flex items-center gap-3 p-2.5 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-900 border border-transparent hover:border-neutral-800/80 transition-all active:scale-[0.99]"
                    >
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${item.colorBg}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-neutral-200 group-hover:text-white">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-neutral-500 group-hover:text-neutral-400 truncate">
                          {item.desc}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 transition-transform group-hover:translate-x-0.5 shrink-0" />
                    </Link>
                  );
                })}
              </div>

              {/* User Profile & Footer */}
              <div className="pt-2 border-t border-neutral-800/80 space-y-1">
                <Link
                  href="/perfil"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-2.5 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-900 border border-transparent hover:border-neutral-800/80 transition-all active:scale-[0.99]"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-neutral-200">Perfil & Resumen</div>
                    <div className="text-[11px] text-neutral-500">Métricas y configuración ({userName})</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-600 shrink-0" />
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl text-neutral-400 hover:text-rose-300 hover:bg-rose-950/20 border border-transparent hover:border-rose-500/30 transition-all active:scale-[0.99] text-left cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                    <LogOut className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-neutral-200">Cerrar Sesión</div>
                    <div className="text-[11px] text-neutral-500">Salir de SOMA en este dispositivo</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Semi-transparent backdrop to dismiss menu on click */}
          <div
            className="flex-1 min-h-12 cursor-pointer"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-20 w-full flex-1 space-y-8">
        {/* Executive Header / Greeting */}
        <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-neutral-800/80">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              {greeting}, {userName}.
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 capitalize mt-1">
              {new Date().toLocaleDateString("es-ES", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}{" "}
              • Panel de Operación Diaria
            </p>
          </div>

          {/* Pulse summary chips */}
          <div className="flex items-center gap-2.5 flex-wrap text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-neutral-400">Hábitos:</span>
              <span className="font-semibold text-neutral-200">
                {completedHabitsCount}/{totalHabitsCount} ({hubData?.completionPercentage || 0}%)
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-neutral-400">Foco:</span>
              <span className="font-semibold text-neutral-200 font-mono">
                {hubData?.workSummary?.focusMinutesToday || 0}m
              </span>
            </div>
          </div>
        </section>

        {/* Check-in Diario Compacto (Ánimo & Energía) */}
        <section className="p-3.5 sm:p-4 rounded-xl bg-neutral-900/40 border border-neutral-800/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center justify-between md:justify-start gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <Smile className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                Check-in Diario
              </span>
            </div>
            {savingCheckin && (
              <span className="text-[10px] text-neutral-500 animate-pulse font-mono">Guardando...</span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 text-xs">
            {/* Ánimo */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-neutral-500 shrink-0">
                Ánimo:
              </span>
              <div className="flex items-center gap-1 bg-neutral-950/70 p-1 rounded-lg border border-neutral-800/80">
                {moodOptions.map((opt) => (
                  <button
                    key={opt.score}
                    type="button"
                    title={opt.label}
                    onClick={() => handleScoreChange(opt.score, energy)}
                    className={`px-2 py-1 rounded-md text-xs transition flex items-center gap-1 ${
                      mood === opt.score
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "text-neutral-400 hover:text-white hover:bg-neutral-900/80"
                    }`}
                  >
                    <span>{opt.emoji}</span>
                    <span className="hidden xl:inline text-[10px]">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Energía */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-neutral-500 shrink-0">
                Energía:
              </span>
              <div className="flex items-center gap-1 bg-neutral-950/70 p-1 rounded-lg border border-neutral-800/80">
                {energyOptions.map((opt) => (
                  <button
                    key={opt.score}
                    type="button"
                    title={opt.label}
                    onClick={() => handleScoreChange(mood, opt.score)}
                    className={`px-2 py-1 rounded-md text-xs transition flex items-center gap-1 ${
                      energy === opt.score
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "text-neutral-400 hover:text-white hover:bg-neutral-900/80"
                    }`}
                  >
                    <span>{opt.emoji}</span>
                    <span className="hidden xl:inline text-[10px]">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard 2-Columns Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Column: Hábitos de Hoy (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Hábitos de 1-Toque */}
            <section className="p-5 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Hábitos de Hoy ({completedHabitsCount}/{totalHabitsCount})
                  </h2>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Marca con un solo toque para registrar consistencia
                  </p>
                </div>
                <Link
                  href="/habitos"
                  className="text-xs text-neutral-400 hover:text-white transition flex items-center gap-1 font-medium"
                >
                  <span>Gestionar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${hubData?.completionPercentage || 0}%` }}
                />
              </div>

              {/* Habits List */}
              <div className="space-y-2 pt-1">
                {hubData?.habits.map((habit) => (
                  <div
                    key={habit.id}
                    onClick={() => handleToggleHabit(habit.id)}
                    className={`cursor-pointer p-3.5 rounded-xl border transition-all flex items-center justify-between select-none ${
                      habit.isCompletedToday
                        ? "bg-emerald-950/20 border-emerald-500/30 text-neutral-200"
                        : "bg-neutral-950/70 border-neutral-800/80 hover:border-neutral-700 text-neutral-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                          habit.isCompletedToday
                            ? "bg-emerald-500 text-neutral-950 font-bold"
                            : "border-2 border-neutral-700 bg-neutral-900"
                        }`}
                      >
                        {habit.isCompletedToday && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div>
                        <span
                          className={`text-xs sm:text-sm font-medium transition ${
                            habit.isCompletedToday
                              ? "line-through text-neutral-500"
                              : "text-neutral-100"
                          }`}
                        >
                          {habit.name}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-neutral-500 mt-0.5">
                          <span className="capitalize">{habit.category}</span>
                          <span>•</span>
                          <span>{habit.frequencyDescription}</span>
                        </div>
                      </div>
                    </div>

                    {/* Streak flame badge */}
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-[11px]">
                      <Flame
                        className={`w-3.5 h-3.5 ${
                          habit.currentStreak > 0
                            ? "text-amber-400 fill-amber-400"
                            : "text-neutral-600"
                        }`}
                      />
                      <span className="font-semibold text-neutral-300">{habit.currentStreak}</span>
                      <span className="text-[10px] text-neutral-500">d</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Secondary Column: Trabajo, Exámenes & Asistente (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Widget: Deep Work & Trabajo */}
            <section className="p-5 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-amber-400" />
                  Trabajo & Deep Work
                </h2>
                <Link
                  href="/trabajo"
                  className="text-xs text-amber-400 hover:text-amber-300 transition flex items-center gap-1 font-medium"
                >
                  <span>Tablero</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800/80">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Minutos de Foco</span>
                  </div>
                  <div className="text-2xl font-bold text-white font-mono">
                    {hubData?.workSummary?.focusMinutesToday ?? 0}m
                  </div>
                  <span className="text-[10px] text-neutral-500">Sesiones activas</span>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800/80">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tareas Hechas</span>
                  </div>
                  <div className="text-2xl font-bold text-white font-mono">
                    {hubData?.workSummary?.completedTasksToday ?? 0}
                  </div>
                  <span className="text-[10px] text-neutral-500">Completadas hoy</span>
                </div>
              </div>

              <Link
                href="/trabajo"
                className="w-full py-2.5 px-3 rounded-xl bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 hover:text-white flex items-center justify-center gap-2 transition font-medium"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Iniciar sesión de foco</span>
              </Link>
            </section>

            {/* Widget: Próximos Exámenes & Hitos Académicos */}
            <section className="p-5 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-sky-400" />
                  Próximos Exámenes (7d)
                </h2>
                <Link
                  href="/academia"
                  className="text-xs text-sky-400 hover:text-sky-300 transition flex items-center gap-1 font-medium"
                >
                  <span>Ver Todos</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {(!hubData?.upcomingExams || hubData.upcomingExams.length === 0) ? (
                <div className="p-4 rounded-xl bg-neutral-950/60 border border-dashed border-neutral-800 text-center text-xs text-neutral-500">
                  Sin exámenes programados para los próximos 7 días.
                </div>
              ) : (
                <div className="space-y-2">
                  {hubData.upcomingExams.map((exam) => (
                    <div
                      key={exam.milestoneId}
                      className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-neutral-200 truncate">
                            {exam.subjectName}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-900 text-neutral-400 capitalize">
                            {exam.milestoneType}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                          {exam.milestoneTitle}
                        </p>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 border ${
                          exam.daysRemaining === 0
                            ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                            : exam.daysRemaining === 1
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            : "bg-sky-500/15 text-sky-300 border-sky-500/30"
                        }`}
                      >
                        {exam.daysRemaining === 0
                          ? "¡Hoy!"
                          : exam.daysRemaining === 1
                          ? "Mañana"
                          : `En ${exam.daysRemaining} días`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Widget SOMA AI Asistente (Compacto & Elegante) */}
            <section className="p-4 rounded-2xl bg-neutral-900/50 border border-purple-500/20 hover:border-purple-500/40 transition flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-neutral-200">Asistente AI</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                    Consultá métricas, creá tareas o agendá exámenes
                  </p>
                </div>
              </div>

              <Link
                href="/asistente"
                className="shrink-0 px-3 py-1.5 rounded-xl bg-purple-600/90 hover:bg-purple-500 text-white text-xs font-semibold transition active:scale-95 flex items-center gap-1.5"
              >
                <span>Abrir</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
