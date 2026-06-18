"use client";

import { useState } from "react";
import { Room, ChatMessage, isPlayerChatMuted } from "@entities/room/model/types";
import { createDefaultReserveMs } from "@entities/room/model/types";
import { CaptainRole, PlayerRole } from "@entities/room/model/types";
import { areCaptainsGameReady, areCaptainsReady, getCaptainByTeam } from "@entities/room/model/types";
import { getStatusLabel } from "../lib/roomLabels";
import PlayerList from "./PlayerList";
import RoomChat from "./RoomChat";
import RoomSettingsPanel from "./RoomSettingsPanel";
import DraftPanel from "@features/draft/ui/DraftPanel";
import { isDraftComplete } from "@features/draft/model/draftLogic";
import styles from "./room.module.css";

interface Props {
  room: Room;
  playerId: string;
  onKick: (targetId: string) => Promise<void>;
  onAssignRole: (targetId: string, role: PlayerRole) => Promise<void>;
  onClaimCaptain: (role: CaptainRole) => Promise<void>;
  onReleaseCaptain: () => Promise<void>;
  onSetReady: (ready: boolean) => Promise<void>;
  onUpdateSettings: (settings: Partial<Room["settings"]>) => Promise<void>;
  onStartDraft: () => Promise<void>;
  onLeave: () => void;
  onDeleteLobby: () => Promise<void>;
  onDraftAction: (heroId: number) => Promise<void>;
  onRecordWinner: (winner: import("@entities/room/model/types").WinnerTeam) => Promise<void>;
  chatMessages: ChatMessage[];
  onSendChat: (text: string) => Promise<void>;
  onToggleChatMute: (playerId: string, muted: boolean) => Promise<void>;
}

