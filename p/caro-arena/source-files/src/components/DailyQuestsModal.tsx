/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { X, Calendar, CheckCircle2, Coins, Sparkles, Clock } from "lucide-react";
import { DailyQuest, PlayerProfile } from "../types";
import synth from "../utils/audio";

interface DailyQuestsModalProps {
  quests: DailyQuest[];
  onClaimQuest: (questId: string, rewardCoins: number) => void;
  onClose: () => void;
  theme?: "light" | "dark";
}

export default function DailyQuestsModal({
  quests,
  onClaimQuest,
  onClose,
  theme = "dark",
}: DailyQuestsModalProps) {
  const isDark = theme === "dark";

  const handleClaim = (q: DailyQuest) => {
    onClaimQuest(q.id, q.rewardCoins);
    synth.playWin();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`w-full max-w-lg rounded-3xl border shadow-2xl flex flex-col overflow-hidden max-h-[80vh] ${
          isDark
            ? "bg-slate-950 border-cyan-500/30 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                Nhiệm Vụ Hàng Ngày
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Clock size={11} /> Tự động làm mới mỗi 24 giờ
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

        {/* Quests List */}
        <div className="p-6 overflow-y-auto space-y-3.5 custom-scrollbar">
          {quests.map((q) => {
            const isCompleted = q.currentCount >= q.targetCount;

            return (
              <div
                key={q.id}
                className={`p-4 rounded-2xl border transition flex items-center justify-between gap-4 ${
                  q.isClaimed
                    ? "bg-slate-900/40 border-slate-800 text-slate-400 opacity-75"
                    : isCompleted
                    ? "bg-amber-950/20 border-amber-500/50 text-slate-100 shadow-lg shadow-amber-500/10"
                    : isDark
                    ? "bg-slate-900/70 border-slate-800/80 text-slate-200"
                    : "bg-slate-50 border-slate-200 text-slate-800"
                }`}
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm truncate">{q.title}</h4>
                    {q.isClaimed && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 size={10} /> Đã nhận
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{q.description}</p>
                  {/* Progress Bar */}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (q.currentCount / q.targetCount) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-slate-400">
                      {q.currentCount}/{q.targetCount}
                    </span>
                  </div>
                </div>

                {/* Claim / Reward */}
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
                    <Coins size={14} /> +{q.rewardCoins}
                  </div>
                  {isCompleted && !q.isClaimed ? (
                    <button
                      onClick={() => handleClaim(q)}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition shadow-lg shadow-amber-500/20 cursor-pointer animate-bounce"
                    >
                      Nhận Thưởng
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
