"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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
  AlertCircle,
  Settings2,
  Award,
  SlidersHorizontal
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

export interface PomodoroSettings {
  workMinutes: number;
  breakMinutes: number;
  targetBlocks: number;
}

const STORAGE_KEY = "lt_deep_work_timer";
const SETTINGS_KEY = "lt_pomodoro_settings";
const DEFAULT_SETTINGS: PomodoroSettings = {
  workMinutes: 25,
  breakMinutes: 5,
  targetBlocks: 4,
};

interface StoredTimerData {
  mode: TimerMode;
  pomodoroPhase: PomodoroPhase;
  secondsLeft: number;
  stopwatchElapsed: number;
  totalFocusSeconds: number;
  isRunning: boolean;
  lastTimestamp: number;
  sessionStartedAt: string;
  currentBlock?: number;
  completedBlocks?: number;
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
  // Client mount check for portal
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Pomodoro Settings
  const [pomodoroSettings, setPomodoroSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingWorkMins, setSettingWorkMins] = useState(DEFAULT_SETTINGS.workMinutes);
  const [settingBreakMins, setSettingBreakMins] = useState(DEFAULT_SETTINGS.breakMinutes);
  const [settingBlocks, setSettingBlocks] = useState(DEFAULT_SETTINGS.targetBlocks);
  const [savedSettingsNotice, setSavedSettingsNotice] = useState<string | null>(null);

  // Blocks tracking
  const [currentBlock, setCurrentBlock] = useState<number>(1);
  const [completedBlocks, setCompletedBlocks] = useState<number>(0);
  const [goalReached, setGoalReached] = useState<boolean>(false);

  // Timer State
  const [mode, setMode] = useState<TimerMode>("pomodoro");
  const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>("work");
  const [secondsLeft, setSecondsLeft] = useState<number>(DEFAULT_SETTINGS.workMinutes * 60);
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

  // Load settings & timer state from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(SETTINGS_KEY);
      let loadedSettings = DEFAULT_SETTINGS;
      if (savedSettings) {
        loadedSettings = JSON.parse(savedSettings);
        setPomodoroSettings(loadedSettings);
        setSettingWorkMins(loadedSettings.workMinutes);
        setSettingBreakMins(loadedSettings.breakMinutes);
        setSettingBlocks(loadedSettings.targetBlocks);
      }

