/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlayerSymbol, Position, AIDifficulty, GameRule, CaroPuzzle, Achievement, DailyQuest } from "../types";

// Check if there is a win passing through the last placed cell (lastX, lastY)
// Supports standard FREE gomoku (5 in a row) & VN_BLOCKED_ENDS (5 in a row blocked by opponent on both ends is not a win)
export function checkWin(
  board: Record<string, PlayerSymbol>,
  lastX: number,
  lastY: number,
  symbol: PlayerSymbol,
  rule: GameRule = "FREE"
): Position[] | null {
  const directions = [
    { dx: 1, dy: 0 },   // Horizontal
    { dx: 0, dy: 1 },   // Vertical
    { dx: 1, dy: 1 },   // Diagonal Down-Right
    { dx: 1, dy: -1 },  // Diagonal Up-Right
  ];

  const opponent = symbol === "X" ? "O" : "X";

  for (const { dx, dy } of directions) {
    const winningCells: Position[] = [{ x: lastX, y: lastY }];

    // Search forward
    let fx = lastX + dx;
    let fy = lastY + dy;
    while (board[`${fx},${fy}`] === symbol) {
      winningCells.push({ x: fx, y: fy });
      fx += dx;
      fy += dy;
    }

    // Search backward
    let bx = lastX - dx;
    let by = lastY - dy;
    while (board[`${bx},${by}`] === symbol) {
      winningCells.push({ x: bx, y: by });
      bx -= dx;
      by -= dy;
    }

    // If we have 5 or more in a row
    if (winningCells.length >= 5) {
      if (rule === "VN_BLOCKED_ENDS" && winningCells.length === 5) {
        // In Vietnamese blocked ends rule:
        // fx, fy is the cell immediately following the forward end
        // bx, by is the cell immediately preceding the backward end
        const forwardBlocked = board[`${fx},${fy}`] === opponent;
        const backwardBlocked = board[`${bx},${by}`] === opponent;

        // If BOTH ends are blocked by opponent pieces, this 5-chain is NOT a win
        if (forwardBlocked && backwardBlocked) {
          continue;
        }
      }

      // Sort winning cells for clean laser draw line
      return winningCells.sort((a, b) => (a.x !== b.x ? a.x - b.x : a.y - b.y));
    }
  }

  return null;
}

// Get all empty grid positions within a certain radius of already placed pieces
export function getCandidates(
  board: Record<string, PlayerSymbol>,
  radius: number = 1
): Position[] {
  const candidatesMap: Record<string, Position> = {};
  const keys = Object.keys(board);

  if (keys.length === 0) {
    return [{ x: 0, y: 0 }];
  }

  for (const key of keys) {
    const [xStr, yStr] = key.split(",");
    const px = parseInt(xStr, 10);
    const py = parseInt(yStr, 10);

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (dx === 0 && dy === 0) continue;
        const cx = px + dx;
        const cy = py + dy;
        const cKey = `${cx},${cy}`;

        if (!board[cKey]) {
          candidatesMap[cKey] = { x: cx, y: cy };
        }
      }
    }
  }

  return Object.values(candidatesMap);
}

// Heuristic score for a window of 5 cells
function evaluateWindow(countMine: number, countOpponent: number): number {
  if (countOpponent > 0) {
    return 0;
  }
  switch (countMine) {
    case 4:
      return 100000;
    case 3:
      return 6000;
    case 2:
      return 500;
    case 1:
      return 40;
    case 0:
      return 3;
    default:
      return 0;
  }
}

