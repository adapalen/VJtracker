/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  PlayerSymbol,
  Position,
  GameMode,
  AIDifficulty,
  GameStatus,
  PlayerProfile,
  LeaderboardEntry,
  MatchRecord,
  GameRule,
  MoveStep,
  EmoteItem,
  DailyQuest,
} from "./types";
import {
  checkWin,
  getBestMove,
  getHintMove,
  calculateEloChange,
  getRankTier,
  evaluateMove,
  getCandidates,
  generateDailyQuests,
  DEFAULT_ACHIEVEMENTS,
  DEFAULT_PUZZLES,
} from "./utils/gameLogic";
import synth from "./utils/audio";
import { 
  doc, 
  getDoc, 
  setDoc,
  collection,
  addDoc,
  updateDoc,
  query,
  where,
  limit,
  getDocs,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { db, auth } from "./firebase";
import InfiniteBoard from "./components/InfiniteBoard";
import Leaderboard from "./components/Leaderboard";
import MatchHistory from "./components/MatchHistory";
import AiOpponents from "./components/AiOpponents";
import CosmeticsShop from "./components/CosmeticsShop";
import RankExplanation from "./components/RankExplanation";
import CelebrationOverlay from "./components/CelebrationOverlay";
import EmoteOverlay from "./components/EmoteOverlay";
import MatchReplayModal from "./components/MatchReplayModal";
import CaroPuzzles from "./components/CaroPuzzles";
import AchievementsModal from "./components/AchievementsModal";
import DailyQuestsModal from "./components/DailyQuestsModal";
import {
  Cpu,
  Trophy,
  Activity,
  Edit2,
  Check,
  RotateCcw,
  Flag,
  Sparkles,
  Sun,
  Moon,
  LogOut,
  Globe,
  Wifi,
  Send,
  Info,
  AlertTriangle,
  Timer,
  HelpCircle,
  ShieldAlert,
  Volume2,
  VolumeX,
  ShoppingBag,
  BookOpen,
  Coins,
  Users,
  Grid,
  Swords,
  Undo2,
  Lightbulb,
  Puzzle,
  Award,
  Calendar,
  Share2,
  Copy,
  Link,
  ShieldCheck,
} from "lucide-react";

const STORAGE_KEYS = {
  PROFILE: "infinite_ttt_player_profile",
  LEADERBOARD: "infinite_ttt_global_leaderboard",
  MUTED: "infinite_ttt_muted",
  THEME: "infinite_ttt_theme",
  IS_LOGGED_IN: "infinite_ttt_sso_logged_in",
  GAME_RULE: "infinite_ttt_game_rule",
};

const COUNTRIES = [
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "TR", name: "Turkey", flag: "🇹🇷" },
];

const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  { name: "alex_92", elo: 2600, wins: 412, losses: 104, status: "ONLINE", avatarSeed: "alex_92", countryCode: "US", countryName: "United States", countryFlag: "🇺🇸" },
  { name: "yuki_caro", elo: 2250, wins: 310, losses: 150, status: "IN_GAME", avatarSeed: "yuki_caro", countryCode: "JP", countryName: "Japan", countryFlag: "🇯🇵" },
  { name: "minh_gomoku", elo: 2100, wins: 295, losses: 165, status: "ONLINE", avatarSeed: "minh_gomoku", countryCode: "VN", countryName: "Vietnam", countryFlag: "🇻🇳" },
  { name: "mateo_k", elo: 2000, wins: 288, losses: 142, status: "OFFLINE", avatarSeed: "mateo_k", countryCode: "ES", countryName: "Spain", countryFlag: "🇪🇸" },
  { name: "hassan_p", elo: 1850, wins: 240, losses: 130, status: "ONLINE", avatarSeed: "hassan_p", countryCode: "TR", countryName: "Turkey", countryFlag: "🇹🇷" },
  { name: "emma_smith", elo: 1650, wins: 198, losses: 172, status: "IN_GAME", avatarSeed: "emma_smith", countryCode: "CA", countryName: "Canada", countryFlag: "🇨🇦" },
  { name: "chen_wei", elo: 1400, wins: 154, losses: 120, status: "ONLINE", avatarSeed: "chen_wei", countryCode: "CN", countryName: "China", countryFlag: "🇨🇳" },
  { name: "sarah_m", elo: 1250, wins: 112, losses: 110, status: "OFFLINE", avatarSeed: "sarah_m", countryCode: "DE", countryName: "Germany", countryFlag: "🇩🇪" },
  { name: "lucas_tc", elo: 800, wins: 32, losses: 180, status: "ONLINE", avatarSeed: "lucas_tc", countryCode: "BR", countryName: "Brazil", countryFlag: "🇧🇷" },
];

interface MoveClassification {
  brilliant: number;
  best: number;
  excellent: number;
  good: number;
  inaccuracy: number;
  mistake: number;
  blunder: number;
}

interface AnalysisResult {
  playerAccuracy: number;
  opponentAccuracy: number;
  playerStats: MoveClassification;
  opponentStats: MoveClassification;
  criticalTurn: number | null;
  criticalTurnReason: string | null;
}

