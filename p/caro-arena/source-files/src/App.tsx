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
} from "./types";
import {
  checkWin,
  getBestMove,
  calculateEloChange,
  getRankTier,
  evaluateMove,
  getCandidates,
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
} from "lucide-react";

const STORAGE_KEYS = {
  PROFILE: "infinite_ttt_player_profile",
  LEADERBOARD: "infinite_ttt_global_leaderboard",
  MUTED: "infinite_ttt_muted",
  THEME: "infinite_ttt_theme",
  IS_LOGGED_IN: "infinite_ttt_sso_logged_in",
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
    playerStats.good = playerTotal - (playerStats.brilliant + playerStats.best + playerStats.excellent);
    if (playerStats.good < 0) playerStats.good = 0;

    opponentStats.best = Math.floor(opponentTotal * 0.35);
    opponentStats.excellent = Math.floor(opponentTotal * 0.25);
    opponentStats.good = Math.floor(opponentTotal * 0.20);
    opponentStats.inaccuracy = Math.max(0, Math.floor(opponentTotal * 0.10));
    opponentStats.mistake = Math.max(0, Math.floor(opponentTotal * 0.05));
    opponentStats.blunder = Math.max(1, opponentTotal - (opponentStats.best + opponentStats.excellent + opponentStats.good + opponentStats.inaccuracy + opponentStats.mistake));
    if (opponentStats.blunder < 0) opponentStats.blunder = 1;
  } else if (result === "LOSS") {
    playerAccuracy = Math.round((60 + Math.random() * 18) * 10) / 10;
    opponentAccuracy = Math.round((87 + Math.random() * 10.5) * 10) / 10;

    playerStats.best = Math.floor(playerTotal * 0.35);
    playerStats.excellent = Math.floor(playerTotal * 0.25);
    playerStats.good = Math.floor(playerTotal * 0.20);
    playerStats.inaccuracy = Math.max(0, Math.floor(playerTotal * 0.10));
    playerStats.mistake = Math.max(0, Math.floor(playerTotal * 0.05));
    playerStats.blunder = Math.max(1, playerTotal - (playerStats.best + playerStats.excellent + playerStats.good + playerStats.inaccuracy + playerStats.mistake));
    if (playerStats.blunder < 0) playerStats.blunder = 1;

    opponentStats.brilliant = Math.random() < 0.2 && opponentTotal > 5 ? 1 : 0;
    opponentStats.best = Math.ceil(opponentTotal * 0.55);
    opponentStats.excellent = Math.floor(opponentTotal * 0.25);
    opponentStats.good = opponentTotal - (opponentStats.brilliant + opponentStats.best + opponentStats.excellent);
    if (opponentStats.good < 0) opponentStats.good = 0;
  } else {
    playerAccuracy = Math.round((78 + Math.random() * 12) * 10) / 10;
    opponentAccuracy = Math.round((77 + Math.random() * 12) * 10) / 10;

    playerStats.best = Math.floor(playerTotal * 0.45);
    playerStats.excellent = Math.floor(playerTotal * 0.30);
    playerStats.good = playerTotal - (playerStats.best + playerStats.excellent);
    if (playerStats.good < 0) playerStats.good = 0;

    opponentStats.best = Math.floor(opponentTotal * 0.45);
    opponentStats.excellent = Math.floor(opponentTotal * 0.30);
    opponentStats.good = opponentTotal - (opponentStats.best + opponentStats.excellent);
    if (opponentStats.good < 0) opponentStats.good = 0;
  }

  let criticalTurn: number | null = null;
  let criticalTurnReason: string | null = null;

  if (movesCount >= 4) {
    criticalTurn = Math.ceil(movesCount * 0.6 + Math.random() * (movesCount * 0.2));
    if (criticalTurn > movesCount) criticalTurn = movesCount;

    if (result === "WIN") {
      criticalTurnReason = `Your opponent committed a crucial blunder on turn ${criticalTurn}, allowing your alignment threat to compound.`;
    } else if (result === "LOSS") {
      criticalTurnReason = `A vital defensive slip on turn ${criticalTurn} compromised your outer perimeter, paving the way for the defeat.`;
    } else {
      criticalTurnReason = `An intense tactical deadlock on turn ${criticalTurn} sealed the perfect split-point for both defense layouts.`;
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
  const [profile, setProfile] = useState<PlayerProfile>({
    name: "Player_1",
    elo: 1200,
    matches: [],
    countryCode: "VN",
    countryName: "Vietnam",
    countryFlag: "🇻🇳",
    coins: 999999,
    unlockedThemes: ["classic"],
    unlockedMarkings: ["classic"],
    activeTheme: "classic",
    activeMarking: "classic",
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(DEFAULT_LEADERBOARD);

  const [board, setBoard] = useState<Record<string, PlayerSymbol>>({});
  const [currentPlayer, setCurrentPlayer] = useState<PlayerSymbol>("X");
  const [gameMode, setGameMode] = useState<GameMode>("AI");
  const [difficulty, setDifficulty] = useState<AIDifficulty>("SENTINEL");
  const [gameStatus, setGameStatus] = useState<GameStatus>("PLAYING");
  const [isMatchStarted, setIsMatchStarted] = useState(false);
  
  const [winningCells, setWinningCells] = useState<Position[] | null>(null);
  const [boardLastMove, setBoardLastMove] = useState<Position | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Single Sign-On (SSO) States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [ssoUsername, setSsoUsername] = useState("");
  const [ssoCountryCode, setSsoCountryCode] = useState("VN");
  const [ssoLogs, setSsoLogs] = useState<string[]>([]);
  const [isSsoLoading, setIsSsoLoading] = useState(false);

  // Chess Clock Time Controls (Bullet: 1m, Flash: 5m, Rapid: 10m)
  const [timeControl, setTimeControl] = useState<"BULLET" | "FLASH" | "RAPID">("FLASH");
  const [playerXTime, setPlayerXTime] = useState(300);
  const [playerOTime, setPlayerOTime] = useState(300);
  const [hasGameStarted, setHasGameStarted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Online Matchmaking states
  const [matchmakingState, setMatchmakingState] = useState<"IDLE" | "SEARCHING" | "CONNECTED">("IDLE");
  const [matchmakingProgress, setMatchmakingProgress] = useState(0);
  const [matchmakingLogs, setMatchmakingLogs] = useState<string[]>([]);
  const [onlineOpponent, setOnlineOpponent] = useState<LeaderboardEntry | null>(null);
  const [onlineChats, setOnlineChats] = useState<Array<{ sender: string; text: string; time: string }>>([]);
  const [chatMessageInput, setChatMessageInput] = useState("");
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [userSymbol, setUserSymbol] = useState<"X" | "O">("X");

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
    const authUser = auth.currentUser;
    if (authUser) {
      try {
        await setDoc(doc(db, "users", authUser.uid), updatedProfile);
      } catch (e) {
        console.error("Failed to save profile to cloud:", e);
      }
    } else {
      const trimmedUsername = ssoUsername.trim();
      if (trimmedUsername) {
        try {
          await setDoc(doc(db, "users", trimmedUsername.toLowerCase()), updatedProfile);
        } catch (e) {
          console.error("Failed to save profile to cloud:", e);
        }
      }
    }
  };

  // --- INITIAL LOAD & SYNC WITH FIREBASE AUTH ---
  useEffect(() => {
    // Load theme setting
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      setTheme("dark");
    }

    // Load mute setting
    const savedMuted = localStorage.getItem(STORAGE_KEYS.MUTED);
    if (savedMuted === "true") {
      setIsMuted(true);
      synth.toggleMute();
    }

    // Load basic leaderboard first
    const savedLeaderboard = localStorage.getItem(STORAGE_KEYS.LEADERBOARD);
    let currentLeaderboard = DEFAULT_LEADERBOARD;
    if (savedLeaderboard) {
      try {
        currentLeaderboard = JSON.parse(savedLeaderboard);
      } catch (e) {
        currentLeaderboard = [...DEFAULT_LEADERBOARD];
      }
    }
    setLeaderboard(currentLeaderboard);

    // Load SSO authentication state and profile
    const loadProfileAndCredentials = async () => {
      auth.onAuthStateChanged(async (user) => {
        if (user) {
          setIsLoggedIn(true);
          try {
            let loadedProfile: PlayerProfile | null = null;
            
            try {
              // Attempt to sync from Cloud Firestore by UID
              const docRef = doc(db, "users", user.uid);
              const docSnap = await getDoc(docRef);
              if (docSnap.exists()) {
                loadedProfile = docSnap.data() as PlayerProfile;
              }
            } catch (firestoreErr) {
              console.warn("Firestore offline or inaccessible. Resorting to local profiles.", firestoreErr);
            }

            // Fallback to local storage profile if exists
            if (!loadedProfile) {
              const savedSsoUsername = localStorage.getItem("infinite_ttt_sso_username") || "";
              const localRaw = localStorage.getItem(`infinite_ttt_player_profile_${savedSsoUsername.toLowerCase()}`) || 
                               localStorage.getItem(`infinite_ttt_player_profile_${savedSsoUsername}`) || 
                               localStorage.getItem(STORAGE_KEYS.PROFILE);
              if (localRaw) {
                try {
                  loadedProfile = JSON.parse(localRaw);
                } catch (err) {}
              }
            }

            if (loadedProfile) {
              setProfile(loadedProfile);
              setTempCallsign(loadedProfile.name);
              setSsoUsername(loadedProfile.name);

              // Merge user to leaderboard
              const playerWins = loadedProfile.matches.filter(m => m.result === "WIN").length;
              const playerLosses = loadedProfile.matches.filter(m => m.result === "LOSS").length;
              
              const updatedLeaderboard = currentLeaderboard.map(e => {
                if (e.name.toLowerCase() === loadedProfile!.name.toLowerCase() || e.isPlayer) {
                  return {
                    ...e,
                    name: loadedProfile!.name,
                    elo: loadedProfile!.elo,
                    wins: playerWins,
                    losses: playerLosses,
                    isPlayer: true,
                    countryCode: loadedProfile!.countryCode || "VN",
                    countryName: loadedProfile!.countryName || "Vietnam",
                    countryFlag: loadedProfile!.countryFlag || "🇻🇳"
                  };
                }
                return e;
              });

              if (!updatedLeaderboard.some(e => e.name.toLowerCase() === loadedProfile!.name.toLowerCase())) {
                updatedLeaderboard.push({
                  name: loadedProfile.name,
                  elo: loadedProfile.elo,
                  wins: playerWins,
                  losses: playerLosses,
                  isPlayer: true,
                  status: "ONLINE",
                  avatarSeed: loadedProfile.name,
                  countryCode: loadedProfile.countryCode || "VN",
                  countryName: loadedProfile.countryName || "Vietnam",
                  countryFlag: loadedProfile.countryFlag || "🇻🇳"
                });
              }

              setLeaderboard(updatedLeaderboard);
              localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(updatedLeaderboard));
            }
          } catch (e) {
            console.error("Error loading profile:", e);
          }
        } else {
          const savedLoggedIn = localStorage.getItem("infinite_ttt_is_logged_in") === "true";
          const savedSsoUsername = localStorage.getItem("infinite_ttt_sso_username") || "";
          if (savedLoggedIn && savedSsoUsername) {
            try {
              await signInAnonymously(auth);
            } catch (err) {
              console.error("Anonymous authentication fallback failed:", err);
            }
          }
        }
      });
    };

    loadProfileAndCredentials();
  }, []);

  // --- CHESS CLOCK TIMER LOGIC ---
  useEffect(() => {
    if (gameStatus !== "PLAYING" || !hasGameStarted) {
      return;
    }

    const interval = setInterval(() => {
      if (currentPlayer === "X") {
        setPlayerXTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleChessTimeout("X");
            return 0;
          }
          const nextVal = prev - 1;
          if (nextVal <= 10) {
            synth.playWarning();
          } else {
            synth.playTick();
          }
          return nextVal;
        });
      } else {
        setPlayerOTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleChessTimeout("O");
            return 0;
          }
          const nextVal = prev - 1;
          if (nextVal <= 10) {
            synth.playWarning();
          } else {
            synth.playTick();
          }
          return nextVal;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStatus, hasGameStarted, currentPlayer]);

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
          resolveMatch(result, opponent.name, opponent.elo, data.isTimeout || false);
        }
      }
    }, (err) => {
      console.error("Match synchronization error:", err);
    });

    return () => unsubscribe();
  }, [activeMatchId, matchmakingState, gameMode, userSymbol, gameStatus]);

  // Handle Turn Expiry Forfeit (Chess clock runout)
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
        opponentName: `Local Pilot (${winningPlayer})`,
        opponentElo: 1200,
        oldElo: profile.elo,
        newElo: profile.elo,
        deltaElo: 0,
        movesCount,
        isPvpUnchanged: true,
        isTimeout: true,
      });
    } else if (gameMode === "ONLINE") {
      const opName = onlineOpponent?.name || "Online Rival";
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
      await dummyDelay(400);

      let authUser: any = null;
      let hasCloudAccess = false;

      try {
        log("Authenticating anonymously with Firebase Auth...");
        const userCredential = await signInAnonymously(auth);
        authUser = userCredential.user;
        log(`Authenticated session UID: ${authUser.uid}`);
        await dummyDelay(400);
      } catch (authErr: any) {
        log(`[WARNING] Auth handshake failed: ${authErr.message || authErr}`);
        log("Activating robust offline guest mode...");
        await dummyDelay(400);
      }

      log("Querying Cloud Firestore database for pilot records...");
      let finalProfile: PlayerProfile | null = null;

      if (authUser) {
        try {
          const docRef = doc(db, "users", authUser.uid);
          const docSnap = await getDoc(docRef);
          hasCloudAccess = true;
          await dummyDelay(400);

          if (docSnap.exists()) {
            finalProfile = docSnap.data() as PlayerProfile;
            log("Cloud profile synced successfully.");
          }
        } catch (firestoreErr: any) {
          log(`[WARNING] Cloud sync database is offline or restricted.`);
          log("Activating robust offline-first pilot protocol...");
          await dummyDelay(400);
        }
      }

      if (!finalProfile) {
        log("Restoring local profile backup state...");
        await dummyDelay(300);

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
        log("No existing profile found. Provisioning new pilot schema...");
        await dummyDelay(300);

        const selectedCountry = COUNTRIES.find(c => c.code === ssoCountryCode) || COUNTRIES[0];
        finalProfile = {
          name: trimmed,
          elo: 1200,
          matches: [],
          countryCode: selectedCountry.code,
          countryName: selectedCountry.name,
          countryFlag: selectedCountry.flag,
          coins: 999999,
          unlockedThemes: ["classic"],
          unlockedMarkings: ["classic"],
          activeTheme: "classic",
          activeMarking: "classic"
        };

        if (hasCloudAccess) {
          try {
            const docRef = doc(db, "users", authUser.uid);
            await setDoc(docRef, finalProfile);
            log("New profile registered on Cloud Firestore.");
          } catch (writeErr) {
            log("[WARNING] Cloud save unsuccessful. Saved locally.");
          }
        }
      } else {
        if (finalProfile.name !== trimmed) {
          finalProfile = { ...finalProfile, name: trimmed };
          if (hasCloudAccess) {
            try {
              const docRef = doc(db, "users", authUser.uid);
              await setDoc(docRef, finalProfile);
            } catch (err) {}
          }
        }
      }

      await dummyDelay(300);
      log("Securing localized session data...");
      
      // Save to state and local storage
      setProfile(finalProfile);
      setTempCallsign(trimmed);
      setIsLoggedIn(true);

      localStorage.setItem("infinite_ttt_is_logged_in", "true");
      localStorage.setItem("infinite_ttt_sso_username", trimmed);
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(finalProfile));
      localStorage.setItem(`infinite_ttt_player_profile_${trimmed}`, JSON.stringify(finalProfile));

      // Merge user into leaderboard
      const playerWins = finalProfile.matches.filter(m => m.result === "WIN").length;
      const playerLosses = finalProfile.matches.filter(m => m.result === "LOSS").length;
      const updatedLeaderboard = leaderboard.map(e => {
        if (e.name.toLowerCase() === finalProfile!.name.toLowerCase() || e.isPlayer) {
          return {
            ...e,
            name: finalProfile!.name,
            elo: finalProfile!.elo,
            wins: playerWins,
            losses: playerLosses,
            isPlayer: true,
            countryCode: finalProfile!.countryCode || "VN",
            countryName: finalProfile!.countryName || "Vietnam",
            countryFlag: finalProfile!.countryFlag || "🇻🇳"
          };
        }
        return e;
      });

      if (!updatedLeaderboard.some(e => e.name.toLowerCase() === finalProfile!.name.toLowerCase())) {
        updatedLeaderboard.push({
          name: finalProfile.name,
          elo: finalProfile.elo,
          wins: playerWins,
          losses: playerLosses,
          isPlayer: true,
          status: "ONLINE",
          avatarSeed: finalProfile.name,
          countryCode: finalProfile.countryCode || "VN",
          countryName: finalProfile.countryName || "Vietnam",
          countryFlag: finalProfile.countryFlag || "🇻🇳"
        });
      }
      setLeaderboard(updatedLeaderboard);
      localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(updatedLeaderboard));

      log(`[SUCCESS] Single Sign-On link complete. Pilot "${trimmed}" authorized.`);
      await dummyDelay(300);

      setIsSsoLoading(false);
      synth.playWin();
    } catch (err: any) {
      log(`[ERROR] Authentication handshake failed.`);
      log(`Details: ${err.message || err}`);
      setIsSsoLoading(false);
      synth.playDefeat();
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setSsoUsername("");
    setSsoLogs([]);
    localStorage.removeItem("infinite_ttt_is_logged_in");
    localStorage.removeItem("infinite_ttt_sso_username");
    synth.playDefeat();
  };

  // --- ONLINE MATCHMAKING VIA FIRESTORE ---
  const handleStartMatchmaking = async () => {
    if (matchmakingState !== "IDLE") return;
    
    synth.playTick();
    setMatchmakingState("SEARCHING");
    setMatchmakingProgress(0);
    setMatchmakingLogs(["Initiating secure corridor..."]);

    const authUser = auth.currentUser;
    if (!authUser) {
      setMatchmakingState("IDLE");
      setMatchmakingLogs(["[ERROR] Offline mode. Online matchmaking requires an active authenticated session."]);
      return;
    }

    const currentUid = authUser.uid;
    const currentName = profile.name || "Anonymous Pilot";
    const currentElo = profile.elo || 1200;
    const currentCountry = profile.countryCode || "VN";
    const currentFlag = profile.countryFlag || "🇻🇳";

    setMatchmakingProgress(20);
    setMatchmakingLogs(prev => [...prev, "Contacting Cloud Firestore matchmaking database..."]);

    try {
      const dummyDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      await dummyDelay(400);

      // Search for any active waiting lobbies
      const q = query(
        collection(db, "caro_matches"),
        where("status", "==", "waiting"),
        limit(5)
      );
      
      const snap = await getDocs(q);
      let foundDoc = null;
      
      if (!snap.empty) {
        // Find other player's lobby first, but fallback to own lobby to allow self-testing across tabs
        const otherMatches = snap.docs.filter(d => d.data().playerX.uid !== currentUid);
        if (otherMatches.length > 0) {
          foundDoc = otherMatches[0];
        } else {
          foundDoc = snap.docs[0];
        }
      }

      if (foundDoc) {
        // Join existing lobby as Player O
        const matchId = foundDoc.id;
        const matchData = foundDoc.data();
        
        setUserSymbol("O");
        setOnlineOpponent({
          name: matchData.playerX.name,
          elo: matchData.playerX.elo,
          wins: 0,
          losses: 0,
          status: "ONLINE",
          avatarSeed: matchData.playerX.name,
          countryCode: matchData.playerX.countryCode,
          countryFlag: matchData.playerX.flag
        });

        setMatchmakingProgress(80);
        setMatchmakingLogs(prev => [...prev, `Found opponent: ${matchData.playerX.name} (${matchData.playerX.elo} ELO)`]);
        setMatchmakingLogs(prev => [...prev, "Synchronizing board state and starting battle clock..."]);
        await dummyDelay(300);

        const initialTime = timeControl === "BULLET" ? 60 : timeControl === "FLASH" ? 300 : 600;

        await updateDoc(doc(db, "caro_matches", matchId), {
          playerO: {
            uid: currentUid,
            name: currentName,
            elo: currentElo,
            countryCode: currentCountry,
            flag: currentFlag
          },
          status: "playing",
          currentTurn: "X",
          playerXTime: initialTime,
          playerOTime: initialTime,
          lastMoveTime: Date.now()
        });

        setActiveMatchId(matchId);
        setMatchmakingProgress(100);
        setMatchmakingState("CONNECTED");
        setBoard({});
        setWinningCells(null);
        setBoardLastMove(null);
        setGameStatus("PLAYING");
        setCurrentPlayer("X");
        setPlayerXTime(initialTime);
        setPlayerOTime(initialTime);
        setHasGameStarted(true);
        setIsMatchStarted(true);
        synth.playWin();

        setOnlineChats([
          {
            sender: "System",
            text: "Connection established. Battle grid active! Player X moves first.",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setActiveTab("QUANTUM_CHAT");

      } else {
        // Create a new lobby as Player X
        setUserSymbol("X");
        setMatchmakingProgress(50);
        setMatchmakingLogs(prev => [...prev, "No active waiting lobbies found. Provisioning new session..."]);
        await dummyDelay(300);

        const initialTime = timeControl === "BULLET" ? 60 : timeControl === "FLASH" ? 300 : 600;
        
        const newMatchRef = await addDoc(collection(db, "caro_matches"), {
          playerX: {
            uid: currentUid,
            name: currentName,
            elo: currentElo,
            countryCode: currentCountry,
            flag: currentFlag
          },
          playerO: null,
          status: "waiting",
          board: {},
          lastMove: null,
          currentTurn: "X",
          playerXTime: initialTime,
          playerOTime: initialTime,
          lastMoveTime: Date.now(),
          timeControl: timeControl,
          chats: [
            {
              sender: "System",
              text: "Lobby registered. Awaiting opponent connection beacon...",
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ],
          createdAt: serverTimestamp()
        });

        setActiveMatchId(newMatchRef.id);
        setMatchmakingLogs(prev => [...prev, "Lobby generated. Listening for connection beacons..."]);
      }

    } catch (err: any) {
      setMatchmakingState("IDLE");
      setMatchmakingLogs(prev => [...prev, `[ERROR] Lobby failed: ${err.message}`]);
      console.error("Matchmaking error:", err);
    }
  };

  // Real-time Chat message handlers
  const sendPresetChat = async (text: string) => {
    if (gameMode !== "ONLINE" || !activeMatchId) return;
    synth.playTick();

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newChat = { sender: profile.name, text, time: timestamp };

    try {
      const matchDocRef = doc(db, "caro_matches", activeMatchId);
      const matchSnap = await getDoc(matchDocRef);
      if (matchSnap.exists()) {
        const chats = matchSnap.data().chats || [];
        await updateDoc(matchDocRef, {
          chats: [...chats, newChat]
        });
      }
    } catch (err) {
      console.error("Failed to send chat message:", err);
    }
  };

  const handleSendCustomChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = chatMessageInput.trim();
    if (!trimmed || !activeMatchId) return;
    
    setChatMessageInput("");
    await sendPresetChat(trimmed);
  };

  // Toggle Theme
  const handleToggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, nextTheme);
    synth.playTick();
  };

  // Sync profile edits to Leaderboard
  const handleUpdateCallsign = () => {
    const trimmed = tempCallsign.trim();
    if (!trimmed || trimmed.length > 20) {
      setTempCallsign(profile.name);
      setIsEditingCallsign(false);
      return;
    }

    const updatedProfile = { ...profile, name: trimmed };
    setProfile(updatedProfile);
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updatedProfile));
    saveProfileToCloud(updatedProfile);

    // Update in Leaderboard list
    const updatedLeaderboard = leaderboard.map(e => {
      if (e.isPlayer || e.name === profile.name) {
        return { ...e, name: trimmed, avatarSeed: trimmed, isPlayer: true };
      }
      return e;
    });
    setLeaderboard(updatedLeaderboard);
    localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(updatedLeaderboard));

    setIsEditingCallsign(false);
    synth.playTick();
  };

  // Toggle audio mute state
  const handleToggleMute = () => {
    const nextMute = synth.toggleMute();
    setIsMuted(nextMute);
    localStorage.setItem(STORAGE_KEYS.MUTED, nextMute ? "true" : "false");
  };

  // --- GAME LIFECYCLE ---
  
  // Surrender / Forfeit current active match
  const handleSurrender = async () => {
    if (gameStatus !== "PLAYING" || isAiThinking) return;
    
    synth.playPlace();
    const opponentName = gameMode === "AI" ? getAiDetails(difficulty).name : (gameMode === "ONLINE" ? (onlineOpponent?.name || "Online Pilot") : "Guest Player");
    const opponentElo = gameMode === "AI" ? getAiDetails(difficulty).elo : (gameMode === "ONLINE" ? (onlineOpponent?.elo || 1200) : 1200);
    
    if (gameMode === "PVP") {
      // Local PVP surrender - no Elo change!
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
          const winningUid = userSymbol === "X" ? "O" : "X"; // the other player wins
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

  // Reset the grid board for a new skirmish
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
    setIsMatchStarted(false); // Return to placeholder launcher page
    if (gameMode === "ONLINE") {
      setMatchmakingState("IDLE");
    }
    synth.playTick();
  };

  // Resolve match and compute ELO metrics (excluding local PVP)
  const resolveMatch = (result: "WIN" | "LOSS" | "DRAW", opponentName: string, opponentElo: number, isTimeout = false) => {
    setGameStatus("WON"); // End the board operations
    if (result === "WIN") {
      setShowCelebration(true);
    }
    
    const movesCount = Object.keys(board).length;
    const oldElo = profile.elo;

    const isPvp = gameMode === "PVP";

    // Calculate FIDE Elo Change (Render ELO rating unchanged for PVP matches!)
    const eloCalc = isPvp
      ? { eloChange: 0, newElo: profile.elo, expectedScore: 0.5 }
      : calculateEloChange(profile.elo, opponentElo, result, profile.matches.length);

    const analysis = generateMatchAnalysis(result, movesCount);

    // Create Match Log
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
      newElo: eloCalc.newElo
    };

    const updatedMatches = [newRecord, ...profile.matches];
    const updatedProfile: PlayerProfile = {
      ...profile,
      elo: eloCalc.newElo,
      matches: updatedMatches,
    };

    setProfile(updatedProfile);
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updatedProfile));
    localStorage.setItem(`infinite_ttt_player_profile_${updatedProfile.name}`, JSON.stringify(updatedProfile));
    saveProfileToCloud(updatedProfile);

    // Update global leaderboard and simulate surrounding bot duels
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

    // Simulate other AI bots playing matches against each other in the background
    updatedLeaderboard = simulateSectorDuels(updatedLeaderboard, profile.name);

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

  const handleViewPastReport = (record: MatchRecord) => {
    const analysis = {
      playerAccuracy: record.playerAccuracy || (record.result === "WIN" ? 85.5 : record.result === "LOSS" ? 64.2 : 75.8),
      opponentAccuracy: record.opponentAccuracy || (record.result === "WIN" ? 62.4 : record.result === "LOSS" ? 88.1 : 74.5),
      criticalTurn: record.criticalTurn || null,
      criticalTurnReason: record.criticalTurnReason || null,
      playerStats: generateMatchAnalysis(record.result, record.movesCount).playerStats,
      opponentStats: generateMatchAnalysis(record.result, record.movesCount).opponentStats
    };

    const recordOldElo = record.oldElo || (record.newElo ? record.newElo - record.eloChange : profile.elo - record.eloChange);
    const recordNewElo = record.newElo || (record.oldElo ? record.oldElo + record.eloChange : profile.elo);

    setPostGameReport({
      show: true,
      result: record.result,
      opponentName: record.opponentName,
      opponentElo: record.opponentElo,
      oldElo: recordOldElo,
      newElo: recordNewElo,
      deltaElo: record.eloChange,
      movesCount: record.movesCount,
      isPvpUnchanged: record.eloChange === 0,
      isTimeout: !!record.isTimeout,
      analysis,
    });
  };

  // Simulated background matches for leaderboard immersion
  const simulateSectorDuels = (list: LeaderboardEntry[], playerCallsign: string): LeaderboardEntry[] => {
    return list.map(entry => {
      if (entry.name === playerCallsign) return entry;
      
      // 30% chance for another pilot's score to fluctuate as they finish simulated duels elsewhere
      if (Math.random() < 0.3) {
        const delta = Math.floor((Math.random() * 8) + 3) * (Math.random() > 0.45 ? 1 : -1);
        const nextElo = Math.max(100, entry.elo + delta);
        const winsDelta = delta > 0 ? 1 : 0;
        const lossesDelta = delta <= 0 ? 1 : 0;
        
        const statuses: Array<"ONLINE" | "OFFLINE" | "IN_GAME"> = ["ONLINE", "OFFLINE", "IN_GAME"];
        const nextStatus = statuses[Math.floor(Math.random() * statuses.length)];

        return {
          ...entry,
          elo: nextElo,
          wins: entry.wins + winsDelta,
          losses: entry.losses + lossesDelta,
          status: nextStatus,
        };
      }
      return entry;
    });
  };

  // Click handler on specific cell position
  const handleCellClick = async (x: number, y: number) => {
    // Ignore input if game completed, cell occupied, AI currently executing, or match has not started yet
    if (gameStatus !== "PLAYING" || !hasGameStarted || board[`${x},${y}`] || isAiThinking) return;

    const key = `${x},${y}`;

    if (gameMode === "ONLINE") {
      if (currentPlayer !== userSymbol) return;

      const updatedBoard = { ...board, [key]: userSymbol };
      setBoard(updatedBoard);
      setBoardLastMove({ x, y });
      synth.playPlace();

      const winSequence = checkWin(updatedBoard, x, y, userSymbol);
      const isWinner = !!winSequence;

      const currentUid = auth.currentUser?.uid || "guest";
      const updates: any = {
        board: updatedBoard,
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
      setBoardLastMove({ x, y });
      synth.playPlace();

      // Check Win Condition
      const winSequence = checkWin(updatedBoard, x, y, currentPlayer);
      if (winSequence) {
        setWinningCells(winSequence);
        synth.playWin();

        const opponentName = gameMode === "AI" ? getAiDetails(difficulty).name : "Guest Player";
        const opponentElo = gameMode === "AI" ? getAiDetails(difficulty).elo : 1200;
        resolveMatch("WIN", opponentName, opponentElo);
        return;
      }

      // Toggle turn or trigger AI / simulated online competitor
      if (gameMode === "PVP") {
        setCurrentPlayer(currentPlayer === "X" ? "O" : "X");
      } else {
        // AI Mode turn
        setIsAiThinking(true);
        setCurrentPlayer("O");

        const aiDelay = difficulty === "NOVICE" ? 500 : difficulty === "SENTINEL" ? 800 : difficulty === "OVERLORD" ? 1150 : 1300;

        setTimeout(() => {
          const aiMove = getBestMove(updatedBoard, "O", difficulty);
          const aiKey = `${aiMove.x},${aiMove.y}`;
          const boardWithAi = { ...updatedBoard, [aiKey]: "O" };
          
          setBoard(boardWithAi);
          setBoardLastMove(aiMove);
          synth.playPlace();

          // Check AI win
          const aiWinSequence = checkWin(boardWithAi, aiMove.x, aiMove.y, "O");
          if (aiWinSequence) {
            setWinningCells(aiWinSequence);
            synth.playDefeat();
            
            const opponentName = getAiDetails(difficulty).name;
            const opponentElo = getAiDetails(difficulty).elo;
            resolveMatch("LOSS", opponentName, opponentElo);
            setIsAiThinking(false);
            return;
          }

          // Toggle back to player X
          setCurrentPlayer("X");
          setIsAiThinking(false);

          // Check if the AI's move set up an immediate threat (an open 4 or immediate winning spot)
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

  // Utilities to get AI constants
  const getAiDetails = (diff: AIDifficulty) => {
    switch (diff) {
      case "NOVICE":
        return { name: "Novice AI", elo: 800 };
      case "SENTINEL":
        return { name: "Standard AI", elo: 1400 };
      case "OVERLORD":
        return { name: "Strategic AI", elo: 2000 };
      case "SINGULARITY":
        return { name: "Expert AI", elo: 2600 };
    }
  };

  const rankTier = getRankTier(profile.elo);

  // --- SSO FORM CONDITIONAL RENDERING ---
  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen flex flex-col font-sans relative select-none justify-center items-center p-4 transition-colors duration-300 ${
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"
      }`}>
        {/* Decorative Space Dust Glow */}
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
          {/* Decorative Corner Lines */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-500/40" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-500/40" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-500/40" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500/40" />

          {/* Logo / Title Area */}
          <div className="text-center mb-6">
            <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4 transition-colors duration-300 ${
              isDark ? "bg-cyan-500/10 border border-cyan-400/40 text-cyan-400" : "bg-cyan-100 border border-cyan-300 text-cyan-600"
            }`}>
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>
            <h1 className="text-xl font-display font-bold uppercase tracking-wider">Caro Arena Login</h1>
            <p className={`text-[10px] font-mono tracking-widest mt-1 uppercase ${isDark ? "text-cyan-400/60" : "text-cyan-600/70"}`}>
              Player Portal
            </p>
          </div>

          <form onSubmit={handleSsoLogin} className="space-y-4">
            <div>
              <label className={`block text-[10px] uppercase tracking-wider font-mono font-bold mb-1.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Choose Username
              </label>
              <div className="relative">
                <input
                  id="sso-username-input"
                  type="text"
                  placeholder="Enter username..."
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
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                  <Globe size={14} className={isDark ? "text-cyan-500/40" : "text-slate-400"} />
                </div>
              </div>
              <p className={`text-[9px] font-mono mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Only alphanumeric characters and underscores are allowed.
              </p>
            </div>

            <div>
              <label className={`block text-[10px] uppercase tracking-wider font-mono font-bold mb-1.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Select Country
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
              className={`w-full py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-xs uppercase tracking-wider font-bold rounded-lg cursor-pointer transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2`}
            >
              {isSsoLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <Wifi size={13} />
                  <span>Sign In to Arena</span>
                </>
              )}
            </button>
          </form>

          {/* Secure Telemetry Logs Feed */}
          {ssoLogs.length > 0 && (
            <div className={`mt-5 rounded-lg p-3.5 font-mono text-[9px] border transition-all ${
              isDark ? "bg-slate-950/60 border-cyan-500/10 text-cyan-400/70" : "bg-slate-100 border-slate-200 text-cyan-700/80"
            }`}>
              <div className="flex justify-between items-center mb-1 text-[8px] uppercase tracking-wider font-bold opacity-60">
                <span>SSO Link Logs</span>
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              </div>
              <div className="space-y-1">
                {ssoLogs.map((log, idx) => (
                  <div key={idx}>{log}</div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans relative selection:bg-cyan-500/30 selection:text-cyan-900 transition-colors duration-300 ${
      isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"
    }`}>
      
      {/* Space Dust Radial Background overlay */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
        isDark 
          ? "bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.12),rgba(0,0,0,0))]" 
          : "bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.06),rgba(0,0,0,0))]"
      }`} />

      {/* Primary Header Command Bar */}
      <header className={`border-b sticky top-0 z-40 px-4 py-3.5 shadow-sm transition-colors duration-300 ${
        isDark ? "border-cyan-500/15 bg-slate-950/80 backdrop-blur-md" : "border-slate-200 bg-white/80 backdrop-blur-md"
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Logo & Info */}
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded flex items-center justify-center transition-colors duration-300 ${
              isDark 
                ? "bg-cyan-500/10 border border-cyan-400/40 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.25)]" 
                : "bg-cyan-100 border border-cyan-200 text-cyan-600 shadow-sm"
            }`}>
              <Swords className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className={`text-sm font-sans font-extrabold uppercase tracking-widest ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                Caro Arena
              </h1>
            </div>
          </div>

          {/* Right Header items: Theme toggle & Player Profile stats bar */}
          <div className="flex items-center gap-3.5 w-full md:w-auto">
            
            {/* Theme Toggle Button */}
            <button
              id="theme-toggle-btn"
              onClick={handleToggleTheme}
              className={`p-2 rounded-lg border transition-all cursor-pointer shadow-sm ${
                isDark 
                  ? "bg-slate-900 border-cyan-500/20 text-cyan-400 hover:bg-cyan-950/40 hover:text-cyan-300" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Profile Bar */}
            <div className={`flex items-center gap-4 px-4 py-2 rounded-lg w-full md:w-auto transition-colors duration-300 ${
              isDark ? "bg-slate-900/60 border border-cyan-500/20" : "bg-white border border-slate-200 shadow-sm"
            }`}>
              
              {/* Callsign (Permanent) */}
              <div className="flex flex-col flex-1 md:flex-initial">
                <div className="flex items-center gap-1.5">
                  {profile.countryFlag && (
                    <span className="text-sm select-none" title={profile.countryName}>{profile.countryFlag}</span>
                  )}
                  <span className={`text-xs font-sans font-extrabold tracking-wide ${isDark ? "text-cyan-300" : "text-cyan-600"}`}>
                    {profile.name}
                  </span>
                  <span className={`text-[8px] px-1.5 py-0.25 rounded border font-bold uppercase tracking-wide ${
                    isDark ? "bg-cyan-500/15 text-cyan-400/80 border-cyan-500/20" : "bg-cyan-100 text-cyan-700 border-cyan-200"
                  }`}>
                    PILOT
                  </span>
                </div>
                <span className={`text-[10px] font-sans font-semibold mt-0.5 ${rankTier.colorClass}`}>
                  {rankTier.title}
                </span>
              </div>

              <div className={`w-px h-8 hidden md:block ${isDark ? "bg-cyan-500/20" : "bg-slate-200"}`} />

              {/* Virtual Currency Badge */}
              <div className={`flex flex-col items-center md:items-start px-2.5 py-1 rounded border ${isDark ? "border-amber-500/30 bg-amber-500/5 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.05)]" : "border-amber-200 bg-amber-50 text-amber-700 shadow-inner"}`}>
                <span className={`text-[8px] font-sans uppercase tracking-wider font-bold flex items-center gap-1 ${isDark ? "text-amber-400/80" : "text-amber-600"}`}>
                  <Coins size={9} className="text-amber-500 animate-pulse" />
                  Credits
                </span>
                <span className="text-xs font-mono font-bold leading-none mt-0.5">
                  {profile.coins.toLocaleString()}
                </span>
              </div>

              <div className={`w-px h-8 hidden md:block ${isDark ? "bg-cyan-500/20" : "bg-slate-200"}`} />

              {/* ELO Rating Badge */}
              <div className={`flex flex-col items-center md:items-start px-2.5 py-1 rounded border ${rankTier.borderColor} ${isDark ? "bg-slate-950/60" : "bg-slate-50 shadow-inner"}`}>
                <span className={`text-[8px] font-sans uppercase tracking-wider font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Rating ELO</span>
                <span className={`text-xs font-mono font-bold ${rankTier.colorClass} leading-none mt-0.5`}>
                  {profile.elo}
                </span>
              </div>

              <div className={`w-px h-8 hidden md:block ${isDark ? "bg-cyan-500/20" : "bg-slate-200"}`} />

              {/* SSO Logout */}
              <button
                id="sso-logout-btn"
                onClick={handleLogout}
                className={`p-1.5 rounded transition ${isDark ? "text-slate-400 hover:text-red-400 hover:bg-slate-800/60" : "text-slate-500 hover:text-red-500 hover:bg-slate-100"}`}
                title="Disconnect SSO Session"
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
        <section className="flex-grow lg:w-2/3 flex flex-col gap-4">
          
          {/* Game Modes control console */}
          <div className={`p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 transition-colors duration-300 ${
            isDark ? "bg-slate-900/40 border border-cyan-500/15" : "bg-white border border-slate-200 shadow-sm"
          }`}>
            
            <div className="flex flex-col items-center sm:items-start gap-1">
              <span className={`text-[10px] font-sans font-bold tracking-wider uppercase ${isDark ? "text-cyan-400/60" : "text-cyan-600"}`}>System Operations</span>
              <div className="flex gap-4 items-center">
                <span className={`text-xs font-sans font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                  Mode: <span className={`${isDark ? "text-cyan-300" : "text-cyan-600"} font-bold uppercase tracking-wide`}>
                    {gameMode === "AI" ? "Ranked Campaign" : gameMode === "ONLINE" ? "Online Multiplayer" : "Local PVP Play (Unranked)"}
                  </span>
                </span>
              </div>
            </div>

            {/* Action Toggles */}
            <div className="flex flex-wrap gap-2.5 justify-center">
              <button
                id="toggle-ai-mode"
                onClick={() => {
                  setGameMode("AI");
                  setIsMatchStarted(false);
                  handleResetBoard();
                }}
                className={`px-3 py-1.5 text-xs font-sans uppercase tracking-wider rounded font-bold cursor-pointer transition-all ${
                  gameMode === "AI"
                    ? isDark
                      ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                      : "bg-cyan-100 text-cyan-700 border border-cyan-200 shadow-sm"
                    : isDark
                      ? "bg-slate-950/40 border border-slate-800 text-slate-400 hover:text-slate-300 hover:border-cyan-500/20"
                      : "bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-cyan-500/30"
                }`}
              >
                Campaign
              </button>
              <button
                id="toggle-online-mode"
                onClick={() => {
                  setGameMode("ONLINE");
                  setIsMatchStarted(false);
                  handleResetBoard();
                }}
                className={`px-3 py-1.5 text-xs font-sans uppercase tracking-wider rounded font-bold cursor-pointer transition-all ${
                  gameMode === "ONLINE"
                    ? isDark
                      ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                      : "bg-cyan-100 text-cyan-700 border border-cyan-200 shadow-sm"
                    : isDark
                      ? "bg-slate-950/40 border border-slate-800 text-slate-400 hover:text-slate-300 hover:border-cyan-500/20"
                      : "bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-cyan-500/30"
                }`}
              >
                Online Arena
              </button>
              <button
                id="toggle-pvp-mode"
                onClick={() => {
                  setGameMode("PVP");
                  setIsMatchStarted(false);
                  handleResetBoard();
                }}
                className={`px-3 py-1.5 text-xs font-sans uppercase tracking-wider rounded font-bold cursor-pointer transition-all ${
                  gameMode === "PVP"
                    ? isDark
                      ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                      : "bg-cyan-100 text-cyan-700 border border-cyan-200 shadow-sm"
                    : isDark
                      ? "bg-slate-950/40 border border-slate-800 text-slate-400 hover:text-slate-300 hover:border-cyan-500/20"
                      : "bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-cyan-500/30"
                }`}
              >
                Local PVP
              </button>
            </div>
          </div>

          {/* Render Board or Matchmaking Lobby depending on online status */}
          <div className="relative">
            {!isMatchStarted ? (
              <div className={`w-full min-h-[400px] sm:min-h-[500px] md:min-h-[600px] lg:min-h-[620px] rounded-xl border flex flex-col justify-center items-center p-6 transition-all duration-300 relative overflow-hidden ${
                isDark 
                  ? "bg-slate-950 border-cyan-500/20 shadow-[inset_0_0_30px_rgba(6,182,212,0.15)]" 
                  : "bg-white border-slate-200 shadow-sm"
              }`}>
                {/* Visual sci-fi corner grid elements */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-cyan-500/20" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-cyan-500/20" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-cyan-500/20" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-cyan-500/20" />

                <motion.div 
                  className="w-full max-w-md text-center space-y-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {/* Mode-specific icon and header */}
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
                    <span className={`text-[10px] font-mono tracking-widest uppercase px-2.5 py-1 rounded-full border ${
                      isDark ? "bg-cyan-950/40 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"
                    }`}>
                      {gameMode === "AI" ? "Ready to Launch" : gameMode === "ONLINE" ? "Online Matchmaking Portal" : "Local Hotseat Duel"}
                    </span>
                    <h2 className="text-xl font-sans font-extrabold uppercase tracking-wide mt-3.5">
                      {gameMode === "AI" ? "Ranked AI Campaign" : gameMode === "ONLINE" ? "Continuous Arena Grid" : "Local Battle Grid"}
                    </h2>
                    <p className={`text-xs mt-2 leading-relaxed px-4 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      {gameMode === "AI" 
                        ? "Test your strategic capabilities against advanced artificial neural nets. Earn ELO rating points on victorious engagements."
                        : gameMode === "ONLINE"
                        ? "Connect with players across the world in real-time. System auto-matches you with an opponent near your skill tier."
                        : "Challenge a companion on the same device. Standard unranked rules apply. Infinite scrolling grid sandbox."}
                    </p>
                  </div>

                  {/* Settings or status display card */}
                  <div className={`p-4 rounded-xl border text-left space-y-3.5 font-sans ${
                    isDark ? "bg-slate-900/40 border-cyan-500/10" : "bg-slate-50 border-slate-150"
                  }`}>
                    {gameMode === "AI" && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center border-b pb-2 border-cyan-500/10">
                          <span className={`text-[10px] uppercase font-mono font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Current Opponent</span>
                          <span className="text-xs font-bold text-cyan-400">{getAiDetails(difficulty).name}</span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2 border-cyan-500/10">
                          <span className={`text-[10px] uppercase font-mono font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Estimated Elo</span>
                          <span className="text-xs font-mono font-bold text-amber-400">{getAiDetails(difficulty).elo} ELO</span>
                        </div>
                        <div className="space-y-2">
                          <span className={`text-[10px] uppercase font-mono font-bold block ${isDark ? "text-slate-400" : "text-slate-500"}`}>Select Difficulty</span>
                          <div className="grid grid-cols-4 gap-1.5">
                            {(["NOVICE", "SENTINEL", "OVERLORD", "SINGULARITY"] as const).map((diff) => {
                              const isSelected = difficulty === diff;
                              return (
                                <button
                                  key={diff}
                                  onClick={() => {
                                    setDifficulty(diff);
                                    synth.playTick();
                                  }}
                                  className={`py-1.5 px-1 rounded text-[9px] font-bold uppercase tracking-wider border cursor-pointer text-center transition-all ${
                                    isSelected
                                      ? isDark 
                                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                                        : "bg-cyan-100 border-cyan-300 text-cyan-800"
                                      : isDark
                                        ? "bg-slate-950 border-transparent text-slate-400 hover:text-slate-200"
                                        : "bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300"
                                  }`}
                                >
                                  {diff === "NOVICE" ? "Novice" : diff === "SENTINEL" ? "Standard" : diff === "OVERLORD" ? "Strategic" : "Expert"}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {gameMode === "ONLINE" && (
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center border-b pb-2 border-cyan-500/10">
                          <span className={`text-[10px] uppercase font-mono font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Your Profile</span>
                          <span className="text-xs font-bold text-cyan-300">{profile.name}</span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2 border-cyan-500/10">
                          <span className={`text-[10px] uppercase font-mono font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Rank Tier</span>
                          <span className={`text-xs font-bold ${rankTier.colorClass}`}>{rankTier.title} ({profile.elo} ELO)</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] uppercase font-mono font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Server Ingress</span>
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active (3ms)
                          </span>
                        </div>
                      </div>
                    )}

                    {gameMode === "PVP" && (
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center border-b pb-2 border-cyan-500/10">
                          <span className={`text-[10px] uppercase font-mono font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Pilot X (First)</span>
                          <span className="text-xs font-bold text-cyan-400">{profile.name}</span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2 border-cyan-500/10">
                          <span className={`text-[10px] uppercase font-mono font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Pilot O (Second)</span>
                          <span className="text-xs font-bold text-slate-400">Local Guest</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] uppercase font-mono font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Type</span>
                          <span className="text-xs font-mono font-bold text-amber-500">Unranked Sandbox Play</span>
                        </div>
                      </div>
                    )}

                    <div className="border-t border-cyan-500/10 pt-3.5 space-y-2">
                      <span className={`text-[10px] uppercase font-mono font-bold block ${isDark ? "text-slate-400" : "text-slate-500"}`}>Chess Clock Time Control</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(["BULLET", "FLASH", "RAPID"] as const).map((mode) => {
                          const isSelected = timeControl === mode;
                          const label = mode === "BULLET" ? "Bullet (1m)" : mode === "FLASH" ? "Flash (5m)" : "Rapid (10m)";
                          return (
                            <button
                              key={mode}
                              onClick={() => {
                                setTimeControl(mode);
                                synth.playTick();
                              }}
                              className={`py-1.5 px-1 rounded text-[9px] font-bold uppercase tracking-wider border cursor-pointer text-center transition-all ${
                                isSelected
                                  ? isDark 
                                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                                    : "bg-cyan-100 border-cyan-300 text-cyan-800"
                                  : isDark
                                    ? "bg-slate-950/40 border-cyan-500/5 text-slate-400 hover:text-slate-200"
                                    : "bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Primary Trigger button */}
                  {gameMode === "ONLINE" ? (
                    <button
                      id="launch-match-btn"
                      onClick={() => {
                        setIsMatchStarted(true);
                        handleStartMatchmaking();
                      }}
                      className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-sans text-xs uppercase tracking-wider font-extrabold rounded-lg cursor-pointer transition-all shadow-[0_4px_15px_rgba(6,182,212,0.15)] hover:shadow-[0_4px_20px_rgba(6,182,212,0.25)] flex items-center justify-center gap-2"
                    >
                      <Globe size={14} className="animate-spin" style={{ animationDuration: "3s" }} />
                      <span>Connect to Multiplayer Queue</span>
                    </button>
                  ) : (
                    <button
                      id="launch-match-btn"
                      onClick={() => {
                        setIsMatchStarted(true);
                        synth.playPlace();
                        startMatchSetup();
                      }}
                      className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-sans text-xs uppercase tracking-wider font-extrabold rounded-lg cursor-pointer transition-all shadow-[0_4px_15px_rgba(6,182,212,0.15)] hover:shadow-[0_4px_20px_rgba(6,182,212,0.25)] flex items-center justify-center gap-2"
                    >
                      <Sparkles size={14} />
                      <span>{gameMode === "AI" ? "Engage Campaign Combat" : "Initialize Battle Grid"}</span>
                    </button>
                  )}
                </motion.div>
              </div>
            ) : gameMode === "ONLINE" && matchmakingState !== "CONNECTED" ? (
              <div className={`w-full h-[400px] sm:h-[500px] md:h-[600px] lg:h-[620px] rounded-xl border flex flex-col justify-center items-center p-6 transition-all duration-300 ${
                isDark 
                  ? "bg-slate-950 border-cyan-500/20 shadow-[inset_0_0_30px_rgba(6,182,212,0.15)]" 
                  : "bg-white border-slate-200 shadow-sm"
              }`}>
                {matchmakingState === "IDLE" ? (
                  <motion.div
                    className="text-center max-w-sm space-y-6"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <div className="flex justify-center">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center animate-pulse ${
                        isDark ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30" : "bg-cyan-50 text-cyan-600 border border-cyan-200"
                      }`}>
                        <Globe size={32} />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-lg font-display font-bold uppercase tracking-wider">Arena Matchmaking</h2>
                      <p className={`text-xs mt-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                        Join the continuous global queue. Match with active players matching your ELO rating tier.
                      </p>
                    </div>

                    <div className={`p-4 rounded-lg border font-mono text-xs space-y-2 text-left ${
                      isDark ? "bg-slate-900/60 border-cyan-500/10 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}>
                      <div className="flex justify-between">
                        <span>Active Players:</span>
                        <span className="text-emerald-500 font-bold">482 Online</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Your Rating:</span>
                        <span className={rankTier.colorClass}>{profile.elo} ELO</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Server Region:</span>
                        <span className="text-cyan-400">Singapore</span>
                      </div>
                    </div>

                    <button
                       id="initiate-queue-btn"
                       onClick={handleStartMatchmaking}
                       className="w-full py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-sans text-xs uppercase tracking-wider font-bold rounded-lg cursor-pointer transition-all shadow-md hover:shadow-lg"
                    >
                      Join Matchmaking
                    </button>
                  </motion.div>
                ) : (
                  <div className="w-full max-w-md space-y-6">
                    <div className="text-center space-y-2">
                      <div className="relative w-16 h-16 mx-auto mb-4">
                        {/* Radar Scan Indicator */}
                        <div className="absolute inset-0 rounded-full border-2 border-cyan-500 animate-ping opacity-70" />
                        <div className="absolute inset-2 rounded-full border-2 border-cyan-400 animate-pulse" />
                        <div className="absolute inset-0 rounded-full flex items-center justify-center text-cyan-400">
                          <Globe className="w-6 h-6 animate-spin" style={{ animationDuration: "12s" }} />
                        </div>
                      </div>
                      <h3 className="text-sm font-display font-bold uppercase tracking-wider">Searching for Opponent...</h3>
                      <p className={`text-[10px] font-mono ${isDark ? "text-cyan-400/60" : "text-cyan-600"}`}>
                        Searching for an active player nearby
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? "bg-slate-900" : "bg-slate-100"}`}>
                        <div
                          className="h-full bg-cyan-500 shadow-[0_0_8px_#22d3ee] transition-all duration-150"
                          style={{ width: `${matchmakingProgress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono opacity-60">
                        <span>Progress: {matchmakingProgress}%</span>
                        <span>Estimated: 0:03s</span>
                      </div>
                    </div>

                    {/* Logs */}
                    <div className={`rounded-lg p-3.5 font-mono text-[9px] border h-28 overflow-y-auto ${
                      isDark ? "bg-slate-950/60 border-cyan-500/10 text-cyan-400/70" : "bg-slate-100 border-slate-200 text-cyan-700/80"
                    }`}>
                      {matchmakingLogs.map((log, idx) => (
                        <div key={idx} className="leading-relaxed">{log}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={`relative ${(currentPlayer === "X" ? playerXTime : playerOTime) <= 10 && gameStatus === "PLAYING" && hasGameStarted && !isAiThinking ? "animate-screen-shake" : ""}`}>
                {/* Visual red alert overlay when time is critical */}
                {(currentPlayer === "X" ? playerXTime : playerOTime) <= 10 && gameStatus === "PLAYING" && hasGameStarted && !isAiThinking && (
                  <div className="absolute inset-0 pointer-events-none animate-warning-flash border-2 border-red-500 rounded-xl z-30" />
                )}

                {/* Interactive Draggable Board Sandbox */}
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
                />

                {/* Start Match overlay to prevent auto-starting */}
                {isMatchStarted && !hasGameStarted && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-45 p-4 rounded-xl">
                    <motion.div
                      className={`border rounded-xl p-6 max-w-sm w-full text-center shadow-2xl transition-all duration-300 ${
                        isDark 
                          ? "bg-slate-900 border-cyan-500/30 text-slate-100 shadow-[0_0_30px_rgba(6,182,212,0.25)]" 
                          : "bg-white border-slate-200 text-slate-800"
                      }`}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                    >
                      <span className="text-[9px] uppercase tracking-widest font-mono font-bold text-cyan-400">Battle Grid Initialized</span>
                      <h3 className="text-lg font-sans font-extrabold mt-1.5 uppercase tracking-wide">Ready for Engagement</h3>
                      
                      <div className="my-4 p-3 rounded-lg bg-slate-950/60 border border-cyan-500/10 space-y-1 text-xs text-left text-slate-300 font-mono">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Mode:</span>
                          <span className="font-bold">{gameMode === "AI" ? "Campaign Match" : gameMode === "ONLINE" ? "Arena Matchmaking" : "Local Hotseat"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Time Control:</span>
                          <span className="font-bold text-cyan-300">
                            {timeControl === "BULLET" ? "1 Minute Bullet" : timeControl === "FLASH" ? "5 Minutes Flash" : "10 Minutes Rapid"}
                          </span>
                        </div>
                        {gameMode === "AI" && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">AI Pilot:</span>
                            <span className="font-bold text-amber-400">{getAiDetails(difficulty).name}</span>
                          </div>
                        )}
                        {gameMode === "ONLINE" && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Opponent:</span>
                            <span className="font-bold text-amber-400">{onlineOpponent?.name || "Online Rival"}</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setHasGameStarted(true);
                          synth.playWin();
                        }}
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-sans text-xs uppercase tracking-wider font-extrabold rounded-lg cursor-pointer transition-all shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
                      >
                        Start Game
                      </button>
                    </motion.div>
                  </div>
                )}

                {/* Floating Absolute Chess Clock HUD */}
                {gameStatus === "PLAYING" && (
                  <div className="absolute top-18 left-4 z-40 pointer-events-none">
                    <motion.div
                      className={`backdrop-blur-md border p-3 rounded-xl text-center shadow-2xl flex flex-col gap-2 transition-all duration-300 ${
                        isDark ? "bg-slate-900/90 border-cyan-500/30 text-white" : "bg-white/95 border-slate-200 text-slate-800"
                      }`}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                    >
                      <div className="flex items-center gap-2">
                        <Timer className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-slate-400">CHESS CLOCK</span>
                      </div>
                      <div className="flex items-center gap-4 border-t border-cyan-500/10 pt-2">
                        {/* Player X */}
                        <div className={`flex flex-col items-center px-2 py-1 rounded transition-all ${
                          currentPlayer === "X" && hasGameStarted
                            ? playerXTime <= 10
                              ? "bg-red-500/20 border border-red-500 animate-pulse text-red-400"
                              : "bg-cyan-500/10 border border-cyan-500/30 text-cyan-300"
                            : "opacity-60 text-slate-400"
                        }`}>
                          <span className="text-[8px] uppercase tracking-widest font-bold">Pilot X</span>
                          <span className="text-sm font-mono font-bold tracking-tight">
                            {formatClockTime(playerXTime)}
                          </span>
                        </div>
                        
                        <span className="text-xs font-mono opacity-40">|</span>

                        {/* Player O */}
                        <div className={`flex flex-col items-center px-2 py-1 rounded transition-all ${
                          currentPlayer === "O" && hasGameStarted
                            ? playerOTime <= 10
                              ? "bg-red-500/20 border border-red-500 animate-pulse text-red-400"
                              : "bg-cyan-500/10 border border-cyan-500/30 text-cyan-300"
                            : "opacity-60 text-slate-400"
                        }`}>
                          <span className="text-[8px] uppercase tracking-widest font-bold">Pilot O</span>
                          <span className="text-sm font-mono font-bold tracking-tight">
                            {formatClockTime(playerOTime)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Board controls & status */}
          <div className={`p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 transition-colors duration-300 ${
            isDark ? "bg-slate-900/40 border border-cyan-500/15" : "bg-white border border-slate-200 shadow-sm"
          }`}>
            
            {/* Live game state log description */}
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full animate-pulse shadow-sm ${
                (currentPlayer === "X" ? playerXTime : playerOTime) <= 10 && gameStatus === "PLAYING" && hasGameStarted && !isAiThinking ? "bg-red-500 shadow-[0_0_8px_#ef4444]" : isDark ? "bg-cyan-400" : "bg-cyan-500"
              }`} />
              <div className="flex flex-col">
                <span className={`text-[9px] uppercase tracking-wider font-bold ${isDark ? "text-slate-500" : "text-slate-400"}`}>Status</span>
                {gameStatus === "WON" ? (
                  <span className="text-xs text-emerald-500 font-bold uppercase mt-0.5">Match Completed</span>
                ) : !hasGameStarted ? (
                  <span className="text-xs text-amber-500 font-bold uppercase mt-0.5">Awaiting Game Start</span>
                ) : isAiThinking ? (
                  <span className="text-xs text-amber-500 font-bold uppercase mt-0.5">
                    {gameMode === "ONLINE" ? `${onlineOpponent?.name || "Opponent"} is planning vector...` : "Computer thinking..."}
                  </span>
                ) : (
                  <span className={`text-xs font-semibold uppercase mt-0.5 ${
                    (currentPlayer === "X" ? playerXTime : playerOTime) <= 10 ? "text-red-500 animate-pulse font-bold" : isDark ? "text-cyan-300" : "text-cyan-600"
                  }`}>
                    {currentPlayer === "X" ? "Your Turn (X)" : gameMode === "AI" ? "AI TURN (O)" : "Player O Turn"}
                  </span>
                )}
              </div>
            </div>

            {/* Command board actions */}
            <div className="flex gap-2.5">
              {gameStatus === "PLAYING" && Object.keys(board).length > 0 && (
                <button
                  id="surrender-btn"
                  onClick={handleSurrender}
                  className={`px-4.5 py-1.5 border rounded text-xs uppercase tracking-wider cursor-pointer transition ${
                    isDark 
                      ? "border-red-500/35 bg-red-950/20 text-red-400 hover:bg-red-950/40 hover:border-red-500/65" 
                      : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300"
                  }`}
                  title="Surrender and accept rating deduction"
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    <Flag size={12} />
                    <span>Surrender</span>
                  </div>
                </button>
              )}

              <button
                id="reset-board-btn"
                onClick={handleResetBoard}
                className={`px-4.5 py-1.5 border rounded text-xs uppercase tracking-wider cursor-pointer transition flex items-center gap-1.5 font-bold ${
                  isDark 
                    ? "border-cyan-500/30 bg-cyan-950/20 text-cyan-400 hover:bg-cyan-950/40 hover:border-cyan-400/60" 
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white hover:border-slate-300"
                }`}
              >
                <RotateCcw size={12} />
                <span>{gameMode === "ONLINE" ? "Disconnect" : "Reset Grid"}</span>
              </button>
            </div>
          </div>

        </section>

        {/* Right Column: High-tech tabs dashboard */}
        <section className="lg:w-1/3 flex flex-col gap-4">
          
          {/* Tab buttons */}
          <div className={`grid grid-cols-3 gap-1 rounded-xl p-1 shadow-md transition-colors duration-300 ${
            isDark ? "bg-slate-900/60 border border-cyan-500/15" : "bg-white border border-slate-200"
          }`}>
            <button
              id="tab-ai-dir"
              onClick={() => {
                setActiveTab("AI_DIRECTORY");
                synth.playTick();
              }}
              className={`flex flex-col items-center justify-center py-2 rounded-lg border text-center transition cursor-pointer ${
                activeTab === "AI_DIRECTORY"
                  ? isDark 
                    ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-sm font-semibold"
                    : "bg-cyan-50 border-cyan-200 text-cyan-700 shadow-sm font-semibold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Cpu size={14} className="mb-0.5" />
              <span className="text-[9px] uppercase tracking-wider font-bold">Opponents</span>
            </button>

            {gameMode === "ONLINE" && (
              <button
                id="tab-chat"
                onClick={() => {
                  setActiveTab("QUANTUM_CHAT");
                  synth.playTick();
                }}
                className={`flex flex-col items-center justify-center py-2 rounded-lg border text-center transition cursor-pointer ${
                  activeTab === "QUANTUM_CHAT"
                    ? isDark 
                      ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-sm font-semibold"
                      : "bg-cyan-50 border-cyan-200 text-cyan-700 shadow-sm font-semibold"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Send size={14} className="mb-0.5" />
                <span className="text-[9px] uppercase tracking-wider font-bold">Chats</span>
              </button>
            )}

            <button
              id="tab-leaderboard"
              onClick={() => {
                setActiveTab("LEADERBOARD");
                synth.playTick();
              }}
              className={`flex flex-col items-center justify-center py-2 rounded-lg border text-center transition cursor-pointer ${
                activeTab === "LEADERBOARD"
                  ? isDark 
                    ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-sm font-semibold"
                    : "bg-cyan-50 border-cyan-200 text-cyan-700 shadow-sm font-semibold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Trophy size={14} className="mb-0.5" />
              <span className="text-[9px] uppercase tracking-wider font-bold">Rankings</span>
            </button>

            <button
              id="tab-combat-log"
              onClick={() => {
                setActiveTab("COMBAT_LOG");
                synth.playTick();
              }}
              className={`flex flex-col items-center justify-center py-2 rounded-lg border text-center transition cursor-pointer ${
                activeTab === "COMBAT_LOG"
                  ? isDark 
                    ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-sm font-semibold"
                    : "bg-cyan-50 border-cyan-200 text-cyan-700 shadow-sm font-semibold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Activity size={14} className="mb-0.5" />
              <span className="text-[9px] uppercase tracking-wider font-bold">History</span>
            </button>

            <button
              id="tab-shop"
              onClick={() => {
                setActiveTab("SHOP");
                synth.playTick();
              }}
              className={`flex flex-col items-center justify-center py-2 rounded-lg border text-center transition cursor-pointer ${
                activeTab === "SHOP"
                  ? isDark 
                    ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-sm font-semibold"
                    : "bg-cyan-50 border-cyan-200 text-cyan-700 shadow-sm font-semibold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <ShoppingBag size={14} className="mb-0.5" />
              <span className="text-[9px] uppercase tracking-wider font-bold">Shop</span>
            </button>

            <button
              id="tab-rankings-help"
              onClick={() => {
                setActiveTab("RANKINGS_HELP");
                synth.playTick();
              }}
              className={`flex flex-col items-center justify-center py-2 rounded-lg border text-center transition cursor-pointer ${
                activeTab === "RANKINGS_HELP"
                  ? isDark 
                    ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-sm font-semibold"
                    : "bg-cyan-50 border-cyan-200 text-cyan-700 shadow-sm font-semibold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <BookOpen size={14} className="mb-0.5" />
              <span className="text-[9px] uppercase tracking-wider font-bold">Rules</span>
            </button>
          </div>

          {/* Tab Contents */}
          <div className="flex-grow flex flex-col justify-stretch">
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

            {activeTab === "QUANTUM_CHAT" && gameMode === "ONLINE" && (
              <div className={`p-5 rounded-xl border flex flex-col h-[400px] transition-all duration-300 ${
                isDark 
                  ? "bg-slate-900/60 border-cyan-500/15 shadow-[0_0_20px_rgba(6,182,212,0.05)]" 
                  : "bg-white border-slate-200 shadow-sm"
              }`}>
                <div className={`flex items-center justify-between mb-3 border-b pb-2 ${isDark ? "border-cyan-500/10" : "border-slate-100"}`}>
                  <span className="text-xs uppercase tracking-wider font-bold text-cyan-500">Arena Chat Feed</span>
                  <span className="text-[9px] font-mono opacity-50">Connected</span>
                </div>

                {/* Message Log */}
                <div className="flex-grow overflow-y-auto space-y-2 pr-1 custom-scrollbar text-xs">
                  {onlineChats.map((chat, idx) => {
                    const isMe = chat.sender === profile.name;
                    return (
                      <div key={idx} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        <div className="flex items-center gap-1 text-[8px] opacity-50 mb-0.5">
                          <span>{chat.sender}</span>
                          <span>•</span>
                          <span>{chat.time}</span>
                        </div>
                        <div className={`px-3 py-2 rounded-lg max-w-[85%] leading-relaxed ${
                          isMe
                            ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                            : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/25"
                        }`}>
                          {chat.text}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Preset Actions */}
                <div className="mt-3 pt-3 border-t border-cyan-500/10 space-y-2">
                  <span className="text-[8px] uppercase tracking-wider font-bold opacity-40 block mb-1">Send reaction:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Good luck!",
                      "Nice move!",
                      "Are you lagging?",
                      "Checkmate is near.",
                      "Great match!"
                    ].map((txt) => (
                      <button
                        key={txt}
                        onClick={() => sendPresetChat(txt)}
                        className={`text-[9px] px-2 py-1 rounded border transition-all cursor-pointer ${
                          isDark
                            ? "bg-slate-950 border-cyan-500/10 hover:border-cyan-400 text-cyan-400/80 hover:text-cyan-300"
                            : "bg-slate-50 border-slate-200 hover:border-cyan-500 text-slate-600 hover:text-cyan-700"
                        }`}
                      >
                        {txt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Message Input */}
                <form onSubmit={handleSendCustomChat} className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={chatMessageInput}
                    onChange={(e) => setChatMessageInput(e.target.value)}
                    placeholder="Type a message..."
                    className={`flex-grow px-3 py-2 rounded-lg border text-xs outline-none ${
                      isDark
                        ? "bg-slate-950 border-cyan-500/20 text-cyan-300 placeholder-slate-600 focus:border-cyan-400"
                        : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-cyan-500"
                    }`}
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-cyan-600 text-white rounded-lg text-xs font-bold hover:bg-cyan-500 transition cursor-pointer"
                  >
                    Send
                  </button>
                </form>
              </div>
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
                onViewAnalysis={handleViewPastReport}
              />
            )}
            {activeTab === "SHOP" && (
              <CosmeticsShop
                profile={profile}
                onUpdateProfile={(updated) => {
                  setProfile(updated);
                  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
                  localStorage.setItem(`infinite_ttt_player_profile_${updated.name}`, JSON.stringify(updated));
                  saveProfileToCloud(updated);
                }}
                theme={theme}
              />
            )}
            {activeTab === "RANKINGS_HELP" && (
              <RankExplanation 
                theme={theme}
              />
            )}
          </div>

        </section>

      </main>

      {/* Tactical Post-Game Modal Overlay Report */}
      <AnimatePresence>
        {postGameReport && postGameReport.show && (
          <div
            id="post-game-modal-bg"
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
          >
            <motion.div
              id="post-game-modal"
              className={`border rounded-xl p-6 max-w-lg w-full shadow-2xl relative overflow-hidden flex flex-col transition-colors duration-300 ${
                isDark 
                  ? "bg-slate-900 border-cyan-500/30 text-slate-100 shadow-[0_0_50px_rgba(6,182,212,0.25)]" 
                  : "bg-white border-slate-200 text-slate-800 shadow-[0_10px_35px_rgba(0,0,0,0.1)]"
              }`}
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
            >
              {/* Optional Background visual glow */}
              {isDark && <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.06),transparent)] pointer-events-none" />}

              <div className="text-center mb-6">
                <span className={`text-[10px] font-sans font-bold uppercase tracking-wider ${isDark ? "text-cyan-400/60" : "text-cyan-600"}`}>
                  Match Completed
                </span>
                <h2
                  className={`text-2xl font-sans font-bold uppercase tracking-wide mt-2 flex items-center justify-center gap-2 ${
                    postGameReport.result === "WIN"
                      ? "text-emerald-500 drop-shadow-sm"
                      : postGameReport.result === "LOSS"
                      ? "text-red-500 drop-shadow-sm"
                      : "text-amber-500"
                  }`}
                >
                  {postGameReport.result === "WIN" && (
                    <>
                      <Sparkles className="w-5.5 h-5.5" />
                      Victory!
                    </>
                  )}
                  {postGameReport.result === "LOSS" && (
                    <>
                      {postGameReport.isTimeout ? (
                        <ShieldAlert className="w-5.5 h-5.5 animate-bounce text-red-500" />
                      ) : (
                        <Flag className="w-5.5 h-5.5 animate-bounce" />
                      )}
                      {postGameReport.isTimeout ? "Forfeit: Timeout" : "Defeat"}
                    </>
                  )}
                  {postGameReport.result === "DRAW" && "Draw"}
                </h2>
              </div>

              {/* Stats delta box */}
              <div className={`border rounded-lg p-4 mb-6 space-y-3 font-sans transition-colors duration-300 ${
                isDark ? "bg-slate-950/60 border-cyan-500/10" : "bg-slate-50 border-slate-150"
              }`}>
                
                {/* Adversary stats */}
                <div className="flex justify-between items-center text-xs">
                  <span className={`${isDark ? "text-slate-400" : "text-slate-500"}`}>Opponent:</span>
                  <span className={`font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>{postGameReport.opponentName} ({postGameReport.opponentElo} ELO)</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className={`${isDark ? "text-slate-400" : "text-slate-500"}`}>Total Moves:</span>
                  <span className={isDark ? "text-slate-200" : "text-slate-800"}>{postGameReport.movesCount} moves</span>
                </div>

                <div className={`border-t pt-3 flex justify-between items-center text-xs ${isDark ? "border-cyan-500/10" : "border-slate-200"}`}>
                  <span className={`${isDark ? "text-slate-400" : "text-slate-500"}`}>Rating Adjustment:</span>
                  <div className="flex items-center gap-1.5">
                    <span className={isDark ? "text-slate-400" : "text-slate-500"}>{postGameReport.oldElo}</span>
                    <span className="opacity-40">➔</span>
                    <span className={`font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>{postGameReport.newElo}</span>
                  </div>
                </div>

                {/* ELO Delta */}
                <div className="flex justify-between items-center text-xs">
                  <span className={`${isDark ? "text-slate-400" : "text-slate-500"}`}>Rating Change:</span>
                  {postGameReport.isPvpUnchanged ? (
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400/80">Unchanged (Local PVP)</span>
                  ) : (
                    <span
                      className={`font-bold ${
                        postGameReport.deltaElo > 0
                          ? "text-emerald-500"
                          : postGameReport.deltaElo < 0
                          ? "text-red-500"
                          : "text-slate-500"
                      }`}
                    >
                      {postGameReport.deltaElo > 0 ? `+${postGameReport.deltaElo}` : postGameReport.deltaElo} ELO
                    </span>
                  )}
                </div>
              </div>

              {/* Accuracy Analysis Section */}
              {postGameReport.analysis && (
                <div className={`border rounded-lg p-4 mb-6 space-y-4 font-sans transition-colors duration-300 ${
                  isDark ? "bg-slate-950/40 border-cyan-500/10" : "bg-slate-50 border-slate-150"
                }`}>
                  <div className="flex items-center gap-2 pb-2 border-b border-cyan-500/10">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span className={`text-xs uppercase tracking-wider font-mono font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      Tactical Accuracy Analysis
                    </span>
                  </div>

                  {/* Accuracy progress bars */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="font-semibold text-cyan-400">Your Accuracy</span>
                        <span className="font-bold">{postGameReport.analysis.playerAccuracy}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-1000" 
                          style={{ width: `${postGameReport.analysis.playerAccuracy}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="font-semibold text-slate-400">Opponent Accuracy</span>
                        <span className="font-bold">{postGameReport.analysis.opponentAccuracy}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-sky-500 h-full rounded-full transition-all duration-1000" 
                          style={{ width: `${postGameReport.analysis.opponentAccuracy}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Move Classifications Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-1 text-[11px]">
                    {/* Player moves */}
                    <div className="space-y-1 bg-slate-950/20 p-2 rounded border border-cyan-500/5">
                      <div className="font-semibold text-[9px] uppercase tracking-wider text-cyan-400/80 mb-1">Your placements</div>
                      {postGameReport.analysis.playerStats.brilliant > 0 && (
                        <div className="flex justify-between">
                          <span className="text-purple-400 font-bold">✨ Brilliant</span>
                          <span className="font-mono font-bold">{postGameReport.analysis.playerStats.brilliant}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-emerald-400 font-semibold">⭐ Best Move</span>
                        <span className="font-mono">{postGameReport.analysis.playerStats.best}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-teal-400">🟢 Excellent</span>
                        <span className="font-mono">{postGameReport.analysis.playerStats.excellent}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sky-400">🔵 Good</span>
                        <span className="font-mono">{postGameReport.analysis.playerStats.good}</span>
                      </div>
                      {postGameReport.analysis.playerStats.blunder > 0 && (
                        <div className="flex justify-between">
                          <span className="text-red-400 font-bold">❌ Blunder</span>
                          <span className="font-mono font-bold">{postGameReport.analysis.playerStats.blunder}</span>
                        </div>
                      )}
                    </div>

                    {/* Opponent moves */}
                    <div className="space-y-1 bg-slate-950/20 p-2 rounded border border-cyan-500/5">
                      <div className="font-semibold text-[9px] uppercase tracking-wider text-slate-400 mb-1">Opponent placements</div>
                      {postGameReport.analysis.opponentStats.brilliant > 0 && (
                        <div className="flex justify-between">
                          <span className="text-purple-400 font-bold">✨ Brilliant</span>
                          <span className="font-mono font-bold">{postGameReport.analysis.opponentStats.brilliant}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-emerald-400 font-semibold">⭐ Best Move</span>
                        <span className="font-mono">{postGameReport.analysis.opponentStats.best}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-teal-400">🟢 Excellent</span>
                        <span className="font-mono">{postGameReport.analysis.opponentStats.excellent}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sky-400">🔵 Good</span>
                        <span className="font-mono">{postGameReport.analysis.opponentStats.good}</span>
                      </div>
                      {postGameReport.analysis.opponentStats.blunder > 0 && (
                        <div className="flex justify-between">
                          <span className="text-red-400 font-bold">❌ Blunder</span>
                          <span className="font-mono font-bold">{postGameReport.analysis.opponentStats.blunder}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Critical Turn Reason */}
                  {postGameReport.analysis.criticalTurn && (
                    <div className={`p-2.5 rounded border text-[10px] leading-relaxed transition-colors duration-300 ${
                      isDark 
                        ? "bg-amber-500/5 border-amber-500/20 text-amber-300" 
                        : "bg-amber-50 border-amber-200 text-amber-800"
                    }`}>
                      <div className="font-bold uppercase tracking-wider text-[8px] mb-0.5 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        Critical Moment • Turn {postGameReport.analysis.criticalTurn}
                      </div>
                      {postGameReport.analysis.criticalTurnReason}
                    </div>
                  )}
                </div>
              )}

              <p className={`text-xs leading-relaxed text-center mb-6 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                {postGameReport.result === "WIN"
                  ? "Congratulations on the win! Your rating has been updated successfully."
                  : postGameReport.isTimeout
                  ? "Turn timer expired. You have forfeited the match."
                  : "Good effort. Your opponent managed to align five in a row. Better luck next game!"}
              </p>

              {/* Separated close/start options */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  id="close-post-game-report-btn"
                  onClick={() => {
                    setPostGameReport(prev => prev ? { ...prev, show: false } : null);
                    setShowCelebration(false);
                  }}
                  className={`flex-1 py-2.5 rounded-lg font-sans text-xs uppercase tracking-wider font-bold border transition-all cursor-pointer ${
                    isDark 
                      ? "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700" 
                      : "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Close Report
                </button>
                <button
                  id="reset-and-start-new-game-btn"
                  onClick={handleResetBoard}
                  className="flex-grow py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-sans text-xs uppercase tracking-wider font-bold rounded-lg cursor-pointer transition-all shadow-md hover:shadow-lg"
                >
                  Start New Game
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FIDE-inspired ELO explanation Modal overlay */}
      <AnimatePresence>
        {isEloModalOpen && (
          <div
            id="fide-elo-modal-bg"
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
          >
            <motion.div
              id="fide-elo-modal"
              className={`border rounded-xl p-6 max-w-xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] transition-colors duration-300 ${
                isDark 
                  ? "bg-slate-900 border-cyan-500/30 text-slate-100 shadow-[0_0_55px_rgba(6,182,212,0.2)]" 
                  : "bg-white border-slate-200 text-slate-800 shadow-[0_10px_35px_rgba(0,0,0,0.1)]"
              }`}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="flex justify-between items-center mb-4 border-b pb-3 border-cyan-500/10">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-sm font-sans font-bold uppercase tracking-wider">FIDE Adjusted ELO System</h3>
                </div>
                <button
                  onClick={() => setIsEloModalOpen(false)}
                  className={`text-xs px-2 py-1 rounded border transition ${
                    isDark 
                      ? "border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10" 
                      : "border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  Dismiss
                </button>
              </div>

              <div className="overflow-y-auto pr-1 space-y-4 text-xs leading-relaxed custom-scrollbar font-sans text-slate-300">
                
                {/* Expected Score Section */}
                <div className="space-y-2">
                  <h4 className="font-bold text-cyan-400 uppercase tracking-wide text-[10px]">1. Expected Match Outcome (Expected Score E)</h4>
                  <p className={isDark ? "text-slate-400" : "text-slate-600"}>
                    Before a game begins, our system calculates each pilot's probability of victory based on the rating difference. It uses the standard international FIDE logistic curve equation:
                  </p>
                  <div className={`p-4 rounded-lg font-mono text-center text-sm border font-semibold ${isDark ? "bg-slate-950/60 border-cyan-500/10 text-cyan-300" : "bg-slate-50 border-slate-200 text-cyan-700"}`}>
                    E = 1 / (1 + 10^((R_opponent - R_player) / 400))
                  </div>
                  <p className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                    Where <span className="font-bold">R_player</span> is your current rating, and <span className="font-bold">R_opponent</span> is the opponent's rating. An expected score of <span className="font-mono">0.75</span> means you have a 75% forecasted chance to win.
                  </p>
                </div>

                {/* Rating Modification Section */}
                <div className="space-y-2">
                  <h4 className="font-bold text-cyan-400 uppercase tracking-wide text-[10px]">2. ELO Rating Calibration (R_new)</h4>
                  <p className={isDark ? "text-slate-400" : "text-slate-600"}>
                    After match completion, ratings are mathematically adjusted depending on the actual result (S) compared to the expected score (E):
                  </p>
                  <div className={`p-4 rounded-lg font-mono text-center text-sm border font-semibold ${isDark ? "bg-slate-950/60 border-cyan-500/10 text-cyan-300" : "bg-slate-50 border-slate-200 text-cyan-700"}`}>
                    R_new = R_player + K * (S - E)
                  </div>
                  <ul className={`list-disc pl-5 space-y-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    <li><span className="font-bold text-slate-200">S (Actual Outcome):</span> 1.0 for a victory, 0.5 for a draw, and 0.0 for a loss/surrender.</li>
                    <li><span className="font-bold text-slate-200">K (K-Factor Weight):</span> The development coefficient which sets the volatility speed of ELO calibration:</li>
                  </ul>
                </div>

                {/* K-factor calibration matrix */}
                <div className={`p-3.5 rounded-lg border space-y-2 font-mono text-[10px] ${isDark ? "bg-slate-950/40 border-cyan-500/5" : "bg-slate-50 border-slate-200"}`}>
                  <div className="font-bold text-[9px] uppercase tracking-wider text-slate-400">K-Factor Matrix Configurations</div>
                  <div className="flex justify-between border-b border-cyan-500/5 pb-1">
                    <span>Calibration Phase (Matches &lt; 10):</span>
                    <span className="text-cyan-400 font-bold">K = 40</span>
                  </div>
                  <div className="flex justify-between border-b border-cyan-500/5 pb-1">
                    <span>Standard Arena Gameplay (Mastery &lt; 2400):</span>
                    <span className="text-cyan-400 font-bold">K = 20</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Apex Masters (ELO &ge; 2400):</span>
                    <span className="text-cyan-400 font-bold">K = 10</span>
                  </div>
                </div>

                {/* PVP Rules info */}
                <div className="space-y-1.5 p-3 rounded-lg border border-yellow-500/25 bg-yellow-500/5 text-amber-500">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wide text-[9px]">
                    <AlertTriangle size={12} />
                    <span>Local PvP Rating Protection Clause</span>
                  </div>
                  <p className="text-[10px] leading-relaxed">
                    To maintain leaderboard competitive integrity, all matches played in local split-screen <span className="font-bold">Local PvP mode render the ELO rating completely unchanged</span>.
                  </p>
                </div>

              </div>

              <div className="mt-5 border-t pt-3 border-cyan-500/10 flex justify-end">
                <button
                  onClick={() => setIsEloModalOpen(false)}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-sans text-xs uppercase tracking-wider font-bold rounded-lg cursor-pointer transition shadow"
                >
                  Acknowledge Formulas
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCelebration && (
          <CelebrationOverlay isDark={isDark} />
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className={`border-t py-4 px-4 text-center text-[10px] font-sans font-semibold tracking-wider uppercase transition-colors duration-300 ${
        isDark ? "border-cyan-500/10 bg-slate-950/60 text-cyan-500/40" : "border-slate-200 bg-white text-slate-400"
      }`}>
        <span>
          Caro Arena • Infinite Tactical Battle Grid •{" "}
          <button
            id="fide-elo-explain-btn"
            onClick={() => {
              setIsEloModalOpen(true);
              synth.playTick();
            }}
            className="underline text-cyan-500 hover:text-cyan-400 font-bold uppercase tracking-wider cursor-pointer"
          >
            FIDE Adjusted ELO System
          </button>
        </span>
      </footer>
    </div>
  );
}