// Evaluate a candidate move (cx, cy) for a player symbol
export function evaluateMove(
  board: Record<string, PlayerSymbol>,
  cx: number,
  cy: number,
  player: PlayerSymbol
): number {
  const opponent = player === "X" ? "O" : "X";
  let totalScore = 0;

  const directions = [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 1, dy: 1 },
    { dx: 1, dy: -1 },
  ];

  for (const { dx, dy } of directions) {
    let directionScore = 0;

    for (let offset = -4; offset <= 0; offset++) {
      let countMine = 0;
      let countOpponent = 0;

      for (let step = 0; step < 5; step++) {
        const wx = cx + (offset + step) * dx;
        const wy = cy + (offset + step) * dy;

        if (wx === cx && wy === cy) {
          countMine++;
          continue;
        }

        const cell = board[`${wx},${wy}`];
        if (cell === player) {
          countMine++;
        } else if (cell === opponent) {
          countOpponent++;
        }
      }

      directionScore += evaluateWindow(countMine, countOpponent);
    }

    totalScore += directionScore;
  }

  return totalScore;
}

// Get best move for AI or Hint helper
export function getBestMove(
  board: Record<string, PlayerSymbol>,
  aiSymbol: PlayerSymbol,
  difficulty: AIDifficulty
): Position {
  const candidates = getCandidates(board, difficulty === "SINGULARITY" ? 2 : 1);

  if (candidates.length === 0) {
    return { x: 0, y: 0 };
  }

  const opponentSymbol = aiSymbol === "X" ? "O" : "X";

  let aiWeight = 1.0;
  let opponentWeight = 1.0;
  let randomness = 0;
  let noiseRange = 0;

  switch (difficulty) {
    case "NOVICE":
      aiWeight = 1.0;
      opponentWeight = 0.5;
      randomness = 0.3;
      noiseRange = 50;
      break;

    case "SENTINEL":
      aiWeight = 0.8;
      opponentWeight = 1.5;
      randomness = 0.05;
      noiseRange = 10;
      break;

    case "OVERLORD":
      aiWeight = 1.2;
      opponentWeight = 1.0;
      randomness = 0.0;
      noiseRange = 0;
      break;

    case "SINGULARITY":
      aiWeight = 1.5;
      opponentWeight = 1.35;
      randomness = 0.0;
      noiseRange = 0;
      break;
  }

  if (randomness > 0 && Math.random() < randomness) {
    const randomIndex = Math.floor(Math.random() * candidates.length);
    return candidates[randomIndex];
  }

  const scoredCandidates = candidates.map((c) => {
    const scoreSelf = evaluateMove(board, c.x, c.y, aiSymbol);
    const scoreOpponent = evaluateMove(board, c.x, c.y, opponentSymbol);

    let score = scoreSelf * aiWeight + scoreOpponent * opponentWeight;

    if (noiseRange > 0) {
      score += (Math.random() - 0.5) * noiseRange;
    }

    if (scoreSelf >= 100000) {
      score += 1000000;
    } else if (scoreOpponent >= 100000) {
      score += 500000;
    }

    return { pos: c, score, scoreSelf, scoreOpponent };
  });

  scoredCandidates.sort((a, b) => b.score - a.score);

  if (difficulty === "NOVICE" && scoredCandidates.length > 2 && Math.random() < 0.25) {
    const offset = Math.min(scoredCandidates.length - 1, 1 + Math.floor(Math.random() * 2));
    return scoredCandidates[offset].pos;
  }

  if (difficulty === "SENTINEL" && scoredCandidates.length > 1 && Math.random() < 0.05) {
    return scoredCandidates[1].pos;
  }

  return scoredCandidates[0].pos;
}

