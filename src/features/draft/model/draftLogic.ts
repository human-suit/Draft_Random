import { Hero } from "@entities/hero/model/types";
import { Team, Phase, phases } from "./phases";
import { generateDraftPool, POOL_SIZE_PER_ATTRIBUTE } from "./heroPool";

export interface DraftState {
  pool: Hero[];
  radiant: Hero[];
  dire: Hero[];
  banned: Hero[];
  currentPhase: number;
}

export function createEmptyDraft(): DraftState {
  return {
    pool: [],
    radiant: [],
    dire: [],
    banned: [],
    currentPhase: 0,
  };
}

export function generateInitialDraft(excludedHeroIds: number[] = []): DraftState {
  return {
    pool: generateDraftPool(POOL_SIZE_PER_ATTRIBUTE, excludedHeroIds),
    radiant: [],
    dire: [],
    banned: [],
    currentPhase: 0,
  };
}

export function getPickedHeroIds(draft: DraftState): number[] {
  return [...draft.radiant, ...draft.dire].map((h) => h.id);
}

export function isDraftComplete(draft: DraftState): boolean {
  return draft.currentPhase >= phases.length;
}

export function getCurrentPhase(draft: DraftState): Phase | null {
  if (isDraftComplete(draft)) return null;
  return phases[draft.currentPhase];
}

export function isHeroInPool(draft: DraftState, hero: Hero): boolean {
  return draft.pool.some((h) => h.id === hero.id);
}

export function isHeroTaken(draft: DraftState, hero: Hero): boolean {
  return (
    draft.banned.some((h) => h.id === hero.id) ||
    draft.radiant.some((h) => h.id === hero.id) ||
    draft.dire.some((h) => h.id === hero.id)
  );
}

export function canTeamAct(team: Team, draft: DraftState): boolean {
  const phase = getCurrentPhase(draft);
  return phase?.team === team;
}

export function getAvailablePoolHeroes(draft: DraftState): Hero[] {
  return draft.pool.filter((h) => !isHeroTaken(draft, h));
}

export function pickRandomAvailableHero(draft: DraftState): Hero | null {
  const available = getAvailablePoolHeroes(draft);
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

export function applyPhase(draft: DraftState, hero: Hero): DraftState {
  if (isDraftComplete(draft)) return draft;
  if (!isHeroInPool(draft, hero)) return draft;
  if (isHeroTaken(draft, hero)) return draft;

  const phase = phases[draft.currentPhase];
  const newDraft: DraftState = {
    ...draft,
    currentPhase: draft.currentPhase + 1,
  };

  if (phase.type === "BAN") {
    newDraft.banned = [...draft.banned, hero];
  } else if (phase.type === "PICK") {
    if (phase.team === "RADIANT") {
      newDraft.radiant = [...draft.radiant, hero];
    } else {
      newDraft.dire = [...draft.dire, hero];
    }
  }

  return newDraft;
}

export interface DraftTimelineSlot {
  index: number;
  phase: Phase;
  hero: Hero | null;
  isActive: boolean;
  isDone: boolean;
}

export function buildDraftTimeline(draft: DraftState): DraftTimelineSlot[] {
  let banIndex = 0;
  let radiantIndex = 0;
  let direIndex = 0;

  return phases.map((phase, index) => {
    let hero: Hero | null = null;
    const isDone = index < draft.currentPhase;

    if (isDone) {
      if (phase.type === "BAN") {
        hero = draft.banned[banIndex++] ?? null;
      } else if (phase.team === "RADIANT") {
        hero = draft.radiant[radiantIndex++] ?? null;
      } else {
        hero = draft.dire[direIndex++] ?? null;
      }
    }

    return {
      index,
      phase,
      hero,
      isActive: index === draft.currentPhase && !isDraftComplete(draft),
      isDone,
    };
  });
}
