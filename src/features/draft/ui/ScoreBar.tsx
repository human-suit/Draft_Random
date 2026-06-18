import { SeriesScore } from "@entities/room/model/types";
import styles from "./draft-board.module.css";

interface Props {
  score: SeriesScore;
  radiantName?: string;
  direName?: string;
}

export default function ScoreBar({
  score,
  radiantName = "RADIANT",
  direName = "DIRE",
}: Props) {
  return (
    <div className={styles.scoreBar}>
      <div className={styles.scoreTeam}>
        <span className={styles.scoreName}>{radiantName}</span>
        <span className={`${styles.scoreValue} ${styles.scoreRadiant}`}>
          {score.radiant}
        </span>
      </div>
      <span className={styles.scoreDivider}>:</span>
      <div className={styles.scoreTeam}>
        <span className={`${styles.scoreValue} ${styles.scoreDire}`}>
          {score.dire}
        </span>
        <span className={styles.scoreName}>{direName}</span>
      </div>
    </div>
  );
}