// AI Hint Assistant
export function getHintMove(
  board: Record<string, PlayerSymbol>,
  playerSymbol: PlayerSymbol
): { pos: Position; reason: string } {
  const candidates = getCandidates(board, 2);
  if (candidates.length === 0) {
    return { pos: { x: 0, y: 0 }, reason: "Khai cuộc ở vị trí trung tâm bàn cờ." };
  }

  const opponent = playerSymbol === "X" ? "O" : "X";

  const scored = candidates.map((c) => {
    const scoreSelf = evaluateMove(board, c.x, c.y, playerSymbol);
    const scoreOpponent = evaluateMove(board, c.x, c.y, opponent);
    let total = scoreSelf * 1.3 + scoreOpponent * 1.1;

    let reason = "Nước đi mở rộng thế công tốt nhất.";
    if (scoreSelf >= 100000) {
      total += 10000000;
      reason = "Nước đi dứt điểm trận đấu (Tạo 5 quân thắng)!";
    } else if (scoreOpponent >= 100000) {
      total += 5000000;
      reason = "Chặn ngay thế thắng nguy hiểm của đối thủ!";
    } else if (scoreSelf >= 6000) {
      total += 50000;
      reason = "Tạo chuỗi 4 quân tấn công liên hoàn (VCF).";
    } else if (scoreOpponent >= 6000) {
      total += 30000;
      reason = "Hóa giải nguy cơ chuỗi 4 quân của đối thủ.";
    }

    return { pos: c, score: total, reason };
  });

  scored.sort((a, b) => b.score - a.score);
  return { pos: scored[0].pos, reason: scored[0].reason };
}

// ELO calculation
export function calculateEloChange(
  playerElo: number,
  opponentElo: number,
  result: "WIN" | "LOSS" | "DRAW",
  matchesCount: number
): { eloChange: number; newElo: number; expectedScore: number } {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));

  let actualScore = 0.5;
  if (result === "WIN") actualScore = 1.0;
  if (result === "LOSS") actualScore = 0.0;

  let k = 20;
  if (matchesCount < 10) {
    k = 40;
  } else if (playerElo >= 2400) {
    k = 10;
  }

  const eloChange = Math.round(k * (actualScore - expectedScore));
  const newElo = Math.max(100, playerElo + eloChange);

  return {
    eloChange,
    newElo,
    expectedScore,
  };
}

// Rank tiers
export function getRankTier(elo: number): {
  title: string;
  colorClass: string;
  bgGlow: string;
  borderColor: string;
} {
  if (elo < 1000) {
    return {
      title: "Iron Candidate Master",
      colorClass: "text-zinc-400 font-medium",
      bgGlow: "shadow-[0_0_15px_rgba(161,161,170,0.15)]",
      borderColor: "border-zinc-500/30",
    };
  } else if (elo < 1300) {
    return {
      title: "Bronze FIDE Master",
      colorClass: "text-amber-600 font-medium",
      bgGlow: "shadow-[0_0_15px_rgba(217,119,6,0.15)]",
      borderColor: "border-amber-600/30",
    };
  } else if (elo < 1600) {
    return {
      title: "Silver International Master",
      colorClass: "text-slate-300 font-medium",
      bgGlow: "shadow-[0_0_15px_rgba(203,213,225,0.15)]",
      borderColor: "border-slate-300/30",
    };
  } else if (elo < 1900) {
    return {
      title: "Gold Grandmaster",
      colorClass: "text-yellow-400 font-semibold",
      bgGlow: "shadow-[0_0_15px_rgba(234,179,8,0.2)]",
      borderColor: "border-yellow-400/40",
    };
  } else if (elo < 2200) {
    return {
      title: "Platinum Super Grandmaster",
      colorClass: "text-emerald-400 font-semibold",
      bgGlow: "shadow-[0_0_15px_rgba(52,211,153,0.2)]",
      borderColor: "border-emerald-400/40",
    };
  } else if (elo < 2500) {
    return {
      title: "Diamond Elite Grandmaster",
      colorClass: "text-cyan-400 font-bold",
      bgGlow: "shadow-[0_0_15px_rgba(34,211,238,0.25)]",
      borderColor: "border-cyan-400/50",
    };
  } else {
    return {
      title: "Challenger Apex Master",
      colorClass: "text-rose-400 font-extrabold tracking-wider",
      bgGlow: "shadow-[0_0_20px_rgba(244,63,94,0.3)] animate-pulse",
      borderColor: "border-rose-400/60",
    };
  }
}

