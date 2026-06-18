export type HeroAttribute =
  | "strength"
  | "agility"
  | "intelligence"
  | "universal";

export interface Hero {
  id: number;
  name: string;
  slug: string;
  attribute: HeroAttribute;
}
