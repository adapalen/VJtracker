/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlayerSymbol, Position, AIDifficulty } from "../types";

// Check if there is a win of 5-in-a-row passing through the last placed cell (lastX, lastY)
export function checkWin(
  board: Record<string, PlayerSymbol>,
  lastX: number,
  lastY: number,
  symbol: PlayerSymbol
): Position[] | null {
  const directions = [
    { dx: 1, dy: 0 },   // Horizontal
    { dx: 0, dy: 1 },   // Vertical
    { dx: 1, dy: 1 },   // Diagonal Down-Right (or Up-Right depending on grid coordinates)
    { dx: 1, dy: -1 },  // Diagonal Up-Right
  ];

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

    // If we have 5 or more in a row, it's a win!
    if (winningCells.length >= 5) {
      // Sort winning cells to have clean laser draw lines
      return winningCells.sort((a, b) => a.x !== b.x ? a.x - b.x : a.y - b.y);
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
    // If the board is completely empty, the center (0,0) is the candidate
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
// countMine: number of our pieces
// countOpponent: number of opponent pieces
function evaluateWindow(countMine: number, countOpponent: number): number {
  if (countOpponent > 0) {
    // Opponent blocks this window, so it cannot form 5-in-a-row
    return 0;
  }
  switch (countMine) {
    case 4:
      return 100000; // 4 of our pieces: placing 5th wins instantly
    case 3:
      return 6000;   // 3 of our pieces: placing 4th creates a huge threat
    case 2:
      return 500;    // 2 of our pieces: placing 3rd forms active 3
    case 1:
      return 40;     // 1 of our pieces: placing 2nd forms active 2
    case 0:
      return 3;      // Empty window
    default:
      return 0;
  }
}

// Evaluate a candidate move (x, y) for a player symbol
export function evaluateMove(
  board: Record<string, PlayerSymbol>,
  cx: number,
  cy: number,
  player: PlayerSymbol
): number {
  const opponent = player === "X" ? "O" : "X";
  let totalScore = 0;

  const directions = [
    { dx: 1, dy: 0 },   // Horizontal
    { dx: 0, dy: 1 },   // Vertical
    { dx: 1, dy: 1 },   // Diagonal Down-Right
    { dx: 1, dy: -1 },  // Diagonal Up-Right
  ];

  // For each direction, check all 5 windows of length 5 that cover (cx, cy)
  for (const { dx, dy } of directions) {
    let directionScore = 0;

    // A window starting offset can range from -4 to 0
    // If offset is -4, the window covers: (cx-4, cy-4) to (cx, cy)
    // If offset is 0, the window covers: (cx, cy) to (cx+4, cy+4)
    for (let offset = -4; offset <= 0; offset++) {
      let countMine = 0;
      let countOpponent = 0;

      for (let step = 0; step < 5; step++) {
        const wx = cx + (offset + step) * dx;
        const wy = cy + (offset + step) * dy;

        // Skip the candidate cell itself, since we are simulating placing a piece there
        if (wx === cx && wy === cy) {
          countMine++; // Simulate our piece in the window
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

// AI decision maker based on difficulty ELO tier
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

  // Different personalities have different evaluation weights
  let aiWeight = 1.0;
  let opponentWeight = 1.0;
  let randomness = 0; // chance of picking a random move (0 to 1)
  let noiseRange = 0; // slight random variation in scores

  switch (difficulty) {
    case "NOVICE":
      // Novice plays randomly 30% of the time, weights offense less, misses obvious blocks
      aiWeight = 1.0;
      opponentWeight = 0.5; // less defensive awareness
      randomness = 0.3;
      noiseRange = 50;
      break;

    case "SENTINEL":
      // Sentinel is highly defensive, prioritizing blocking player threats
      aiWeight = 0.8;
      opponentWeight = 1.5; // very defensive
      randomness = 0.05;
      noiseRange = 10;
      break;

    case "OVERLORD":
      // Overlord is balanced, offensive, tactical, and completely deterministic
      aiWeight = 1.2;
      opponentWeight = 1.0;
      randomness = 0.0;
      noiseRange = 0;
      break;

    case "SINGULARITY":
      // Singularity has expert foresight, higher weights, and deterministic search
      aiWeight = 1.5;
      opponentWeight = 1.35;
      randomness = 0.0;
      noiseRange = 0;
      break;
  }

  // Handle randomness check
  if (randomness > 0 && Math.random() < randomness) {
    const randomIndex = Math.floor(Math.random() * candidates.length);
    return candidates[randomIndex];
  }

  let bestMove = candidates[0];
  let highestScore = -Infinity;

  const scoredCandidates = candidates.map(c => {
    const scoreSelf = evaluateMove(board, c.x, c.y, aiSymbol);
    const scoreOpponent = evaluateMove(board, c.x, c.y, opponentSymbol);

    // Apply weights to self (attack) vs opponent (defense)
    let score = scoreSelf * aiWeight + scoreOpponent * opponentWeight;

    // Add slight noise if applicable
    if (noiseRange > 0) {
      score += (Math.random() - 0.5) * noiseRange;
    }

    // Crucial rule: If either player can win in one move (scoreSelf has 4 of our pieces, or scoreOpponent has 4 opponent pieces),
    // we MUST prioritize it immediately! An immediate win/block overrides standard weight sums.
    if (scoreSelf >= 100000) {
      score += 1000000; // absolute priority: we win!
    } else if (scoreOpponent >= 100000) {
      score += 500000;  // very high priority: we block opponent's win!
    }

    return { pos: c, score };
  });

  // Sort by score descending
  scoredCandidates.sort((a, b) => b.score - a.score);

  // In Novice mode, sometimes it picks the 2nd or 3rd best move to simulate mistakes
  if (difficulty === "NOVICE" && scoredCandidates.length > 2 && Math.random() < 0.25) {
    const offset = Math.min(scoredCandidates.length - 1, 1 + Math.floor(Math.random() * 2));
    return scoredCandidates[offset].pos;
  }

  // Sentinel has a slight chance of oversight (5%)
  if (difficulty === "SENTINEL" && scoredCandidates.length > 1 && Math.random() < 0.05) {
    return scoredCandidates[1].pos;
  }

  return scoredCandidates[0].pos;
}

// FIDE-based ELO calculation
export function calculateEloChange(
  playerElo: number,
  opponentElo: number,
  result: "WIN" | "LOSS" | "DRAW",
  matchesCount: number
): { eloChange: number; newElo: number; expectedScore: number } {
  // Expected score for player
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));

  // Actual score
  let actualScore = 0.5;
  if (result === "WIN") actualScore = 1.0;
  if (result === "LOSS") actualScore = 0.0;

  // K-factor selection
  let k = 20;
  if (matchesCount < 10) {
    k = 40; // Calibration phase
  } else if (playerElo >= 2400) {
    k = 10; // Master phase
  }

  // Calculate change
  const eloChange = Math.round(k * (actualScore - expectedScore));
  const newElo = Math.max(100, playerElo + eloChange); // ELO cannot drop below 100

  return {
    eloChange,
    newElo,
    expectedScore,
  };
}

// Get Rank Title and styling for ELO tiers (blended FIDE + League of Legends ranks)
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
