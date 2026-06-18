import { randomBytes } from "crypto";
import { heroes } from "../src/entities/hero/model/heroes";
import type { Hero } from "../src/entities/hero/model/types";
import {
  CaptainRole,
  createDefaultReserveMs,
  ChatMessage,
  DEFAULT_ROOM_SETTINGS,
  EMPTY_SCORE,
  Player,
  PlayerRole,
  Room,
  RoomSettings,
  areCaptainsGameReady,
  areCaptainsReady,
  isCaptain,
} from "../src/entities/room/model/types";
import type { WinnerTeam } from "../src/entities/room/model/types";
import type { Team } from "../src/features/draft/model/phases";
import {
  applyPhase,
  canTeamAct,
  createEmptyDraft,
  generateInitialDraft,
  getCurrentPhase,
  getPickedHeroIds,
  isDraftComplete,
  isHeroTaken,
  pickRandomAvailableHero,
} from "../src/features/draft/model/draftLogic";

function generateCode(): string {
  return randomBytes(3).toString("hex").toUpperCase();
}

function createPlayer(
  id: string,
  name: string,
  role: PlayerRole = "spectator",
): Player {
  return { id, name, role, joinedAt: Date.now(), isReady: false };
}

function setPhaseDeadline(room: Room): void {
  const seconds = room.settings.pickTimerSeconds;
  room.draftTimerMode = "main";
  room.reserveStartedAt = null;
  room.phaseDeadline =
    seconds > 0 ? Date.now() + seconds * 1000 : null;
}

function resetReserveTimer(room: Room): void {
  room.reserveMs = createDefaultReserveMs();
  room.draftTimerMode = "main";
  room.reserveStartedAt = null;
}

function deductReserveOnPick(room: Room, team: Team): void {
  if (room.draftTimerMode !== "reserve" || !room.reserveStartedAt) return;
  const elapsed = Date.now() - room.reserveStartedAt;
  room.reserveMs[team] = Math.max(0, room.reserveMs[team] - elapsed);
}

function finishMapDraft(room: Room): void {
  const picked = getPickedHeroIds(room.draft);
  room.usedHeroIds = [...room.usedHeroIds, ...picked];
  room.status = "awaiting_result";
  room.phaseDeadline = null;
  room.draftTimerMode = "main";
  room.reserveStartedAt = null;
}

function advanceDraftWithHero(room: Room, hero: Hero): void {
  const phase = getCurrentPhase(room.draft);
  if (phase) {
    deductReserveOnPick(room, phase.team);
  }

  room.draft = applyPhase(room.draft, hero);

  if (isDraftComplete(room.draft)) {
    finishMapDraft(room);
  } else {
    setPhaseDeadline(room);
  }
}

function countSpectators(room: Room): number {
  return room.players.filter((p) => !isCaptain(p.role)).length;
}

function swapCaptainSides(room: Room): void {
  for (const player of room.players) {
    if (player.role === "captain_radiant") {
      player.role = "captain_dire";
      player.isReady = false;
    } else if (player.role === "captain_dire") {
      player.role = "captain_radiant";
      player.isReady = false;
    }
  }
}

class RoomStore {
  private rooms = new Map<string, Room>();
  private codeToId = new Map<string, string>();
  private chatMessages = new Map<string, ChatMessage[]>();

  getRoom(id: string): Room | undefined {
    return this.rooms.get(id);
  }

  getRoomByCode(code: string): Room | undefined {
    const id = this.codeToId.get(code.toUpperCase());
    return id ? this.rooms.get(id) : undefined;
  }

  listPublicRooms(): Room[] {
    return Array.from(this.rooms.values()).filter(
      (room) => !room.settings.isPrivate && room.status === "lobby",
    );
  }

