"use client";

import {
  DraftState,
  getCurrentPhase,
  isDraftComplete,
} from "../model/draftLogic";
import { PlayerRole, SeriesScore, WinnerTeam } from "@entities/room/model/types";
import type { DraftTimerMode, TeamReserveMs } from "@entities/room/model/types";
import { createDefaultReserveMs } from "@entities/room/model/types";
import { useDraftTimer, formatTimer } from "../lib/useDraftTimer";
import HeroPoolBoard from "./HeroPoolBoard";
import DraftTimeline from "./DraftTimeline";
import ScoreBar from "./ScoreBar";
import MapResultPanel from "./MapResultPanel";
import styles from "./draft-board.module.css";

interface Props {
  draft: DraftState;
  playerRole?: PlayerRole;
  onPickBan?: (heroId: number) => void;
  readOnly?: boolean;
  soloMode?: boolean;
  radiantName?: string;
  direName?: string;
  phaseDeadline?: number | null;
  pickTimerSeconds?: number;
  draftTimerMode?: DraftTimerMode;
  reserveMs?: TeamReserveMs;
  currentMap?: number;
  mapCount?: number;
  seriesFinished?: boolean;
  score?: SeriesScore;
  isHost?: boolean;
  onRecordWinner?: (winner: WinnerTeam) => void;
}

function canPlayerAct(role: PlayerRole | undefined, draft: DraftState): boolean {
  const phase = getCurrentPhase(draft);
  if (!phase || !role) return false;
  if (role === "captain_radiant") return phase.team === "RADIANT";
  if (role === "captain_dire") return phase.team === "DIRE";
  return false;
}

export default function DraftPanel({
  draft,
  playerRole,
  onPickBan,
  readOnly = false,
  soloMode = false,
  radiantName = "RADIANT",
  direName = "DIRE",
  phaseDeadline = null,
  pickTimerSeconds = 30,
  draftTimerMode = "main",
  reserveMs = createDefaultReserveMs(),
  currentMap = 1,
  mapCount = 1,
  seriesFinished = false,
  score = { radiant: 0, dire: 0 },
  isHost = false,
  onRecordWinner,
}: Props) {
  const phase = getCurrentPhase(draft);
  const complete = isDraftComplete(draft);
  const showMapResult = complete && !seriesFinished;
  const canPickWinner = Boolean(onRecordWinner) && (isHost || soloMode);

  const timerSeconds = useDraftTimer(
    complete || pickTimerSeconds === 0 ? null : phaseDeadline,
  );

  const canAct =
    !readOnly &&
    !complete &&
    (soloMode ||
      playerRole === undefined ||
      canPlayerAct(playerRole, draft));

  const takenIds = new Set([
    ...draft.radiant.map((h) => h.id),
    ...draft.dire.map((h) => h.id),
  ]);
  const bannedIds = new Set(draft.banned.map((h) => h.id));

  const isBan = phase?.type === "BAN";
  const phaseLabel = showMapResult
    ? `Карта ${currentMap} — выберите победителя`
    : seriesFinished
      ? "Серия завершена"
      : phase
        ? `${phase.team === "RADIANT" ? radiantName : direName} — ${isBan ? "БАН" : "ПИК"}`
        : "CAPTAINS DRAFT";

  const handleSelect = (heroId: number) => {
    if (!canAct || !onPickBan) return;
    if (bannedIds.has(heroId) || takenIds.has(heroId)) return;
    onPickBan(heroId);
  };

  return (
    <div className={styles.board}>
      <header className={styles.boardHeader}>
        <div className={styles.headerTeam}>
          <span className={styles.teamRadiant}>{radiantName}</span>
          <span className={styles.reserveBank}>
            Доп: {formatTimer(Math.ceil(reserveMs.RADIANT / 1000))}
          </span>
        </div>
        <div className={styles.headerCenter}>
          {!complete && pickTimerSeconds > 0 && (
            <>
              {draftTimerMode === "reserve" && (
                <p className={styles.reserveLabel}>Доп. время</p>
              )}
              <div
                className={`${styles.timer} ${timerSeconds <= 5 ? styles.timerUrgent : ""} ${draftTimerMode === "reserve" ? styles.timerReserve : ""}`}
              >
                {formatTimer(timerSeconds)}
              </div>
            </>
          )}
          <h2 className={styles.draftTitle}>CAPTAINS DRAFT</h2>
          {mapCount > 1 && (
            <p className={styles.mapLabel}>
              Карта {currentMap} / {mapCount}
              {currentMap > 1 && !showMapResult && !seriesFinished && (
                <span className={styles.sideSwapHint}>
                  {" "}· стороны поменялись
                </span>
              )}
            </p>
          )}
          <p
            className={`${styles.phaseLabel} ${showMapResult ? styles.phasePickText : ""} ${!showMapResult && isBan ? styles.phaseBanText : ""} ${!showMapResult && phase && !isBan ? styles.phasePickText : ""}`}
          >
            {phaseLabel}
          </p>
          {canAct && (
            <p className={styles.turnHint}>Выберите героя из пула</p>
          )}
        </div>
        <div className={styles.headerTeam}>
          <span className={styles.teamDire}>{direName}</span>
          <span className={styles.reserveBank}>
            Доп: {formatTimer(Math.ceil(reserveMs.DIRE / 1000))}
          </span>
        </div>
      </header>

      {soloMode && !showMapResult && !seriesFinished && (
        <p className={styles.soloBanner}>
          Тестовый режим — управляете обеими командами
        </p>
      )}

      <div className={styles.boardBody}>
        <div className={styles.poolArea}>
          {seriesFinished ? (
            <div className={styles.completeMsg}>Серия завершена</div>
          ) : showMapResult ? (
            <div className={styles.completeMsg}>Драфт карты завершён</div>
          ) : (
            <HeroPoolBoard
              pool={draft.pool}
              takenIds={takenIds}
              bannedIds={bannedIds}
              canAct={canAct}
              onSelect={handleSelect}
            />
          )}
        </div>

        <DraftTimeline
          draft={draft}
          radiantName={radiantName}
          direName={direName}
          currentMap={currentMap}
          mapCount={mapCount}
        />
      </div>

      {showMapResult && (
        <MapResultPanel
          radiantName={radiantName}
          direName={direName}
          currentMap={currentMap}
          mapCount={mapCount}
          canPickWinner={canPickWinner}
          onRecordWinner={onRecordWinner}
        />
      )}

      <ScoreBar
        score={score}
        radiantName={radiantName}
        direName={direName}
      />
    </div>
  );
}
