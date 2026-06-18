import Link from "next/link";
import SoloDraftPanel from "@features/draft/ui/SoloDraftPanel";
import styles from "./draft.module.css";

export default function DraftPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Локальный тест</h1>
        <p>
          28 героев в пуле (7 на атрибут). Captains Mode — пики справа.
        </p>
        <Link href="/" className={styles.link}>
          ← На главную
        </Link>
      </header>
      <SoloDraftPanel />
    </div>
  );
}
