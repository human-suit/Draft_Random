"use client";

import { useState } from "react";
import { Room, RoomSettings } from "@entities/room/model/types";
import styles from "./room.module.css";

interface Props {
  room: Room;
  onSave: (settings: Partial<RoomSettings>) => Promise<void>;
}

export default function RoomSettingsPanel({ room, onSave }: Props) {
  const [settings, setSettings] = useState(room.settings);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(settings);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={styles.settingsPanel} onSubmit={handleSubmit}>
      <h3>Настройки комнаты</h3>
      <p className={styles.hint}>
        В драфте участвуют 2 капитана. Хост может занять один из слотов.
      </p>

      <label className={styles.field}>
        <span>Название</span>
        <input
          type="text"
          value={settings.name}
          onChange={(e) => setSettings({ ...settings, name: e.target.value })}
          maxLength={40}
        />
      </label>

      <label className={styles.field}>
        <span>Количество карт (1–5)</span>
        <select
          className={styles.select}
          value={settings.mapCount ?? 1}
          onChange={(e) =>
            setSettings({ ...settings, mapCount: Number(e.target.value) })
          }
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>Макс. зрителей</span>
        <input
          type="number"
          min={0}
          max={100}
          value={settings.maxSpectators}
          onChange={(e) =>
            setSettings({
              ...settings,
              maxSpectators: Number(e.target.value),
            })
          }
        />
      </label>

      <label className={styles.field}>
        <span>Таймер на пик (сек, 0 = без таймера)</span>
        <input
          type="number"
          min={0}
          max={120}
          value={settings.pickTimerSeconds}
          onChange={(e) =>
            setSettings({
              ...settings,
              pickTimerSeconds: Number(e.target.value),
            })
          }
        />
      </label>

      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={settings.isPrivate}
          onChange={(e) =>
            setSettings({ ...settings, isPrivate: e.target.checked })
          }
        />
        Приватная комната
      </label>

      {settings.isPrivate && (
        <label className={styles.field}>
          <span>Пароль</span>
          <input
            type="password"
            value={settings.password}
            onChange={(e) =>
              setSettings({ ...settings, password: e.target.value })
            }
          />
        </label>
      )}

      <button type="submit" className={styles.primaryBtn} disabled={saving}>
        {saving ? "Сохранение..." : "Сохранить настройки"}
      </button>
    </form>
  );
}