function generateMatchAnalysis(result: "WIN" | "LOSS" | "DRAW", movesCount: number): AnalysisResult {
  const playerTotal = Math.max(1, Math.ceil(movesCount / 2));
  const opponentTotal = Math.max(1, Math.floor(movesCount / 2));

  let playerAccuracy = 0;
  let opponentAccuracy = 0;

  const playerStats: MoveClassification = { brilliant: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
  const opponentStats: MoveClassification = { brilliant: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };

  if (result === "WIN") {
    playerAccuracy = Math.round((86 + Math.random() * 11.5) * 10) / 10;
    opponentAccuracy = Math.round((62 + Math.random() * 16) * 10) / 10;

    playerStats.brilliant = Math.random() < 0.2 && playerTotal > 5 ? 1 : 0;
    playerStats.best = Math.ceil(playerTotal * 0.55);
    playerStats.excellent = Math.floor(playerTotal * 0.25);
    playerStats.good = Math.max(0, playerTotal - (playerStats.brilliant + playerStats.best + playerStats.excellent));

    opponentStats.best = Math.floor(opponentTotal * 0.35);
    opponentStats.excellent = Math.floor(opponentTotal * 0.25);
    opponentStats.good = Math.floor(opponentTotal * 0.20);
    opponentStats.inaccuracy = Math.max(0, Math.floor(opponentTotal * 0.10));
    opponentStats.mistake = Math.max(0, Math.floor(opponentTotal * 0.05));
    opponentStats.blunder = Math.max(1, opponentTotal - (opponentStats.best + opponentStats.excellent + opponentStats.good + opponentStats.inaccuracy + opponentStats.mistake));
  } else if (result === "LOSS") {
    playerAccuracy = Math.round((60 + Math.random() * 18) * 10) / 10;
    opponentAccuracy = Math.round((87 + Math.random() * 10.5) * 10) / 10;

    playerStats.best = Math.floor(playerTotal * 0.35);
    playerStats.excellent = Math.floor(playerTotal * 0.25);
    playerStats.good = Math.floor(playerTotal * 0.20);
    playerStats.inaccuracy = Math.max(0, Math.floor(playerTotal * 0.10));
    playerStats.mistake = Math.max(0, Math.floor(playerTotal * 0.05));
    playerStats.blunder = Math.max(1, playerTotal - (playerStats.best + playerStats.excellent + playerStats.good + playerStats.inaccuracy + playerStats.mistake));

    opponentStats.brilliant = Math.random() < 0.2 && opponentTotal > 5 ? 1 : 0;
    opponentStats.best = Math.ceil(opponentTotal * 0.55);
    opponentStats.excellent = Math.floor(opponentTotal * 0.25);
    opponentStats.good = Math.max(0, opponentTotal - (opponentStats.brilliant + opponentStats.best + opponentStats.excellent));
  } else {
    playerAccuracy = Math.round((78 + Math.random() * 12) * 10) / 10;
    opponentAccuracy = Math.round((77 + Math.random() * 12) * 10) / 10;

    playerStats.best = Math.floor(playerTotal * 0.45);
    playerStats.excellent = Math.floor(playerTotal * 0.30);
    playerStats.good = Math.max(0, playerTotal - (playerStats.best + playerStats.excellent));

    opponentStats.best = Math.floor(opponentTotal * 0.45);
    opponentStats.excellent = Math.floor(opponentTotal * 0.30);
    opponentStats.good = Math.max(0, opponentTotal - (opponentStats.best + opponentStats.excellent));
  }

  let criticalTurn: number | null = null;
  let criticalTurnReason: string | null = null;

  if (movesCount >= 4) {
    criticalTurn = Math.ceil(movesCount * 0.6 + Math.random() * (movesCount * 0.2));
    if (criticalTurn > movesCount) criticalTurn = movesCount;

    if (result === "WIN") {
      criticalTurnReason = `Đối thủ mắc sai lầm then chốt ở nước thứ ${criticalTurn}, mở ra cơ hội dứt điểm.`;
    } else if (result === "LOSS") {
      criticalTurnReason = `Một sơ hở phòng ngự ở nước thứ ${criticalTurn} đã để đối thủ mở rộng thế tấn công.`;
    } else {
      criticalTurnReason = `Cục diện giằng co căng thẳng ở nước thứ ${criticalTurn} phân định thế hòa.`;
    }
  }

  return {
    playerAccuracy,
    opponentAccuracy,
    playerStats,
    opponentStats,
    criticalTurn,
    criticalTurnReason
  };
}

function formatClockTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function App() {
  // --- STATE ---
  const [profile, setProfile] = useState<PlayerProfile>(() => {
    try {
      const savedSsoUsername = localStorage.getItem("infinite_ttt_sso_username") || "";
      const localRaw = (savedSsoUsername && (localStorage.getItem(`infinite_ttt_player_profile_${savedSsoUsername.toLowerCase()}`) || localStorage.getItem(`infinite_ttt_player_profile_${savedSsoUsername}`))) || 
                       localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (localRaw) {
        const loaded = JSON.parse(localRaw);
        if (loaded && loaded.name) {
          const today = new Date().toDateString();
          if (loaded.dailyQuestsDate !== today || !loaded.dailyQuests) {
            loaded.dailyQuests = generateDailyQuests();
            loaded.dailyQuestsDate = today;
          }
          if (!loaded.completedPuzzles) loaded.completedPuzzles = [];
          if (!loaded.claimedAchievements) loaded.claimedAchievements = [];
          return loaded;
        }
      }
    } catch (e) {}
    return {
      name: "Kỳ Thủ",
      elo: 1200,
      matches: [],
      countryCode: "VN",
      countryName: "Vietnam",
      countryFlag: "🇻🇳",
      coins: 1000,
      unlockedThemes: ["classic"],
      unlockedMarkings: ["classic"],
      activeTheme: "classic",
      activeMarking: "classic",
      claimedAchievements: [],
      completedPuzzles: [],
      dailyQuests: generateDailyQuests(),
      dailyQuestsDate: new Date().toDateString(),
    };
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LEADERBOARD);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_LEADERBOARD;
  });

  const [board, setBoard] = useState<Record<string, PlayerSymbol>>({});
  const [moveHistory, setMoveHistory] = useState<MoveStep[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<PlayerSymbol>("X");
  const [gameMode, setGameMode] = useState<GameMode>("AI");
  const [difficulty, setDifficulty] = useState<AIDifficulty>("SENTINEL");
  const [gameRule, setGameRule] = useState<GameRule>(() => {
    return (localStorage.getItem(STORAGE_KEYS.GAME_RULE) as GameRule) || "FREE";
  });
  const [gameStatus, setGameStatus] = useState<GameStatus>("PLAYING");
  const [isMatchStarted, setIsMatchStarted] = useState(false);
  
  const [winningCells, setWinningCells] = useState<Position[] | null>(null);
  const [boardLastMove, setBoardLastMove] = useState<Position | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.MUTED) === "true";
  });
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem(STORAGE_KEYS.THEME) as "light" | "dark") || "dark";
  });

  // AI Hint Assistant state
  const [activeHint, setActiveHint] = useState<{ pos: Position; reason: string } | null>(null);

  // In-Game Emotes state
  const [emotes, setEmotes] = useState<EmoteItem[]>([]);

  // Feature Modals state
  const [showPuzzlesModal, setShowPuzzlesModal] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [showDailyQuestsModal, setShowDailyQuestsModal] = useState(false);
  const [replayMatch, setReplayMatch] = useState<MatchRecord | null>(null);

  // Single Sign-On (SSO) States
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const savedLoggedIn = localStorage.getItem("infinite_ttt_is_logged_in");
      const savedUsername = localStorage.getItem("infinite_ttt_sso_username");
      const savedProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return savedLoggedIn === "true" || !!savedUsername || !!savedProfile;
    } catch (e) {
      return false;
    }
  });
  const [ssoUsername, setSsoUsername] = useState(() => {
    return localStorage.getItem("infinite_ttt_sso_username") || "";
  });
  const [ssoCountryCode, setSsoCountryCode] = useState("VN");
  const [ssoLogs, setSsoLogs] = useState<string[]>([]);
  const [isSsoLoading, setIsSsoLoading] = useState(false);

  // Chess Clock Time Controls (Bullet: 1m, Flash: 5m, Rapid: 10m)
  const [timeControl, setTimeControl] = useState<"BULLET" | "FLASH" | "RAPID">("FLASH");
  const [playerXTime, setPlayerXTime] = useState(300);
  const [playerOTime, setPlayerOTime] = useState(300);
  const [hasGameStarted, setHasGameStarted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Online Matchmaking & Private Room states
  const [matchmakingState, setMatchmakingState] = useState<"IDLE" | "SEARCHING" | "CONNECTED">("IDLE");
  const [matchmakingProgress, setMatchmakingProgress] = useState(0);
  const [matchmakingLogs, setMatchmakingLogs] = useState<string[]>([]);
  const [onlineOpponent, setOnlineOpponent] = useState<LeaderboardEntry | null>(null);
  const [onlineChats, setOnlineChats] = useState<Array<{ sender: string; text: string; time: string }>>([]);
  const [chatMessageInput, setChatMessageInput] = useState("");
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [userSymbol, setUserSymbol] = useState<"X" | "O">("X");
  const [customRoomCode, setCustomRoomCode] = useState("");
  const [isCopiedLink, setIsCopiedLink] = useState(false);

  // ELO System pop-up modal state
  const [isEloModalOpen, setIsEloModalOpen] = useState(false);

  // Name Editing state
  const [isEditingCallsign, setIsEditingCallsign] = useState(false);
  const [tempCallsign, setTempCallsign] = useState("");

  // Tab: "AI_DIRECTORY" | "LEADERBOARD" | "COMBAT_LOG" | "QUANTUM_CHAT" | "SHOP" | "RANKINGS_HELP"
  const [activeTab, setActiveTab] = useState<"AI_DIRECTORY" | "LEADERBOARD" | "COMBAT_LOG" | "QUANTUM_CHAT" | "SHOP" | "RANKINGS_HELP">("AI_DIRECTORY");

  // Post Game Report Overlay
  const [postGameReport, setPostGameReport] = useState<{
    show: boolean;
    result: "WIN" | "LOSS" | "DRAW";
    opponentName: string;
    opponentElo: number;
    oldElo: number;
    newElo: number;
    deltaElo: number;
    movesCount: number;
    isPvpUnchanged?: boolean;
    isTimeout?: boolean;
    analysis?: AnalysisResult;
  } | null>(null);

  const [showCelebration, setShowCelebration] = useState(false);

  const isDark = theme === "dark";

  // --- SAVE PROFILE TO CLOUD ---
  const saveProfileToCloud = async (updatedProfile: PlayerProfile) => {
    try {
      const authUser = auth.currentUser;
      if (authUser) {
        await setDoc(doc(db, "users", authUser.uid), updatedProfile);
      } else {
        const trimmedUsername = (ssoUsername || updatedProfile.name || "").trim();
        if (trimmedUsername) {
          await setDoc(doc(db, "users", trimmedUsername.toLowerCase()), updatedProfile);
        }
      }
    } catch (e) {
      console.warn("Cloud profile save completed locally:", e);
    }
  };

  // --- INITIAL LOAD & SYNC WITH FIREBASE AUTH ---
  useEffect(() => {
    // Check URL parameters for private room code (?room=XYZ or #room=XYZ)
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get("room") || window.location.hash.replace("#room=", "");
    if (roomParam) {
      setCustomRoomCode(roomParam.toUpperCase());
      setGameMode("ONLINE");
    }

    // Sync mute to audio engine (state already initialized from localStorage)
    if (localStorage.getItem(STORAGE_KEYS.MUTED) === "true") {
      synth.toggleMute();
    }

    // --- Firebase Auth: background cloud sync only ---
    // IMPORTANT: onAuthStateChanged must NEVER call setIsLoggedIn.
    // The login gate is controlled exclusively by localStorage + handleSsoLogin/handleLogout.
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Try to sync profile from cloud (non-blocking, won't affect login state)
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const cloudProfile = docSnap.data() as PlayerProfile;
            // Only update profile if it has a valid name and matches current session
            const currentUsername = localStorage.getItem("infinite_ttt_sso_username") || "";
            if (cloudProfile && cloudProfile.name && 
                (!currentUsername || cloudProfile.name.toLowerCase() === currentUsername.toLowerCase())) {
              const today = new Date().toDateString();
              if (cloudProfile.dailyQuestsDate !== today || !cloudProfile.dailyQuests) {
                cloudProfile.dailyQuests = generateDailyQuests();
                cloudProfile.dailyQuestsDate = today;
              }
              if (!cloudProfile.completedPuzzles) cloudProfile.completedPuzzles = [];
              if (!cloudProfile.claimedAchievements) cloudProfile.claimedAchievements = [];
              setProfile(cloudProfile);
              setTempCallsign(cloudProfile.name);
            }
          }
        } catch (firestoreErr) {
          // Cloud sync failed silently — local profile is authoritative
          console.warn("Cloud profile sync skipped:", firestoreErr);
        }
      } else {
        // Firebase user is null — try to re-authenticate in background
        // This does NOT affect the login state in any way
        const hasLocalSession = localStorage.getItem("infinite_ttt_is_logged_in") === "true" ||
                                !!localStorage.getItem("infinite_ttt_sso_username") ||
                                !!localStorage.getItem(STORAGE_KEYS.PROFILE);
        if (hasLocalSession) {
          try {
            await signInAnonymously(auth);
          } catch (err) {
            // Auth failed — game continues with local profile, no sign-out
            console.warn("Background re-auth skipped:", err);
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // --- CHESS CLOCK TIMER HOOK ---
  useEffect(() => {
    if (!hasGameStarted || gameStatus !== "PLAYING") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      if (currentPlayer === "X") {
        setPlayerXTime((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleChessTimeout("X");
            return 0;
          }
          return prev - 1;
        });
      } else {
        setPlayerOTime((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleChessTimeout("O");
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasGameStarted, gameStatus, currentPlayer]);

  // --- FIRESTORE REAL-TIME MULTIPLAYER SYNC ---
  useEffect(() => {
    if (!activeMatchId || gameMode !== "ONLINE") return;

    const matchDocRef = doc(db, "caro_matches", activeMatchId);
    
    const unsubscribe = onSnapshot(matchDocRef, (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();

      // 1. Peer joining resolution
      if (matchmakingState === "SEARCHING" && data.status === "playing" && data.playerO) {
        setOnlineOpponent({
          name: data.playerO.name,
          elo: data.playerO.elo,
          wins: 0,
          losses: 0,
          status: "ONLINE",
          avatarSeed: data.playerO.name,
          countryCode: data.playerO.countryCode,
          countryFlag: data.playerO.flag
        });
        setMatchmakingProgress(100);
        setMatchmakingState("CONNECTED");
        setBoard({});
        setMoveHistory([]);
        setWinningCells(null);
        setBoardLastMove(null);
        setGameStatus("PLAYING");
        setCurrentPlayer("X");
        setPlayerXTime(data.playerXTime || 300);
        setPlayerOTime(data.playerOTime || 300);
        setHasGameStarted(true);
        setIsMatchStarted(true);
        synth.playWin();
        setOnlineChats(data.chats || []);
        setActiveTab("QUANTUM_CHAT");
      }

      // 2. Synchronize gameplay turns
      if (data.status === "playing") {
        setBoard(data.board || {});
        if (data.movesList) setMoveHistory(data.movesList);
        setCurrentPlayer(data.currentTurn);
        setBoardLastMove(data.lastMove);
        setPlayerXTime(data.playerXTime || 300);
        setPlayerOTime(data.playerOTime || 300);
        setOnlineChats(data.chats || []);
        
        if (data.lastMove) {
          synth.playPlace();
        }
      }

      // 3. Synchronize match completions
      if (data.status === "finished") {
        setBoard(data.board || {});
        if (data.movesList) setMoveHistory(data.movesList);
        setBoardLastMove(data.lastMove);
        setWinningCells(data.winningCells);
        setOnlineChats(data.chats || []);

        if (gameStatus === "PLAYING") {
          const isWinner = data.winnerUid === auth.currentUser?.uid;
          const result = isWinner ? "WIN" : (data.winnerUid === null ? "DRAW" : "LOSS");
          const opponent = userSymbol === "X" ? data.playerO : data.playerX;
          
          if (isWinner) {
            synth.playWin();
          } else {
            synth.playDefeat();
          }
          resolveMatch(result, opponent?.name || "Đối thủ", opponent?.elo || 1200, data.isTimeout || false);
        }
      }
    }, (err) => {
      console.error("Match synchronization error:", err);
    });

    return () => unsubscribe();
  }, [activeMatchId, matchmakingState, gameMode, userSymbol, gameStatus]);

  // Handle Turn Expiry Forfeit
  const handleChessTimeout = (losingPlayer: "X" | "O") => {
    if (gameStatus !== "PLAYING") return;
    synth.playDefeat();

    const movesCount = Object.keys(board).length;
    
    if (gameMode === "PVP") {
      setGameStatus("WON");
      const winningPlayer = losingPlayer === "X" ? "O" : "X";

      setPostGameReport({
        show: true,
        result: "LOSS",
        opponentName: `Local Player (${winningPlayer})`,
        opponentElo: 1200,
        oldElo: profile.elo,
        newElo: profile.elo,
        deltaElo: 0,
        movesCount,
        isPvpUnchanged: true,
        isTimeout: true,
      });
    } else if (gameMode === "ONLINE") {
      const opName = onlineOpponent?.name || "Đối thủ Online";
      const opElo = onlineOpponent?.elo || 1200;
      resolveMatch(losingPlayer === "X" ? "LOSS" : "WIN", opName, opElo, true);
    } else {
      const opName = getAiDetails(difficulty).name;
      const opElo = getAiDetails(difficulty).elo;
      resolveMatch(losingPlayer === "X" ? "LOSS" : "WIN", opName, opElo, true);
    }
  };

  // Setup initial chess clock timer settings
  const startMatchSetup = () => {
    const initialTime = timeControl === "BULLET" ? 60 : timeControl === "FLASH" ? 300 : 600;
    setPlayerXTime(initialTime);
    setPlayerOTime(initialTime);
    setHasGameStarted(false);
  };

  // --- GAMEPLAY ASSISTANTS (UNDO & HINT) ---
  const handleUndo = () => {
    if (gameStatus !== "PLAYING" || isAiThinking || moveHistory.length === 0) return;

    if (gameMode === "AI") {
      // In AI mode, undo last 2 moves (Player + AI) so it's player's turn again
      if (moveHistory.length < 2) return;
      const newHistory = moveHistory.slice(0, -2);
      const newBoard: Record<string, PlayerSymbol> = {};
      newHistory.forEach((m) => {
        newBoard[`${m.x},${m.y}`] = m.symbol;
      });

      setBoard(newBoard);
      setMoveHistory(newHistory);
      setBoardLastMove(newHistory.length > 0 ? { x: newHistory[newHistory.length - 1].x, y: newHistory[newHistory.length - 1].y } : null);
      setCurrentPlayer("X");
      setActiveHint(null);
      synth.playTick();
    } else if (gameMode === "PVP") {
      // In Local PVP mode, undo 1 move
      const newHistory = moveHistory.slice(0, -1);
      const newBoard: Record<string, PlayerSymbol> = {};
      newHistory.forEach((m) => {
        newBoard[`${m.x},${m.y}`] = m.symbol;
      });

      setBoard(newBoard);
      setMoveHistory(newHistory);
      setBoardLastMove(newHistory.length > 0 ? { x: newHistory[newHistory.length - 1].x, y: newHistory[newHistory.length - 1].y } : null);
      setCurrentPlayer(currentPlayer === "X" ? "O" : "X");
      setActiveHint(null);
      synth.playTick();
    }
  };

  const handleHint = () => {
    if (gameStatus !== "PLAYING" || isAiThinking) return;
    const hint = getHintMove(board, currentPlayer);
    setActiveHint(hint);
    synth.playTick();
  };

  // --- EMOTES DISPATCH ---
  const handleSendEmote = (content: string, type: "EMOJI" | "TEXT") => {
    const newEmote: EmoteItem = {
      id: Math.random().toString(36).substr(2, 9),
      sender: "PLAYER",
      type,
      content,
      timestamp: Date.now(),
    };

    setEmotes((prev) => [...prev, newEmote]);
    setTimeout(() => {
      setEmotes((prev) => prev.filter((e) => e.id !== newEmote.id));
    }, 3500);

    // AI dynamic emote reaction
    if (gameMode === "AI" && Math.random() < 0.7) {
      setTimeout(() => {
        const aiQuotes = [
          "🤖 Nước cờ rất đáng gờm!",
          "🔥 Tôi đã đọc trước 5 bước!",
          "😎 Không dễ thắng tôi đâu nha!",
          "😱 Sơ hở kìa bạn ơi!",
          "👑 Hãy xem đòn phản công này!",
        ];
        const aiEmotesList = ["😎", "🔥", "🎯", "🤔", "👑"];
        const isText = Math.random() > 0.4;
        const aiEmote: EmoteItem = {
          id: Math.random().toString(36).substr(2, 9),
          sender: "AI",
          type: isText ? "TEXT" : "EMOJI",
          content: isText ? aiQuotes[Math.floor(Math.random() * aiQuotes.length)] : aiEmotesList[Math.floor(Math.random() * aiEmotesList.length)],
          timestamp: Date.now(),
        };
        setEmotes((prev) => [...prev, aiEmote]);
        setTimeout(() => {
          setEmotes((prev) => prev.filter((e) => e.id !== aiEmote.id));
        }, 3500);
      }, 700);
    }
  };

  // --- GAMIFICATION PROGRESSION HANDLERS ---
  const handleClaimAchievement = (achievementId: string, rewardCoins: number) => {
    const claimed = [...(profile.claimedAchievements || []), achievementId];
    const updated: PlayerProfile = {
      ...profile,
      coins: (profile.coins || 0) + rewardCoins,
      claimedAchievements: claimed,
    };
    setProfile(updated);
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
    saveProfileToCloud(updated);
  };

  const handleClaimQuest = (questId: string, rewardCoins: number) => {
    const updatedQuests = (profile.dailyQuests || []).map((q) =>
      q.id === questId ? { ...q, isClaimed: true } : q
    );
    const updated: PlayerProfile = {
      ...profile,
      coins: (profile.coins || 0) + rewardCoins,
      dailyQuests: updatedQuests,
    };
    setProfile(updated);
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
    saveProfileToCloud(updated);
  };

  const handleCompletePuzzle = (puzzleId: string, rewardCoins: number) => {
    const completed = [...(profile.completedPuzzles || [])];
    if (!completed.includes(puzzleId)) completed.push(puzzleId);

    // Update daily quests
    const updatedQuests = (profile.dailyQuests || []).map((q) => {
      if (q.id === "quest_solve_puzzle") {
        return { ...q, currentCount: q.currentCount + 1, isCompleted: true };
      }
      return q;
    });

    const updated: PlayerProfile = {
      ...profile,
      coins: (profile.coins || 0) + rewardCoins,
      completedPuzzles: completed,
      dailyQuests: updatedQuests,
    };
    setProfile(updated);
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
    saveProfileToCloud(updated);
  };

  // --- PRIVATE ROOM MULTIPLAYER ---
  const handleCreatePrivateRoom = () => {
    const code = "CARO-" + Math.floor(1000 + Math.random() * 9000);
    setCustomRoomCode(code);
    setIsMatchStarted(true);
    setGameMode("ONLINE");
    handleStartMatchmaking(code);
  };

  const handleCopyRoomLink = () => {
    const roomUrl = `${window.location.origin}${window.location.pathname}?room=${customRoomCode || "CARO-7777"}`;
    navigator.clipboard.writeText(roomUrl);
    setIsCopiedLink(true);
    synth.playTick();
    setTimeout(() => setIsCopiedLink(false), 2500);
  };

  // --- SSO LOGIN PROTOCOL ---
  const handleSsoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = ssoUsername.trim();
    if (!trimmed) return;

    setIsSsoLoading(true);
    synth.playTick();
    setSsoLogs([]);

    const log = (msg: string) => {
      setSsoLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
      synth.playTick();
    };

    try {
      const dummyDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      log("Contacting authentication server...");
      await dummyDelay(300);

      let authUser: any = null;
      let hasCloudAccess = false;

      try {
        log("Authenticating anonymously with Firebase Auth...");
        const userCredential = await signInAnonymously(auth);
        authUser = userCredential.user;
        log(`Authenticated session UID: ${authUser.uid}`);
        await dummyDelay(300);
      } catch (authErr: any) {
        log("Activating robust offline guest mode...");
        await dummyDelay(300);
      }

      log("Querying Cloud Firestore database for pilot records...");
      let finalProfile: PlayerProfile | null = null;

      if (authUser) {
        try {
          const docRef = doc(db, "users", authUser.uid);
          const docSnap = await getDoc(docRef);
          hasCloudAccess = true;
          await dummyDelay(300);

          if (docSnap.exists()) {
            finalProfile = docSnap.data() as PlayerProfile;
            log("Cloud profile synced successfully.");
          }
        } catch (firestoreErr: any) {
          log("Activating robust offline-first pilot protocol...");
          await dummyDelay(300);
        }
      }

      if (!finalProfile) {
        const localRaw = localStorage.getItem(`infinite_ttt_player_profile_${trimmed.toLowerCase()}`) || 
                         localStorage.getItem(`infinite_ttt_player_profile_${trimmed}`) || 
                         localStorage.getItem(STORAGE_KEYS.PROFILE);
        if (localRaw) {
          try {
            const potentialProfile = JSON.parse(localRaw);
            if (potentialProfile && potentialProfile.name.toLowerCase() === trimmed.toLowerCase()) {
              finalProfile = potentialProfile;
              log("Local pilot profile restored successfully.");
            }
          } catch (parseErr) {}
        }
      }

      if (!finalProfile) {
        const selectedCountry = COUNTRIES.find(c => c.code === ssoCountryCode) || COUNTRIES[0];
        finalProfile = {
          name: trimmed,
          elo: 1200,
          matches: [],
          countryCode: selectedCountry.code,
          countryName: selectedCountry.name,
          countryFlag: selectedCountry.flag,
          coins: 1000,
          unlockedThemes: ["classic"],
          unlockedMarkings: ["classic"],
          activeTheme: "classic",
          activeMarking: "classic",
          claimedAchievements: [],
          completedPuzzles: [],
          dailyQuests: generateDailyQuests(),
          dailyQuestsDate: new Date().toDateString(),
        };

        if (hasCloudAccess) {
          try {
            const docRef = doc(db, "users", authUser.uid);
            await setDoc(docRef, finalProfile);
          } catch (writeErr) {}
        }
      }

      setProfile(finalProfile);
      setTempCallsign(trimmed);
      setIsLoggedIn(true);

      localStorage.setItem("infinite_ttt_is_logged_in", "true");
      localStorage.setItem("infinite_ttt_sso_username", trimmed);
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(finalProfile));
      localStorage.setItem(`infinite_ttt_player_profile_${trimmed}`, JSON.stringify(finalProfile));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSsoLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem("infinite_ttt_is_logged_in");
    synth.playTick();
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    localStorage.setItem(STORAGE_KEYS.MUTED, String(nextMuted));
    synth.toggleMute();
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, nextTheme);
    synth.playTick();
  };

  const handleToggleGameRule = () => {
    const nextRule: GameRule = gameRule === "FREE" ? "VN_BLOCKED_ENDS" : "FREE";
    setGameRule(nextRule);
    localStorage.setItem(STORAGE_KEYS.GAME_RULE, nextRule);
    synth.playTick();
  };

  // Surrender / Forfeit current active match
  const handleSurrender = async () => {
    if (gameStatus !== "PLAYING" || isAiThinking) return;
    
    synth.playPlace();
    const opponentName = gameMode === "AI" ? getAiDetails(difficulty).name : (gameMode === "ONLINE" ? (onlineOpponent?.name || "Online Pilot") : "Guest Player");
    const opponentElo = gameMode === "AI" ? getAiDetails(difficulty).elo : (gameMode === "ONLINE" ? (onlineOpponent?.elo || 1200) : 1200);
    
    if (gameMode === "PVP") {
      setGameStatus("WON");
      const movesCnt = Object.keys(board).length;
      setPostGameReport({
        show: true,
        result: "LOSS",
        opponentName: `Local Pilot (${currentPlayer === "X" ? "O" : "X"})`,
        opponentElo: 1200,
        oldElo: profile.elo,
        newElo: profile.elo,
        deltaElo: 0,
        movesCount: movesCnt,
        isPvpUnchanged: true,
        analysis: generateMatchAnalysis("LOSS", movesCnt),
      });
    } else if (gameMode === "ONLINE") {
      if (activeMatchId) {
        try {
          const winningUid = userSymbol === "X" ? "O" : "X";
          await updateDoc(doc(db, "caro_matches", activeMatchId), {
            status: "finished",
            winnerUid: winningUid === "O" ? (onlineOpponent?.name || "opponent") : auth.currentUser?.uid,
            isForfeit: true
          });
        } catch (err) {}
      }
    } else {
      resolveMatch("LOSS", opponentName, opponentElo);
    }
  };

  // Reset the grid board
  const handleResetBoard = async () => {
    if (gameMode === "ONLINE" && activeMatchId && gameStatus === "PLAYING") {
      try {
        await updateDoc(doc(db, "caro_matches", activeMatchId), {
          status: "finished",
          winnerUid: "opponent_forfeit"
        });
      } catch (err) {}
    }
    setActiveMatchId(null);

    setBoard({});
    setMoveHistory([]);
    setActiveHint(null);
    setWinningCells(null);
    setBoardLastMove(null);
    setGameStatus("PLAYING");
    setCurrentPlayer("X");
    setIsAiThinking(false);
    setPostGameReport(null);
    setShowCelebration(false);
    const initialTime = timeControl === "BULLET" ? 60 : timeControl === "FLASH" ? 300 : 600;
    setPlayerXTime(initialTime);
    setPlayerOTime(initialTime);
    setHasGameStarted(false);
    setIsMatchStarted(false);
    if (gameMode === "ONLINE") {
      setMatchmakingState("IDLE");
    }
    synth.playTick();
  };

  // Resolve match and compute ELO metrics
  const resolveMatch = (result: "WIN" | "LOSS" | "DRAW", opponentName: string, opponentElo: number, isTimeout = false) => {
    setGameStatus("WON");
    if (result === "WIN") {
      setShowCelebration(true);
    }
    
    const movesCount = Object.keys(board).length;
    const oldElo = profile.elo;
    const isPvp = gameMode === "PVP";

    const eloCalc = isPvp
      ? { eloChange: 0, newElo: profile.elo, expectedScore: 0.5 }
      : calculateEloChange(profile.elo, opponentElo, result, profile.matches.length);

    const analysis = generateMatchAnalysis(result, movesCount);

    // Create Match Log with full step list & rule
    const newRecord: MatchRecord = {
      id: Math.random().toString(36).substr(2, 9),
      opponentName,
      opponentElo,
      result,
      eloChange: eloCalc.eloChange,
      date: new Date().toISOString(),
      movesCount,
      playerAccuracy: analysis.playerAccuracy,
      opponentAccuracy: analysis.opponentAccuracy,
      criticalTurn: analysis.criticalTurn,
      criticalTurnReason: analysis.criticalTurnReason,
      isTimeout,
      oldElo,
      newElo: eloCalc.newElo,
      movesList: moveHistory,
      ruleUsed: gameRule,
    };

    const updatedMatches = [newRecord, ...profile.matches];
    
    // Update daily quests
    const updatedDailyQuests = (profile.dailyQuests || []).map((q) => {
      if (q.id === "quest_play_3") {
        const nextCount = q.currentCount + 1;
        return { ...q, currentCount: nextCount, isCompleted: nextCount >= q.targetCount };
      }
      if (q.id === "quest_win_ai" && gameMode === "AI" && result === "WIN" && (difficulty === "SENTINEL" || difficulty === "OVERLORD" || difficulty === "SINGULARITY")) {
        return { ...q, currentCount: 1, isCompleted: true };
      }
      return q;
    });

    const updatedProfile: PlayerProfile = {
      ...profile,
      elo: eloCalc.newElo,
      matches: updatedMatches,
      dailyQuests: updatedDailyQuests,
    };

    setProfile(updatedProfile);
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updatedProfile));
    saveProfileToCloud(updatedProfile);

    // Update global leaderboard
    let updatedLeaderboard = leaderboard.map(e => {
      if (e.isPlayer || e.name === profile.name) {
        const wins = updatedMatches.filter(m => m.result === "WIN").length;
        const losses = updatedMatches.filter(m => m.result === "LOSS").length;
        return {
          ...e,
          elo: eloCalc.newElo,
          wins,
          losses,
          isPlayer: true,
          status: "ONLINE" as const,
        };
      }
      return e;
    });

    setLeaderboard(updatedLeaderboard);
    localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(updatedLeaderboard));

    // Render post game report modal
    setPostGameReport({
      show: true,
      result,
      opponentName,
      opponentElo,
      oldElo,
      newElo: eloCalc.newElo,
      deltaElo: eloCalc.eloChange,
      movesCount,
      isPvpUnchanged: isPvp,
      isTimeout,
      analysis,
    });
  };

  const handleStartMatchmaking = async (roomOverride?: string) => {
    setMatchmakingState("SEARCHING");
    setMatchmakingProgress(0);
    setMatchmakingLogs(["Kết nối máy chủ thời gian thực...", `Mã phòng: ${roomOverride || "Ngẫu nhiên"}`]);

    synth.playTick();

    const currentUid = auth.currentUser?.uid || "guest_" + Math.random().toString(36).substr(2, 6);
    const roomCode = roomOverride || "ROOM_RANDOM";

    try {
      const matchDoc = await addDoc(collection(db, "caro_matches"), {
        roomCode,
        playerX: {
          uid: currentUid,
          name: profile.name,
          elo: profile.elo,
          countryCode: profile.countryCode || "VN",
          flag: profile.countryFlag || "🇻🇳"
        },
        playerO: null,
        board: {},
        currentTurn: "X",
        status: "waiting",
        createdAt: serverTimestamp(),
      });

      setActiveMatchId(matchDoc.id);
      setUserSymbol("X");
    } catch (e) {
      console.warn("Matchmaking offline fallback:", e);
    }
  };

  // Click handler on specific cell position
  const handleCellClick = async (x: number, y: number) => {
    if (gameStatus !== "PLAYING" || !hasGameStarted || board[`${x},${y}`] || isAiThinking) return;

    const key = `${x},${y}`;
    setActiveHint(null);

    const moveStep: MoveStep = {
      x,
      y,
      symbol: currentPlayer,
      step: moveHistory.length + 1,
      timestamp: Date.now(),
    };
    const nextHistory = [...moveHistory, moveStep];

    if (gameMode === "ONLINE") {
      if (currentPlayer !== userSymbol) return;

      const updatedBoard = { ...board, [key]: userSymbol };
      setBoard(updatedBoard);
      setMoveHistory(nextHistory);
      setBoardLastMove({ x, y });
      synth.playPlace();

      const winSequence = checkWin(updatedBoard, x, y, userSymbol, gameRule);
      const isWinner = !!winSequence;

      const currentUid = auth.currentUser?.uid || "guest";
      const updates: any = {
        board: updatedBoard,
        movesList: nextHistory,
        lastMove: { x, y, timestamp: Date.now() },
        currentTurn: userSymbol === "X" ? "O" : "X",
        playerXTime: userSymbol === "X" ? Math.max(0, playerXTime) : playerXTime,
        playerOTime: userSymbol === "O" ? Math.max(0, playerOTime) : playerOTime,
        lastMoveTime: Date.now()
      };

      if (isWinner) {
        updates.status = "finished";
        updates.winnerUid = currentUid;
        updates.winningCells = winSequence;
      }

      try {
        await updateDoc(doc(db, "caro_matches", activeMatchId!), updates);
      } catch (err) {
        console.error("Failed to write online move:", err);
      }

    } else {
      const updatedBoard = { ...board, [key]: currentPlayer };
      setBoard(updatedBoard);
      setMoveHistory(nextHistory);
      setBoardLastMove({ x, y });
      synth.playPlace();

      // Check Win Condition with selected rule
      const winSequence = checkWin(updatedBoard, x, y, currentPlayer, gameRule);
      if (winSequence) {
        setWinningCells(winSequence);
        synth.playWin();

        const opponentName = gameMode === "AI" ? getAiDetails(difficulty).name : "Guest Player";
        const opponentElo = gameMode === "AI" ? getAiDetails(difficulty).elo : 1200;
        resolveMatch("WIN", opponentName, opponentElo);
        return;
      }

      // Toggle turn or trigger AI
      if (gameMode === "PVP") {
        setCurrentPlayer(currentPlayer === "X" ? "O" : "X");
      } else {
        // AI Mode turn
        setIsAiThinking(true);
        setCurrentPlayer("O");

        const aiDelay = difficulty === "NOVICE" ? 400 : difficulty === "SENTINEL" ? 650 : difficulty === "OVERLORD" ? 900 : 1100;

        setTimeout(() => {
          const aiMove = getBestMove(updatedBoard, "O", difficulty);
          const aiKey = `${aiMove.x},${aiMove.y}`;
          const boardWithAi = { ...updatedBoard, [aiKey]: "O" };
          const aiMoveStep: MoveStep = {
            x: aiMove.x,
            y: aiMove.y,
            symbol: "O",
            step: nextHistory.length + 1,
            timestamp: Date.now(),
          };
          const historyWithAi = [...nextHistory, aiMoveStep];

          setBoard(boardWithAi);
          setMoveHistory(historyWithAi);
          setBoardLastMove(aiMove);
          synth.playPlace();

          // Check AI win with selected rule
          const aiWinSequence = checkWin(boardWithAi, aiMove.x, aiMove.y, "O", gameRule);
          if (aiWinSequence) {
            setWinningCells(aiWinSequence);
            synth.playDefeat();
            
            const opponentName = getAiDetails(difficulty).name;
            const opponentElo = getAiDetails(difficulty).elo;
            resolveMatch("LOSS", opponentName, opponentElo);
            setIsAiThinking(false);
            return;
          }

          setCurrentPlayer("X");
          setIsAiThinking(false);

          const hasImmediateAiThreat = getCandidates(boardWithAi, 1).some(c => {
            return evaluateMove(boardWithAi, c.x, c.y, "O") >= 100000;
          });
          if (hasImmediateAiThreat) {
            synth.playWarning();
          }
        }, aiDelay);
      }
    }
  };

  const getAiDetails = (diff: AIDifficulty) => {
    switch (diff) {
      case "NOVICE":
        return { name: "Novice AI", elo: 800 };
      case "SENTINEL":
        return { name: "Standard AI", elo: 1400 };
      case "OVERLORD":
        return { name: "Strategic AI", elo: 2000 };
      case "SINGULARITY":
        return { name: "Singularity AI", elo: 2600 };
    }
  };

  const rankTier = getRankTier(profile.elo);

  // Unclaimed rewards count
  const unclaimedQuestsCount = (profile.dailyQuests || []).filter(
    (q) => q.isCompleted && !q.isClaimed
  ).length;

  // --- SSO FORM CONDITIONAL RENDERING ---
  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen flex flex-col font-sans relative select-none justify-center items-center p-4 transition-colors duration-300 ${
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"
      }`}>
        <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
          isDark 
            ? "bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,rgba(6,182,212,0.15),rgba(0,0,0,0))]" 
            : "bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,rgba(6,182,212,0.06),rgba(0,0,0,0))]"
        }`} />

        <motion.div
          id="sso-gateway-card"
          className={`border rounded-2xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden flex flex-col transition-all duration-300 ${
            isDark 
              ? "bg-slate-900 border-cyan-500/20 text-slate-100 shadow-[0_0_50px_rgba(6,182,212,0.12)]" 
              : "bg-white border-slate-200 text-slate-800 shadow-lg"
          }`}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-6">
            <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4 transition-colors duration-300 ${
              isDark ? "bg-cyan-500/10 border border-cyan-400/40 text-cyan-400" : "bg-cyan-100 border border-cyan-300 text-cyan-600"
            }`}>
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>
            <h1 className="text-xl font-bold uppercase tracking-wider">Caro Arena</h1>
            <p className={`text-[10px] font-mono tracking-widest mt-1 uppercase ${isDark ? "text-cyan-400/60" : "text-cyan-600/70"}`}>
              Đăng Nhập Kỳ Thủ
            </p>
          </div>

          <form onSubmit={handleSsoLogin} className="space-y-4">
            <div>
              <label className={`block text-[10px] uppercase tracking-wider font-mono font-bold mb-1.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Tên kỳ thủ
              </label>
              <div className="relative">
                <input
                  id="sso-username-input"
                  type="text"
                  placeholder="Nhập tên của bạn..."
                  value={ssoUsername}
                  onChange={(e) => setSsoUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                  maxLength={15}
                  disabled={isSsoLoading}
                  required
                  className={`w-full px-4 py-3 rounded-lg text-sm border font-sans outline-none transition-all ${
                    isDark 
                      ? "bg-slate-950 border-cyan-500/20 text-cyan-300 placeholder-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30" 
                      : "bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-[10px] uppercase tracking-wider font-mono font-bold mb-1.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Quốc gia
              </label>
              <select
                id="sso-country-select"
                value={ssoCountryCode}
                onChange={(e) => setSsoCountryCode(e.target.value)}
                disabled={isSsoLoading}
                className={`w-full px-4 py-3 rounded-lg text-sm border font-sans outline-none transition-all cursor-pointer ${
                  isDark 
                    ? "bg-slate-950 border-cyan-500/20 text-cyan-300 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 font-semibold" 
                    : "bg-slate-50 border-slate-300 text-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 font-semibold"
                }`}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code} className={isDark ? "bg-slate-900 text-slate-200" : "bg-white text-slate-800"}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              id="sso-submit-btn"
              type="submit"
              disabled={isSsoLoading || !ssoUsername.trim()}
              className="w-full py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-xs uppercase tracking-wider font-bold rounded-lg cursor-pointer transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Wifi size={13} />
              <span>Vào Đấu Trường</span>
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans relative selection:bg-cyan-500/30 selection:text-cyan-900 transition-colors duration-300 ${
      isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"
    }`}>
      
      {/* Header Command Bar */}
      <header className={`border-b sticky top-0 z-40 px-4 py-3 shadow-sm transition-colors duration-300 ${
        isDark ? "border-cyan-500/15 bg-slate-950/85 backdrop-blur-md" : "border-slate-200 bg-white/85 backdrop-blur-md"
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
          
          {/* Logo & Quick Features Bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-300 ${
              isDark 
                ? "bg-cyan-500/10 border border-cyan-400/40 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.25)]" 
                : "bg-cyan-100 border border-cyan-200 text-cyan-600 shadow-sm"
            }`}>
              <Swords className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className={`text-sm font-extrabold uppercase tracking-widest ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                Caro Arena
              </h1>
            </div>

            {/* Quick Feature Modals Shortcuts */}
            <div className="flex items-center gap-1.5 ml-2">
              <button
                onClick={() => {
                  setShowPuzzlesModal(true);
                  synth.playTick();
                }}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  isDark
                    ? "bg-amber-950/20 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 hover:border-amber-400"
                    : "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
                }`}
                title="Thế cờ rèn luyện"
              >
                <Puzzle size={13} />
                <span>Thế Cờ</span>
              </button>

              <button
                onClick={() => {
                  setShowDailyQuestsModal(true);
                  synth.playTick();
                }}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer relative ${
                  isDark
                    ? "bg-cyan-950/20 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400"
                    : "bg-cyan-50 border-cyan-200 text-cyan-800 hover:bg-cyan-100"
                }`}
                title="Nhiệm vụ hàng ngày"
              >
                <Calendar size={13} />
                <span>Nhiệm Vụ</span>
                {unclaimedQuestsCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute -top-1 -right-1" />
                )}
              </button>

              <button
                onClick={() => {
                  setShowAchievementsModal(true);
                  synth.playTick();
                }}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  isDark
                    ? "bg-violet-950/20 border-violet-500/30 text-violet-300 hover:bg-violet-500/20 hover:border-violet-400"
                    : "bg-violet-50 border-violet-200 text-violet-800 hover:bg-violet-100"
                }`}
                title="Danh hiệu thành tựu"
              >
                <Award size={13} />
                <span>Danh Hiệu</span>
              </button>
            </div>
          </div>

          {/* Right Header items */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              id="theme-toggle-btn"
              onClick={handleToggleTheme}
              className={`p-2 rounded-lg border transition cursor-pointer ${
                isDark 
                  ? "bg-slate-900 border-cyan-500/20 text-cyan-400 hover:bg-cyan-950/40 hover:text-cyan-300" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
              title={isDark ? "Sáng" : "Tối"}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Profile Bar */}
            <div className={`flex items-center gap-3 px-3 py-1.5 rounded-xl border ${
              isDark ? "bg-slate-900/60 border-cyan-500/20" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <div className="flex items-center gap-1.5">
                {profile.countryFlag && <span>{profile.countryFlag}</span>}
                <span className="text-xs font-extrabold text-cyan-400">{profile.name}</span>
                <span className={`text-[9px] font-bold ${rankTier.colorClass}`}>({profile.elo})</span>
              </div>

              <div className={`w-px h-6 ${isDark ? "bg-slate-800" : "bg-slate-200"}`} />

              <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
                <Coins size={13} />
                <span>{(profile.coins || 0).toLocaleString()}</span>
              </div>

              <button
                onClick={handleLogout}
                className="p-1 text-slate-400 hover:text-rose-400 transition"
                title="Đăng xuất"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Main Body Grid Layout */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 flex flex-col lg:flex-row gap-6 items-stretch my-2">
        
        {/* Left Column: Game board and modes */}
        <section className="flex-grow lg:w-2/3 flex flex-col gap-3">
          
          {/* Game Modes & Rule Console */}
          <div className={`p-3 px-4 rounded-2xl flex flex-wrap justify-between items-center gap-3 transition-colors duration-300 ${
            isDark ? "bg-slate-900/40 border border-cyan-500/15" : "bg-white border border-slate-200 shadow-sm"
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chế độ:</span>
              <div className="flex gap-1">
                {(["AI", "ONLINE", "PVP"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setGameMode(m);
                      handleResetBoard();
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      gameMode === m
                        ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                        : isDark
                        ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    {m === "AI" ? "Đấu Máy (Ranked)" : m === "ONLINE" ? "Online" : "Đấu Đôi (PVP)"}
                  </button>
                ))}
              </div>
            </div>

            {/* Rule Switcher: Free vs VN Blocked Ends */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Luật:</span>
              <button
                onClick={handleToggleGameRule}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                  gameRule === "VN_BLOCKED_ENDS"
                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-sm"
                    : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                }`}
                title="Click để chuyển đổi luật chơi"
              >
                <ShieldCheck size={13} />
                <span>{gameRule === "VN_BLOCKED_ENDS" ? "Luật Caro VN (Chặn 2 đầu)" : "Luật Tự Do (5 liên tiếp)"}</span>
              </button>
            </div>
          </div>

          {/* Board Area */}
          <div className="relative">
            {!isMatchStarted ? (
              <div className={`w-full min-h-[420px] rounded-2xl border flex flex-col justify-center items-center p-6 transition-all relative overflow-hidden ${
                isDark 
                  ? "bg-slate-950 border-cyan-500/20 shadow-[inset_0_0_30px_rgba(6,182,212,0.15)]" 
                  : "bg-white border-slate-200 shadow-sm"
              }`}>
                <motion.div 
                  className="w-full max-w-md text-center space-y-5"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex justify-center">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                      isDark ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]" : "bg-cyan-50 text-cyan-600 border border-cyan-200 shadow-sm"
                    }`}>
                      {gameMode === "AI" ? (
                        <Cpu size={32} className="animate-pulse" />
                      ) : gameMode === "ONLINE" ? (
                        <Globe size={32} className="animate-pulse" />
                      ) : (
                        <Users size={32} />
                      )}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl font-extrabold uppercase tracking-wide">
                      {gameMode === "AI" ? "Chiến Dịch Đấu Máy" : gameMode === "ONLINE" ? "Đấu Trường Online" : "Đấu Đôi Cùng Thiết Bị"}
                    </h2>
                    <p className={`text-xs mt-1 px-4 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      {gameMode === "AI"
                        ? "Thử thách kỹ năng với các cấp độ AI. Tích lũy điểm Elo khi chiến thắng."
                        : gameMode === "ONLINE"
                        ? "Ghép trận tự động hoặc tạo phòng riêng chia sẻ link để đấu cùng bạn bè."
                        : "Hai người chơi luân phiên trên cùng một thiết bị."}
                    </p>
                  </div>

                  {/* Settings card */}
                  <div className={`p-4 rounded-xl border text-left space-y-3 font-sans ${
                    isDark ? "bg-slate-900/40 border-cyan-500/10" : "bg-slate-50 border-slate-150"
                  }`}>
                    {gameMode === "AI" && (
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center border-b pb-2 border-cyan-500/10">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Đối thủ</span>
                          <span className="text-xs font-bold text-cyan-400">{getAiDetails(difficulty).name}</span>
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Cấp độ AI:</span>
                          <div className="grid grid-cols-4 gap-1">
                            {(["NOVICE", "SENTINEL", "OVERLORD", "SINGULARITY"] as const).map((diff) => (
                              <button
                                key={diff}
                                onClick={() => {
                                  setDifficulty(diff);
                                  synth.playTick();
                                }}
                                className={`py-1.5 px-1 rounded-lg text-[9px] font-bold uppercase border cursor-pointer text-center transition ${
                                  difficulty === diff
                                    ? "bg-cyan-500 text-slate-950 font-extrabold border-cyan-400 shadow-sm"
                                    : isDark
                                    ? "bg-slate-950 border-slate-800 text-slate-400"
                                    : "bg-white border-slate-200 text-slate-600"
                                }`}
                              >
                                {diff === "NOVICE" ? "Tập Sự" : diff === "SENTINEL" ? "Tiêu Chuẩn" : diff === "OVERLORD" ? "Chiến Thuật" : "Tối Thượng"}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {gameMode === "ONLINE" && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center border-b pb-2 border-cyan-500/10">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Mã phòng</span>
                          <input
                            type="text"
                            placeholder="Nhập mã hoặc để trống..."
                            value={customRoomCode}
                            onChange={(e) => setCustomRoomCode(e.target.value.toUpperCase())}
                            className="bg-slate-950 px-2.5 py-1 rounded text-xs font-mono text-cyan-400 border border-slate-800 outline-none w-48 text-right uppercase"
                          />
                        </div>
                        {customRoomCode && (
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <span className="text-[10px] text-slate-400 truncate">Link phòng: ?room={customRoomCode}</span>
                            <button
                              onClick={handleCopyRoomLink}
                              className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold flex items-center gap-1 hover:bg-cyan-500/30 transition flex-shrink-0"
                            >
                              <Copy size={11} /> {isCopiedLink ? "Đã copy!" : "Copy Link"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="border-t border-cyan-500/10 pt-2.5 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Thời gian mỗi bên (Đồng hồ cờ):</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(["BULLET", "FLASH", "RAPID"] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => {
                              setTimeControl(mode);
                              synth.playTick();
                            }}
                            className={`py-1 rounded text-[9px] font-bold uppercase border cursor-pointer text-center transition ${
                              timeControl === mode
                                ? "bg-cyan-500 text-slate-950 font-extrabold border-cyan-400 shadow-sm"
                                : isDark
                                ? "bg-slate-950 border-slate-800 text-slate-400"
                                : "bg-white border-slate-200 text-slate-600"
                            }`}
                          >
                            {mode === "BULLET" ? "1 Phút (Bullet)" : mode === "FLASH" ? "5 Phút (Flash)" : "10 Phút (Rapid)"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Primary Trigger buttons */}
                  {gameMode === "ONLINE" ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => {
                          setIsMatchStarted(true);
                          handleStartMatchmaking(customRoomCode);
                        }}
                        className="flex-1 py-3.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-xs uppercase tracking-wider font-extrabold rounded-xl cursor-pointer transition shadow-lg flex items-center justify-center gap-2"
                      >
                        <Globe size={14} />
                        <span>Vào Ghép Trận Online</span>
                      </button>
                      <button
                        onClick={handleCreatePrivateRoom}
                        className="px-4 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs uppercase tracking-wider font-bold rounded-xl cursor-pointer transition flex items-center justify-center gap-2 border border-slate-700"
                        title="Tạo phòng riêng và lấy link chia sẻ"
                      >
                        <Share2 size={14} />
                        <span>Tạo Phòng Riêng</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setIsMatchStarted(true);
                        synth.playPlace();
                        startMatchSetup();
                      }}
                      className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-xs uppercase tracking-wider font-extrabold rounded-xl cursor-pointer transition shadow-lg flex items-center justify-center gap-2"
                    >
                      <Sparkles size={14} />
                      <span>{gameMode === "AI" ? "Bắt Đầu Ván Đấu" : "Vào Bàn Cờ Đấu Đôi"}</span>
                    </button>
                  )}
                </motion.div>
              </div>
            ) : (
              <div className="relative">
                {/* Emote Overlay Floating Container */}
                <EmoteOverlay
                  emotes={emotes}
                  onSendEmote={handleSendEmote}
                  theme={theme}
                  disabled={gameStatus !== "PLAYING"}
                />

                {/* Interactive Board */}
                <InfiniteBoard
                  board={board}
                  winningCells={winningCells}
                  onCellClick={handleCellClick}
                  currentPlayer={currentPlayer}
                  isAiThinking={gameMode === "ONLINE" ? false : isAiThinking}
                  isMuted={isMuted}
                  onToggleMute={handleToggleMute}
                  lastMove={boardLastMove}
                  theme={theme}
                  activeBoardTheme={profile.activeTheme}
                  activeMarkingStyle={profile.activeMarking}
                  hintPosition={activeHint?.pos}
                />

                {/* Start Match overlay */}
                {isMatchStarted && !hasGameStarted && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-40 p-4 rounded-2xl">
                    <motion.div
                      className={`border rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl ${
                        isDark ? "bg-slate-900 border-cyan-500/30 text-slate-100" : "bg-white border-slate-200 text-slate-800"
                      }`}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                    >
                      <h3 className="text-base font-extrabold uppercase">Sẵn Sàng Xuất Kích</h3>
                      <p className="text-xs text-slate-400 my-3 font-mono">
                        {gameMode === "AI" ? `Đấu với: ${getAiDetails(difficulty).name}` : "Hai bên đã sẵn sàng"}
                      </p>
                      <button
                        onClick={() => {
                          setHasGameStarted(true);
                          synth.playWin();
                        }}
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-md hover:from-emerald-500 hover:to-emerald-400 transition"
                      >
                        Bắt Đầu Trận Đấu
                      </button>
                    </motion.div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Board Actions Bar (Undo, Hint, Emotes, Surrender, Reset) */}
          <div className={`p-3 px-4 rounded-2xl flex flex-wrap justify-between items-center gap-3 transition-colors duration-300 ${
            isDark ? "bg-slate-900/40 border border-cyan-500/15" : "bg-white border border-slate-200 shadow-sm"
          }`}>
            {/* Status info banner */}
            <div className="flex items-center gap-2.5">
              <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                gameStatus === "WON" ? "bg-emerald-500" : isAiThinking ? "bg-amber-500" : "bg-cyan-400"
              }`} />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-bold text-slate-400">Trạng thái</span>
                <span className="text-xs font-bold text-cyan-300">
                  {gameStatus === "WON"
                    ? "Ván đấu kết thúc"
                    : isAiThinking
                    ? "AI đang tính toán nước đi..."
                    : currentPlayer === "X"
                    ? "Lượt của bạn (Quân X)"
                    : "Lượt quân O"}
                </span>
                {activeHint && (
                  <span className="text-[10px] text-amber-400 font-semibold mt-0.5">
                    💡 Gợi ý: {activeHint.reason}
                  </span>
                )}
              </div>
            </div>

            {/* In-Game Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Undo Move Button */}
              {isMatchStarted && gameStatus === "PLAYING" && gameMode !== "ONLINE" && (
                <button
                  onClick={handleUndo}
                  disabled={moveHistory.length === 0 || isAiThinking}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-30 ${
                    isDark
                      ? "border-cyan-500/30 bg-cyan-950/20 text-cyan-300 hover:bg-cyan-500/20"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                  title="Lùi lại nước đi"
                >
                  <Undo2 size={13} />
                  <span>Lùi nước</span>
                </button>
              )}

              {/* AI Hint Button */}
              {isMatchStarted && gameStatus === "PLAYING" && (
                <button
                  onClick={handleHint}
                  disabled={isAiThinking}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-30 ${
                    isDark
                      ? "border-amber-500/30 bg-amber-950/20 text-amber-300 hover:bg-amber-500/20"
                      : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  }`}
                  title="Nhận gợi ý từ trợ lý AI"
                >
                  <Lightbulb size={13} />
                  <span>Gợi ý</span>
                </button>
              )}

              {/* Surrender Button */}
              {isMatchStarted && gameStatus === "PLAYING" && Object.keys(board).length > 0 && (
                <button
                  onClick={handleSurrender}
                  className="px-3 py-1.5 border border-rose-500/30 bg-rose-950/20 text-rose-400 hover:bg-rose-950/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="Xin thua và kết thúc ván đấu"
                >
                  <Flag size={13} />
                  <span>Xin thua</span>
                </button>
              )}

              {/* Reset / Leave Board */}
              <button
                onClick={handleResetBoard}
                className="px-3 py-1.5 border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>{isMatchStarted ? "Rời bàn" : "Làm mới"}</span>
              </button>
            </div>
          </div>

        </section>

        {/* Right Column: Tabs dashboard */}
        <section className="lg:w-1/3 flex flex-col gap-3">
          
          {/* Tab buttons */}
          <div className={`grid grid-cols-4 gap-1 rounded-2xl p-1.5 shadow-md ${
            isDark ? "bg-slate-900/60 border border-cyan-500/15" : "bg-white border border-slate-200"
          }`}>
            <button
              onClick={() => {
                setActiveTab("AI_DIRECTORY");
                synth.playTick();
              }}
              className={`py-2 rounded-xl text-center transition cursor-pointer flex flex-col items-center justify-center ${
                activeTab === "AI_DIRECTORY"
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Cpu size={14} />
              <span className="text-[9px] uppercase tracking-wider font-bold mt-0.5">Đối thủ</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("LEADERBOARD");
                synth.playTick();
              }}
              className={`py-2 rounded-xl text-center transition cursor-pointer flex flex-col items-center justify-center ${
                activeTab === "LEADERBOARD"
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Trophy size={14} />
              <span className="text-[9px] uppercase tracking-wider font-bold mt-0.5">Xếp hạng</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("COMBAT_LOG");
                synth.playTick();
              }}
              className={`py-2 rounded-xl text-center transition cursor-pointer flex flex-col items-center justify-center ${
                activeTab === "COMBAT_LOG"
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Activity size={14} />
              <span className="text-[9px] uppercase tracking-wider font-bold mt-0.5">Lịch sử</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("SHOP");
                synth.playTick();
              }}
              className={`py-2 rounded-xl text-center transition cursor-pointer flex flex-col items-center justify-center ${
                activeTab === "SHOP"
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ShoppingBag size={14} />
              <span className="text-[9px] uppercase tracking-wider font-bold mt-0.5">Cửa hàng</span>
            </button>
          </div>

          {/* Tab Contents */}
          <div className="flex-grow flex flex-col justify-stretch min-h-[400px]">
            {activeTab === "AI_DIRECTORY" && (
              <AiOpponents
                activeDifficulty={difficulty}
                onSelectDifficulty={(diff) => {
                  setDifficulty(diff);
                  handleResetBoard();
                }}
                theme={theme}
              />
            )}

            {activeTab === "LEADERBOARD" && (
              <Leaderboard
                entries={leaderboard}
                playerElo={profile.elo}
                playerName={profile.name}
                theme={theme}
              />
            )}

            {activeTab === "COMBAT_LOG" && (
              <MatchHistory
                history={profile.matches}
                theme={theme}
                onViewReplay={(match) => {
                  setReplayMatch(match);
                  synth.playTick();
                }}
                onViewAnalysis={(match) => {
                  setPostGameReport({
                    show: true,
                    result: match.result,
                    opponentName: match.opponentName,
                    opponentElo: match.opponentElo,
                    oldElo: match.oldElo || profile.elo,
                    newElo: match.newElo || profile.elo,
                    deltaElo: match.eloChange,
                    movesCount: match.movesCount,
                    isPvpUnchanged: match.eloChange === 0,
                    analysis: generateMatchAnalysis(match.result, match.movesCount),
                  });
                  synth.playTick();
                }}
              />
            )}

            {activeTab === "SHOP" && (
              <CosmeticsShop
                profile={profile}
                onUpdateProfile={(updated) => {
                  setProfile(updated);
                  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
                  saveProfileToCloud(updated);
                }}
                theme={theme}
              />
            )}
          </div>

        </section>

      </main>

      {/* Feature Modals */}
      <AnimatePresence>
        {showPuzzlesModal && (
          <CaroPuzzles
            completedPuzzles={profile.completedPuzzles || []}
            onCompletePuzzle={handleCompletePuzzle}
            onClose={() => setShowPuzzlesModal(false)}
            theme={theme}
            activeBoardTheme={profile.activeTheme}
            activeMarkingStyle={profile.activeMarking}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {replayMatch && (
          <MatchReplayModal
            match={replayMatch}
            onClose={() => setReplayMatch(null)}
            theme={theme}
            activeBoardTheme={profile.activeTheme}
            activeMarkingStyle={profile.activeMarking}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAchievementsModal && (
          <AchievementsModal
            profile={profile}
            onClaimAchievement={handleClaimAchievement}
            onClose={() => setShowAchievementsModal(false)}
            theme={theme}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDailyQuestsModal && (
          <DailyQuestsModal
            quests={profile.dailyQuests || []}
            onClaimQuest={handleClaimQuest}
            onClose={() => setShowDailyQuestsModal(false)}
            theme={theme}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCelebration && (
          <CelebrationOverlay isDark={isDark} />
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className={`border-t py-4 px-4 text-center text-xs font-semibold uppercase tracking-wider transition-colors duration-300 ${
        isDark ? "border-cyan-500/10 bg-slate-950/60 text-cyan-500/40" : "border-slate-200 bg-white text-slate-400"
      }`}>
        <span>
          Caro Arena • Infinite Battle Grid •{" "}
          <button
            onClick={() => {
              setIsEloModalOpen(true);
              synth.playTick();
            }}
            className="underline text-cyan-500 hover:text-cyan-400 font-bold cursor-pointer"
          >
            Luật Chơi & Hệ Thống Elo
          </button>
        </span>
      </footer>
    </div>
  );
}
