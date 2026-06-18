"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import DraftPanel from "@features/draft/ui/DraftPanel";
import {
  DraftState,
  applyPhase,
  generateInitialDraft,
  getCurrentPhase,
  getPickedHeroIds,
  isDraftComplete,
  pickRandomAvailableHero,
} from "@features/draft/model/draftLogic";
import type { Team } from "@features/draft/model/phases";
import {
  createDefaultReserveMs,
  DraftTimerMode,
  TeamReserveMs,
  WinnerTeam,
  SeriesScore,
} from "@entities/room/model/types";
import { getHeroById } from "@entities/hero/model/heroes";
import styles from "./draft.module.css";

const PICK_TIMER = 30;
const MAP_COUNT = 1;

function deductReserve(
  reserveMs: TeamReserveMs,
  team: Team,
  reserveStartedAt: number | null,
): TeamReserveMs {
  if (!reserveStartedAt) return reserveMs;
  const elapsed = Date.now() - reserveStartedAt;
  return {
    ...reserveMs,
    [team]: Math.max(0, reserveMs[team] - elapsed),
  };
}

export default function SoloDraftPanel() {
  const [draft, setDraft] = useState<DraftState>(generateInitialDraft);
  const [phaseDeadline, setPhaseDeadline] = useState<number | null>(() =>
    Date.now() + PICK_TIMER * 1000,
  );
  const [draftTimerMode, setDraftTimerMode] = useState<DraftTimerMode>("main");
  const [reserveMs, setReserveMs] = useState<TeamReserveMs>(
    createDefaultReserveMs,
  );
  const [reserveStartedAt, setReserveStartedAt] = useState<number | null>(
    null,
  );
  const [currentMap, setCurrentMap] = useState(1);
  const [usedHeroIds, setUsedHeroIds] = useState<number[]>([]);
  const [score, setScore] = useState<SeriesScore>({ radiant: 0, dire: 0 });
  const [seriesFinished, setSeriesFinished] = useState(false);

  const draftRef = useRef(draft);
  const timerRef = useRef({
    draftTimerMode,
    reserveMs,
    reserveStartedAt,
  });

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    timerRef.current = { draftTimerMode, reserveMs, reserveStartedAt };
  }, [draftTimerMode, reserveMs, reserveStartedAt]);

  const resetMainTimer = useCallback(() => {
    setDraftTimerMode("main");
    setReserveStartedAt(null);
    setPhaseDeadline(Date.now() + PICK_TIMER * 1000);
  }, []);

  const handlePickBan = (heroId: number) => {
    const hero = getHeroById(heroId);
    if (!hero) return;

    const prev = draftRef.current;
    const phase = getCurrentPhase(prev);
    if (!phase) return;

    const { draftTimerMode: mode, reserveStartedAt: started } =
      timerRef.current;

    if (mode === "reserve") {
      setReserveMs((current) =>
        deductReserve(current, phase.team, started),
      );
    }

    const next = applyPhase(prev, hero);
    setDraft(next);

    if (!isDraftComplete(next)) {
      resetMainTimer();
    } else {
      setPhaseDeadline(null);
      setDraftTimerMode("main");
      setReserveStartedAt(null);
    }
  };

  useEffect(() => {
    if (!phaseDeadline) return;

    const id = setInterval(() => {
      if (Date.now() < phaseDeadline) return;

      const prev = draftRef.current;
      const phase = getCurrentPhase(prev);
      if (!phase || isDraftComplete(prev)) return;

      const { draftTimerMode: mode, reserveMs: reserve } = timerRef.current;

      if (mode === "main" && reserve[phase.team] > 0) {
        const now = Date.now();
        setDraftTimerMode("reserve");
        setReserveStartedAt(now);
        setPhaseDeadline(now + reserve[phase.team]);
        return;
      }

      const hero = pickRandomAvailableHero(prev);
      if (!hero) return;

      if (mode === "reserve") {
        setReserveMs((current) =>
          deductReserve(current, phase.team, timerRef.current.reserveStartedAt),
        );
      } else {
        setReserveMs((current) => ({ ...current, [phase.team]: 0 }));
      }

      const next = applyPhase(prev, hero);
      setDraft(next);
      setDraftTimerMode("main");
      setReserveStartedAt(null);

      if (!isDraftComplete(next)) {
        setPhaseDeadline(Date.now() + PICK_TIMER * 1000);
      } else {
        setPhaseDeadline(null);
      }
    }, 200);

    return () => clearInterval(id);
  }, [phaseDeadline]);

  const handleRecordWinner = (winner: WinnerTeam) => {
    setScore((prev) => ({
      ...prev,
      radiant: prev.radiant + (winner === "RADIANT" ? 1 : 0),
      dire: prev.dire + (winner === "DIRE" ? 1 : 0),
    }));

    const picked = getPickedHeroIds(draft);
    const nextUsed = [...usedHeroIds, ...picked];

    if (currentMap >= MAP_COUNT) {
      setSeriesFinished(true);
      setUsedHeroIds(nextUsed);
      return;
    }

    setUsedHeroIds(nextUsed);
    setCurrentMap((m) => m + 1);
    setDraft(generateInitialDraft(nextUsed));
    setReserveMs(createDefaultReserveMs());
    setDraftTimerMode("main");
    setReserveStartedAt(null);
    setPhaseDeadline(Date.now() + PICK_TIMER * 1000);
  };

  const handleReset = () => {
    setDraft(generateInitialDraft());
    setPhaseDeadline(Date.now() + PICK_TIMER * 1000);
    setDraftTimerMode("main");
    setReserveMs(createDefaultReserveMs());
    setReserveStartedAt(null);
    setCurrentMap(1);
    setUsedHeroIds([]);
    setScore({ radiant: 0, dire: 0 });
    setSeriesFinished(false);
  };

  return (
    <div>
      <div className={styles.soloToolbar}>
        <span className={styles.soloBadge}>Тестовый режим</span>
        <button type="button" className={styles.resetBtn} onClick={handleReset}>
          Новый пул героев
        </button>
      </div>
      <DraftPanel
        draft={draft}
        onPickBan={handlePickBan}
        soloMode
        isHost
        phaseDeadline={phaseDeadline}
        pickTimerSeconds={PICK_TIMER}
        draftTimerMode={draftTimerMode}
        reserveMs={reserveMs}
        currentMap={currentMap}
        mapCount={MAP_COUNT}
        seriesFinished={seriesFinished}
        score={score}
        onRecordWinner={handleRecordWinner}
      />
    </div>
  );
}
