"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  LifeTrackerApiClient,
  type WorkoutSession,
  type WorkoutSet,
} from "@/lib/api-client";

export function useLiveWorkout(onSetCompleted?: (restSeconds: number) => void) {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // General session timer (elapsed seconds)
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const fetchActiveSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const active = await LifeTrackerApiClient.getActiveWorkoutSession();
      setSession(active);

      if (active) {
        const start = new Date(active.startedAt).getTime();
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar la sesión activa.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveSession();
  }, [fetchActiveSession]);

  // General workout stopwatch
  useEffect(() => {
    if (!session || session.status !== "active") return;

    const interval = setInterval(() => {
      const start = new Date(session.startedAt).getTime();
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const startSession = async (name: string, routineId?: string) => {
    try {
      setSaving(true);
      const newSession = await LifeTrackerApiClient.startWorkoutSession({ name, routineId });
      setSession(newSession);
      const start = new Date(newSession.startedAt).getTime();
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
      return newSession;
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : "Error al iniciar el entrenamiento.");
    } finally {
      setSaving(false);
    }
  };

  const addSet = async (
    exerciseId: string,
    setOrder: number,
    setType: WorkoutSet["setType"] = "normal",
    weightKg: number = 0,
    reps: number = 10
  ) => {
    if (!session) return;
    try {
      setSaving(true);
      const newSet = await LifeTrackerApiClient.logWorkoutSet(session.id, {
        exerciseId,
        setOrder,
        setType,
        weightKg,
        reps,
        isCompleted: false,
      });

      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sets: [...prev.sets, newSet],
        };
      });
      return newSet;
    } finally {
      setSaving(false);
    }
  };

  const updateSet = async (
    setId: string,
    data: {
      setType: WorkoutSet["setType"];
      weightKg: number;
      reps: number;
      rpe?: number | null;
      rir?: number | null;
      isCompleted: boolean;
    },
    suggestedRestSeconds: number = 90
  ) => {
    if (!session) return;
    const previousSet = session.sets.find((s) => s.id === setId);
    const wasCompleted = previousSet?.isCompleted ?? false;

    // Optimistic UI update
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sets: prev.sets.map((s) =>
          s.id === setId
            ? {
                ...s,
                ...data,
                completedAt: data.isCompleted ? new Date().toISOString() : null,
              }
            : s
        ),
      };
    });

    try {
      const updated = await LifeTrackerApiClient.updateWorkoutSet(session.id, setId, data);

      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sets: prev.sets.map((s) => (s.id === setId ? updated : s)),
        };
      });

      // Trigger rest timer only on transitioning from incomplete to completed
      if (!wasCompleted && data.isCompleted) {
        onSetCompleted?.(suggestedRestSeconds);
      }

      return updated;
    } catch (err) {
      // Revert on error
      await fetchActiveSession();
      throw err;
    }
  };

  const deleteSet = async (setId: string) => {
    if (!session) return;
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sets: prev.sets.filter((s) => s.id !== setId),
      };
    });

    try {
      await LifeTrackerApiClient.deleteWorkoutSet(session.id, setId);
    } catch {
      await fetchActiveSession();
    }
  };

  const completeSession = async (notes?: string) => {
    if (!session) return;
    try {
      setSaving(true);
      const completed = await LifeTrackerApiClient.completeWorkoutSession(session.id, { notes });
      setSession(null);
      return completed;
    } finally {
      setSaving(false);
    }
  };

  const discardSession = async () => {
    if (!session) return;
    try {
      setSaving(true);
      await LifeTrackerApiClient.discardWorkoutSession(session.id);
      setSession(null);
    } finally {
      setSaving(false);
    }
  };

  return {
    session,
    loading,
    error,
    saving,
    elapsedSeconds,
    startSession,
    addSet,
    updateSet,
    deleteSet,
    completeSession,
    discardSession,
    refreshSession: fetchActiveSession,
  };
}
