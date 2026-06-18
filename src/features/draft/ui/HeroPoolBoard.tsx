import { Hero, HeroAttribute } from "@entities/hero/model/types";
import {
  ATTRIBUTE_LABELS,
  ATTRIBUTE_ORDER,
} from "@entities/hero/model/heroes";
import { groupPoolByAttribute } from "@features/draft/model/heroPool";
import HeroPortrait from "./HeroPortrait";
import styles from "./draft-board.module.css";

interface Props {
  pool: Hero[];
  takenIds: Set<number>;
  bannedIds: Set<number>;
  canAct: boolean;
  onSelect: (heroId: number) => void;
}

export default function HeroPoolBoard({
  pool,
  takenIds,
  bannedIds,
  canAct,
  onSelect,
}: Props) {
  const grouped = groupPoolByAttribute(pool);

  return (
    <div className={styles.poolBoard}>
      {ATTRIBUTE_ORDER.map((attribute) => (
        <AttributeColumn
          key={attribute}
          attribute={attribute}
          heroes={grouped[attribute]}
          takenIds={takenIds}
          bannedIds={bannedIds}
          canAct={canAct}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function AttributeColumn({
  attribute,
  heroes,
  takenIds,
  bannedIds,
  canAct,
  onSelect,
}: {
  attribute: HeroAttribute;
  heroes: Hero[];
  takenIds: Set<number>;
  bannedIds: Set<number>;
  canAct: boolean;
  onSelect: (heroId: number) => void;
}) {
  return (
    <div className={`${styles.attrColumn} ${styles[attribute]}`}>
      <div className={styles.attrHeader}>
        <span className={styles.attrIcon} />
        <span>{ATTRIBUTE_LABELS[attribute]}</span>
      </div>
      <div className={styles.attrGrid}>
        {heroes.map((hero) => (
          <HeroPortrait
            key={hero.id}
            hero={hero}
            size="xl"
            taken={takenIds.has(hero.id)}
            banned={bannedIds.has(hero.id)}
            onClick={() => onSelect(hero.id)}
            disabled={!canAct}
          />
        ))}
      </div>
    </div>
  );
}
