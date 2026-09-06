"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  BookOpen,
  Briefcase,
  GraduationCap,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Flame,
  Check,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight
} from "lucide-react";

export interface ToolResultItem {
  CallId?: string;
  callId?: string;
  ToolName?: string;
  toolName?: string;
  Success?: boolean;
  success?: boolean;
  Data?: unknown;
  data?: unknown;
  ErrorMessage?: string;
  errorMessage?: string;
}

interface RichToolCardsProps {
  toolResultsJson?: string;
  toolCallsJson?: string;
}

export function RichToolCards({ toolResultsJson, toolCallsJson }: RichToolCardsProps) {
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedDetails((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Parse tool results if available
  let results: ToolResultItem[] = [];
  if (toolResultsJson) {
    try {
      const parsed = JSON.parse(toolResultsJson);
      results = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // Ignore parse error
    }
  }

  // If no results but toolCallsJson is present, extract tool calls
  if (results.length === 0 && toolCallsJson) {
    try {
      const parsedCalls = JSON.parse(toolCallsJson);
      const callsArray = Array.isArray(parsedCalls) ? parsedCalls : [parsedCalls];
      results = callsArray.map((c: Record<string, unknown>) => ({
        toolName: (c.ToolName || c.toolName || "tool") as string,
        callId: (c.CallId || c.callId || "call") as string,
        success: true,
        data: c.Arguments || c.arguments || {},
      }));
    } catch {
      // Ignore
    }
  }

  if (results.length === 0) return null;

  return (
    <div className="space-y-2.5 my-2">
      {results.map((item, idx) => {
        const toolName = (item.ToolName || item.toolName || "").toLowerCase();
        const callId = item.CallId || item.callId || `tool-${idx}`;
        const success = item.Success ?? item.success ?? true;
        const data = (item.Data ?? item.data ?? {}) as Record<string, unknown>;
        const errorMessage = item.ErrorMessage || item.errorMessage;
        const isExpanded = !!expandedDetails[callId];

        // Route by tool name
        if (toolName === "get_health_summary") {
          return (
            <HealthSummaryCard
              key={callId}
              data={data}
              success={success}
              errorMessage={errorMessage}
            />
          );
        }

        if (toolName === "get_habits_status" || toolName === "toggle_habit") {
          return (
            <HabitsCard
              key={callId}
              toolName={toolName}
              data={data}
              success={success}
              errorMessage={errorMessage}
            />
          );
        }

        if (toolName === "search_notes" || toolName === "create_quick_note") {
          return (
            <NotesCard
              key={callId}
              toolName={toolName}
              data={data}
              success={success}
              errorMessage={errorMessage}
            />
          );
        }

        if (toolName === "get_work_tasks" || toolName === "create_work_task") {
          return (
            <WorkTasksCard
              key={callId}
              toolName={toolName}
              data={data}
              success={success}
              errorMessage={errorMessage}
            />
          );
        }

        if (toolName === "get_academic_status" || toolName === "create_academic_milestone") {
          return (
            <AcademicsCard
              key={callId}
              toolName={toolName}
              data={data}
              success={success}
              errorMessage={errorMessage}
            />
          );
        }

        if (toolName === "get_timeline_feed") {
          return (
            <TimelineFeedCard
              key={callId}
              data={data}
              success={success}
              errorMessage={errorMessage}
            />
          );
        }

        // Generic Tool Card Fallback
        return (
          <div
            key={callId}
            className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-mono font-medium text-zinc-200">{toolName}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    success
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                      : "bg-rose-500/15 text-rose-300 border border-rose-500/20"
                  }`}
                >
                  {success ? "Ejecutado" : "Error"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleExpand(callId)}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded"
              >
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {errorMessage && (
              <p className="text-rose-400 text-[11px] flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </p>
            )}

            {isExpanded && (
              <pre className="p-2.5 rounded-lg bg-black/50 border border-zinc-800/80 font-mono text-[11px] text-zinc-400 overflow-x-auto max-h-48">
                {JSON.stringify(data, null, 2)}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------------------------
// 1. Salud: HealthSummaryCard
// -----------------------------------------------------------------------------
interface CardSubProps {
  data: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
}

function HealthSummaryCard({ data, success, errorMessage }: CardSubProps) {
  // Check if comparison or studies list
  const metricName = (data.metricName || data.MetricName) as string | undefined;
  const history = (data.history || data.History) as Array<Record<string, unknown>> | undefined;
  const studies = (data.studies || data.Studies) as Array<Record<string, unknown>> | undefined;
  const totalStudies = (data.totalStudies || data.TotalStudies) as number | undefined;

  return (
    <div className="rounded-xl bg-zinc-900/90 border border-rose-500/20 p-3.5 shadow-sm space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/20">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-zinc-200">
              {metricName ? `Métrica Médica: ${metricName}` : "Historial de Salud & Laboratorio"}
            </h4>
            <span className="text-[10px] text-zinc-400">Datos clínicos verificados</span>
          </div>
        </div>

        <Link
          href="/salud"
          className="text-[11px] text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 transition"
        >
          <span>Abrir Salud</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {errorMessage ? (
        <p className="text-xs text-rose-400">{errorMessage}</p>
      ) : metricName && history ? (
        <div className="p-2.5 rounded-lg bg-black/40 border border-zinc-800 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-zinc-400 text-[11px]">
            <span>Puntos registrados: <strong className="text-zinc-200">{history.length}</strong></span>
            <span>Último valor</span>
          </div>
          {history.length > 0 && (
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-xs text-zinc-400">
                {String(history[history.length - 1].studyDate || history[history.length - 1].StudyDate || "")}
              </span>
              <span className="text-base font-bold text-rose-300 font-mono">
                {String(history[history.length - 1].value || history[history.length - 1].Value || "")}{" "}
                <span className="text-xs font-normal text-zinc-400">
                  {String(history[history.length - 1].unit || history[history.length - 1].Unit || "")}
                </span>
              </span>
            </div>
          )}
        </div>
      ) : studies ? (
        <div className="space-y-1.5 text-xs">
          <span className="text-[11px] text-zinc-400">
            Total de estudios analizados: <strong className="text-zinc-200">{totalStudies ?? studies.length}</strong>
          </span>
          <div className="divide-y divide-zinc-800/80 rounded-lg bg-black/40 border border-zinc-800 overflow-hidden">
            {studies.slice(0, 3).map((s, i) => (
              <div key={i} className="p-2 flex items-center justify-between text-[11px]">
                <div className="truncate">
                  <span className="font-medium text-zinc-200">
                    {String(s.studyType || s.StudyType || "Estudio")}
                  </span>
                  <span className="text-zinc-500 ml-1.5 truncate">
                    {String(s.institution || s.Institution || "")}
                  </span>
                </div>
                <span className="text-zinc-400 font-mono text-[10px] shrink-0 ml-2">
                  {String(s.studyDate || s.StudyDate || "")}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-zinc-400">Consulta clínica procesada con éxito.</p>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// 2. Hábitos: HabitsCard
// -----------------------------------------------------------------------------
function HabitsCard({ toolName, data, success, errorMessage }: CardSubProps & { toolName: string }) {
  const isToggle = toolName === "toggle_habit";
  const habits = (data.habits || data.Habits) as Array<Record<string, unknown>> | undefined;
  const completionPercentage = (data.completionPercentage ?? data.CompletionPercentage) as number | undefined;

  return (
    <div className="rounded-xl bg-zinc-900/90 border border-emerald-500/20 p-3.5 shadow-sm space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-zinc-200">
              {isToggle ? "Hábito Actualizado" : "Hábitos & Consistencia"}
            </h4>
            <span className="text-[10px] text-zinc-400">
              {isToggle ? "Registro de cumplimiento sincronizado" : "Estado diario y rachas"}
            </span>
          </div>
        </div>

        <Link
          href="/habitos"
          className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition"
        >
          <span>Ver Hábitos</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {errorMessage ? (
        <p className="text-xs text-rose-400">{errorMessage}</p>
      ) : isToggle ? (
        <div className="p-2.5 rounded-lg bg-black/40 border border-zinc-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-emerald-500 text-black flex items-center justify-center font-bold">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
            <span className="text-zinc-200 font-medium">Hábito marcado exitosamente</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-amber-400">
            <Flame className="w-3 h-3 fill-amber-400" />
            <span className="font-bold">
              Racha: {String(data.currentStreak ?? data.CurrentStreak ?? 1)}d
            </span>
          </div>
        </div>
      ) : habits ? (
        <div className="space-y-2 text-xs">
          {completionPercentage !== undefined && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Progreso del día</span>
              <span className="font-bold text-emerald-400">{completionPercentage}%</span>
            </div>
          )}
          <div className="space-y-1.5">
            {habits.slice(0, 4).map((h, idx) => {
              const isDone = Boolean(h.isCompletedToday ?? h.IsCompletedToday);
              const name = String(h.name || h.Name || "Hábito");
              const streak = Number(h.currentStreak || h.CurrentStreak || 0);

              return (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-black/40 border border-zinc-800/80 flex items-center justify-between text-[11px]"
                >
                  <div className="flex items-center gap-2 truncate">
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center ${
                        isDone ? "bg-emerald-500 text-black" : "border border-zinc-700"
                      }`}
                    >
                      {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className={`truncate ${isDone ? "line-through text-zinc-500" : "text-zinc-200"}`}>
                      {name}
                    </span>
                  </div>

                  <span className="text-amber-400 font-mono text-[10px] flex items-center gap-0.5 shrink-0 ml-2">
                    <Flame className="w-3 h-3" />
                    {streak}d
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// -----------------------------------------------------------------------------
// 3. Notas: NotesCard
// -----------------------------------------------------------------------------
function NotesCard({ toolName, data, success, errorMessage }: CardSubProps & { toolName: string }) {
  const isCreate = toolName === "create_quick_note";
  const notes = (data.notes || data.Notes) as Array<Record<string, unknown>> | undefined;
  const title = (data.title || data.Title) as string | undefined;
  const slug = (data.slug || data.Slug) as string | undefined;

  return (
    <div className="rounded-xl bg-zinc-900/90 border border-indigo-500/20 p-3.5 shadow-sm space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-zinc-200">
              {isCreate ? "Nota Creada en Segundo Cerebro" : "Búsqueda en Segundo Cerebro"}
            </h4>
            <span className="text-[10px] text-zinc-400">
              {isCreate ? "Enlazada a tu grafo de conocimiento" : "Coincidencias encontradas"}
            </span>
          </div>
        </div>

        <Link
          href="/notas"
          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition"
        >
          <span>Abrir Notas</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {errorMessage ? (
        <p className="text-xs text-rose-400">{errorMessage}</p>
      ) : isCreate ? (
        <div className="p-2.5 rounded-lg bg-black/40 border border-zinc-800 space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-indigo-300">{title}</span>
            {slug && (
              <span className="text-[10px] font-mono text-zinc-500">[[{slug}]]</span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400 line-clamp-2">
            {String(data.content || data.Content || "Nota registrada exitosamente.")}
          </p>
        </div>
      ) : notes ? (
        <div className="space-y-1.5 text-xs">
          <div className="divide-y divide-zinc-800/80 rounded-lg bg-black/40 border border-zinc-800 overflow-hidden">
            {notes.slice(0, 3).map((n, i) => (
              <div key={i} className="p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-200 text-xs truncate">
                    {String(n.title || n.Title || "")}
                  </span>
                  <span className="text-[10px] font-mono text-indigo-400 shrink-0 ml-2">
                    [[{String(n.slug || n.Slug || "")}]]
                  </span>
                </div>
                {Boolean(n.snippet) && (
                  <p className="text-[11px] text-zinc-400 line-clamp-1">
                    {String(n.snippet)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// -----------------------------------------------------------------------------
// 4. Trabajo: WorkTasksCard
// -----------------------------------------------------------------------------
function WorkTasksCard({ toolName, data, success, errorMessage }: CardSubProps & { toolName: string }) {
  const isCreate = toolName === "create_work_task";
  const tasks = (data.tasks || data.Tasks) as Array<Record<string, unknown>> | undefined;
  const metrics = (data.metrics || data.Metrics) as Record<string, unknown> | undefined;

  return (
    <div className="rounded-xl bg-zinc-900/90 border border-amber-500/20 p-3.5 shadow-sm space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/20">
            <Briefcase className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-zinc-200">
              {isCreate ? "Tarea Kanban Creada" : "Tablero Kanban & Foco"}
            </h4>
            <span className="text-[10px] text-zinc-400">
              {isCreate ? "Añadida al flujo de trabajo" : "Tareas y métricas semanales"}
            </span>
          </div>
        </div>

        <Link
          href="/trabajo"
          className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 transition"
        >
          <span>Ir a Tablero</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {errorMessage ? (
        <p className="text-xs text-rose-400">{errorMessage}</p>
      ) : isCreate ? (
        <div className="p-2.5 rounded-lg bg-black/40 border border-zinc-800 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-zinc-200">
              {String(data.title || data.Title || "Nueva tarea")}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/20 uppercase">
              {String(data.priority || data.Priority || "medium")}
            </span>
          </div>
          {Boolean(data.description) && (
            <p className="text-[11px] text-zinc-400 line-clamp-1">
              {String(data.description)}
            </p>
          )}
          {Boolean(data.dueDate) && (
            <div className="text-[10px] text-zinc-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Vencimiento: {String(data.dueDate)}</span>
            </div>
          )}
        </div>
      ) : tasks ? (
        <div className="space-y-2 text-xs">
          {metrics && (
            <div className="flex items-center gap-3 text-[11px] text-zinc-400 bg-black/40 p-2 rounded-lg border border-zinc-800/80">
              <span>Foco semana: <strong className="text-amber-300">{String(metrics.focusMinutesThisWeek || 0)}m</strong></span>
              <span>•</span>
              <span>Tareas completadas: <strong className="text-emerald-300">{String(metrics.completedTasksThisWeek || 0)}</strong></span>
            </div>
          )}

          <div className="space-y-1.5">
            {tasks.slice(0, 3).map((t, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg bg-black/40 border border-zinc-800/80 flex items-center justify-between text-[11px]"
              >
                <span className="text-zinc-200 truncate font-medium">
                  {String(t.title || t.Title || "")}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300 capitalize shrink-0 ml-2">
                  {String(t.status || t.Status || "todo")}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// -----------------------------------------------------------------------------
// 5. Academia: AcademicsCard
// -----------------------------------------------------------------------------
function AcademicsCard({ toolName, data, success, errorMessage }: CardSubProps & { toolName: string }) {
  const isCreate = toolName === "create_academic_milestone";
  const subjects = (data.subjects || data.Subjects) as Array<Record<string, unknown>> | undefined;
  const careerAverage = (data.careerAverage ?? data.CareerAverage) as number | undefined;

  return (
    <div className="rounded-xl bg-zinc-900/90 border border-sky-500/20 p-3.5 shadow-sm space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/20">
            <GraduationCap className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-zinc-200">
              {isCreate ? "Hito Evaluativo Registrado" : "Rendimiento Académico & Materias"}
            </h4>
            <span className="text-[10px] text-zinc-400">
              {isCreate ? "Agendado al calendario de cursada" : "Promedios y evaluaciones"}
            </span>
          </div>
        </div>

        <Link
          href="/academia"
          className="text-[11px] text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 transition"
        >
          <span>Ver Academia</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {errorMessage ? (
        <p className="text-xs text-rose-400">{errorMessage}</p>
      ) : isCreate ? (
        <div className="p-2.5 rounded-lg bg-black/40 border border-zinc-800 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-zinc-200">
              {String(data.title || data.Title || "Hito")}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/20 uppercase">
              {String(data.milestoneType || data.MilestoneType || "parcial")}
            </span>
          </div>
          {Boolean(data.dueDate) && (
            <div className="text-[10px] text-zinc-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Fecha: {String(data.dueDate)}</span>
            </div>
          )}
        </div>
      ) : subjects ? (
        <div className="space-y-2 text-xs">
          {careerAverage !== undefined && (
            <div className="p-2 rounded-lg bg-black/40 border border-zinc-800 flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Promedio General Acumulado:</span>
              <span className="font-bold text-sky-300 font-mono text-sm">
                {careerAverage ? Number(careerAverage).toFixed(2) : "—"}
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            {subjects.slice(0, 3).map((s, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg bg-black/40 border border-zinc-800/80 flex items-center justify-between text-[11px]"
              >
                <span className="text-zinc-200 truncate font-medium">
                  {String(s.name || s.Name || "")}
                </span>
                <span className="text-zinc-400 font-mono text-[10px] shrink-0 ml-2">
                  {s.average ? `Nota: ${Number(s.average).toFixed(2)}` : "En curso"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// -----------------------------------------------------------------------------
// 6. Spine / Timeline: TimelineFeedCard
// -----------------------------------------------------------------------------
function TimelineFeedCard({ data, success, errorMessage }: CardSubProps) {
  const events = (data.events || data.Events) as Array<Record<string, unknown>> | undefined;
  const totalEvents = (data.totalEvents || data.TotalEvents) as number | undefined;

  return (
    <div className="rounded-xl bg-zinc-900/90 border border-purple-500/20 p-3.5 shadow-sm space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/20">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-zinc-200">Línea de Tiempo Unificada (Spine)</h4>
            <span className="text-[10px] text-zinc-400">
              Total de eventos sincronizados: {totalEvents ?? (events ? events.length : 0)}
            </span>
          </div>
        </div>

        <Link
          href="/hoy"
          className="text-[11px] text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 transition"
        >
          <span>Ver Daily Hub</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {errorMessage ? (
        <p className="text-xs text-rose-400">{errorMessage}</p>
      ) : events && events.length > 0 ? (
        <div className="divide-y divide-zinc-800/80 rounded-lg bg-black/40 border border-zinc-800 overflow-hidden text-xs">
          {events.slice(0, 3).map((e, idx) => (
            <div key={idx} className="p-2 flex items-center justify-between text-[11px]">
              <div className="truncate pr-2">
                <span className="font-semibold text-zinc-200">
                  {String(e.title || e.Title || "Evento")}
                </span>
                {Boolean(e.summary) && (
                  <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                    {String(e.summary)}
                  </p>
                )}
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 capitalize shrink-0">
                {String(e.sourceModule || e.SourceModule || "módulo")}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-500">No se encontraron eventos en la ventana de fechas.</p>
      )}
    </div>
  );
}
