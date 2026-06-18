import {
  CaptainRole,
  Player,
  PlayerRole,
  Room,
  areCaptainsReady,
  getCaptainByTeam,
  isCaptain,
  isPlayerChatMuted,
} from "@entities/room/model/types";
import { getRoleLabel } from "../lib/roomLabels";
import styles from "./room.module.css";

interface Props {
  room: Room;
  currentPlayerId: string;
  isHost: boolean;
  compact?: boolean;
  onKick: (playerId: string) => void;
  onAssignRole: (playerId: string, role: PlayerRole) => void;
  onClaimCaptain: (role: CaptainRole) => void;
  onReleaseCaptain: () => void;
  onToggleChatMute: (playerId: string, muted: boolean) => void;
}

const CAPTAIN_SLOTS: { role: CaptainRole; label: string; teamClass: string }[] =
  [
    { role: "captain_radiant", label: "Radiant", teamClass: styles.radiantSlot },
    { role: "captain_dire", label: "Dire", teamClass: styles.direSlot },
  ];

export default function PlayerList({
  room,
  currentPlayerId,
  isHost,
  compact = false,
  onKick,
  onAssignRole,
  onClaimCaptain,
  onReleaseCaptain,
  onToggleChatMute,
}: Props) {
  const currentPlayer = room.players.find((p) => p.id === currentPlayerId);
  const participants = sortParticipants(room.players);
  const canClaim =
    !compact &&
    room.status === "lobby" &&
    currentPlayer &&
    !isCaptain(currentPlayer.role);

  return (
    <div className={styles.playerList}>
      <h3>Капитаны ({areCaptainsReady(room) ? 2 : getCaptainsCount(room)}/2)</h3>
      <div className={styles.captainSlots}>
        {CAPTAIN_SLOTS.map(({ role, label, teamClass }) => {
          const captain = getCaptainByTeam(room, role);
          const isMine = captain?.id === currentPlayerId;

          return (
            <div key={role} className={`${styles.captainSlot} ${teamClass}`}>
              <span className={styles.slotLabel}>{label}</span>
              {captain ? (
                <div className={styles.slotPlayer}>
                  <span>{captain.name}{isMine ? " (вы)" : ""}</span>
                  {isMine && !compact && room.status === "lobby" && (
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={onReleaseCaptain}
                    >
                      Снять роль
                    </button>
                  )}
                </div>
              ) : canClaim ? (
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => onClaimCaptain(role)}
                >
                  Стать капитаном
                </button>
              ) : (
                <span className={styles.muted}>Свободно</span>
              )}
            </div>
          );
        })}
      </div>

      {canClaim && (
        <p className={styles.hint}>
          Займите свободный слот капитана или оставайтесь зрителем
        </p>
      )}

      {isHost && !compact && room.status === "lobby" && (
        <p className={styles.hint}>
          Вы можете занять слот капитана или назначить капитанов из списка зрителей
        </p>
      )}

      {!compact && (
        <>
          <h3 className={styles.spectatorsTitle}>
            Участники ({participants.length})
          </h3>
          <div className={styles.playersScrollArea}>
            <ul className={styles.playersList}>
              {participants.length === 0 && (
                <li className={styles.muted}>Нет участников</li>
              )}
              {participants.map((player: Player) => {
                const chatMuted = isPlayerChatMuted(room, player.id);

                return (
                <li key={player.id} className={styles.playerItem}>
                  <div className={styles.playerInfo}>
                    <span className={styles.playerName}>
                      {player.name}
                      {player.id === currentPlayerId && " (вы)"}
                      {chatMuted && (
                        <span className={styles.mutedBadge} title="Заглушён в чате">
                          {" "}🔇
                        </span>
                      )}
                    </span>
                    <span
                      className={`${styles.roleBadge} ${styles[player.role]}`}
                    >
                      {getRoleLabel(player.role)}
                      {isCaptain(player.role) && player.isReady && " ✓"}
                    </span>
                  </div>

                  {isHost && player.id !== currentPlayerId && (
                    <div className={styles.playerActions}>
                      <button
                        type="button"
                        className={
                          chatMuted ? styles.unmuteBtn : styles.muteBtn
                        }
                        onClick={() =>
                          onToggleChatMute(player.id, !chatMuted)
                        }
                        title={
                          chatMuted
                            ? "Разрешить писать в чат"
                            : "Заглушить в чате"
                        }
                      >
                        {chatMuted ? "🔊" : "🔇"}
                      </button>

                      {room.status === "lobby" &&
                        player.role === "spectator" && (
                          <>
                            <button
                              type="button"
                              className={styles.radiantAssignBtn}
                              onClick={() =>
                                onAssignRole(player.id, "captain_radiant")
                              }
                            >
                              Radiant
                            </button>
                            <button
                              type="button"
                              className={styles.direAssignBtn}
                              onClick={() =>
                                onAssignRole(player.id, "captain_dire")
                              }
                            >
                              Dire
                            </button>
                            <button
                              type="button"
                              className={styles.dangerBtn}
                              onClick={() => onKick(player.id)}
                            >
                              Кик
                            </button>
                          </>
                        )}
                    </div>
                  )}
                </li>
              );
              })}
            </ul>
          </div>
        </>
      )}

      {compact && isHost && (
        <>
          <h3 className={styles.spectatorsTitle}>
            Участники ({participants.length})
          </h3>
          <ul className={styles.compactPlayersList}>
            {participants.map((player) => {
              const chatMuted = isPlayerChatMuted(room, player.id);
              return (
                <li key={player.id} className={styles.compactPlayerItem}>
                  <span className={styles.compactPlayerName}>
                    {player.name}
                    {chatMuted && " 🔇"}
                  </span>
                  {player.id !== currentPlayerId && (
                    <button
                      type="button"
                      className={chatMuted ? styles.unmuteBtn : styles.muteBtn}
                      onClick={() => onToggleChatMute(player.id, !chatMuted)}
                      title={
                        chatMuted
                          ? "Разрешить писать в чат"
                          : "Заглушить в чате"
                      }
                    >
                      {chatMuted ? "🔊" : "🔇"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {compact && !isHost && participants.length > 0 && (
        <p className={styles.compactSpectators}>
          Участники: {participants.map((p) => p.name).join(", ")}
        </p>
      )}
    </div>
  );
}

function getCaptainsCount(room: Room): number {
  return room.players.filter((p) => isCaptain(p.role)).length;
}

const ROLE_ORDER: Record<PlayerRole, number> = {
  host: 0,
  captain_radiant: 1,
  captain_dire: 2,
  spectator: 3,
};

function sortParticipants(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    const byRole = ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
    return byRole !== 0 ? byRole : a.joinedAt - b.joinedAt;
  });
}
