"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { connectSocket, getSocket } from "@shared/lib/socketClient";
import {
  CaptainRole,
  ChatMessage,
  PlayerRole,
  Room,
  RoomSettings,
} from "@entities/room/model/types";

interface SocketContextValue {
  connected: boolean;
  room: Room | null;
  publicRooms: Room[];
  error: string | null;
  kicked: boolean;
  roomClosed: boolean;
  createRoom: (
    playerId: string,
    playerName: string,
    settings?: Partial<RoomSettings>,
  ) => Promise<Room>;
  createTestRoom: (playerId: string, playerName: string) => Promise<Room>;
  joinRoom: (params: {
    roomId?: string;
    code?: string;
    playerId: string;
    playerName: string;
    password?: string;
  }) => Promise<Room>;
  syncRoom: (roomId: string) => Promise<Room>;
  listRooms: () => Promise<Room[]>;
  leaveRoom: (roomId: string, playerId: string) => void;
  deleteLobby: (roomId: string, hostId: string) => Promise<void>;
  kickPlayer: (
    roomId: string,
    hostId: string,
    targetId: string,
  ) => Promise<Room>;
  updateSettings: (
    roomId: string,
    hostId: string,
    settings: Partial<RoomSettings>,
  ) => Promise<Room>;
  assignRole: (
    roomId: string,
    hostId: string,
    targetId: string,
    role: PlayerRole,
  ) => Promise<Room>;
  claimCaptain: (
    roomId: string,
    playerId: string,
    role: CaptainRole,
  ) => Promise<Room>;
  releaseCaptain: (roomId: string, playerId: string) => Promise<Room>;
  setReady: (roomId: string, playerId: string, ready: boolean) => Promise<Room>;
  startDraft: (roomId: string, hostId: string) => Promise<Room>;
  draftAction: (
    roomId: string,
    playerId: string,
    heroId: number,
  ) => Promise<Room>;
  recordWinner: (
    roomId: string,
    hostId: string,
    winner: import("@entities/room/model/types").WinnerTeam,
  ) => Promise<Room>;
  chatMessages: ChatMessage[];
  sendChatMessage: (
    roomId: string,
    playerId: string,
    text: string,
  ) => Promise<void>;
  setChatMuted: (
    roomId: string,
    hostId: string,
    targetId: string,
    muted: boolean,
  ) => Promise<Room>;
  clearError: () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({
  children,
  socketUrl: initialSocketUrl,
}: {
  children: React.ReactNode;
  socketUrl: string;
}) {
  const [socketUrl, setSocketUrl] = useState(initialSocketUrl);
  const socketRef = useRef<ReturnType<typeof connectSocket> | null>(null);
  const activeRoomIdRef = useRef<string | null>(null);
  const deletingLobbyRef = useRef(false);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [publicRooms, setPublicRooms] = useState<Room[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [kicked, setKicked] = useState(false);
  const [roomClosed, setRoomClosed] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const trackRoom = useCallback((nextRoom: Room | null) => {
    activeRoomIdRef.current = nextRoom?.id ?? null;
    setRoom(nextRoom);
    if (nextRoom) {
      setRoomClosed(false);
      setKicked(false);
    } else {
      setChatMessages([]);
    }
  }, []);

  useEffect(() => {
    const isLocalDefault =
      initialSocketUrl.includes("localhost") &&
      typeof window !== "undefined" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1";

    if (!isLocalDefault) return;

    fetch("/api/config")
      .then((response) => response.json())
      .then((data: { socketUrl?: string }) => {
        if (data.socketUrl && !data.socketUrl.includes("localhost")) {
          setSocketUrl(data.socketUrl);
        }
      })
      .catch(() => {});
  }, [initialSocketUrl]);

  useEffect(() => {
    const socket = connectSocket(socketUrl);
    socketRef.current = socket;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onConnectError = (err: Error) => {
      console.error("Socket connect error:", err.message);
      setConnected(false);
    };
    const onRoomUpdated = (updated: Room) => {
      if (activeRoomIdRef.current === updated.id) {
        setRoom(updated);
      }
    };
    const onLobbyUpdated = (rooms: Room[]) => setPublicRooms(rooms);
    const onRoomClosed = () => {
      trackRoom(null);
      if (!deletingLobbyRef.current) {
        setRoomClosed(true);
      }
    };
    const onKicked = (data: { playerId: string }) => {
      const myId = localStorage.getItem("dota_player_id");
      if (myId === data.playerId) {
        setKicked(true);
        trackRoom(null);
      }
    };
    const onChatMessage = (message: ChatMessage) => {
      if (activeRoomIdRef.current !== message.roomId) return;
      setChatMessages((prev) => {
        if (prev.some((item) => item.id === message.id)) return prev;
        return [...prev, message];
      });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("room:updated", onRoomUpdated);
    socket.on("lobby:updated", onLobbyUpdated);
    socket.on("room:closed", onRoomClosed);
    socket.on("room:kicked", onKicked);
    socket.on("room:chat:message", onChatMessage);

    if (socket.connected) {
      setConnected(true);
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("room:updated", onRoomUpdated);
      socket.off("lobby:updated", onLobbyUpdated);
      socket.off("room:closed", onRoomClosed);
      socket.off("room:kicked", onKicked);
      socket.off("room:chat:message", onChatMessage);
    };
  }, [trackRoom, socketUrl]);

  const emit = useCallback(
    <T,>(event: string, data?: unknown): Promise<T> =>
      new Promise((resolve, reject) => {
        const socket = socketRef.current ?? getSocket();
        if (!socket?.connected) {
          reject(new Error("Нет соединения с сервером"));
          return;
        }

        const timeout = setTimeout(() => {
          const message =
            "Сервер не ответил. Перезапустите npm run dev и попробуйте снова.";
          setError(message);
          reject(new Error(message));
        }, 8000);

        const onResult = (result: { ok: boolean; error?: string } & T) => {
          clearTimeout(timeout);
          if (result?.ok) {
            setError(null);
            resolve(result);
          } else {
            const message = result?.error ?? "Неизвестная ошибка";
            setError(message);
            reject(new Error(message));
          }
        };

        const payload = data === undefined ? undefined : data;
        if (payload === undefined) {
          socket.emit(event, onResult);
        } else {
          socket.emit(event, payload, onResult);
        }
      }),
    [],
  );

  const createRoom = useCallback(
    async (
      playerId: string,
      playerName: string,
      settings?: Partial<RoomSettings>,
    ) => {
      const result = await emit<{ room: Room }>("room:create", {
        playerId,
        playerName,
        settings,
      });
      trackRoom(result.room);
      return result.room;
    },
    [emit, trackRoom],
  );

  const createTestRoom = useCallback(
    async (playerId: string, playerName: string) => {
      const result = await emit<{ room: Room }>("room:createTest", {
        playerId,
        playerName,
      });
      trackRoom(result.room);
      return result.room;
    },
    [emit, trackRoom],
  );

  const joinRoom = useCallback(
    async (params: {
      roomId?: string;
      code?: string;
      playerId: string;
      playerName: string;
      password?: string;
    }) => {
      const result = await emit<{ room: Room; messages?: ChatMessage[] }>(
        "room:join",
        params,
      );
      trackRoom(result.room);
      setChatMessages(result.messages ?? []);
      return result.room;
    },
    [emit, trackRoom],
  );

  const syncRoom = useCallback(
    async (roomId: string) => {
      const result = await emit<{ room: Room; messages?: ChatMessage[] }>(
        "room:sync",
        { roomId },
      );
      trackRoom(result.room);
      setChatMessages(result.messages ?? []);
      return result.room;
    },
    [emit, trackRoom],
  );

  const listRooms = useCallback(async () => {
    const result = await emit<{ rooms: Room[] }>("room:list");
    setPublicRooms(result.rooms);
    return result.rooms;
  }, [emit]);

  const leaveRoom = useCallback((roomId: string, playerId: string) => {
    socketRef.current?.emit("room:leave", { roomId, playerId });
    trackRoom(null);
  }, [trackRoom]);

  const deleteLobby = useCallback(
    async (roomId: string, hostId: string) => {
      deletingLobbyRef.current = true;
      try {
        await emit("room:delete", { roomId, hostId });
        trackRoom(null);
      } finally {
        deletingLobbyRef.current = false;
      }
    },
    [emit, trackRoom],
  );

  const kickPlayer = useCallback(
    async (roomId: string, hostId: string, targetId: string) => {
      const result = await emit<{ room: Room }>("room:kick", {
        roomId,
        hostId,
        targetId,
      });
      setRoom(result.room);
      return result.room;
    },
    [emit],
  );

  const updateSettings = useCallback(
    async (
      roomId: string,
      hostId: string,
      settings: Partial<RoomSettings>,
    ) => {
      const result = await emit<{ room: Room }>("room:updateSettings", {
        roomId,
        hostId,
        settings,
      });
      setRoom(result.room);
      return result.room;
    },
    [emit],
  );

  const assignRole = useCallback(
    async (
      roomId: string,
      hostId: string,
      targetId: string,
      role: PlayerRole,
    ) => {
      const result = await emit<{ room: Room }>("room:assignRole", {
        roomId,
        hostId,
        targetId,
        role,
      });
      setRoom(result.room);
      return result.room;
    },
    [emit],
  );

  const claimCaptain = useCallback(
    async (roomId: string, playerId: string, role: CaptainRole) => {
      const result = await emit<{ room: Room }>("room:claimCaptain", {
        roomId,
        playerId,
        role,
      });
      setRoom(result.room);
      return result.room;
    },
    [emit],
  );

  const releaseCaptain = useCallback(
    async (roomId: string, playerId: string) => {
      const result = await emit<{ room: Room }>("room:releaseCaptain", {
        roomId,
        playerId,
      });
      setRoom(result.room);
      return result.room;
    },
    [emit],
  );

  const setReady = useCallback(
    async (roomId: string, playerId: string, ready: boolean) => {
      const result = await emit<{ room: Room }>("room:ready", {
        roomId,
        playerId,
        ready,
      });
      setRoom(result.room);
      return result.room;
    },
    [emit],
  );

  const startDraft = useCallback(
    async (roomId: string, hostId: string) => {
      const result = await emit<{ room: Room }>("room:startDraft", {
        roomId,
        hostId,
      });
      setRoom(result.room);
      return result.room;
    },
    [emit],
  );

  const draftAction = useCallback(
    async (roomId: string, playerId: string, heroId: number) => {
      const result = await emit<{ room: Room }>("draft:action", {
        roomId,
        playerId,
        heroId,
      });
      setRoom(result.room);
      return result.room;
    },
    [emit],
  );

  const recordWinner = useCallback(
    async (
      roomId: string,
      hostId: string,
      winner: import("@entities/room/model/types").WinnerTeam,
    ) => {
      const result = await emit<{ room: Room }>("room:recordWinner", {
        roomId,
        hostId,
        winner,
      });
      setRoom(result.room);
      return result.room;
    },
    [emit],
  );

  const sendChatMessage = useCallback(
    async (roomId: string, playerId: string, text: string) => {
      await emit("room:chat:send", { roomId, playerId, text });
    },
    [emit],
  );

  const setChatMuted = useCallback(
    async (
      roomId: string,
      hostId: string,
      targetId: string,
      muted: boolean,
    ) => {
      const result = await emit<{ room: Room }>("room:chat:mute", {
        roomId,
        hostId,
        targetId,
        muted,
      });
      setRoom(result.room);
      return result.room;
    },
    [emit],
  );

  const value: SocketContextValue = {
    connected,
    room,
    publicRooms,
    error,
    kicked,
    roomClosed,
    createRoom,
    createTestRoom,
    joinRoom,
    syncRoom,
    listRooms,
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
    clearError: () => setError(null),
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useRoomSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error("useRoomSocket must be used within SocketProvider");
  }
  return ctx;
}
