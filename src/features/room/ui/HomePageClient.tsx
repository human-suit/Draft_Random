"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRoomSocket } from "@features/room/lib/useRoomSocket";
import { usePlayerIdentity } from "@features/room/lib/usePlayerIdentity";
import { getStatusLabel } from "@features/room/lib/roomLabels";
import { useLoadingOverlay } from "@shared/ui/LoadingProvider";
import styles from "@features/room/ui/room.module.css";

export default function HomePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showLoader, hideLoader } = useLoadingOverlay();
  const { playerId, playerName, updateName, ready } = usePlayerIdentity();
  const {
    connected,
    error,
    publicRooms,
    createRoom,
    createTestRoom,
    joinRoom,
    listRooms,
    clearError,
  } = useRoomSocket();

  const [name, setName] = useState("");
  const [roomName, setRoomName] = useState("Новая комната");
  const [mapCount, setMapCount] = useState(1);
  const [joinCode, setJoinCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const kicked = searchParams.get("kicked") === "1";
  const closed = searchParams.get("closed") === "1";

  useEffect(() => {
    if (playerName) setName(playerName);
  }, [playerName]);

  useEffect(() => {
    if (!connected) return;
    listRooms().catch(() => {});
  }, [connected, listRooms]);

  useEffect(() => {
    if (!ready) {
      showLoader("Инициализация профиля...");
    } else {
      hideLoader();
    }
  }, [ready, showLoader, hideLoader]);

  const ensureName = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      alert("Введите имя");
      return null;
    }
    updateName(trimmed);
    return trimmed;
  };

  const handleCreate = async () => {
    const trimmed = ensureName();
    if (!trimmed || !playerId) return;

    setLoading(true);
    showLoader("Создание комнаты...");
    clearError();
    try {
      const room = await createRoom(playerId, trimmed, {
        name: roomName,
        mapCount,
      });
      router.push(`/room/${room.id}`);
    } catch {
      // error shown via hook
    } finally {
      setLoading(false);
      hideLoader();
    }
  };

  const handleCreateTest = async () => {
    const trimmed = ensureName();
    if (!trimmed || !playerId) return;
    if (!connected) {
      alert("Сервер офлайн. Запустите npm run dev");
      return;
    }

    setLoading(true);
    showLoader("Тестовая комната...");
    clearError();
    try {
      const room = await createTestRoom(playerId, trimmed);
      router.push(`/room/${room.id}`);
    } catch {
      // error shown via hook
    } finally {
      setLoading(false);
      hideLoader();
    }
  };

  const handleJoin = async (code?: string) => {
    const trimmed = ensureName();
    if (!trimmed || !playerId) return;

    setLoading(true);
    showLoader("Вход в комнату...");
    clearError();
    try {
      const room = await joinRoom({
        code: code ?? joinCode,
        playerId,
        playerName: trimmed,
        password: password || undefined,
      });
      router.push(`/room/${room.id}`);
    } catch {
      // error shown via hook
    } finally {
      setLoading(false);
      hideLoader();
    }
  };

  if (!ready) {
    return null;
  }

  return (
    <div className={styles.home}>
      <header className={styles.homeHeader}>
        <h1>Dota Draft</h1>
        <p>Captains Mode — создавайте комнаты и драфтите вместе</p>
        <div className={styles.connectionStatus}>
          <span
            className={`${styles.dot} ${connected ? styles.online : styles.offline}`}
          />
          {connected ? "Сервер онлайн" : "Сервер офлайн"}
        </div>
      </header>

      {kicked && (
        <div className={styles.errorBanner}>Вас исключили из комнаты</div>
      )}
      {closed && (
        <div className={styles.errorBanner}>Лобби было удалено хостом</div>
      )}
      {error && <div className={styles.errorBanner}>{error}</div>}

      <section className={styles.card}>
        <h2>Ваш профиль</h2>
        <label className={styles.field}>
          <span>Имя</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Введите ник"
            maxLength={24}
          />
        </label>
      </section>

      <section className={`${styles.card} ${styles.testCard}`}>
        <h2>Тестовый режим</h2>
        <p className={styles.muted}>
          Проверьте драфт в одиночку — без второго игрока
        </p>
        <div className={styles.testActions}>
          <Link href="/draft" className={styles.secondaryBtn}>
            Локальный драфт
          </Link>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={handleCreateTest}
            disabled={loading || !connected}
          >
            {loading ? "Создание..." : "Тестовая комната"}
          </button>
        </div>
        <p className={styles.hint}>
          <strong>Локальный</strong> — работает без сервера.{" "}
          <strong>Тестовая комната</strong> — через socket, вы управляете обеими
          командами.
        </p>
      </section>

      <div className={styles.homeGrid}>
        <section className={styles.card}>
          <h2>Создать комнату</h2>
          <label className={styles.field}>
            <span>Название комнаты</span>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              maxLength={40}
            />
          </label>
          <label className={styles.field}>
            <span>Количество карт (1–5)</span>
            <select
              className={styles.select}
              value={mapCount}
              onChange={(e) => setMapCount(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "карта" : n < 5 ? "карты" : "карт"}
                </option>
              ))}
            </select>
          </label>
          <p className={styles.hint}>
            Пикнутые герои не попадут в пул на следующих картах
          </p>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={handleCreate}
            disabled={loading || !connected}
          >
            Создать
          </button>
        </section>

        <section className={styles.card}>
          <h2>Войти по коду</h2>
          <label className={styles.field}>
            <span>Код комнаты</span>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
            />
          </label>
          <label className={styles.field}>
            <span>Пароль (если есть)</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => handleJoin()}
            disabled={loading || !connected || !joinCode}
          >
            Войти
          </button>
        </section>
      </div>

      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <h2>Публичные комнаты</h2>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => listRooms()}
            disabled={!connected}
          >
            Обновить
          </button>
        </div>
        {publicRooms.length === 0 ? (
          <p className={styles.muted}>Пока нет открытых комнат</p>
        ) : (
          <ul className={styles.roomList}>
            {publicRooms.map((room) => (
              <li key={room.id} className={styles.roomListItem}>
                <div>
                  <strong>{room.settings.name}</strong>
                  <span className={styles.muted}>
                    {" "}
                    · {room.players.length} игр. · {getStatusLabel(room.status)}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => handleJoin(room.code)}
                  disabled={loading || !connected}
                >
                  Войти
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