  createRoom(
    hostId: string,
    hostName: string,
    settings?: Partial<RoomSettings>,
  ): Room {
    const id = crypto.randomUUID();
    let code = generateCode();
    while (this.codeToId.has(code)) {
      code = generateCode();
    }

    const room: Room = {
      id,
      code,
      hostId,
      settings: { ...DEFAULT_ROOM_SETTINGS, ...settings },
      players: [createPlayer(hostId, hostName, "host")],
      status: "lobby",
      draft: createEmptyDraft(),
      phaseDeadline: null,
      draftTimerMode: "main",
      reserveMs: createDefaultReserveMs(),
      reserveStartedAt: null,
      currentMap: 1,
      usedHeroIds: [],
      score: { ...EMPTY_SCORE },
      chatMutedIds: [],
      createdAt: Date.now(),
    };

    this.rooms.set(id, room);
    this.codeToId.set(code, id);
    return room;
  }

  createTestRoom(hostId: string, hostName: string): Room {
    const room = this.createRoom(hostId, hostName, {
      name: `Тест — ${hostName}`,
      isPrivate: true,
      soloTest: true,
      mapCount: 1,
    });

    room.players.push(
      createPlayer("bot-radiant", "Radiant (бот)", "captain_radiant"),
      createPlayer("bot-dire", "Dire (бот)", "captain_dire"),
    );
    room.status = "drafting";
    room.currentMap = 1;
    room.usedHeroIds = [];
    resetReserveTimer(room);
    room.draft = generateInitialDraft();
    setPhaseDeadline(room);
    return room;
  }

  private assertHost(room: Room, playerId: string): void {
    if (room.hostId !== playerId) {
      throw new Error("Только хост может выполнить это действие");
    }
  }

  private assertLobby(room: Room): void {
    if (room.status !== "lobby") {
      throw new Error("Комната уже не в лобби");
    }
  }

  private releaseCaptainSlot(room: Room, role: CaptainRole): void {
    const current = room.players.find((p) => p.role === role);
    if (current) {
      current.role = current.id === room.hostId ? "host" : "spectator";
    }
  }

  joinRoom(
    roomId: string,
    playerId: string,
    playerName: string,
    password?: string,
  ): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Комната не найдена");

    const existing = room.players.find((p) => p.id === playerId);
    if (existing) {
      existing.name = playerName;
      return room;
    }

    if (room.settings.isPrivate && room.settings.password !== (password ?? "")) {
      throw new Error("Неверный пароль");
    }

    if (countSpectators(room) >= room.settings.maxSpectators) {
      throw new Error("Достигнут лимит зрителей");
    }

