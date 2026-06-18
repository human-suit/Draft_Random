"use client";

import { useEffect, useState } from "react";

const PLAYER_ID_KEY = "dota_player_id";
const PLAYER_NAME_KEY = "dota_player_name";

export function getOrCreatePlayerId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

export function getPlayerName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(PLAYER_NAME_KEY) ?? "";
}

export function savePlayerName(name: string): void {
  localStorage.setItem(PLAYER_NAME_KEY, name.trim());
}

export function usePlayerIdentity() {
  const [playerId, setPlayerId] = useState("");
  const [playerName, setPlayerName] = useState("");

  useEffect(() => {
    setPlayerId(getOrCreatePlayerId());
    setPlayerName(getPlayerName());
  }, []);

  const updateName = (name: string) => {
    savePlayerName(name);
    setPlayerName(name);
  };

  return { playerId, playerName, updateName, ready: Boolean(playerId) };
}
