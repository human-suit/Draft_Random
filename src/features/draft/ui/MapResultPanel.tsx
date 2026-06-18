import { WinnerTeam } from "@entities/room/model/types";
import styles from "./draft-board.module.css";

interface Props {
  radiantName?: string;
  direName?: string;
  currentMap: number;
  mapCount: number;
  canPickWinner: boolean;
  onRecordWinner?: (winner: WinnerTeam) => void;
}

export default function MapResultPanel({
  radiantName = "RADIANT",
  direName = "DIRE",
  currentMap,
  mapCount,
  canPickWinner,
  onRecordWinner,
}: Props) {
  return (
    <section className={styles.winnerPanel}>
      <div className={styles.winnerPanelHeader}>
        <span className={styles.winnerPanelTag}>ИТОГ КАРТЫ {currentMap}</span>
        <p className={styles.winnerPanelHint}>
          {mapCount > 1
            ? `Кто победил на карте ${currentMap}?`
            : "Кто победил в матче?"}
        </p>
      </div>

      {canPickWinner && onRecordWinner ? (
        <div className={styles.winnerButtons}>
          <button
            type="button"
            className={styles.winnerRadiantBtn}
            onClick={() => onRecordWinner("RADIANT")}
          >
            {radiantName} победил
          </button>
          <button
            type="button"
            className={styles.winnerDireBtn}
            onClick={() => onRecordWinner("DIRE")}
          >
            {direName} победил
          </button>
        </div>
      ) : (
        <p className={styles.mapResultWait}>
          Ожидание выбора хоста...
        </p>
      )}
    </section>
  );
}
