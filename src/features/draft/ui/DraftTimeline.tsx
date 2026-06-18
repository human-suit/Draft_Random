import { buildDraftTimeline, getCurrentPhase } from "@features/draft/model/draftLogic";
import { DraftState } from "@features/draft/model/draftLogic";
import HeroPortrait from "./HeroPortrait";
import styles from "./draft-board.module.css";

interface Props {
  draft: DraftState;
  radiantName?: string;
  direName?: string;
  currentMap?: number;
  mapCount?: number;
}

export default function DraftTimeline({
  draft,
  radiantName = "RADIANT",
  direName = "DIRE",
  currentMap = 1,
  mapCount = 1,
}: Props) {
  const slots = buildDraftTimeline(draft);
  const activePhase = getCurrentPhase(draft);
  const activeSlot = slots.find((s) => s.isActive);
  const isBan = activePhase?.type === "BAN";

  const radiantSlots = slots.filter((s) => s.phase.team === "RADIANT");
  const direSlots = slots.filter((s) => s.phase.team === "DIRE");

  return (
    <aside className={styles.timeline}>
      {activePhase && (
        <div
          className={`${styles.phaseBanner} ${isBan ? styles.phaseBannerBan : styles.phaseBannerPick}`}
        >
          <span className={styles.phaseBannerType}>
            {isBan ? "БАН" : "ПИК"}
          </span>
          <span className={styles.phaseBannerTeam}>
            {activePhase.team === "RADIANT" ? radiantName : direName}
          </span>
        </div>
      )}

      <div className={styles.timelineColumns}>
        <TeamColumn
          name={radiantName}
          slots={radiantSlots}
          columnClass={styles.radiantColumn}
          isActiveTeam={activePhase?.team === "RADIANT"}
          activeType={activePhase?.team === "RADIANT" ? activePhase.type : null}
        />
        <TeamColumn
          name={direName}
          slots={direSlots}
          columnClass={styles.direColumn}
          isActiveTeam={activePhase?.team === "DIRE"}
          activeType={activePhase?.team === "DIRE" ? activePhase.type : null}
        />
      </div>

      <div
        className={`${styles.statusBox} ${isBan ? styles.statusBan : styles.statusPick}`}
      >
        <div className={styles.statusLabel}>
          {activePhase?.type === "BAN" ? "БАН" : "ПИК"}
        </div>
        <div className={styles.statusValue}>
          {activeSlot?.hero?.name?.toUpperCase() ?? "—"}
        </div>
      </div>

      {mapCount > 1 && (
        <div className={styles.mapTracker}>
          {Array.from({ length: mapCount }, (_, i) => i + 1).map((map) => (
            <div
              key={map}
              className={[
                styles.mapSlot,
                map === currentMap ? styles.mapSlotActive : "",
                map < currentMap ? styles.mapSlotDone : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              MAP {map}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

function TeamColumn({
  name,
  slots,
  columnClass,
  isActiveTeam,
  activeType,
}: {
  name: string;
  slots: ReturnType<typeof buildDraftTimeline>;
  columnClass: string;
  isActiveTeam: boolean;
  activeType: "BAN" | "PICK" | null;
}) {
  return (
    <div
      className={[
        styles.teamColumn,
        columnClass,
        isActiveTeam && activeType === "BAN" ? styles.teamColumnBan : "",
        isActiveTeam && activeType === "PICK" ? styles.teamColumnPick : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.teamColumnHeader}>
        <span>{name}</span>
        {isActiveTeam && activeType && (
          <span
            className={`${styles.teamPhaseBadge} ${activeType === "BAN" ? styles.badgeBan : styles.badgePick}`}
          >
            {activeType === "BAN" ? "BAN" : "PICK"}
          </span>
        )}
      </div>
      <div className={styles.teamStaggerGrid}>
        {slots.map((slot, index) => {
          const isBan = slot.phase.type === "BAN";
          const staggerClass =
            index % 2 === 0 ? styles.staggerLeft : styles.staggerRight;

          return (
            <div
              key={slot.index}
              className={[
                styles.teamSlot,
                staggerClass,
                slot.isActive ? styles.teamSlotActive : "",
                slot.isDone ? styles.teamSlotDone : "",
                isBan ? styles.teamSlotBan : styles.teamSlotPick,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className={styles.teamSlotNumber}>{slot.index + 1}</span>
              <SlotContent slot={slot} variant={isBan ? "ban" : "pick"} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SlotContent({
  slot,
  variant,
}: {
  slot: ReturnType<typeof buildDraftTimeline>[number];
  variant: "ban" | "pick";
}) {
  if (slot.hero) {
    return (
      <HeroPortrait
        hero={slot.hero}
        size="sm"
        taken={variant === "ban"}
      />
    );
  }

  if (slot.isActive) {
    return (
      <div
        className={`${styles.slotEmpty} ${variant === "ban" ? styles.emptyban : styles.emptypick}`}
      >
        {variant === "ban" ? "BAN" : "PICK"}
      </div>
    );
  }

  return <div className={styles.teamSlotPlaceholder} />;
}
