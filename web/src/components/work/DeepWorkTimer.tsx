"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  Flame, 
  Coffee, 
  X, 
  Briefcase, 
  Check, 
  Sparkles,
  AlertCircle
} from "lucide-react";
import { 
  LifeTrackerApiClient, 
  type WorkProject, 
  type WorkTask, 
  type WorkSession, 
  type RecordWorkSessionPayload 
} from "@/lib/api-client";

interface DeepWorkTimerProps {
  projects: WorkProject[];
  tasks: WorkTask[];
  onSessionRecorded?: (session: WorkSession) => void;
}

type TimerMode = "pomodoro" | "stopwatch";
type PomodoroPhase = "work" | "break";

const STORAGE_KEY = "lt_deep_work_timer";
const POMODORO_WORK_SECONDS = 25 * 60; // 25 min
const POMODORO_BREAK_SECONDS = 5 * 60; // 5 min

interface StoredTimerData {
  mode: TimerMode;
  pomodoroPhase: PomodoroPhase;
  secondsLeft: number;
  stopwatchElapsed: number;
  totalFocusSeconds: number;
  isRunning: boolean;
  lastTimestamp: number;
  sessionStartedAt: string;
}

// Sound chime using Web Audio API
function playChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.65);
    });
  } catch {
    // Audio playback might be restricted if no user interaction yet
  }
}