// Curated Caro Tactical Puzzles (Tsumego Mode)
export const DEFAULT_PUZZLES: CaroPuzzle[] = [
  {
    id: "puzzle-1",
    title: "1. Đòn 4-3 cơ bản",
    difficulty: "EASY",
    description: "Bạn cầm quân X. Hãy tìm nước đi tạo bẫy 4-3 kép không thể hóa giải!",
    playerSymbol: "X",
    initialBoard: {
      "0,0": "X",
      "1,0": "X",
      "2,0": "X",
      "0,1": "O",
      "0,2": "O",
      "1,1": "O",
    },
    initialLastMove: { x: 1, y: 1 },
    solutionSteps: [
      {
        playerMove: { x: 3, y: 0 },
        opponentResponse: { x: 4, y: 0 },
        explanation: "Tạo hàng 4 quân và ép đối thủ phải chặn!",
      },
      {
        playerMove: { x: -1, y: 0 },
        explanation: "Đạt chuỗi 5 quân liên tiếp và giành chiến thắng!",
      },
    ],
    rewardCoins: 100,
  },
  {
    id: "puzzle-2",
    title: "2. Chặn đứng chuỗi 4 đôi công",
    difficulty: "EASY",
    description: "Đối thủ O đang có chuỗi 3 quân thoáng cực kỳ nguy hiểm. Chặn ngay tại điểm then chốt!",
    playerSymbol: "X",
    initialBoard: {
      "0,0": "O",
      "1,0": "O",
      "2,0": "O",
      "-1,1": "X",
      "0,2": "X",
    },
    initialLastMove: { x: 2, y: 0 },
    solutionSteps: [
      {
        playerMove: { x: 3, y: 0 },
        opponentResponse: { x: -1, y: 0 },
        explanation: "Chặn thành công đầu tấn công chủ lực của O!",
      },
      {
        playerMove: { x: 0, y: 1 },
        explanation: "Phát triển thế công mới cho X!",
      },
    ],
    rewardCoins: 120,
  },
  {
    id: "puzzle-3",
    title: "3. VCF (Chiến thắng bằng chuỗi 4 liên hoàn)",
    difficulty: "MEDIUM",
    description: "Dồn đối thủ vào thế bị động bằng các đòn 4 liên tiếp và kết liễu trận đấu.",
    playerSymbol: "X",
    initialBoard: {
      "0,0": "X",
      "1,0": "X",
      "3,0": "X",
      "1,1": "O",
      "2,1": "O",
      "0,2": "O",
    },
    initialLastMove: { x: 0, y: 2 },
    solutionSteps: [
      {
        playerMove: { x: 2, y: 0 },
        opponentResponse: { x: 4, y: 0 },
        explanation: "Điền vào lỗ hổng tạo 4 quân ép O phải chặn đầu!",
      },
      {
        playerMove: { x: -1, y: 0 },
        explanation: "Hoàn tất chuỗi 5 quân không thể ngăn cản!",
      },
    ],
    rewardCoins: 180,
  },
  {
    id: "puzzle-4",
    title: "4. Bẫy giao điểm chữ V",
    difficulty: "HARD",
    description: "Xây dựng giao điểm giữa hàng chéo và hàng ngang để đối thủ chỉ chặn được một bên.",
    playerSymbol: "X",
    initialBoard: {
      "0,0": "X",
      "1,1": "X",
      "2,2": "X",
      "2,0": "X",
      "2,1": "O",
      "0,1": "O",
      "1,2": "O",
    },
    initialLastMove: { x: 1, y: 2 },
    solutionSteps: [
      {
        playerMove: { x: 3, y: 3 },
        opponentResponse: { x: 4, y: 4 },
        explanation: "Kích hoạt đòn tấn công chéo ép O phòng thủ!",
      },
      {
        playerMove: { x: -1, y: -1 },
        explanation: "Chiến thắng hoàn hảo trên đường chéo chính!",
      },
    ],
    rewardCoins: 250,
  },
  {
    id: "puzzle-5",
    title: "5. Bậc thầy hóa giải bẫy kép",
    difficulty: "MASTER",
    description: "Thế cờ đỉnh cao: Vừa phòng ngự đường 4 của O vừa mở ra thế thắng phản công chớp nhoáng!",
    playerSymbol: "X",
    initialBoard: {
      "0,0": "O",
      "0,1": "O",
      "0,2": "O",
      "0,3": "O",
      "-1,1": "X",
      "1,1": "X",
      "2,1": "X",
    },
    initialLastMove: { x: 0, y: 3 },
    solutionSteps: [
      {
        playerMove: { x: 0, y: 4 },
        opponentResponse: { x: 0, y: -1 },
        explanation: "Chặn ngay nước 5 của đối phương!",
      },
      {
        playerMove: { x: 3, y: 1 },
        opponentResponse: { x: 4, y: 1 },
        explanation: "Tấn công ngược lại với hàng 4 của X!",
      },
      {
        playerMove: { x: -2, y: 1 },
        explanation: "Lội ngược dòng ngoạn mục với 5 quân hoàn hảo!",
      },
    ],
    rewardCoins: 350,
  },
];

