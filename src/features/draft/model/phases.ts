export type Team = "RADIANT" | "DIRE";
export type PhaseType = "BAN" | "PICK";

export interface Phase {
  team: Team;
  type: PhaseType;
}

export const phases: Phase[] = [
  { team: "RADIANT", type: "BAN" },
  { team: "DIRE", type: "BAN" },
  { team: "RADIANT", type: "BAN" },
  { team: "DIRE", type: "BAN" },
  { team: "RADIANT", type: "PICK" },
  { team: "DIRE", type: "PICK" },
  { team: "DIRE", type: "PICK" },
  { team: "RADIANT", type: "PICK" },
  { team: "RADIANT", type: "PICK" },
  { team: "DIRE", type: "PICK" },
  { team: "DIRE", type: "PICK" },
  { team: "RADIANT", type: "PICK" },
  { team: "RADIANT", type: "PICK" },
  { team: "DIRE", type: "PICK" },
];
