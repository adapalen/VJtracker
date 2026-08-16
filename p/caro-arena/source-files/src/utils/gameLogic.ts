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

// Dynamic Arena ELO calculation
export function calculateEloChange(
  playerElo: number,
  opponentElo: number,
  result: "WIN" | "LOSS" | "DRAW",
  matchesCount: number,
  winStreak: number = 0
): { eloChange: number; newElo: number; expectedScore: number } {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));

  let actualScore = 0.5;
  if (result === "WIN") actualScore = 1.0;
  if (result === "LOSS") actualScore = 0.0;

  let k = 24;
  if (matchesCount < 10) {
    k = 36; // Calibration phase
  } else if (playerElo >= 2600) {
    k = 12; // Apex Grandmaster phase
  } else if (playerElo >= 2200) {
    k = 16;
  } else if (playerElo >= 1600) {
    k = 20;
  } else {
    k = 28;
  }

  let eloChange = Math.round(k * (actualScore - expectedScore));

  // Ensure reasonable minimum outcome for victories & defeats
  if (result === "WIN") {
    if (eloChange <= 0) eloChange = 2; // Guaranteed progress on victory
    // Win streak momentum bonus
    if (winStreak >= 3) {
      const streakBonus = Math.min(6, Math.floor(winStreak / 2));
      eloChange += streakBonus;
    }
  } else if (result === "LOSS") {
    if (eloChange >= 0) eloChange = -2;
  }

  const newElo = Math.max(100, playerElo + eloChange);

  return {
    eloChange,
    newElo,
    expectedScore,
  };
}

