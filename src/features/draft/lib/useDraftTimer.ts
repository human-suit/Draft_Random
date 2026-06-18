"use client";

import { useEffect, useState } from "react";

export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function useDraftTimer(deadline: number | null | undefined): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!deadline) {
      setSeconds(0);
      return;
    }

    const tick = () => {
      setSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return seconds;
}
