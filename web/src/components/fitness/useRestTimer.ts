"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface RestTimerState {
  isRunning: boolean;
  remainingSeconds: number;
  totalSeconds: number;
  startTimer: (seconds: number) => void;
  addSeconds: (additional?: number) => void;
  stopTimer: () => void;
}

export function useRestTimer(): RestTimerState {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [totalSeconds, setTotalSeconds] = useState<number>(0);

  const targetEndUtcRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play synthetic pleasant beep using Web Audio API
  const playAlertSound = useCallback(() => {
    try {
      if (typeof window === "undefined") return;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current || audioCtxRef.current.state === "suspended") {
        audioCtxRef.current = new AudioCtx();
      }

      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;

      // Double beep at 880Hz (A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, now + 0.16);
      gain2.gain.setValueAtTime(0.2, now + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.16);
      osc2.stop(now + 0.3);
    } catch {
      // Audio playback allowed to fail silently
    }
  }, []);

  // Trigger haptic vibration if supported
  const triggerHaptic = useCallback(() => {
    if (typeof window !== "undefined" && "navigator" in window && "vibrate" in navigator) {
      try {
        navigator.vibrate([80, 40, 80]);
      } catch {
        // Ignore
      }
    }
  }, []);

  const startTimer = useCallback((seconds: number) => {
    if (seconds <= 0) return;
    const now = Date.now();
    targetEndUtcRef.current = now + seconds * 1000;
    setTotalSeconds(seconds);
    setRemainingSeconds(seconds);
    setIsRunning(true);
  }, []);

  const addSeconds = useCallback((additional: number = 30) => {
    if (!targetEndUtcRef.current || !isRunning) return;
    targetEndUtcRef.current += additional * 1000;
    const remaining = Math.max(0, Math.ceil((targetEndUtcRef.current - Date.now()) / 1000));
    setRemainingSeconds(remaining);
    setTotalSeconds((prev) => prev + additional);
  }, [isRunning]);

  const stopTimer = useCallback(() => {
    targetEndUtcRef.current = null;
    setIsRunning(false);
    setRemainingSeconds(0);
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      if (!targetEndUtcRef.current) {
        setIsRunning(false);
        return;
      }

      const diff = Math.ceil((targetEndUtcRef.current - Date.now()) / 1000);

      if (diff <= 0) {
        setIsRunning(false);
        setRemainingSeconds(0);
        targetEndUtcRef.current = null;
        playAlertSound();
        triggerHaptic();
      } else {
        setRemainingSeconds(diff);
      }
    }, 250); // High-frequency check to compensate for tab throttle

    return () => clearInterval(interval);
  }, [isRunning, playAlertSound, triggerHaptic]);

  return {
    isRunning,
    remainingSeconds,
    totalSeconds,
    startTimer,
    addSeconds,
    stopTimer,
  };
}
