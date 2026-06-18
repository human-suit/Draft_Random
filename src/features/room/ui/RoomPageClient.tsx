"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRoomSocket } from "@features/room/lib/useRoomSocket";
import { usePlayerIdentity } from "@features/room/lib/usePlayerIdentity";
import { useLoadingOverlay } from "@shared/ui/LoadingProvider";
import RoomView from "@features/room/ui/RoomView";
import styles from "./room.module.css";

interface Props {
  roomId: string;
}

export default function RoomPageClient({ roomId }: Props) {
  const router = useRouter();
  const { showLoader, hideLoader } = useLoadingOverlay();
  const { playerId, playerName, ready } = usePlayerIdentity();
  const {
    connected,
    room,
    error,
    kicked,
    roomClosed,
    syncRoom,
    joinRoom,
    leaveRoom,
    deleteLobby,
    kickPlayer,
    updateSettings,
    assignRole,
    claimCaptain,
    releaseCaptain,
    setReady,
    startDraft,
    draftAction,
    recordWinner,
    chatMessages,
    sendChatMessage,
    setChatMuted,
  } = useRoomSocket();

  const [syncDone, setSyncDone] = useState(false);
  const syncingRef = useRef(false);

  useEffect(() => {
    setSyncDone(false);
    syncingRef.current = false;
  }, [roomId]);

  useEffect(() => {
    if (room?.id === roomId) {
      setSyncDone(true);
    }
  }, [room?.id, roomId]);

  useEffect(() => {
    if (!ready || !connected || !playerId) return;
    if (room?.id === roomId) return;
    if (syncingRef.current) return;

    syncingRef.current = true;

    (async () => {
      try {
        await syncRoom(roomId);
      } catch {
        if (playerName) {
          try {
            await joinRoom({ roomId, playerId, playerName });
          } catch {
            // error shown via context
          }
        }
      } finally {
        setSyncDone(true);
        syncingRef.current = false;
      }
    })();
  }, [ready, connected, playerId, playerName, roomId, syncRoom, joinRoom]);

  useEffect(() => {
    if (kicked) {
      router.push("/?kicked=1");
    }
  }, [kicked, router]);

  useEffect(() => {
    if (roomClosed) {
      router.push("/?closed=1");
    }
  }, [roomClosed, router]);

  const hasRoom = room?.id === roomId;
  const waitingForRoom =
    ready && connected && Boolean(playerId) && Boolean(playerName) && !hasRoom && !syncDone;

  useEffect(() => {
    if (!ready || waitingForRoom) {
      showLoader("Вход в комнату...");
      return;
    }
    hideLoader();
  }, [ready, waitingForRoom, showLoader, hideLoader]);

  if (!ready || waitingForRoom) {
    return null;
  }

  if (!connected && !room) {
    return (
      <div className={styles.centered}>
        <p>Нет соединения с сервером.</p>
        <p className={styles.hint}>Убедитесь, что socket-сервер запущен.</p>
      </div>
    );
  }

  if (!playerName) {
    return (
      <div className={styles.centered}>
        <p>Укажите имя на главной странице.</p>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={() => router.push("/")}
        >
          На главную
        </button>
      </div>
    );
  }

  if (!hasRoom) {
    return (
      <div className={styles.centered}>
        <p>{error ?? "Комната не найдена"}</p>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={() => router.push("/")}
        >
          На главную
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {error && <div className={styles.errorBanner}>{error}</div>}
      <RoomView
        room={room}
        playerId={playerId}
        onKick={async (targetId) => {
          await kickPlayer(room.id, playerId, targetId);
        }}
        onAssignRole={async (targetId, role) => {
          await assignRole(room.id, playerId, targetId, role);
        }}
        onClaimCaptain={async (role) => {
          await claimCaptain(room.id, playerId, role);
        }}
        onReleaseCaptain={async () => {
          await releaseCaptain(room.id, playerId);
        }}
        onSetReady={async (ready) => {
          await setReady(room.id, playerId, ready);
        }}
        onUpdateSettings={async (settings) => {
          await updateSettings(room.id, playerId, settings);
        }}
        onStartDraft={async () => {
          await startDraft(room.id, playerId);
        }}
        onLeave={() => {
          showLoader("Выход из комнаты...");
          leaveRoom(room.id, playerId);
          router.push("/");
        }}
        onDeleteLobby={async () => {
          showLoader("Удаление лобби...");
          await deleteLobby(room.id, playerId);
          router.push("/");
        }}
        onDraftAction={async (heroId) => {
          await draftAction(room.id, playerId, heroId);
        }}
        onRecordWinner={async (winner) => {
          await recordWinner(room.id, playerId, winner);
        }}
        chatMessages={chatMessages}
        onSendChat={async (text) => {
          await sendChatMessage(room.id, playerId, text);
        }}
        onToggleChatMute={async (targetId, muted) => {
          await setChatMuted(room.id, playerId, targetId, muted);
        }}
      />
    </div>
  );
}
