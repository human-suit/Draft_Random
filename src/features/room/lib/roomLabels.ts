import { PlayerRole } from "@entities/room/model/types";

const ROLE_LABELS: Record<PlayerRole, string> = {
  host: "Хост",
  captain_radiant: "Капитан Radiant",
  captain_dire: "Капитан Dire",
  spectator: "Зритель",
};

export function getRoleLabel(role: PlayerRole): string {
  return ROLE_LABELS[role];
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "lobby":
      return "Лобби";
    case "drafting":
      return "Драфт";
    case "awaiting_result":
      return "Итог карты";
    case "finished":
      return "Завершён";
    default:
      return status;
  }
}
