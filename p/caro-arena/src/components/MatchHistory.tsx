/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { MatchRecord } from "../types";
import { ListOrdered, TrendingUp, TrendingDown, Clock } from "lucide-react";

interface MatchHistoryProps {
  history: MatchRecord[];
  theme?: "light" | "dark";
}

export default function MatchHistory({ history, theme = "dark" }: MatchHistoryProps) {
  // Sort history newest first
  const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const isDark = theme === "dark";

  if (history.length === 0) {
    return (
      <div className={`p-6 text-center rounded-xl border flex flex-col items-center justify-center h-full min-h-[220px] transition-all duration-300 ${
        isDark 
          ? "bg-slate-900/60 border-cyan-500/15 shadow-[0_0_20px_rgba(6,182,212,0.05)]" 
          : "bg-white border-slate-200 shadow-sm"
      }`}>
        <Clock className={`w-10 h-10 mb-3 animate-pulse ${isDark ? "text-cyan-500/30" : "text-cyan-500/50"}`} />
        <p className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>No match history found yet.</p>
        <p className={`text-[10px] ${isDark ? "text-cyan-400/40" : "text-cyan-600/60"} mt-1`}>Play matches against the computer or another player to see your records here.</p>
      </div>
    );
  }

  return (
    <div className={`p-5 rounded-xl border flex flex-col h-full transition-all duration-300 ${
      isDark 
        ? "bg-slate-900/60 border-cyan-500/15 shadow-[0_0_20px_rgba(6,182,212,0.05)]" 
        : "bg-white border-slate-200 shadow-sm"
    }`}>
      <div className={`flex items-center gap-3 mb-6 border-b pb-4 ${
        isDark ? "border-cyan-500/20" : "border-slate-200"
      }`}>
        <ListOrdered className={`w-5 h-5 ${isDark ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]" : "text-cyan-600"}`} />
        <div>
          <h2 className={`text-sm font-sans font-semibold tracking-wide ${isDark ? "text-slate-100" : "text-slate-800"}`}>Match History</h2>
          <p className={`text-[10px] font-mono ${isDark ? "text-cyan-400/60" : "text-cyan-600/70"}`}>Recent match results and rating changes</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[450px] pr-1 space-y-2 custom-scrollbar">
        {sortedHistory.map((log) => {
          const isWin = log.result === "WIN";
          const isLoss = log.result === "LOSS";
          const isDraw = log.result === "DRAW";

          return (
            <div
              key={log.id}
              id={`match-log-${log.id}`}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-300 ${
                isDark
                  ? "bg-slate-950/40 border-cyan-500/5 hover:border-cyan-500/15 hover:bg-slate-950/70"
                  : "bg-slate-50 border-slate-100 hover:border-slate-200 hover:bg-white"
              }`}
            >
              {/* Left Side: Result Badge & Opponent */}
              <div className="flex items-center gap-3">
                {/* Result Indicator Badge */}
                <div
                  className={`w-18 text-center py-1 rounded text-[9px] font-mono font-bold tracking-wider uppercase border ${
                    isWin
                      ? "bg-emerald-950/30 text-emerald-400 border-emerald-500/30"
                      : isLoss
                      ? "bg-red-950/30 text-red-400 border-red-500/30"
                      : "bg-amber-950/30 text-amber-400 border-amber-500/30"
                  }`}
                >
                  {log.result}
                </div>

                {/* Opponent Identity details */}
                <div className="flex flex-col">
                  <span className={`text-xs font-sans font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                    vs {log.opponentName}
                  </span>
                  <div className={`flex items-center gap-2 text-[9px] font-sans ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    <span>Opponent ELO: {log.opponentElo}</span>
                    <span className="opacity-30">•</span>
                    <span>{log.movesCount} moves</span>
                  </div>
                </div>
              </div>

              {/* Right Side: Rating change & timestamp */}
              <div className="flex items-center gap-4 text-right">
                <div className="flex flex-col">
                  {/* rating Delta */}
                  <div
                    className={`flex items-center justify-end gap-1 text-xs font-mono font-bold ${
                      log.eloChange > 0
                        ? "text-emerald-500"
                        : log.eloChange < 0
                        ? "text-red-500"
                        : "text-slate-400"
                    }`}
                  >
                    {log.eloChange > 0 ? (
                      <>
                        <TrendingUp size={11} />
                        <span>+{log.eloChange}</span>
                      </>
                    ) : log.eloChange < 0 ? (
                      <>
                        <TrendingDown size={11} />
                        <span>{log.eloChange}</span>
                      </>
                    ) : (
                      <span>--</span>
                    )}
                  </div>
                  {/* Timestamp */}
                  <span className={`text-[9px] font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    {new Date(log.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