export function DeepWorkTimer({ projects, tasks, onSessionRecorded }: DeepWorkTimerProps) {
  // Timer State
  const [mode, setMode] = useState<TimerMode>("pomodoro");
  const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>("work");
  const [secondsLeft, setSecondsLeft] = useState<number>(POMODORO_WORK_SECONDS);
  const [stopwatchElapsed, setStopwatchElapsed] = useState<number>(0);
  const [totalFocusSeconds, setTotalFocusSeconds] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [sessionStartedAt, setSessionStartedAt] = useState<string>(() => new Date().toISOString());

  // Finish Modal State
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [savingSession, setSavingSession] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data: StoredTimerData = JSON.parse(saved);
        setMode(data.mode);
        setPomodoroPhase(data.pomodoroPhase);
        setSessionStartedAt(data.sessionStartedAt || new Date().toISOString());

        const now = Date.now();
        const deltaSeconds = data.isRunning ? Math.max(0, Math.floor((now - data.lastTimestamp) / 1000)) : 0;

        if (data.mode === "pomodoro") {
          const nextSeconds = Math.max(0, data.secondsLeft - deltaSeconds);
          setSecondsLeft(nextSeconds);
          if (data.pomodoroPhase === "work") {
            const addedFocus = Math.min(deltaSeconds, data.secondsLeft);
            setTotalFocusSeconds((data.totalFocusSeconds || 0) + addedFocus);
          }
          if (nextSeconds === 0 && data.isRunning) {
            setIsRunning(false);
            playChime();
          } else {
            setIsRunning(data.isRunning);
          }
        } else {
          setStopwatchElapsed((data.stopwatchElapsed || 0) + deltaSeconds);
          setTotalFocusSeconds((data.totalFocusSeconds || 0) + deltaSeconds);
          setIsRunning(data.isRunning);
        }
      }
    } catch {
      // Ignore JSON error
    }
  }, []);

  // Save to localStorage whenever state changes
  const saveStateToStorage = useCallback(() => {
    try {
      const stateToStore: StoredTimerData = {
        mode,
        pomodoroPhase,
        secondsLeft,
        stopwatchElapsed,
        totalFocusSeconds,
        isRunning,
        lastTimestamp: Date.now(),
        sessionStartedAt,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToStore));
    } catch {
      // Ignore
    }
  }, [mode, pomodoroPhase, secondsLeft, stopwatchElapsed, totalFocusSeconds, isRunning, sessionStartedAt]);

  useEffect(() => {
    saveStateToStorage();
  }, [saveStateToStorage]);

  // Main interval loop
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        if (mode === "pomodoro") {
          setSecondsLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timerRef.current!);
              setIsRunning(false);
              playChime();
              return 0;
            }
            if (pomodoroPhase === "work") {
              setTotalFocusSeconds((tf) => tf + 1);
            }
            return prev - 1;
          });
        } else {
          setStopwatchElapsed((prev) => {
            const next = prev + 1;
            setTotalFocusSeconds((tf) => tf + 1);
            return next;
          });
        }
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, pomodoroPhase]);

  // Actions
  const handleStart = () => {
    if (!isRunning && totalFocusSeconds === 0) {
      setSessionStartedAt(new Date().toISOString());
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    if (mode === "pomodoro") {
      setSecondsLeft(pomodoroPhase === "work" ? POMODORO_WORK_SECONDS : POMODORO_BREAK_SECONDS);
    } else {
      setStopwatchElapsed(0);
    }
    setTotalFocusSeconds(0);
    setSessionStartedAt(new Date().toISOString());
    localStorage.removeItem(STORAGE_KEY);
  };

  const switchMode = (newMode: TimerMode) => {
    if (isRunning) {
      if (!window.confirm("El temporizador está activo. ¿Deseas cambiar de modo y reiniciar?")) return;
    }
    setIsRunning(false);
    setMode(newMode);
    if (newMode === "pomodoro") {
      setPomodoroPhase("work");
      setSecondsLeft(POMODORO_WORK_SECONDS);
    } else {
      setStopwatchElapsed(0);
    }
    setTotalFocusSeconds(0);
    setSessionStartedAt(new Date().toISOString());
  };

  const switchPomodoroPhase = (phase: PomodoroPhase) => {
    setIsRunning(false);
    setPomodoroPhase(phase);
    setSecondsLeft(phase === "work" ? POMODORO_WORK_SECONDS : POMODORO_BREAK_SECONDS);
  };

  // Open Finish Modal
  const handleOpenFinish = () => {
    setIsRunning(false);
    setShowFinishModal(true);
    setSaveErrorMessage(null);
  };

  // Submit Session to backend
  const handleRecordSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const durationMinutes = Math.max(1, Math.round(totalFocusSeconds / 60));

    try {
      setSavingSession(true);
      setSaveErrorMessage(null);

      const payload: RecordWorkSessionPayload = {
        projectId: selectedProjectId || undefined,
        taskId: selectedTaskId || undefined,
        startedAt: sessionStartedAt,
        endedAt: new Date().toISOString(),
        notes: notes.trim() || undefined,
      };

      const session = await LifeTrackerApiClient.recordWorkSession(payload);

      setSaveSuccessMessage(`¡Sesión de ${durationMinutes} min guardada con éxito!`);
      if (onSessionRecorded) {
        onSessionRecorded(session);
      }

      // Reset timer
      setTimeout(() => {
        setShowFinishModal(false);
        setSaveSuccessMessage(null);
        handleReset();
        setNotes("");
        setSelectedProjectId("");
        setSelectedTaskId("");
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar la sesión de Deep Work.";
      setSaveErrorMessage(msg);
    } finally {
      setSavingSession(false);
    }
  };

  // Time format helper (MM:SS)
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const currentTimeDisplay = mode === "pomodoro" ? formatTime(secondsLeft) : formatTime(stopwatchElapsed);
  const currentTotalFocusMinutes = Math.floor(totalFocusSeconds / 60);

  // Available tasks filtered by selected project in modal
  const filteredTasksForModal = selectedProjectId
    ? tasks.filter((t) => t.projectId === selectedProjectId && t.status !== "done")
    : tasks.filter((t) => t.status !== "done");

  return (
    <section className="bg-neutral-900/70 border border-neutral-800/90 rounded-2xl p-5 shadow-lg relative overflow-hidden backdrop-blur-sm">
      {/* Background glow when running */}
      {isRunning && (
        <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none animate-pulse" />
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left: Mode Switchers & Status */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Deep Work & Focus Timer
            </h2>
          </div>

          {/* Mode Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-neutral-950/80 rounded-xl border border-neutral-800 w-fit">
            <button
              type="button"
              onClick={() => switchMode("pomodoro")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                mode === "pomodoro"
                  ? "bg-neutral-800 text-white shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Pomodoro
            </button>
            <button
              type="button"
              onClick={() => switchMode("stopwatch")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                mode === "stopwatch"
                  ? "bg-neutral-800 text-white shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Cronómetro Libre
            </button>
          </div>

          {/* Pomodoro Work/Break Sub-tabs */}
          {mode === "pomodoro" && (
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => switchPomodoroPhase("work")}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                  pomodoroPhase === "work"
                    ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                    : "bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200"
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Enfoque (25 min)</span>
              </button>
              <button
                type="button"
                onClick={() => switchPomodoroPhase("break")}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                  pomodoroPhase === "break"
                    ? "bg-teal-500/15 text-teal-300 border-teal-500/30"
                    : "bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200"
                }`}
              >
                <Coffee className="w-3.5 h-3.5 text-teal-400" />
                <span>Descanso (5 min)</span>
              </button>
            </div>
          )}
        </div>

        {/* Center: Big Digital Display */}
        <div className="flex flex-col items-center justify-center">
          <div className="font-mono text-5xl sm:text-6xl font-black tracking-tight text-white select-none">
            {currentTimeDisplay}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-1">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Foco acumulado hoy en sesión: </span>
            <strong className="text-amber-300">{currentTotalFocusMinutes} min</strong>
          </div>
        </div>

        {/* Right: Big Touch Controls (>= 44x44px target) */}
        <div className="flex items-center gap-2.5 self-center md:self-auto flex-wrap justify-center">
          {!isRunning ? (
            <button
              type="button"
              onClick={handleStart}
              className="h-11 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Iniciar</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePause}
              className="h-11 px-5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-500/30 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm active:scale-95 transition"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>Pausar</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleReset}
            title="Reiniciar temporizador"
            className="w-11 h-11 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center border border-neutral-700/50 active:scale-95 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {totalFocusSeconds >= 30 && (
            <button
              type="button"
              onClick={handleOpenFinish}
              className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Finalizar Sesión</span>
            </button>
          )}
        </div>
      </div>

      {/* Modal de Finalización y Registro de Sesión */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-semibold text-white">
                  Registrar Sesión de Deep Work
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFinishModal(false)}
                aria-label="Cerrar modal"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRecordSession} className="p-6 space-y-4">
              {saveSuccessMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{saveSuccessMessage}</span>
                </div>
              )}

              {saveErrorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{saveErrorMessage}</span>
                </div>
              )}

              {/* Time stats summary */}
              <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-neutral-400">Tiempo total de foco registrado</span>
                  <div className="text-xl font-bold text-amber-400 font-mono">
                    {Math.max(1, Math.round(totalFocusSeconds / 60))} minutos
                  </div>
                </div>
                <div className="text-right text-xs text-neutral-500">
                  <span>Inició: </span>
                  <span className="text-neutral-300">
                    {new Date(sessionStartedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>

              {/* Project Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-neutral-400" />
                  Proyecto Asociado (Opcional)
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value);
                    setSelectedTaskId("");
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 text-sm focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="">(Ninguno / Foco General)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">
                  Tarea Específica (Opcional)
                </label>
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 text-sm focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="">(Sin vincular a tarea específica)</option>
                  {filteredTasksForModal.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reflective Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">
                  Notas reflexivas de la sesión
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="¿Qué avances lograste? ¿Hubo algún obstáculo o aprendizaje clave?"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm focus:outline-none focus:border-indigo-500 transition placeholder:text-neutral-600 resize-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowFinishModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
                >
                  Continuar Sesión
                </button>
                <button
                  type="submit"
                  disabled={savingSession}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition flex items-center gap-1.5"
                >
                  {savingSession ? "Guardando..." : "Guardar en Timeline"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
