"use client";

import styles from "./dota-loader.module.css";

interface Props {
  message?: string;
  inline?: boolean;
}

export default function DotaLoader({
  message = "Подготовка арены",
  inline = false,
}: Props) {
  return (
    <div
      className={inline ? styles.inline : styles.overlay}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className={styles.content}>
        <div className={styles.emblem}>
          <div className={styles.ring} />
          <div className={styles.ringInner} />
          <div className={styles.core} />
        </div>
        <p className={styles.title}>ЗАГРУЗКА</p>
        {message && <p className={styles.message}>{message}</p>}
        <div className={styles.dots} aria-hidden>
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
