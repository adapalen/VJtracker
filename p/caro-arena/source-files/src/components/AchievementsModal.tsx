/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { X, Award, CheckCircle2, Coins, Sparkles, Lock } from "lucide-react";
import { Achievement, PlayerProfile } from "../types";
import { DEFAULT_ACHIEVEMENTS } from "../utils/gameLogic";
import synth from "../utils/audio";

interface AchievementsModalProps {
  profile: PlayerProfile;
  onClaimAchievement: (achievementId: string, rewardCoins: number) => void;
  onClose: () => void;
  theme?: "light" | "dark";
}

export default function AchievementsModal({
  profile,
  onClaimAchievement,
  onClose,
  theme = "dark",
}: AchievementsModalProps) {
  const isDark = theme === "dark";
  const claimedList = profile.claimedAchievements || [];

  // Compute progress for each achievement based on profile statistics
  const getProgress = (ach: Achievement): number => {
    switch (ach.id) {
      case "first_blood": {
        const wins = profile.matches.filter((m) => m.result === "WIN").length;
        return Math.min(ach.maxProgress, wins);
      }
      case "win_streak_5": {
        let maxStreak = 0;
        let cur = 0;
        for (const m of profile.matches) {
          if (m.result === "WIN") {
            cur++;
            if (cur > maxStreak) maxStreak = cur;
          } else {
            cur = 0;
          }
        }
        return Math.min(ach.maxProgress, maxStreak);
      }
      case "defeat_singularity": {
        const winSing = profile.matches.some(
          (m) => m.opponentName.includes("Singularity") && m.result === "WIN"
        );
        return winSing ? 1 : 0;
      }
      case "solve_puzzles_3": {
        const count = profile.completedPuzzles?.length || 0;
        return Math.min(ach.maxProgress, count);
      }
      case "play_20_matches": {
        return Math.min(ach.maxProgress, profile.matches.length);
      }
      case "cosmetic_collector": {
        const unlocked =
          (profile.unlockedThemes?.length || 1) + (profile.unlockedMarkings?.length || 1) - 2;
        return Math.min(ach.maxProgress, Math.max(0, unlocked));
      }
      default:
        return 0;
    }
  };

  const handleClaim = (ach: Achievement) => {
    onClaimAchievement(ach.id, ach.rewardCoins);
    synth.playWin();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl flex flex-col overflow-hidden max-h-[85vh] ${
          isDark
            ? "bg-slate-950 border-cyan-500/30 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-violet-500/10 border border-violet-500/30 text-violet-400">
              <Award size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                Hệ Thống Danh Hiệu & Thành Tựu
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-bold border border-violet-500/30">
                  {claimedList.length}/{DEFAULT_ACHIEVEMENTS.length} Đạt được
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Mở khóa các cột mốc thi đấu đỉnh cao và nhận tiền thưởng
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

        {/* List of achievements */}
        <div className="p-6 overflow-y-auto space-y-3.5 custom-scrollbar">
          {DEFAULT_ACHIEVEMENTS.map((ach) => {
            const progress = getProgress(ach);
            const isCompleted = progress >= ach.maxProgress;
            const isClaimed = claimedList.includes(ach.id);

            return (
              <div
                key={ach.id}
                className={`p-4 rounded-2xl border transition flex items-center justify-between gap-4 ${
                  isClaimed
                    ? "bg-slate-900/40 border-slate-800 text-slate-400 opacity-80"
                    : isCompleted
                    ? "bg-violet-950/20 border-violet-500/50 text-slate-100 shadow-lg shadow-violet-500/10"
                    : isDark
                    ? "bg-slate-900/70 border-slate-800/80 text-slate-200"
                    : "bg-slate-50 border-slate-200 text-slate-800"
                }`}
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div className="text-3xl p-2 rounded-2xl bg-slate-800/60 border border-slate-700/40 flex-shrink-0">
                    {ach.icon}
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm truncate">{ach.title}</h4>
                      {isClaimed && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 size={10} /> Đã nhận
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1">{ach.description}</p>
                    {/* Progress Bar */}
                    <div className="flex items-center gap-2 pt-1">
                      <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-violet-500 to-cyan-500 h-full transition-all duration-300"
                          style={{ width: `${(progress / ach.maxProgress) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-semibold text-slate-400">
                        {progress}/{ach.maxProgress}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reward / Action */}
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
                    <Coins size={14} /> +{ach.rewardCoins}
                  </div>
                  {isCompleted && !isClaimed ? (
                    <button
                      onClick={() => handleClaim(ach)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-slate-950 font-bold text-xs hover:opacity-90 transition shadow-lg shadow-cyan-500/20 animate-bounce cursor-pointer"
                    >
                      Nhận Thưởng
                    </button>
                  ) : !isCompleted ? (
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                      <Lock size={12} /> Chưa mở
                    </div>
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