// Achievements Definition
export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_blood",
    title: "Khởi Đầu Nan",
    description: "Chiến thắng trận đấu Caro đầu tiên trong sự nghiệp.",
    icon: "⚔️",
    rewardCoins: 100,
    maxProgress: 1,
    category: "COMBAT",
  },
  {
    id: "win_streak_5",
    title: "Chiến Thần Bất Bại",
    description: "Đạt chuỗi 5 trận thắng liên tiếp.",
    icon: "🔥",
    rewardCoins: 300,
    maxProgress: 5,
    category: "COMBAT",
  },
  {
    id: "defeat_singularity",
    title: "Kẻ Hủy Diệt AI",
    description: "Đánh bại Trí Tuệ Nhân Tạo Singularity AI cấp tối thượng.",
    icon: "🤖",
    rewardCoins: 500,
    maxProgress: 1,
    category: "MASTERY",
  },
  {
    id: "solve_puzzles_3",
    title: "Kỳ Thủ Chiến Thuật",
    description: "Giải thành công 3 thế cờ trong chế độ Thế Cờ Puzzles.",
    icon: "🧩",
    rewardCoins: 250,
    maxProgress: 3,
    category: "MASTERY",
  },
  {
    id: "play_20_matches",
    title: "Kỳ Vương Kỳ Cựu",
    description: "Thi đấu tổng cộng 20 trận đấu.",
    icon: "🏆",
    rewardCoins: 400,
    maxProgress: 20,
    category: "MASTERY",
  },
  {
    id: "cosmetic_collector",
    title: "Nhà Sưu Tầm",
    description: "Mở khóa 2 giao diện bàn cờ hoặc phong cách quân cờ trong Shop.",
    icon: "🎨",
    rewardCoins: 350,
    maxProgress: 2,
    category: "COLLECTION",
  },
];

// Daily Quests Generator
export function generateDailyQuests(): DailyQuest[] {
  return [
    {
      id: "quest_play_3",
      title: "Khởi Động Ngày Mới",
      description: "Tham gia thi đấu 3 ván cờ bất kỳ hôm nay.",
      rewardCoins: 80,
      targetCount: 3,
      currentCount: 0,
      isCompleted: false,
      isClaimed: false,
    },
    {
      id: "quest_win_ai",
      title: "Rèn Luyện Với Bot",
      description: "Chiến thắng 1 trận đấu với AI ở cấp độ Sentinel trở lên.",
      rewardCoins: 120,
      targetCount: 1,
      currentCount: 0,
      isCompleted: false,
      isClaimed: false,
    },
    {
      id: "quest_solve_puzzle",
      title: "Giải Mã Thế Cờ",
      description: "Hoàn thành 1 thế cờ Puzzle chiến thuật.",
      rewardCoins: 100,
      targetCount: 1,
      currentCount: 0,
      isCompleted: false,
      isClaimed: false,
    },
  ];
}