    room.players.push(createPlayer(playerId, playerName, "spectator"));
    return room;
  }

  leaveRoom(roomId: string, playerId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.players = room.players.filter((p) => p.id !== playerId);

    if (room.players.length === 0) {
      this.deleteRoom(room);
      return null;
    }

    if (room.hostId === playerId) {
      const nextHost = room.players[0];
      nextHost.role = "host";
      room.hostId = nextHost.id;
    }

    return room;
  }

  deleteLobby(roomId: string, hostId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Комната не найдена");

    this.assertHost(room, hostId);
    this.deleteRoom(room);
  }

  kickPlayer(roomId: string, hostId: string, targetId: string): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Комната не найдена");

    this.assertHost(room, hostId);
    if (hostId === targetId) {
      throw new Error("Нельзя кикнуть себя");
    }

    const target = room.players.find((p) => p.id === targetId);
    if (!target) throw new Error("Игрок не найден");

    room.players = room.players.filter((p) => p.id !== targetId);
    room.chatMutedIds = (room.chatMutedIds ?? []).filter((id) => id !== targetId);
    return room;
  }

  updateSettings(
    roomId: string,
    hostId: string,
    settings: Partial<RoomSettings>,
  ): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Комната не найдена");

    this.assertHost(room, hostId);
    this.assertLobby(room);

    room.settings = { ...room.settings, ...settings };
    if (room.settings.mapCount < 1) room.settings.mapCount = 1;
    if (room.settings.mapCount > 5) room.settings.mapCount = 5;
    return room;
  }

  claimCaptain(
    roomId: string,
    playerId: string,
    role: CaptainRole,
  ): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Комната не найдена");

    this.assertLobby(room);

    const player = room.players.find((p) => p.id === playerId);
    if (!player) throw new Error("Игрок не в комнате");

    this.releaseCaptainSlot(room, role);

    if (isCaptain(player.role)) {
      player.role = player.id === room.hostId ? "host" : "spectator";
    }

    player.role = role;
    player.isReady = false;
    return room;
  }

  setReady(roomId: string, playerId: string, ready: boolean): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Комната не найдена");

    this.assertLobby(room);

    const player = room.players.find((p) => p.id === playerId);
    if (!player) throw new Error("Игрок не в комнате");

    if (!isCaptain(player.role)) {
      throw new Error("Только капитаны могут отмечать готовность");
    }

    player.isReady = ready;
    return room;
  }

  releaseCaptain(roomId: string, playerId: string): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Комната не найдена");

    this.assertLobby(room);

    const player = room.players.find((p) => p.id === playerId);
    if (!player) throw new Error("Игрок не в комнате");

    if (!isCaptain(player.role)) {
      throw new Error("Вы не капитан");
    }

    player.role = player.id === room.hostId ? "host" : "spectator";
    player.isReady = false;
    return room;
  }

  assignRole(
    roomId: string,
    hostId: string,
    targetId: string,
    role: PlayerRole,
  ): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Комната не найдена");

    this.assertHost(room, hostId);
    this.assertLobby(room);

    const target = room.players.find((p) => p.id === targetId);
    if (!target) throw new Error("Игрок не найден");

    if (role === "host") {
      throw new Error("Роль хоста назначается автоматически");
    }

    if (role === "captain_radiant" || role === "captain_dire") {
      if (target.role !== "spectator" && target.role !== "host") {
        throw new Error("Назначать капитаном можно только зрителей");
      }
      if (isCaptain(target.role)) {
        target.role = target.id === room.hostId ? "host" : "spectator";
      }
      this.releaseCaptainSlot(room, role);
      target.role = role;
      target.isReady = false;
      return room;
    }

    if (role === "spectator") {
      target.role = target.id === room.hostId ? "host" : "spectator";
      target.isReady = false;
      return room;
    }

    throw new Error("Неизвестная роль");
  }

  startDraft(roomId: string, hostId: string): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Комната не найдена");

    this.assertHost(room, hostId);
    this.assertLobby(room);

    if (!areCaptainsReady(room)) {
      throw new Error("Нужны оба капитана: Radiant и Dire");
    }

    if (!room.settings.soloTest && !areCaptainsGameReady(room)) {
      throw new Error("Оба капитана должны нажать «Готов»");
    }

    room.status = "drafting";
    room.currentMap = 1;
    room.usedHeroIds = [];
    room.score = { ...EMPTY_SCORE };
    resetReserveTimer(room);
    room.draft = generateInitialDraft();
    setPhaseDeadline(room);
    return room;
  }

  applyDraftAction(roomId: string, playerId: string, heroId: number): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Комната не найдена");

    if (room.status !== "drafting") {
      throw new Error("Драфт ещё не начат");
    }

    const player = room.players.find((p) => p.id === playerId);
    if (!player) throw new Error("Игрок не в комнате");

    const hero =
      room.draft.pool.find((h) => h.id === heroId) ??
      heroes.find((h) => h.id === heroId);
    if (!hero) throw new Error("Герой не найден");

    if (!room.draft.pool.some((h) => h.id === heroId)) {
      throw new Error("Герой не в пуле драфта");
    }

    if (isHeroTaken(room.draft, hero)) {
      throw new Error("Герой уже занят");
    }

    if (room.settings.soloTest) {
      if (playerId !== room.hostId) {
        throw new Error("Только хост управляет тестовым драфтом");
      }

      advanceDraftWithHero(room, hero);
      return room;
    }

    const team = player.role === "captain_radiant" ? "RADIANT" : "DIRE";
    if (!isCaptain(player.role)) {
      throw new Error("Только капитаны могут пикать и банить");
    }

    if (!canTeamAct(team, room.draft)) {
      throw new Error("Сейчас не ваша очередь");
    }

    advanceDraftWithHero(room, hero);

    return room;
  }

  applyTimeoutDraftAction(roomId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== "drafting") return null;
    if (!room.phaseDeadline || room.settings.pickTimerSeconds <= 0) return null;
    if (Date.now() < room.phaseDeadline) return null;

    const phase = getCurrentPhase(room.draft);
    if (!phase) return null;
    const team = phase.team;

    if (room.draftTimerMode === "main") {
      if (room.reserveMs[team] > 0) {
        const now = Date.now();
        room.draftTimerMode = "reserve";
        room.reserveStartedAt = now;
        room.phaseDeadline = now + room.reserveMs[team];
        return room;
      }
    } else {
      room.reserveMs[team] = 0;
      room.draftTimerMode = "main";
      room.reserveStartedAt = null;
    }

    const hero = pickRandomAvailableHero(room.draft);
    if (!hero) return null;

    advanceDraftWithHero(room, hero);
    return room;
  }

  getDraftingRooms(): Room[] {
    return Array.from(this.rooms.values()).filter(
      (room) => room.status === "drafting",
    );
  }

  recordMapWinner(
    roomId: string,
    hostId: string,
    winner: WinnerTeam,
  ): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Комната не найдена");

    const player = room.players.find((p) => p.id === hostId);
    if (!player) throw new Error("Игрок не в комнате");

    this.assertHost(room, hostId);

    if (
      room.status !== "awaiting_result" &&
      !(room.status === "drafting" && isDraftComplete(room.draft))
    ) {
      throw new Error("Сейчас не этап подведения итогов карты");
    }

    if (!room.score) {
      room.score = { ...EMPTY_SCORE };
    }

    if (winner === "RADIANT") {
      room.score.radiant += 1;
    } else {
      room.score.dire += 1;
    }

    if (room.currentMap >= room.settings.mapCount) {
      room.status = "finished";
      return room;
    }

    room.currentMap += 1;
    if (room.settings.mapCount > 1) {
      swapCaptainSides(room);
    }
    room.draft = generateInitialDraft(room.usedHeroIds);
    room.status = "drafting";
    resetReserveTimer(room);
    setPhaseDeadline(room);
    return room;
  }

  private deleteRoom(room: Room): void {
    this.rooms.delete(room.id);
    this.codeToId.delete(room.code);
    this.chatMessages.delete(room.id);
  }

  getChatMessages(roomId: string): ChatMessage[] {
    return this.chatMessages.get(roomId) ?? [];
  }

  addChatMessage(
    roomId: string,
    playerId: string,
    text: string,
  ): ChatMessage {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Комната не найдена");

    const player = room.players.find((p) => p.id === playerId);
    if (!player) throw new Error("Вы не в комнате");

    if ((room.chatMutedIds ?? []).includes(playerId)) {
      throw new Error("Вы заглушены и не можете писать в чат");
    }

    const trimmed = text.trim();
    if (!trimmed) throw new Error("Пустое сообщение");
    if (trimmed.length > 400) {
      throw new Error("Сообщение слишком длинное");
    }

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      roomId,
      playerId,
      playerName: player.name,
      text: trimmed,
      createdAt: Date.now(),
    };

    const messages = this.chatMessages.get(roomId) ?? [];
    messages.push(message);
    if (messages.length > 100) {
      messages.splice(0, messages.length - 100);
    }
    this.chatMessages.set(roomId, messages);
    return message;
  }

  setChatMuted(
    roomId: string,
    hostId: string,
    targetId: string,
    muted: boolean,
  ): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Комната не найдена");

    this.assertHost(room, hostId);

    if (hostId === targetId) {
      throw new Error("Нельзя заглушить себя");
    }

    const target = room.players.find((p) => p.id === targetId);
    if (!target) throw new Error("Игрок не найден");

    const mutedSet = new Set(room.chatMutedIds ?? []);
    if (muted) {
      mutedSet.add(targetId);
    } else {
      mutedSet.delete(targetId);
    }
    room.chatMutedIds = Array.from(mutedSet);
    return room;
  }
}

export const roomStore = new RoomStore();
