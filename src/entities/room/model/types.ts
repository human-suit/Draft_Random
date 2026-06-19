import { DraftState } from "@features/draft/model/draftLogic";
import type { Team } from "@features/draft/model/phases";

export type RoomStatus = "lobby" | "drafting" | "awaiting_result" | "finished";

export type DraftTimerMode = "main" | "reserve";

export const RESERVE_TIME_MS = 60_000;

export type TeamReserveMs = Record<Team, number>;

export function createDefaultReserveMs(): TeamReserveMs {
  return { RADIANT: RESERVE_TIME_MS, DIRE: RESERVE_TIME_MS };
}

export type WinnerTeam = "RADIANT" | "DIRE";

export type PlayerRole = "host" | "captain_radiant" | "captain_dire" | "spectator";

export type CaptainRole = "captain_radiant" | "captain_dire";

export const CAPTAIN_ROLES: CaptainRole[] = [
  "captain_radiant",
  "captain_dire",
];

export interface RoomSettings {
  name: string;
  isPrivate: boolean;
  password: string;
  pickTimerSeconds: number;
  maxSpectators: number;
  soloTest: boolean;
  mapCount: number;
}

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  name: "Новая комната",
  isPrivate: false,
  password: "",
  pickTimerSeconds: 30,
  maxSpectators: 20,
  soloTest: false,
  mapCount: 1,
};

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  joinedAt: number;
  isReady: boolean;
}

export interface SeriesScore {
  radiant: number;
  dire: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  playerId: string;
  playerName: string;
  text: string;
  createdAt: number;
}

export const LOBBY_CHAT_ROOM_ID = "__lobby__";

export const EMPTY_SCORE: SeriesScore = { radiant: 0, dire: 0 };

export interface Room {
  id: string;
  code: string;
  hostId: string;
  settings: RoomSettings;
  players: Player[];
  status: RoomStatus;
  draft: DraftState;
  phaseDeadline: number | null;
  draftTimerMode: DraftTimerMode;
  reserveMs: TeamReserveMs;
  reserveStartedAt: number | null;
  currentMap: number;
  usedHeroIds: number[];
  score: SeriesScore;
  chatMutedIds: string[];
  createdAt: number;
}

export function isPlayerChatMuted(room: Room, playerId: string): boolean {
  return (room.chatMutedIds ?? []).includes(playerId);
}

export function isCaptain(role: PlayerRole): role is CaptainRole {
  return role === "captain_radiant" || role === "captain_dire";
}

export function getCaptains(room: Room): Player[] {
  return room.players.filter((p) => isCaptain(p.role));
}

export function getSpectators(room: Room): Player[] {
  return room.players.filter((p) => !isCaptain(p.role));
}

export function getCaptainByTeam(
  room: Room,
  team: CaptainRole,
): Player | undefined {
  return room.players.find((p) => p.role === team);
}

export function areCaptainsReady(room: Room): boolean {
  return CAPTAIN_ROLES.every((role) =>
    room.players.some((p) => p.role === role),
  );
}

export function areCaptainsGameReady(room: Room): boolean {
  const captains = getCaptains(room);
  return captains.length === 2 && captains.every((p) => p.isReady);
}
