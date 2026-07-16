/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { LeaderboardEntry } from "../types";
import { Trophy, Award, Radio } from "lucide-react";
import { getRankTier } from "../utils/gameLogic";

// A beautiful initials-based circular avatar with custom deterministic gradient colors
export function SciFiAvatar({ seed, className = "w-10 h-10" }: { seed: string; className?: string }) {
  // Simple deterministic hash based on the seed
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash % 360);
  const color1 = `hsl(${hue}, 75%, 45%)`;
  const color2 = `hsl(${(hue + 130) % 360}, 80%, 55%)`;
  
  // Extract initials
  const cleanSeed = seed.replace(/[^a-zA-Z0-9 ]/g, " ").trim();
  const parts = cleanSeed.split(/\s+/).filter(Boolean);
  let initials = "";
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (parts.length === 1) {
    initials = parts[0].substring(0, 2).toUpperCase();
  } else {
    initials = seed.substring(0, 2).toUpperCase();
  }
  if (!initials) initials = "GP";

  return (
    <div
      className={`${className} rounded-full flex items-center justify-center font-bold text-white text-xs border border-white/10 shadow-sm shrink-0 select-none`}
      style={{
        background: `linear-gradient(135deg, ${color1}, ${color2})`,
      }}
    >
      <span>{initials}</span>
    </div>
  );
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  playerElo: number;
  playerName: string;
  theme?: "light" | "dark";
}

export default function Leaderboard({ entries, playerElo, playerName, theme = "dark" }: LeaderboardProps) {
  // Sort entries descending by ELO
  const sortedEntries = [...entries].sort((a, b) => b.elo - a.elo);
  const isDark = theme === "dark";

  return (
    <div className={`p-5 rounded-xl border flex flex-col h-full transition-all duration-300 ${
      isDark 
        ? "bg-slate-900/60 border-cyan-500/15 shadow-[0_0_20px_rgba(6,182,212,0.05)]" 
        : "bg-white border-slate-200 shadow-sm"
    }`}>
      <div className={`flex items-center gap-3 mb-6 border-b pb-4 ${
        isDark ? "border-cyan-500/20" : "border-slate-200"
      }`}>
        <Trophy className={`w-5 h-5 ${isDark ? "text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" : "text-yellow-500"}`} />
        <div>
          <h2 className={`text-sm font-sans font-semibold tracking-wide ${isDark ? "text-slate-100" : "text-slate-800"}`}>Leaderboard Rankings</h2>
          <p className={`text-[10px] font-mono ${isDark ? "text-cyan-400/60" : "text-cyan-600/70"}`}>Active competitors in the arena</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[450px] pr-1 space-y-2.5 custom-scrollbar">
        {sortedEntries.map((entry, index) => {
          const rank = index + 1;
          const tier = getRankTier(entry.elo);
          const isCurrentPlayer = entry.isPlayer || entry.name === playerName;

          return (
            <div
              key={entry.name}
              id={`leaderboard-rank-${rank}`}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-300 ${
                isCurrentPlayer
                  ? isDark
                    ? "bg-cyan-950/20 border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                    : "bg-cyan-50/70 border-cyan-300 shadow-sm"
                  : isDark
                    ? "bg-slate-950/40 border-cyan-500/5 hover:border-cyan-500/20 hover:bg-slate-950/70"
                    : "bg-slate-50 border-slate-100 hover:border-slate-200 hover:bg-white"
              }`}
            >
              {/* Left Rank & Avatar */}
              <div className="flex items-center gap-3">
                {/* Position Badge */}
                <div className="w-6 flex justify-center font-mono text-sm font-bold">
                  {rank === 1 ? (
                    <Trophy className="text-yellow-500 w-4.5 h-4.5" />
                  ) : rank === 2 ? (
                    <Award className={`${isDark ? "text-slate-300" : "text-slate-400"} w-4.5 h-4.5`} />
                  ) : rank === 3 ? (
                    <Award className="text-amber-600 w-4.5 h-4.5" />
                  ) : (
                    <span className={`${isDark ? "text-cyan-500/60" : "text-slate-400"} text-xs`}>#{rank}</span>
                  )}
                </div>

                {/* procedurally generated Avatar */}
                <SciFiAvatar seed={entry.name} className="w-9 h-9" />

                {/* Player details */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {entry.countryFlag && (
                      <span className="text-sm select-none" title={entry.countryName}>
                        {entry.countryFlag}
                      </span>
                    )}
                    <span className={`text-xs font-sans font-medium ${
                      isCurrentPlayer 
                        ? isDark ? "text-cyan-300 font-bold" : "text-cyan-700 font-bold" 
                        : isDark ? "text-slate-200" : "text-slate-800"
                    }`}>
                      {entry.name}
                    </span>
                    {isCurrentPlayer && (
                      <span className={`text-[8px] px-1 py-0.25 rounded uppercase font-bold tracking-wider border ${
                        isDark 
                          ? "bg-cyan-400/20 text-cyan-300 border-cyan-400/40" 
                          : "bg-cyan-100 text-cyan-700 border-cyan-200"
                      }`}>
                        You
                      </span>
                    )}
                  </div>
                  <span className={`text-[9px] font-mono tracking-wider ${tier.colorClass}`}>
                    {tier.title}
                  </span>
                </div>
              </div>

              {/* Right Side ELO & Win-loss record */}
              <div className="flex items-center gap-4 text-right">
                <div className="flex flex-col">
                  <span className={`text-xs font-mono font-bold ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                    {entry.elo} <span className="text-[9px] font-normal opacity-50">ELO</span>
                  </span>
                  <span className={`text-[9px] font-sans ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    W: {entry.wins} / L: {entry.losses}
                  </span>
                </div>

                {/* Online Status ping */}
                <div className="w-2 flex items-center justify-center">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      entry.status === "ONLINE"
                        ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                        : entry.status === "IN_GAME"
                        ? "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)] animate-pulse"
                        : "bg-slate-400"
                    }`}
                    title={`Player is ${entry.status.toLowerCase().replace("_", " ")}`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
