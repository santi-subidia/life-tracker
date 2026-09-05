import Link from "next/link";
import { Activity, CheckCircle2, BookOpen, Briefcase, GraduationCap, Sparkles, ArrowRight } from "lucide-react";

export default function HomePage() {
  const pillars = [
    {
      title: "Salud & Estudios",
      desc: "Historial médico, análisis clínicos y comparación multianual.",
      href: "/salud",
      icon: Activity,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      border: "border-rose-500/20",
    },
    {
      title: "Hábitos & Rutinas",
      desc: "Checklist diario de 1 toque, rachas y consistencia.",
      href: "/habitos",
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      title: "Segundo Cerebro",
      desc: "Notas con enlaces bidireccionales estilo Obsidian y bitácora.",
      href: "/notas",
      icon: BookOpen,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20",
    },
    {
      title: "Trabajo & Foco",
      desc: "Tablero Kanban completo, proyectos y sesiones de Deep Work.",
      href: "/trabajo",
      icon: Briefcase,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      title: "Academia",
      desc: "Materias, fechas clave de exámenes y calificaciones.",
      href: "/academia",
      icon: GraduationCap,
      color: "text-sky-500",
      bg: "bg-sky-500/10",
      border: "border-sky-500/20",
    },
    {
      title: "Asistente IA",
      desc: "Google Gemini 2.5 Flash con visión transversal de tu vida.",
      href: "/asistente",
      icon: Sparkles,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
  ];

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Top bar */}
      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              LT
            </div>
            <div>
              <h1 className="font-semibold text-base leading-tight">Life Tracker</h1>
              <p className="text-xs text-neutral-400">Personal Life OS</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              .NET 10 & Next.js 16
            </span>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-8 w-full">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-50 mb-3">
            Toda tu vida en un solo lugar.
          </h2>
          <p className="text-neutral-400 text-sm sm:text-base leading-relaxed mb-6">
            Plataforma personal que unifica tus métricas de salud, hábitos diarios, segundo cerebro, proyectos y formación bajo un mismo sistema inteligente.
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/hoy"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>Abrir Daily Hub ("Hoy")</span>
            </Link>
            <Link
              href="/salud"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-sm font-medium transition"
            >
              <Activity className="w-4 h-4 text-rose-500" />
              <span>Estudios Médicos</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Grid of Pillars */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 w-full flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <Link
                key={pillar.href}
                href={pillar.href}
                className="group relative p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all duration-200 hover:bg-neutral-900 flex flex-col justify-between"
              >
                <div>
                  <div className={`w-10 h-10 rounded-xl ${pillar.bg} ${pillar.color} flex items-center justify-center mb-4 border ${pillar.border}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-neutral-100 text-base mb-1 group-hover:text-white flex items-center gap-2">
                    {pillar.title}
                    <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-neutral-400" />
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
