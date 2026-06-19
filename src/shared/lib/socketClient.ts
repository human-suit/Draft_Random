import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let currentUrl = "";

export function connectSocket(url: string): Socket {
  const normalized = url.replace(/\/$/, "");
  if (socket && currentUrl === normalized) {
    return socket;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  currentUrl = normalized;
  socket = io(normalized, {
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    transports: ["websocket", "polling"],
  });

  return socket;
}

export function getSocket(): Socket {
  if (!socket) {
    throw new Error("Socket not initialized. Call connectSocket() first.");
  }
  return socket;
}
