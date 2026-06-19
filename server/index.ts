import { createServer } from "http";
import { Server } from "socket.io";
import { roomStore } from "./roomStore";
import { PlayerRole, RoomSettings } from "../src/entities/room/model/types";
import type { CaptainRole } from "../src/entities/room/model/types";

const PORT = Number(process.env.PORT ?? process.env.SOCKET_PORT ?? 3002);

function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/$/, "");
}

function getAllowedOrigins(): string[] {
  const origins = new Set<string>();
  const clientUrl = process.env.CLIENT_URL?.trim();
  if (clientUrl) origins.add(normalizeOrigin(clientUrl));

  for (const extra of process.env.CLIENT_URLS?.split(",") ?? []) {
    const trimmed = extra.trim();
    if (trimmed) origins.add(normalizeOrigin(trimmed));
  }

  return [...origins];
}

const allowedOrigins = getAllowedOrigins();

const httpServer = createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalized = normalizeOrigin(origin);
      if (
        allowedOrigins.length === 0 &&
        (normalized.startsWith("http://localhost:") ||
          normalized.startsWith("http://127.0.0.1:"))
      ) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(normalized)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    methods: ["GET", "POST"],
  },
});

const socketRooms = new Map<string, string>();

function broadcastLobby() {
  io.emit("lobby:updated", roomStore.listPublicRooms());
}

type SocketCallback = (result: unknown) => void;

function withCallback<T>(
  args: unknown[],
  handler: (data: T, callback: SocketCallback) => void,
) {
  const last = args[args.length - 1];
  if (typeof last !== "function") return;
  const callback = last as SocketCallback;
  const data = (args.length > 1 ? args[0] : {}) as T;
  handler(data, callback);
}