      const savedTimer = localStorage.getItem(STORAGE_KEY);
      if (savedTimer) {
        const data: StoredTimerData = JSON.parse(savedTimer);
        setMode(data.mode);
        setPomodoroPhase(data.pomodoroPhase);
        setSessionStartedAt(data.sessionStartedAt || new Date().toISOString());
        if (typeof data.currentBlock === "number") setCurrentBlock(data.currentBlock);
        if (typeof data.completedBlocks === "number") setCompletedBlocks(data.completedBlocks);

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
      } else {
        setSecondsLeft(loadedSettings.workMinutes * 60);
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
        currentBlock,
        completedBlocks,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToStore));
    } catch {
      // Ignore
    }
  }, [mode, pomodoroPhase, secondsLeft, stopwatchElapsed, totalFocusSeconds, isRunning, sessionStartedAt, currentBlock, completedBlocks]);

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
              playChime();

              if (pomodoroPhase === "work") {
                setTotalFocusSeconds((tf) => tf + 1);
                setCompletedBlocks((cb) => {
                  const nextCompleted = cb + 1;
                  if (nextCompleted >= pomodoroSettings.targetBlocks) {
                    setGoalReached(true);
                  }
                  return nextCompleted;
                });
                // Switch to Break
                setPomodoroPhase("break");
                return pomodoroSettings.breakMinutes * 60;
              } else {
                // Break ended -> next work block
                setCurrentBlock((b) => Math.min(pomodoroSettings.targetBlocks, b + 1));
                setPomodoroPhase("work");
                return pomodoroSettings.workMinutes * 60;
              }
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
  }, [isRunning, mode, pomodoroPhase, pomodoroSettings]);

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
      setSecondsLeft(pomodoroPhase === "work" ? pomodoroSettings.workMinutes * 60 : pomodoroSettings.breakMinutes * 60);
    } else {
      setStopwatchElapsed(0);
    }
    setTotalFocusSeconds(0);
    setSessionStartedAt(new Date().toISOString());
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleResetBlocks = () => {
    setCurrentBlock(1);
    setCompletedBlocks(0);
    setGoalReached(false);
  };

  const switchMode = (newMode: TimerMode) => {
    if (isRunning) {
      if (!window.confirm("El temporizador está activo. ¿Deseas cambiar de modo y reiniciar?")) return;
    }
    setIsRunning(false);
    setMode(newMode);
    if (newMode === "pomodoro") {
      setPomodoroPhase("work");
      setSecondsLeft(pomodoroSettings.workMinutes * 60);
    } else {
      setStopwatchElapsed(0);
    }
    setTotalFocusSeconds(0);
    setSessionStartedAt(new Date().toISOString());
  };

  const switchPomodoroPhase = (phase: PomodoroPhase) => {
    setIsRunning(false);
    setPomodoroPhase(phase);
    setSecondsLeft(phase === "work" ? pomodoroSettings.workMinutes * 60 : pomodoroSettings.breakMinutes * 60);
  };

  // Save Pomodoro Settings
  const handleApplySettings = (work: number, brk: number, blocks: number) => {
    const validWork = Math.max(1, Math.min(120, work));
    const validBreak = Math.max(1, Math.min(60, brk));
    const validBlocks = Math.max(1, Math.min(12, blocks));

    const updated: PomodoroSettings = {
      workMinutes: validWork,
      breakMinutes: validBreak,
      targetBlocks: validBlocks,
    };

    setPomodoroSettings(updated);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }

    if (!isRunning && mode === "pomodoro") {
      setSecondsLeft(pomodoroPhase === "work" ? validWork * 60 : validBreak * 60);
    }

    setShowSettingsModal(false);
    setSavedSettingsNotice(`Ajustes guardados (${validWork}m foco • ${validBreak}m descanso • ${validBlocks} blq)`);
    setTimeout(() => setSavedSettingsNotice(null), 3500);
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

          {/* Mode Tabs & Pomodoro Config Button */}
          <div className="flex items-center gap-2 flex-wrap">
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

            {mode === "pomodoro" && (
              <>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal((prev) => !prev)}
                  title="Configurar minutos y bloques de Pomodoro"
                  className={`p-2 rounded-xl border transition flex items-center gap-1.5 text-xs ${
                    showSettingsModal
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm"
                      : "bg-neutral-950/80 hover:bg-neutral-800 border-neutral-800 text-neutral-400 hover:text-amber-400"
                  }`}
                >
                  <Settings2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-medium">
                    {showSettingsModal ? "Ocultar Ajustes" : "Ajustes"}
                  </span>
                </button>

                {savedSettingsNotice && (
                  <span className="text-[11px] font-medium text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-xl animate-in fade-in flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>{savedSettingsNotice}</span>
                  </span>
                )}
              </>
            )}
          </div>

          {/* Pomodoro Work/Break Sub-tabs & Block Tracker */}
          {mode === "pomodoro" && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
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
                  <span>Enfoque ({pomodoroSettings.workMinutes}m)</span>
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
                  <span>Descanso ({pomodoroSettings.breakMinutes}m)</span>
                </button>
              </div>

              {/* Block Progress Indicators */}
              <div className="flex items-center gap-2 pt-0.5">
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: pomodoroSettings.targetBlocks }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full transition-all ${
                        i < completedBlocks
                          ? "bg-emerald-400 ring-2 ring-emerald-500/30 shadow-sm shadow-emerald-500/50"
                          : i === currentBlock - 1 && isRunning && pomodoroPhase === "work"
                          ? "bg-amber-400 animate-pulse ring-2 ring-amber-400/40"
                          : "bg-neutral-800 border border-neutral-700"
                      }`}
                      title={`Bloque ${i + 1} de ${pomodoroSettings.targetBlocks}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                  <span className="font-semibold text-neutral-200">
                    Bloque {Math.min(currentBlock, pomodoroSettings.targetBlocks)}/{pomodoroSettings.targetBlocks}
                  </span>
                  <span>•</span>
                  <span>{completedBlocks} hechos</span>
                  {completedBlocks > 0 && (
                    <button
                      type="button"
                      onClick={handleResetBlocks}
                      title="Reiniciar conteo de bloques"
                      className="text-[10px] text-neutral-500 hover:text-neutral-300 underline ml-1"
                    >
                      reiniciar
                    </button>
                  )}
                </div>
              </div>

              {/* Goal Reached Banner */}
              {goalReached && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs animate-in fade-in">
                  <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>¡Objetivo de {pomodoroSettings.targetBlocks} bloques alcanzado! 🎉</span>
                </div>
              )}
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

      {/* Panel de Configuración de Pomodoro Integrado */}
      {showSettingsModal && (
        <div className="mt-5 pt-5 border-t border-neutral-800 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-neutral-950/80 border border-neutral-800/90 rounded-2xl p-4 sm:p-5 space-y-5">
            {/* Header del panel */}
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">
                  Personalizar Pomodoro
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                aria-label="Cerrar ajustes"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition text-xs flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                <span className="text-[11px]">Cerrar</span>
              </button>
            </div>

            {/* Presets Rápidos */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-400">
                Presets recomendados (1-clic)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSettingWorkMins(25);
                    setSettingBreakMins(5);
                    setSettingBlocks(4);
                  }}
                  className={`p-3 rounded-xl border text-left transition ${
                    settingWorkMins === 25 && settingBreakMins === 5 && settingBlocks === 4
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-300 ring-1 ring-amber-500/30"
                      : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800/60"
                  }`}
                >
                  <div className="font-semibold text-xs text-white">Clásico</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">25m foco • 5m descanso • 4 bloques</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSettingWorkMins(50);
                    setSettingBreakMins(10);
                    setSettingBlocks(3);
                  }}
                  className={`p-3 rounded-xl border text-left transition ${
                    settingWorkMins === 50 && settingBreakMins === 10 && settingBlocks === 3
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-300 ring-1 ring-amber-500/30"
                      : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800/60"
                  }`}
                >
                  <div className="font-semibold text-xs text-white">Deep Focus</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">50m foco • 10m descanso • 3 bloques</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSettingWorkMins(15);
                    setSettingBreakMins(3);
                    setSettingBlocks(6);
                  }}
                  className={`p-3 rounded-xl border text-left transition ${
                    settingWorkMins === 15 && settingBreakMins === 3 && settingBlocks === 6
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-300 ring-1 ring-amber-500/30"
                      : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800/60"
                  }`}
                >
                  <div className="font-semibold text-xs text-white">Sprint Ágil</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">15m foco • 3m descanso • 6 bloques</div>
                </button>
              </div>
            </div>

            {/* Controles de Minutos y Bloques */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-neutral-800/80">
              {/* Minutos de Trabajo */}
              <div className="p-3.5 rounded-xl bg-neutral-900/70 border border-neutral-800/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    Foco / Trabajo
                  </span>
                  <span className="font-bold text-amber-400 font-mono text-sm">{settingWorkMins} min</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="90"
                  step="5"
                  value={settingWorkMins}
                  onChange={(e) => setSettingWorkMins(Number(e.target.value))}
                  className="w-full accent-amber-500 bg-neutral-950 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between items-center text-[10px] text-neutral-500">
                  <span>5m</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setSettingWorkMins((v) => Math.max(5, v - 5))}
                      className="px-2 py-0.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono"
                    >-5m</button>
                    <button
                      type="button"
                      onClick={() => setSettingWorkMins((v) => Math.min(90, v + 5))}
                      className="px-2 py-0.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono"
                    >+5m</button>
                  </div>
                  <span>90m</span>
                </div>
              </div>

              {/* Minutos de Descanso */}
              <div className="p-3.5 rounded-xl bg-neutral-900/70 border border-neutral-800/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                    <Coffee className="w-3.5 h-3.5 text-teal-400" />
                    Descanso
                  </span>
                  <span className="font-bold text-teal-400 font-mono text-sm">{settingBreakMins} min</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={settingBreakMins}
                  onChange={(e) => setSettingBreakMins(Number(e.target.value))}
                  className="w-full accent-teal-500 bg-neutral-950 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between items-center text-[10px] text-neutral-500">
                  <span>1m</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setSettingBreakMins((v) => Math.max(1, v - 1))}
                      className="px-2 py-0.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono"
                    >-1m</button>
                    <button
                      type="button"
                      onClick={() => setSettingBreakMins((v) => Math.min(30, v + 1))}
                      className="px-2 py-0.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono"
                    >+1m</button>
                  </div>
                  <span>30m</span>
                </div>
              </div>

              {/* Cantidad de Bloques */}
              <div className="p-3.5 rounded-xl bg-neutral-900/70 border border-neutral-800/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    Meta de Bloques
                  </span>
                  <span className="font-bold text-indigo-400 font-mono text-sm">{settingBlocks} bloques</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={settingBlocks}
                  onChange={(e) => setSettingBlocks(Number(e.target.value))}
                  className="w-full accent-indigo-500 bg-neutral-950 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between items-center text-[10px] text-neutral-500">
                  <span>1</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setSettingBlocks((v) => Math.max(1, v - 1))}
                      className="px-2 py-0.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono"
                    >-1</button>
                    <button
                      type="button"
                      onClick={() => setSettingBlocks((v) => Math.min(10, v + 1))}
                      className="px-2 py-0.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono"
                    >+1</button>
                  </div>
                  <span>10</span>
                </div>
              </div>
            </div>

            {/* Footer con Botón Guardar Ajustes */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-neutral-800">
              <span className="text-[11px] text-neutral-400">
                Se guardará para todas tus sesiones futuras en este dispositivo.
              </span>
              <div className="flex items-center gap-2.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleApplySettings(settingWorkMins, settingBreakMins, settingBlocks)}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-lg shadow-amber-500/20 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Guardar Ajustes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Finalización y Registro de Sesión renderizado via Portal para que nunca se corte */}
      {mounted && showFinishModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
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
        </div>,
        document.body
      )}
    </section>
  );
}
