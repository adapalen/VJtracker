/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PlayerSymbol = "X" | "O";

export interface Position {
  x: number;
  y: number;
}

export type GameMode = "PVP" | "AI" | "ONLINE";

export type AIDifficulty = "NOVICE" | "SENTINEL" | "OVERLORD" | "SINGULARITY";

export type GameStatus = "MENU" | "PLAYING" | "WON" | "DRAW";

export interface MatchRecord {
  id: string;
  opponentName: string;
  opponentElo: number;
  result: "WIN" | "LOSS" | "DRAW";
  eloChange: number;
  date: string;
  movesCount: number;
}

export interface PlayerProfile {
  name: string;
  elo: number;
  matches: MatchRecord[];
  countryCode?: string;
  countryName?: string;
  countryFlag?: string;
  coins?: number; // Virtual currency
  unlockedThemes?: string[]; // IDs of unlocked board themes
  unlockedMarkings?: string[]; // IDs of unlocked markings
  activeTheme?: string; // ID of active board theme
  activeMarking?: string; // ID of active marking style
}

export interface LeaderboardEntry {
  name: string;
  elo: number;
  wins: number;
  losses: number;
  isPlayer?: boolean;
  status: "ONLINE" | "OFFLINE" | "IN_GAME";
  avatarSeed: string;
  countryCode?: string;
  countryName?: string;
  countryFlag?: string;
}