io.on("connection", (socket) => {
  socket.emit("lobby:updated", roomStore.listPublicRooms());

  socket.on("room:create", (...args) => {
    withCallback<{
      playerId: string;
      playerName: string;
      settings?: Partial<RoomSettings>;
    }>(args, (data, callback) => {
      try {
        const room = roomStore.createRoom(
          data.playerId,
          data.playerName,
          data.settings,
        );
        socketRooms.set(socket.id, room.id);
        socket.join(room.id);
        broadcastLobby();
        callback({ ok: true, room });
      } catch (e) {
        callback({ ok: false, error: (e as Error).message });
      }
    });
  });

  socket.on("room:createTest", (...args) => {
    withCallback<{ playerId: string; playerName: string }>(args, (data, callback) => {
      try {
        const room = roomStore.createTestRoom(data.playerId, data.playerName);
        socketRooms.set(socket.id, room.id);
        socket.join(room.id);
        callback({ ok: true, room });
      } catch (e) {
        callback({ ok: false, error: (e as Error).message });
      }
    });
  });

  socket.on("room:join", (...args) => {
    withCallback<{
      roomId?: string;
      code?: string;
      playerId: string;
      playerName: string;
      password?: string;
    }>(args, (data, callback) => {
      try {
        const room = data.code
          ? roomStore.getRoomByCode(data.code)
          : data.roomId
            ? roomStore.getRoom(data.roomId)
            : undefined;

        if (!room) {
          callback({ ok: false, error: "Комната не найдена" });
          return;
        }

        const updated = roomStore.joinRoom(
          room.id,
          data.playerId,
          data.playerName,
          data.password,
        );
        socketRooms.set(socket.id, room.id);
        socket.join(room.id);
        io.to(room.id).emit("room:updated", updated);
        broadcastLobby();
        callback({
          ok: true,
          room: updated,
          messages: roomStore.getChatMessages(room.id),
        });
      } catch (e) {
        callback({ ok: false, error: (e as Error).message });
      }
    });
  });

  socket.on("room:list", (...args) => {
    const callback = args[args.length - 1];
    if (typeof callback !== "function") return;
    callback({ ok: true, rooms: roomStore.listPublicRooms() });
  });

  socket.on("room:leave", (data: { roomId: string; playerId: string }) => {
    const room = roomStore.leaveRoom(data.roomId, data.playerId);
    socket.leave(data.roomId);
    socketRooms.delete(socket.id);

    if (room) {
      io.to(data.roomId).emit("room:updated", room);
    } else {
      io.to(data.roomId).emit("room:closed");
    }
    broadcastLobby();
  });

  socket.on("room:delete", (...args) => {
    withCallback<{ roomId: string; hostId: string }>(args, (data, callback) => {
      try {
        roomStore.deleteLobby(data.roomId, data.hostId);
        io.to(data.roomId).emit("room:closed");
        socket.leave(data.roomId);
        socketRooms.delete(socket.id);
        broadcastLobby();
        callback({ ok: true });
      } catch (e) {
        callback({ ok: false, error: (e as Error).message });
      }
    });
  });

  socket.on("room:kick", (...args) => {
    withCallback<{ roomId: string; hostId: string; targetId: string }>(
      args,
      (data, callback) => {
        try {
          const room = roomStore.kickPlayer(
            data.roomId,
            data.hostId,
            data.targetId,
          );
          io.to(data.roomId).emit("room:updated", room);
          io.to(data.roomId).emit("room:kicked", { playerId: data.targetId });
          broadcastLobby();
          callback({ ok: true, room });
        } catch (e) {
          callback({ ok: false, error: (e as Error).message });
        }
      },
    );
  });

  socket.on("room:updateSettings", (...args) => {
    withCallback<{
      roomId: string;
      hostId: string;
      settings: Partial<RoomSettings>;
    }>(args, (data, callback) => {
      try {
        const room = roomStore.updateSettings(
          data.roomId,
          data.hostId,
          data.settings,
        );
        io.to(data.roomId).emit("room:updated", room);
        broadcastLobby();
        callback({ ok: true, room });
      } catch (e) {
        callback({ ok: false, error: (e as Error).message });
      }
    });
  });

  socket.on("room:assignRole", (...args) => {
    withCallback<{
      roomId: string;
      hostId: string;
      targetId: string;
      role: PlayerRole;
    }>(args, (data, callback) => {
      try {
        const room = roomStore.assignRole(
          data.roomId,
          data.hostId,
          data.targetId,
          data.role,
        );
        io.to(data.roomId).emit("room:updated", room);
        callback({ ok: true, room });
      } catch (e) {
        callback({ ok: false, error: (e as Error).message });
      }
    });
  });

  socket.on("room:claimCaptain", (...args) => {
    withCallback<{ roomId: string; playerId: string; role: CaptainRole }>(
      args,
      (data, callback) => {
        try {
          const room = roomStore.claimCaptain(
            data.roomId,
            data.playerId,
            data.role,
          );
          io.to(data.roomId).emit("room:updated", room);
          callback({ ok: true, room });
        } catch (e) {
          callback({ ok: false, error: (e as Error).message });
        }
      },
    );
  });

  socket.on("room:releaseCaptain", (...args) => {
    withCallback<{ roomId: string; playerId: string }>(args, (data, callback) => {
      try {
        const room = roomStore.releaseCaptain(data.roomId, data.playerId);
        io.to(data.roomId).emit("room:updated", room);
        callback({ ok: true, room });
      } catch (e) {
        callback({ ok: false, error: (e as Error).message });
      }
    });
  });

  socket.on("room:ready", (...args) => {
    withCallback<{ roomId: string; playerId: string; ready: boolean }>(
      args,
      (data, callback) => {
        try {
          const room = roomStore.setReady(
            data.roomId,
            data.playerId,
            data.ready,
          );
          io.to(data.roomId).emit("room:updated", room);
          callback({ ok: true, room });
        } catch (e) {
          callback({ ok: false, error: (e as Error).message });
        }
      },
    );
  });

  socket.on("room:startDraft", (...args) => {
    withCallback<{ roomId: string; hostId: string }>(args, (data, callback) => {
      try {
        const room = roomStore.startDraft(data.roomId, data.hostId);
        io.to(data.roomId).emit("room:updated", room);
        broadcastLobby();
        callback({ ok: true, room });
      } catch (e) {
        callback({ ok: false, error: (e as Error).message });
      }
    });
  });

  socket.on("draft:action", (...args) => {
    withCallback<{ roomId: string; playerId: string; heroId: number }>(
      args,
      (data, callback) => {
        try {
          const room = roomStore.applyDraftAction(
            data.roomId,
            data.playerId,
            data.heroId,
          );
          io.to(data.roomId).emit("room:updated", room);
          callback({ ok: true, room });
        } catch (e) {
          callback({ ok: false, error: (e as Error).message });
        }
      },
    );
  });

  socket.on("room:recordWinner", (...args) => {
    withCallback<{
      roomId: string;
      hostId: string;
      winner: import("../src/entities/room/model/types").WinnerTeam;
    }>(args, (data, callback) => {
      try {
        const room = roomStore.recordMapWinner(
          data.roomId,
          data.hostId,
          data.winner,
        );
        io.to(data.roomId).emit("room:updated", room);
        callback({ ok: true, room });
      } catch (e) {
        callback({ ok: false, error: (e as Error).message });
      }
    });
  });

  socket.on("room:sync", (...args) => {
    withCallback<{ roomId: string }>(args, (data, callback) => {
      const room = roomStore.getRoom(data.roomId);
      if (room) {
        socket.join(data.roomId);
        socketRooms.set(socket.id, data.roomId);
        callback({
          ok: true,
          room,
          messages: roomStore.getChatMessages(data.roomId),
        });
      } else {
        callback({ ok: false, error: "Комната не найдена" });
      }
    });
  });

  socket.on("room:chat:send", (...args) => {
    withCallback<{ roomId: string; playerId: string; text: string }>(
      args,
      (data, callback) => {
        try {
          const message = roomStore.addChatMessage(
            data.roomId,
            data.playerId,
            data.text,
          );
          io.to(data.roomId).emit("room:chat:message", message);
          callback({ ok: true, message });
        } catch (e) {
          callback({ ok: false, error: (e as Error).message });
        }
      },
    );
  });

  socket.on("room:chat:mute", (...args) => {
    withCallback<{
      roomId: string;
      hostId: string;
      targetId: string;
      muted: boolean;
    }>(args, (data, callback) => {
      try {
        const room = roomStore.setChatMuted(
          data.roomId,
          data.hostId,
          data.targetId,
          data.muted,
        );
        io.to(data.roomId).emit("room:updated", room);
        callback({ ok: true, room });
      } catch (e) {
        callback({ ok: false, error: (e as Error).message });
      }
    });
  });

  socket.on("disconnect", () => {
    socketRooms.delete(socket.id);
  });
});

httpServer.listen(PORT, "0.0.0.0", () => {
  const corsLabel =
    allowedOrigins.length > 0
      ? allowedOrigins.join(", ")
      : "localhost only";
  console.log(`Socket server running on port ${PORT}, CORS: ${corsLabel}`);
});

setInterval(() => {
  for (const room of roomStore.getDraftingRooms()) {
    if (!room.phaseDeadline || Date.now() < room.phaseDeadline) continue;

    try {
      const updated = roomStore.applyTimeoutDraftAction(room.id);
      if (updated) {
        io.to(room.id).emit("room:updated", updated);
      }
    } catch (e) {
      console.error("Draft timeout error:", e);
    }
  }
}, 500);
