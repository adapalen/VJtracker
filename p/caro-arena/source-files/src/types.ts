/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PlayerSymbol = "X" | "O";

export interface Position {
  x: number;
  y: number;
}

export type GameMode = "PVP" | "AI" | "ONLINE" | "PUZZLE" | "TRAINING";

export type AIDifficulty = "NOVICE" | "SENTINEL" | "OVERLORD" | "SINGULARITY";

export type GameStatus = "MENU" | "PLAYING" | "WON" | "DRAW";

export type GameRule = "FREE" | "VN_BLOCKED_ENDS";

export interface MoveStep {
  x: number;
  y: number;
  symbol: PlayerSymbol;
  step: number;
  timestamp?: number;
}

export interface MatchRecord {
  id: string;
  opponentName: string;
  opponentElo: number;
  result: "WIN" | "LOSS" | "DRAW";
  eloChange: number;
  date: string;
  movesCount: number;
  playerAccuracy?: number;
  opponentAccuracy?: number;
  criticalTurn?: number | null;
  criticalTurnReason?: string | null;
  isTimeout?: boolean;
  oldElo?: number;
  newElo?: number;
  movesList?: MoveStep[];
  ruleUsed?: GameRule;
}

export interface EmoteItem {
  id: string;
  sender: "PLAYER" | "OPPONENT" | "AI";
  type: "EMOJI" | "TEXT";
  content: string;
  x?: number;
  y?: number;
  timestamp: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rewardCoins: number;
  maxProgress: number;
  category: "COMBAT" | "MASTERY" | "COLLECTION";
}

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
  targetCount: number;
  currentCount: number;
  isCompleted: boolean;
  isClaimed: boolean;
}

export interface CaroPuzzle {
  id: string;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "MASTER";
  description: string;
  playerSymbol: PlayerSymbol;
  initialBoard: Record<string, PlayerSymbol>;
  initialLastMove?: Position;
  // sequence of player and opponent moves to win
  solutionSteps: Array<{
    playerMove: Position;
    opponentResponse?: Position;
    explanation?: string;
  }>;
  rewardCoins: number;
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
  claimedAchievements?: string[];
  completedPuzzles?: string[];
  puzzleStars?: number;
  dailyQuestsDate?: string;
  dailyQuests?: DailyQuest[];
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