// Diversified Caro Arena Rank Tiers
export function getRankTier(elo: number): {
  tierId: string;
  title: string;
  subtitle: string;
  colorClass: string;
  bgGlow: string;
  borderColor: string;
  badgeBg: string;
  minElo: number;
  maxElo: number;
} {
  if (elo < 1000) {
    return {
      tierId: "INITIATE",
      title: "Tân Thủ Bàn Cờ",
      subtitle: "Grid Initiate",
      colorClass: "text-zinc-400 font-medium",
      bgGlow: "shadow-[0_0_15px_rgba(161,161,170,0.15)]",
      borderColor: "border-zinc-500/30",
      badgeBg: "bg-zinc-500/10 text-zinc-300",
      minElo: 0,
      maxElo: 999,
    };
  } else if (elo < 1300) {
    return {
      tierId: "VANGUARD",
      title: "Hiệp Sĩ Ô Vuông",
      subtitle: "Grid Vanguard",
      colorClass: "text-amber-600 font-semibold",
      bgGlow: "shadow-[0_0_15px_rgba(217,119,6,0.15)]",
      borderColor: "border-amber-600/30",
      badgeBg: "bg-amber-600/10 text-amber-500",
      minElo: 1000,
      maxElo: 1299,
    };
  } else if (elo < 1600) {
    return {
      tierId: "STRATEGIST",
      title: "Chiến Lược Gia Không Gian",
      subtitle: "Dimensional Strategist",
      colorClass: "text-sky-300 font-semibold",
      bgGlow: "shadow-[0_0_15px_rgba(56,189,248,0.18)]",
      borderColor: "border-sky-400/30",
      badgeBg: "bg-sky-500/10 text-sky-300",
      minElo: 1300,
      maxElo: 1599,
    };
  } else if (elo < 1900) {
    return {
      tierId: "WARLORD",
      title: "Chủ Tướng Trận Địa",
      subtitle: "Battlefield Warlord",
      colorClass: "text-yellow-400 font-bold",
      bgGlow: "shadow-[0_0_15px_rgba(234,179,8,0.22)]",
      borderColor: "border-yellow-400/40",
      badgeBg: "bg-yellow-500/15 text-yellow-300",
      minElo: 1600,
      maxElo: 1899,
    };
  } else if (elo < 2200) {
    return {
      tierId: "GRAND_STRATEGIST",
      title: "Tông Sư Ngũ Tử",
      subtitle: "Gomoku Grandmaster",
      colorClass: "text-emerald-400 font-bold",
      bgGlow: "shadow-[0_0_18px_rgba(52,211,153,0.25)]",
      borderColor: "border-emerald-400/45",
      badgeBg: "bg-emerald-500/15 text-emerald-300",
      minElo: 1900,
      maxElo: 2199,
    };
  } else if (elo < 2500) {
    return {
      tierId: "ARCHON",
      title: "Đại Sư Huyền Không",
      subtitle: "Astral Archon",
      colorClass: "text-cyan-300 font-extrabold tracking-wide",
      bgGlow: "shadow-[0_0_20px_rgba(34,211,238,0.3)]",
      borderColor: "border-cyan-400/50",
      badgeBg: "bg-cyan-500/20 text-cyan-200",
      minElo: 2200,
      maxElo: 2499,
    };
  } else if (elo < 2800) {
    return {
      tierId: "ZENITH",
      title: "Huyền Thoại Vô Cực",
      subtitle: "Infinite Zenith Legend",
      colorClass: "text-purple-400 font-extrabold tracking-wide",
      bgGlow: "shadow-[0_0_22px_rgba(192,132,252,0.35)]",
      borderColor: "border-purple-400/60",
      badgeBg: "bg-purple-500/20 text-purple-200",
      minElo: 2500,
      maxElo: 2799,
    };
  } else {
    return {
      tierId: "SOVEREIGN",
      title: "Thần Vương Tối Cao",
      subtitle: "Apex Celestial Sovereign",
      colorClass: "text-rose-400 font-black tracking-widest uppercase",
      bgGlow: "shadow-[0_0_25px_rgba(244,63,94,0.4)] animate-pulse",
      borderColor: "border-rose-400/70",
      badgeBg: "bg-rose-500/25 text-rose-200",
      minElo: 2800,
      maxElo: 4000,
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
      "2,1": "O",
    },
    initialLastMove: { x: 2, y: 1 },
    solutionSteps: [
      {
        playerMove: { x: 3, y: 0 },
        opponentResponse: { x: 4, y: 0 },
        explanation: "Tạo hàng 4 quân ngang và ép O phải chặn đầu (4,0)!",
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
    title: "2. Chặn đứng chuỗi 3 mở",
    difficulty: "EASY",
    description: "Đối thủ O đang có chuỗi 3 quân thoáng cực kỳ nguy hiểm. Chặn ngay tại điểm then chốt!",
    playerSymbol: "X",
    initialBoard: {
      "0,0": "O",
      "1,0": "O",
      "2,0": "O",
      "-1,1": "X",
      "0,2": "X",
      "1,2": "X",
    },
    initialLastMove: { x: 2, y: 0 },
    solutionSteps: [
      {
        playerMove: { x: 3, y: 0 },
        opponentResponse: { x: -1, y: 0 },
        explanation: "Chặn thành công đầu tấn công chủ lực của O!",
      },
      {
        playerMove: { x: 2, y: 2 },
        explanation: "Hình thành hàng 3 quân thoáng cho X mở đường phản công!",
      },
    ],
    rewardCoins: 120,
  },
  {
    id: "puzzle-3",
    title: "3. Điền lỗ hổng kẹp",
    difficulty: "EASY",
    description: "Khoảng trống giữa các quân X là chìa khóa mở ra chiến thắng 5 quân.",
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
        explanation: "Điền vào lỗ hổng tạo 4 quân ép O phải chặn đầu (4,0)!",
      },
      {
        playerMove: { x: -1, y: 0 },
        explanation: "Hoàn tất chuỗi 5 quân không thể ngăn cản!",
      },
    ],
    rewardCoins: 150,
  },
  {
    id: "puzzle-4",
    title: "4. Tâm điểm giao chữ thập",
    difficulty: "MEDIUM",
    description: "Đặt quân tại giao điểm chiến lược giữa hàng ngang và hàng dọc để tạo 2 đòn tấn công cùng lúc.",
    playerSymbol: "X",
    initialBoard: {
      "1,0": "X",
      "2,0": "X",
      "0,1": "X",
      "0,2": "X",
      "-2,0": "O",
      "0,-2": "O",
      "1,1": "O",
      "2,2": "O",
    },
    initialLastMove: { x: 2, y: 2 },
    solutionSteps: [
      {
        playerMove: { x: 0, y: 0 },
        opponentResponse: { x: 3, y: 0 },
        explanation: "Tung đòn tại giao điểm (0,0) tạo 2 đường 3 mở cùng lúc!",
      },
      {
        playerMove: { x: 0, y: 3 },
        opponentResponse: { x: 0, y: 4 },
        explanation: "Tấn công đường dọc tạo 4 quân ép O chặn!",
      },
      {
        playerMove: { x: 0, y: -1 },
        explanation: "Kết liễu trận đấu với hàng 5 quân dọc hoàn hảo!",
      },
    ],
    rewardCoins: 200,
  },
  {
    id: "puzzle-5",
    title: "5. Đòn kéo chéo bất ngờ",
    difficulty: "MEDIUM",
    description: "Khai thác đường chéo chính với chuỗi 4 quân ép đối thủ vào thế phòng ngự bị động.",
    playerSymbol: "X",
    initialBoard: {
      "0,0": "X",
      "1,1": "X",
      "2,2": "X",
      "2,0": "O",
      "2,1": "O",
      "0,2": "O",
      "-1,1": "O",
    },
    initialLastMove: { x: -1, y: 1 },
    solutionSteps: [
      {
        playerMove: { x: 3, y: 3 },
        opponentResponse: { x: 4, y: 4 },
        explanation: "Tạo 4 quân chéo ép O phòng ngự góc trên!",
      },
      {
        playerMove: { x: -1, y: -1 },
        explanation: "5 quân chéo thẳng hàng không thể cản phá!",
      },
    ],
    rewardCoins: 220,
  },
  {
    id: "puzzle-6",
    title: "6. Chuỗi VCF 4 liên hoàn",
    difficulty: "MEDIUM",
    description: "VCF (Victory by Continuous Fours): Tung chuỗi đòn 4 liên tiếp không cho đối thủ cơ hội phản công.",
    playerSymbol: "X",
    initialBoard: {
      "0,0": "X",
      "1,0": "X",
      "2,0": "X",
      "0,2": "X",
      "0,3": "X",
      "0,4": "X",
      "1,1": "O",
      "2,1": "O",
      "3,0": "O",
      "-2,0": "O",
    },
    initialLastMove: { x: -2, y: 0 },
    solutionSteps: [
      {
        playerMove: { x: -1, y: 0 },
        opponentResponse: { x: 0, y: 1 },
        explanation: "Đòn 4 ngang buộc O phòng thủ tại (0,1) để chặn cả dọc!",
      },
      {
        playerMove: { x: 0, y: 5 },
        opponentResponse: { x: 0, y: 6 },
        explanation: "Tiếp tục tạo 4 dọc ép O chặn đỉnh!",
      },
      {
        playerMove: { x: 0, y: -1 },
        explanation: "Đạt 5 quân dọc kết liễu trận đấu!",
      },
    ],
    rewardCoins: 250,
  },
  {
    id: "puzzle-7",
    title: "7. Bẫy chữ L đôi công",
    difficulty: "HARD",
    description: "Xây dựng bẫy chữ L hai nhánh khiến đối phương không thể cản phá đường công còn lại.",
    playerSymbol: "X",
    initialBoard: {
      "0,0": "X",
      "1,0": "X",
      "0,1": "X",
      "0,2": "X",
      "2,2": "X",
      "2,3": "X",
      "3,0": "O",
      "-1,0": "O",
      "0,3": "O",
      "1,2": "O",
    },
    initialLastMove: { x: 1, y: 2 },
    solutionSteps: [
      {
        playerMove: { x: 2, y: 0 },
        opponentResponse: { x: 2, y: 1 },
        explanation: "Nối liền góc L bên dưới ép O chặn dọc!",
      },
      {
        playerMove: { x: 2, y: 4 },
        opponentResponse: { x: 2, y: 5 },
        explanation: "Tạo 4 quân dọc bên phải!",
      },
      {
        playerMove: { x: 2, y: -1 },
        explanation: "5 quân thẳng hàng kết thúc trận chiến!",
      },
    ],
    rewardCoins: 280,
  },
  {
    id: "puzzle-8",
    title: "8. Đòn ép khép góc",
    difficulty: "HARD",
    description: "Phòng ngự trước đòn 4 nguy hiểm của O, sau đó chuyển hướng phản công chéo dứt khoát.",
    playerSymbol: "X",
    initialBoard: {
      "-1,-1": "X",
      "1,1": "X",
      "2,2": "X",
      "0,1": "O",
      "0,2": "O",
      "0,3": "O",
      "1,0": "O",
    },
    initialLastMove: { x: 0, y: 3 },
    solutionSteps: [
      {
        playerMove: { x: 0, y: 4 },
        opponentResponse: { x: 0, y: 0 },
        explanation: "Chặn ngay đòn 4 của O và O chặn lại tại tâm (0,0)!",
      },
      {
        playerMove: { x: 3, y: 3 },
        opponentResponse: { x: 4, y: 4 },
        explanation: "Phản công tạo 4 chéo!",
      },
      {
        playerMove: { x: -2, y: -2 },
        explanation: "Chiến thắng giòn giã với 5 quân chéo!",
      },
    ],
    rewardCoins: 300,
  },
  {
    id: "puzzle-9",
    title: "9. Bẫy ép quân cờ bí",
    difficulty: "HARD",
    description: "Dồn đối thủ vào thế gọng kìm ngạt thở bằng các nước điền ô then chốt.",
    playerSymbol: "X",
    initialBoard: {
      "0,0": "X",
      "1,0": "X",
      "3,0": "X",
      "0,1": "X",
      "0,3": "X",
      "1,1": "O",
      "2,2": "O",
      "-1,0": "O",
      "0,-1": "O",
      "2,0": "O",
    },
    initialLastMove: { x: 2, y: 0 },
    solutionSteps: [
      {
        playerMove: { x: 0, y: 2 },
        opponentResponse: { x: 0, y: 4 },
        explanation: "Điền ô (0,2) tạo 4 quân dọc mở ép O chặn (0,4)!",
      },
      {
        playerMove: { x: -1, y: 2 },
        opponentResponse: { x: -2, y: 2 },
        explanation: "Mở đường ngang mới ép O phòng thủ!",
      },
      {
        playerMove: { x: 1, y: 2 },
        explanation: "Hình thành hàng 4 không thể phòng thủ!",
      },
    ],
    rewardCoins: 320,
  },
  {
    id: "puzzle-10",
    title: "10. Phản công xuyên tâm",
    difficulty: "MASTER",
    description: "Thế cờ đỉnh cao: Vừa phòng ngự đường 4 của O vừa mở ra thế thắng phản công chớp nhoáng!",
    playerSymbol: "X",
    initialBoard: {
      "0,0": "O",
      "0,1": "O",
      "0,2": "O",
      "0,3": "O",
      "-2,1": "X",
      "-1,1": "X",
      "1,1": "X",
      "2,1": "X",
    },
    initialLastMove: { x: 0, y: 3 },
    solutionSteps: [
      {
        playerMove: { x: 0, y: 4 },
        opponentResponse: { x: 0, y: -1 },
        explanation: "Chặn nước thắng 5 tức thì của O!",
      },
      {
        playerMove: { x: 3, y: 1 },
        opponentResponse: { x: 4, y: 1 },
        explanation: "Chuyển hướng tấn công chớp nhoáng với hàng 4 của X!",
      },
      {
        playerMove: { x: -3, y: 1 },
        explanation: "5 quân hoàn hảo tạo nên màn lội ngược dòng kinh điển!",
      },
    ],
    rewardCoins: 360,
  },
  {
    id: "puzzle-11",
    title: "11. Mê cung song tuyến",
    difficulty: "MASTER",
    description: "Hóa giải đòn 3 mở của O và khai hỏa mạng lưới đường chéo song hành.",
    playerSymbol: "X",
    initialBoard: {
      "-1,-1": "X",
      "0,0": "X",
      "1,1": "X",
      "-1,1": "X",
      "1,-1": "X",
      "0,2": "O",
      "0,3": "O",
      "0,4": "O",
      "-2,0": "O",
      "2,0": "O",
    },
    initialLastMove: { x: 0, y: 4 },
    solutionSteps: [
      {
        playerMove: { x: 0, y: 5 },
        opponentResponse: { x: 0, y: 1 },
        explanation: "Chặn đầu trên của O, buộc O lùi về chặn (0,1)!",
      },
      {
        playerMove: { x: 2, y: 2 },
        opponentResponse: { x: 3, y: 3 },
        explanation: "Khai hỏa đòn 4 chéo chính!",
      },
      {
        playerMove: { x: -2, y: -2 },
        explanation: "5 quân chéo hạ gục đối thủ!",
      },
    ],
    rewardCoins: 400,
  },
  {
    id: "puzzle-12",
    title: "12. Đỉnh cao vô cực",
    difficulty: "MASTER",
    description: "Thế trận chung kết: Tìm duy nhất một ô cờ khởi phát phản ứng dây chuyền 3 hướng tấn công!",
    playerSymbol: "X",
    initialBoard: {
      "-1,0": "X",
      "1,0": "X",
      "2,0": "X",
      "0,-1": "X",
      "0,1": "X",
      "0,2": "X",
      "1,1": "X",
      "2,2": "X",
      "-2,0": "O",
      "3,0": "O",
      "0,-2": "O",
      "0,3": "O",
      "-1,1": "O",
      "1,-1": "O",
      "3,3": "O",
    },
    initialLastMove: { x: 3, y: 3 },
    solutionSteps: [
      {
        playerMove: { x: 0, y: 0 },
        opponentResponse: { x: -1, y: -1 },
        explanation: "Đặt quân tại trung tâm vạn năng (0,0) kích nổ đồng thời 3 đường 4!",
      },
      {
        playerMove: { x: 4, y: 0 },
        opponentResponse: { x: 5, y: 0 },
        explanation: "Đòn 4 ngang không thể ngăn cản!",
      },
      {
        playerMove: { x: -3, y: 0 },
        explanation: "Hoàn tất thế cờ Huyền Thoại Vô Cực với 5 quân hoàn mỹ!",
      },
    ],
    rewardCoins: 500,
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
    id: "solve_puzzles_8",
    title: "Đại Sư Thế Cờ",
    description: "Giải thành công 8 thế cờ chiến thuật hóc búa.",
    icon: "👑",
    rewardCoins: 600,
    maxProgress: 8,
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
