"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "@entities/room/model/types";
import styles from "./room.module.css";

interface Props {
  messages: ChatMessage[];
  currentPlayerId: string;
  onSend: (text: string) => Promise<void>;
  isMuted?: boolean;
  compact?: boolean;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RoomChat({
  messages,
  currentPlayerId,
  onSend,
  isMuted = false,
  compact = false,
}: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      await onSend(trimmed);
      setText("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`${styles.roomChat} ${compact ? styles.roomChatCompact : ""}`}>
      <h3 className={styles.chatTitle}>Чат</h3>
      <div ref={listRef} className={styles.chatMessages}>
        {messages.length === 0 && (
          <p className={styles.muted}>Сообщений пока нет</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.chatMessage} ${
              msg.playerId === currentPlayerId ? styles.chatMessageOwn : ""
            }`}
          >
            <div className={styles.chatMessageMeta}>
              <span className={styles.chatAuthor}>{msg.playerName}</span>
              <span className={styles.chatTime}>{formatTime(msg.createdAt)}</span>
            </div>
            <p className={styles.chatText}>{msg.text}</p>
          </div>
        ))}
      </div>
      <form className={styles.chatForm} onSubmit={handleSubmit}>
        {isMuted && (
          <p className={styles.chatMutedNotice}>
            Хост заглушил вас в чате
          </p>
        )}
        <div className={styles.chatFormRow}>
          <input
            type="text"
            className={styles.chatInput}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              isMuted ? "Вы не можете писать..." : "Написать сообщение..."
            }
            maxLength={400}
            disabled={sending || isMuted}
          />
          <button
            type="submit"
            className={styles.primaryBtn}
            disabled={sending || isMuted || !text.trim()}
          >
            {sending ? "..." : "→"}
          </button>
        </div>
      </form>
    </div>
  );
}