export default function RoomView({
  room,
  playerId,
  onKick,
  onAssignRole,
  onClaimCaptain,
  onReleaseCaptain,
  onSetReady,
  onUpdateSettings,
  onStartDraft,
  onLeave,
  onDeleteLobby,
  onDraftAction,
  onRecordWinner,
  chatMessages,
  onSendChat,
  onToggleChatMute,
}: Props) {
  const [starting, setStarting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isHost = room.hostId === playerId;
  const currentPlayer = room.players.find((p) => p.id === playerId);
  const radiantCaptain = getCaptainByTeam(room, "captain_radiant");
  const direCaptain = getCaptainByTeam(room, "captain_dire");

  const isChatMuted = isPlayerChatMuted(room, playerId);

  const isCaptain =
    currentPlayer?.role === "captain_radiant" ||
    currentPlayer?.role === "captain_dire";

  const handleStart = async () => {
    setStarting(true);
    try {
      await onStartDraft();
    } finally {
      setStarting(false);
    }
  };

  const handleDeleteLobby = async () => {
    if (
      !confirm(
        "Удалить лобби? Комната будет закрыта для всех игроков.",
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      await onDeleteLobby();
    } finally {
      setDeleting(false);
    }
  };

  const totalWins =
    (room.score?.radiant ?? 0) + (room.score?.dire ?? 0);
  const draftComplete = isDraftComplete(room.draft);
  const seriesFinished =
    room.status === "finished" &&
    (!draftComplete || totalWins >= (room.currentMap ?? 1));

  return (
    <div className={styles.room}>
      <header className={styles.roomHeader}>
        <div>
          <h1>{room.settings.name}</h1>
          <p className={styles.meta}>
            Код: <strong>{room.code}</strong> · Статус:{" "}
            {getStatusLabel(room.status)}
            {room.settings.soloTest && " · Тест"}
            {room.settings.mapCount > 1 &&
              ` · Карта ${room.currentMap ?? 1}/${room.settings.mapCount}`}
          </p>
        </div>
        <div className={styles.headerActions}>
          {isHost && (
            <button
              type="button"
              className={styles.dangerBtn}
              onClick={handleDeleteLobby}
              disabled={deleting}
            >
              {deleting ? "Удаление..." : "Удалить лобби"}
            </button>
          )}
          <button type="button" className={styles.secondaryBtn} onClick={onLeave}>
            Выйти
          </button>
        </div>
      </header>

      {room.status === "lobby" && (
        <div className={styles.lobbyGrid}>
          <div className={styles.lobbyPlayersColumn}>
            <PlayerList
              room={room}
              currentPlayerId={playerId}
              isHost={isHost}
              onKick={onKick}
              onAssignRole={onAssignRole}
              onClaimCaptain={onClaimCaptain}
              onReleaseCaptain={onReleaseCaptain}
              onToggleChatMute={(targetId, muted) =>
                onToggleChatMute(targetId, muted)
              }
            />
            <RoomChat
              messages={chatMessages}
              currentPlayerId={playerId}
              onSend={onSendChat}
              isMuted={isChatMuted}
            />
          </div>

          {isCaptain && !isHost && (
            <div className={styles.readyPanel}>
              <span className={styles.readyLabel}>Ваша готовность</span>
              <button
                type="button"
                className={
                  currentPlayer?.isReady
                    ? styles.readyBtnActive
                    : styles.readyBtn
                }
                onClick={() => onSetReady(!currentPlayer?.isReady)}
              >
                {currentPlayer?.isReady ? "✓ Готов" : "Готов"}
              </button>
            </div>
          )}

          {isHost ? (
            <div className={styles.lobbySide}>
              {isCaptain && (
                <div className={styles.readyInline}>
                  <span className={styles.readyLabel}>Ваша готовность</span>
                  <button
                    type="button"
                    className={
                      currentPlayer?.isReady
                        ? styles.readyBtnActive
                        : styles.readyBtn
                    }
                    onClick={() => onSetReady(!currentPlayer?.isReady)}
                  >
                    {currentPlayer?.isReady ? "✓ Готов" : "Готов"}
                  </button>
                </div>
              )}
              <RoomSettingsPanel room={room} onSave={onUpdateSettings} />
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleStart}
                disabled={
                  starting ||
                  !areCaptainsReady(room) ||
                  !areCaptainsGameReady(room)
                }
              >
                {starting
                  ? "Запуск..."
                  : !areCaptainsReady(room)
                    ? "Нужны оба капитана"
                    : !areCaptainsGameReady(room)
                      ? "Ждём готовности"
                      : "Начать драфт"}
              </button>
            </div>
          ) : (
            <div className={styles.waitingPanel}>
              <h3>Ожидание старта</h3>
              <p>
                {isCaptain
                  ? "Нажмите «Готов», когда будете готовы к драфту."
                  : "Капитаны должны нажать «Готов». Хост запустит драфт."}
              </p>
            </div>
          )}
        </div>
      )}

      {(room.status === "drafting" ||
        room.status === "awaiting_result" ||
        room.status === "finished") && (
        <div className={styles.draftLayout}>
          <aside className={styles.draftSidebar}>
            <div className={styles.sidebarColumn}>
              <PlayerList
                room={room}
                currentPlayerId={playerId}
                isHost={isHost}
                compact
                onKick={onKick}
                onAssignRole={onAssignRole}
                onClaimCaptain={onClaimCaptain}
                onReleaseCaptain={onReleaseCaptain}
                onToggleChatMute={(targetId, muted) =>
                  onToggleChatMute(targetId, muted)
                }
              />
              <RoomChat
                messages={chatMessages}
                currentPlayerId={playerId}
                onSend={onSendChat}
                isMuted={isChatMuted}
                compact
              />
            </div>
          </aside>
          <div className={styles.draftWrap}>
            <DraftPanel
              draft={room.draft}
              playerRole={room.settings.soloTest ? undefined : currentPlayer?.role}
              onPickBan={onDraftAction}
              readOnly={seriesFinished}
              soloMode={room.settings.soloTest}
              radiantName={radiantCaptain?.name ?? "RADIANT"}
              direName={direCaptain?.name ?? "DIRE"}
              phaseDeadline={room.phaseDeadline}
              pickTimerSeconds={room.settings.pickTimerSeconds}
              draftTimerMode={room.draftTimerMode ?? "main"}
              reserveMs={room.reserveMs ?? createDefaultReserveMs()}
              currentMap={room.currentMap ?? 1}
              mapCount={room.settings.mapCount ?? 1}
              seriesFinished={seriesFinished}
              score={room.score ?? { radiant: 0, dire: 0 }}
              isHost={isHost}
              onRecordWinner={onRecordWinner}
            />
          </div>
        </div>
      )}
    </div>
  );
}
