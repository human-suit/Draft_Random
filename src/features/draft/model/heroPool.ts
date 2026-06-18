import { Hero, HeroAttribute } from "@entities/hero/model/types";
import { heroes } from "@entities/hero/model/heroes";

export const POOL_SIZE_PER_ATTRIBUTE = 7;

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateDraftPool(
  sizePerAttribute = POOL_SIZE_PER_ATTRIBUTE,
  excludedHeroIds: number[] = [],
): Hero[] {
  const excluded = new Set(excludedHeroIds);
  const attributes: HeroAttribute[] = [
    "strength",
    "agility",
    "intelligence",
    "universal",
  ];

  const pool: Hero[] = [];

  for (const attribute of attributes) {
    const candidates = heroes.filter(
      (h) => h.attribute === attribute && !excluded.has(h.id),
    );
    const picked = shuffle(candidates).slice(0, sizePerAttribute);
    pool.push(...picked);
  }

  return pool;
}

export function groupPoolByAttribute(
  pool: Hero[],
): Record<HeroAttribute, Hero[]> {
  return {
    strength: pool.filter((h) => h.attribute === "strength"),
    agility: pool.filter((h) => h.attribute === "agility"),
    intelligence: pool.filter((h) => h.attribute === "intelligence"),
    universal: pool.filter((h) => h.attribute === "universal"),
  };
}
