/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  Trophy,
  History,
  AlertCircle,
} from "lucide-react";
import { MatchRecord, MoveStep, PlayerSymbol, Position } from "../types";
import InfiniteBoard from "./InfiniteBoard";
import synth from "../utils/audio";

interface MatchReplayModalProps {
  match: MatchRecord;
  onClose: () => void;
  theme?: "light" | "dark";
  activeBoardTheme?: string;
  activeMarkingStyle?: string;
}

export default function MatchReplayModal({
  match,
  onClose,
  theme = "dark",
  activeBoardTheme = "classic",
  activeMarkingStyle = "classic",
}: MatchReplayModalProps) {
  const isDark = theme === "dark";
  const moves: MoveStep[] = match.movesList || [];
  const [currentStepIndex, setCurrentStepIndex] = useState(moves.length);
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimerRef = useRef<number | null>(null);

  // Reconstruct board up to currentStepIndex
  const boardAtStep: Record<string, PlayerSymbol> = {};
  for (let i = 0; i < currentStepIndex && i < moves.length; i++) {
    const m = moves[i];
    boardAtStep[`${m.x},${m.y}`] = m.symbol;
  }

  const lastMoveAtStep: Position | null =
    currentStepIndex > 0 && currentStepIndex <= moves.length
      ? { x: moves[currentStepIndex - 1].x, y: moves[currentStepIndex - 1].y }
      : null;

  // Auto-play loop
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = window.setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= moves.length) {
            setIsPlaying(false);
            return prev;
          }
          synth.playTick();
          return prev + 1;
        });
      }, 1000);
    } else if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
    }

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, moves.length]);

  const handleStepChange = (newIndex: number) => {
    const clamped = Math.max(0, Math.min(moves.length, newIndex));
    setCurrentStepIndex(clamped);
    synth.playTick();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`w-full max-w-5xl h-[88vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
          isDark
            ? "bg-slate-950 border-cyan-500/30 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <History size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Xem Lại Ván Đấu</h3>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    match.result === "WIN"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : match.result === "LOSS"
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                  }`}
                >
                  {match.result === "WIN" ? "Thắng" : match.result === "LOSS" ? "Thua" : "Hòa"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Đối thủ: <strong className="text-slate-200">{match.opponentName}</strong> (Elo {match.opponentElo}) · {match.date}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Board & Replay Panel */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden relative">
          {/* Main Interactive Replay Board */}
          <div className="flex-1 h-full relative">
            <InfiniteBoard
              board={boardAtStep}
              winningCells={null}
              onCellClick={() => {}}
              currentPlayer="X"
              isAiThinking={false}
              isMuted={true}
              onToggleMute={() => {}}
              lastMove={lastMoveAtStep}
              theme={theme}
              activeBoardTheme={activeBoardTheme}
              activeMarkingStyle={activeMarkingStyle}
            />
          </div>

          {/* Move Sequence & Evaluation Sidebar */}
          <div
            className={`w-full md:w-80 border-t md:border-t-0 md:border-l p-4 flex flex-col justify-between ${
              isDark ? "border-slate-800/80 bg-slate-900/50" : "border-slate-200 bg-slate-50"
            }`}
          >
            {/* Step info banner */}
            <div className="space-y-3">
              <div
                className={`p-3 rounded-2xl border ${
                  isDark ? "bg-slate-900 border-cyan-500/20" : "bg-white border-slate-200"
                }`}
              >
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    Tiến độ nước đi
                  </span>
                  <span className="font-mono font-bold text-cyan-400">
                    {currentStepIndex} / {moves.length}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-violet-500 h-full transition-all duration-200"
                    style={{
                      width: `${moves.length > 0 ? (currentStepIndex / moves.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Current Move Details */}
              {currentStepIndex > 0 && moves[currentStepIndex - 1] && (
                <div
                  className={`p-3 rounded-2xl border text-xs space-y-1.5 ${
                    moves[currentStepIndex - 1].symbol === "X"
                      ? "bg-violet-950/30 border-violet-500/30 text-violet-300"
                      : "bg-cyan-950/30 border-cyan-500/30 text-cyan-300"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>
                      Nước #{currentStepIndex}: Quân {moves[currentStepIndex - 1].symbol}
                    </span>
                    <span className="font-mono text-[11px]">
                      ({moves[currentStepIndex - 1].x}, {moves[currentStepIndex - 1].y})
                    </span>
                  </div>
                  {match.criticalTurn === currentStepIndex && (
                    <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px] pt-1">
                      <Sparkles size={12} />
                      <span>{match.criticalTurnReason || "Nước đi then chốt của ván đấu!"}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Move list scroll */}
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar text-xs">
                {moves.map((m, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleStepChange(idx + 1)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between transition cursor-pointer ${
                      currentStepIndex === idx + 1
                        ? "bg-cyan-500 text-slate-950 font-bold shadow-md"
                        : isDark
                        ? "hover:bg-slate-800 text-slate-300"
                        : "hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    <span>
                      #{idx + 1} {m.symbol === "X" ? "🔵 X" : "🔴 O"}
                    </span>
                    <span className="font-mono text-[10px] opacity-75">
                      ({m.x}, {m.y})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Replay Controls Footer */}
            <div className="pt-3 border-t border-slate-800/80 space-y-2">
              <input
                type="range"
                min={0}
                max={moves.length}
                value={currentStepIndex}
                onChange={(e) => handleStepChange(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer"
              />

              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => handleStepChange(0)}
                  disabled={currentStepIndex === 0}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 disabled:opacity-30 transition"
                  title="Về đầu ván"
                >
                  <ChevronsLeft size={16} />
                </button>
                <button
                  onClick={() => handleStepChange(currentStepIndex - 1)}
                  disabled={currentStepIndex === 0}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 disabled:opacity-30 transition"
                  title="Lùi 1 nước"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2.5 px-4 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition shadow-lg shadow-cyan-500/20"
                  title={isPlaying ? "Tạm dừng" : "Tự động phát"}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button
                  onClick={() => handleStepChange(currentStepIndex + 1)}
                  disabled={currentStepIndex >= moves.length}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 disabled:opacity-30 transition"
                  title="Tiến 1 nước"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => handleStepChange(moves.length)}
                  disabled={currentStepIndex >= moves.length}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 disabled:opacity-30 transition"
                  title="Đến nước cuối"
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
