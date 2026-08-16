/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Puzzle,
  CheckCircle2,
  Coins,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Award,
  ChevronRight,
} from "lucide-react";
import { CaroPuzzle, PlayerSymbol, Position } from "../types";
import { DEFAULT_PUZZLES } from "../utils/gameLogic";
import InfiniteBoard from "./InfiniteBoard";
import synth from "../utils/audio";

interface CaroPuzzlesProps {
  completedPuzzles: string[];
  onCompletePuzzle: (puzzleId: string, coinsReward: number) => void;
  onClose: () => void;
  theme?: "light" | "dark";
  activeBoardTheme?: string;
  activeMarkingStyle?: string;
}

export default function CaroPuzzles({
  completedPuzzles,
  onCompletePuzzle,
  onClose,
  theme = "dark",
  activeBoardTheme = "classic",
  activeMarkingStyle = "classic",
}: CaroPuzzlesProps) {
  const isDark = theme === "dark";
  const [selectedPuzzle, setSelectedPuzzle] = useState<CaroPuzzle | null>(null);
  const [boardState, setBoardState] = useState<Record<string, PlayerSymbol>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [lastMove, setLastMove] = useState<Position | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSolved, setIsSolved] = useState(false);

  const startPuzzle = (p: CaroPuzzle) => {
    setSelectedPuzzle(p);
    setBoardState({ ...p.initialBoard });
    setCurrentStep(0);
    setLastMove(p.initialLastMove || null);
    setMessage(null);
    setIsSolved(false);
    synth.playTick();
  };

  const handleCellClick = (x: number, y: number) => {
    if (!selectedPuzzle || isSolved) return;
    const key = `${x},${y}`;
    if (boardState[key]) return; // already occupied

    const stepInfo = selectedPuzzle.solutionSteps[currentStep];
    if (!stepInfo) return;

    // Verify if move matches expected solution
    if (x === stepInfo.playerMove.x && y === stepInfo.playerMove.y) {
      // Correct move
      const nextBoard = { ...boardState, [key]: selectedPuzzle.playerSymbol };
      setBoardState(nextBoard);
      setLastMove({ x, y });
      synth.playMove(selectedPuzzle.playerSymbol);
      setMessage(stepInfo.explanation || "Nước đi chính xác!");

      // If there is an opponent reply and more steps
      if (stepInfo.opponentResponse && currentStep + 1 < selectedPuzzle.solutionSteps.length) {
        const oppSym = selectedPuzzle.playerSymbol === "X" ? "O" : "X";
        setTimeout(() => {
          const resp = stepInfo.opponentResponse!;
          const respKey = `${resp.x},${resp.y}`;
          setBoardState((prev) => ({ ...prev, [respKey]: oppSym }));
          setLastMove(resp);
          synth.playMove(oppSym);
          setCurrentStep((s) => s + 1);
        }, 600);
      } else {
        // Solved!
        setIsSolved(true);
        synth.playWin();
        if (!completedPuzzles.includes(selectedPuzzle.id)) {
          onCompletePuzzle(selectedPuzzle.id, selectedPuzzle.rewardCoins);
        }
      }
    } else {
      // Incorrect move
      synth.playLoss();
      setMessage("Chưa chính xác! Nước đi này chưa tối ưu. Thử lại nhé!");
    }
  };

  const resetCurrentPuzzle = () => {
    if (!selectedPuzzle) return;
    setBoardState({ ...selectedPuzzle.initialBoard });
    setCurrentStep(0);
    setLastMove(selectedPuzzle.initialLastMove || null);
    setMessage(null);
    setIsSolved(false);
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
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Puzzle size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                Thế Cờ Chiến Thuật (Caro Puzzles)
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  {completedPuzzles.length}/{DEFAULT_PUZZLES.length} Đã giải
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Rèn luyện khả năng đọc cờ, hóa giải bẫy và tạo đòn tấn công kết liễu
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

        {/* Content */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Puzzle List Sidebar */}
          <div
            className={`w-full md:w-80 border-b md:border-b-0 md:border-r p-4 overflow-y-auto space-y-2.5 ${
              isDark ? "border-slate-800/80 bg-slate-900/50" : "border-slate-200 bg-slate-50"
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
              Danh sách câu đố
            </span>
            {DEFAULT_PUZZLES.map((p) => {
              const isCompleted = completedPuzzles.includes(p.id);
              const isSelected = selectedPuzzle?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => startPuzzle(p)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-lg shadow-amber-500/10"
                      : isCompleted
                      ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                      : isDark
                      ? "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200"
                      : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs">{p.title}</span>
                      {isCompleted && (
                        <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span
                        className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                          p.difficulty === "EASY"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : p.difficulty === "MEDIUM"
                            ? "bg-cyan-500/20 text-cyan-400"
                            : p.difficulty === "HARD"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-rose-500/20 text-rose-400"
                        }`}
                      >
                        {p.difficulty}
                      </span>
                      <span className="flex items-center gap-1 text-amber-400 font-bold">
                        <Coins size={11} /> +{p.rewardCoins}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="opacity-40" />
                </button>
              );
            })}
          </div>

          {/* Puzzle Play Area */}
          <div className="flex-1 flex flex-col min-h-0 relative">
            {selectedPuzzle ? (
              <>
                <div className="flex-1 relative">
                  <InfiniteBoard
                    board={boardState}
                    winningCells={null}
                    onCellClick={handleCellClick}
                    currentPlayer={selectedPuzzle.playerSymbol}
                    isAiThinking={false}
                    isMuted={false}
                    onToggleMute={() => {}}
                    lastMove={lastMove}
                    theme={theme}
                    activeBoardTheme={activeBoardTheme}
                    activeMarkingStyle={activeMarkingStyle}
                  />

                  {/* Solved Victory Overlay */}
                  <AnimatePresence>
                    {isSolved && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-none"
                      >
                        <div className="bg-gradient-to-b from-amber-500/90 to-yellow-600/90 text-slate-950 p-6 px-8 rounded-3xl shadow-2xl text-center space-y-3 pointer-events-auto border border-amber-300">
                          <Sparkles size={36} className="mx-auto text-amber-200 animate-bounce" />
                          <h4 className="text-xl font-extrabold tracking-wide">
                            GIẢI THÀNH CÔNG!
                          </h4>
                          <p className="text-xs font-medium text-slate-900 max-w-xs">
                            Bạn đã giải mã thế cờ xuất sắc và nhận thưởng!
                          </p>
                          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-950/20 text-slate-950 font-bold text-sm">
                            <Coins size={16} /> +{selectedPuzzle.rewardCoins} Coins
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Instruction & Status Footer */}
                <div
                  className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${
                    isDark ? "border-slate-800 bg-slate-900/80" : "border-slate-200 bg-slate-100"
                  }`}
                >
                  <div className="space-y-0.5 text-center sm:text-left">
                    <p className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                      <span>Nhiệm vụ: {selectedPuzzle.description}</span>
                    </p>
                    {message && (
                      <p
                        className={`text-xs font-bold ${
                          isSolved
                            ? "text-emerald-400"
                            : message.includes("Chưa chính xác")
                            ? "text-rose-400"
                            : "text-amber-400"
                        }`}
                      >
                        {message}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={resetCurrentPuzzle}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer flex-shrink-0"
                  >
                    <RotateCcw size={13} /> Thử lại
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Puzzle size={40} />
                </div>
                <h4 className="font-bold text-base">Chọn một thế cờ để bắt đầu</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  Chọn thế cờ từ danh sách bên trái để thử thách kỹ năng và nhận phần thưởng tiền ảo mở khóa giao diện!
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
