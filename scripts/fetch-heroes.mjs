const map = {
  str: "strength",
  agi: "agility",
  int: "intelligence",
  all: "universal",
};

const heroes = await fetch("https://api.opendota.com/api/heroes").then((r) =>
  r.json(),
);

const items = heroes.map((h) => {
  const slug = h.name.replace("npc_dota_hero_", "");
  const attribute = map[h.primary_attr] || "universal";
  return {
    id: h.id,
    name: h.localized_name,
    slug,
    attribute,
  };
});

console.log(JSON.stringify(items, null, 2));
