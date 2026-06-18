"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import DotaLoader from "./DotaLoader";

interface LoadingContextValue {
  showLoader: (message?: string) => void;
  hideLoader: () => void;
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

const MIN_VISIBLE_MS = 650;

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const [message, setMessage] = useState("Подготовка арены");
  const shownAtRef = useRef(Date.now());
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualLockRef = useRef(false);
  const isFirstPathRef = useRef(true);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const reveal = useCallback(
    (nextMessage?: string) => {
      clearHideTimer();
      if (nextMessage) setMessage(nextMessage);
      shownAtRef.current = Date.now();
      setVisible(true);
    },
    [clearHideTimer],
  );

  const scheduleHide = useCallback(() => {
    if (manualLockRef.current) return;

    clearHideTimer();
    const elapsed = Date.now() - shownAtRef.current;
    const delay = Math.max(0, MIN_VISIBLE_MS - elapsed);

    hideTimerRef.current = setTimeout(() => {
      if (!manualLockRef.current) {
        setVisible(false);
      }
    }, delay);
  }, [clearHideTimer]);

  const showLoader = useCallback(
    (nextMessage?: string) => {
      manualLockRef.current = true;
      reveal(nextMessage);
    },
    [reveal],
  );

  const hideLoader = useCallback(() => {
    manualLockRef.current = false;
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    if (isFirstPathRef.current) {
      isFirstPathRef.current = false;
      scheduleHide();
      return;
    }

    if (!manualLockRef.current) {
      reveal("Переход...");
    }
    scheduleHide();
  }, [pathname, reveal, scheduleHide]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor || anchor.target === "_blank") return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http")) return;
      if (href === pathname) return;

      if (!manualLockRef.current) {
        reveal("Переход...");
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname, reveal]);

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  return (
    <LoadingContext.Provider value={{ showLoader, hideLoader }}>
      {children}
      {visible && <DotaLoader message={message} />}
    </LoadingContext.Provider>
  );
}

export function useLoadingOverlay() {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error("useLoadingOverlay must be used within LoadingProvider");
  }
  return ctx;
}
