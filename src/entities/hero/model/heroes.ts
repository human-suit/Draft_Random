import type { Hero, HeroAttribute } from "./types";
import heroesData from "./heroes.json";

export const heroes: Hero[] = heroesData as Hero[];

export const HERO_IMAGE_CDN =
  "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes";

export function getHeroImageUrl(slug: string): string {
  return `${HERO_IMAGE_CDN}/${slug}.png`;
}

export function getHeroById(id: number): Hero | undefined {
  return heroes.find((h) => h.id === id);
}

export function getHeroesByAttribute(attribute: HeroAttribute): Hero[] {
  return heroes.filter((h) => h.attribute === attribute);
}

export const ATTRIBUTE_LABELS: Record<HeroAttribute, string> = {
  strength: "СИЛА",
  agility: "ЛОВКОСТЬ",
  intelligence: "ИНТЕЛЛЕКТ",
  universal: "УНИВЕРСАЛЬНЫЕ",
};

export const ATTRIBUTE_ORDER: HeroAttribute[] = [
  "strength",
  "agility",
  "intelligence",
  "universal",
];

export type { Hero, HeroAttribute };
