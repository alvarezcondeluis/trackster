/**
 * Hook for 30-second countdown timer
 * Pausing keeps the time, doesn't reset it
 */

import { useEffect, useState, useRef } from "react";

export function useTimer(
  isActive: boolean,
  duration: number = 30,
  onComplete?: () => void,
) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(isActive);
  const hasStartedRef = useRef(false);

  // Only reset when isActive becomes true (song starts playing)
  useEffect(() => {
    if (isActive && !hasStartedRef.current) {
      setTimeLeft(duration);
      setIsRunning(true);
      hasStartedRef.current = true;
    } else if (!isActive && hasStartedRef.current) {
      // Pausing - just stop the timer, don't reset time
      setIsRunning(false);
    }
  }, [isActive, duration]);

  // Timer countdown
  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, onComplete]);

  return {
    timeLeft,
    isRunning,
    pause: () => setIsRunning(false),
    resume: () => setIsRunning(true),
    reset: () => {
      setTimeLeft(duration);
      setIsRunning(true);
      hasStartedRef.current = true;
    },
  };
}
