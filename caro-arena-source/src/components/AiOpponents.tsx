/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { AIDifficulty } from "../types";
import { Cpu, Shield, Zap, Sparkles, Radio } from "lucide-react";
import { SciFiAvatar } from "./Leaderboard";
import { getRankTier } from "../utils/gameLogic";
import synth from "../utils/audio";

interface AiOpponentProfile {
  id: AIDifficulty;
  name: string;
  elo: number;
  style: string;
  description: string;
  icon: React.ReactNode;
  themeColorDark: string;
  themeColorLight: string;
}

interface AiOpponentsProps {
  activeDifficulty: AIDifficulty;
  onSelectDifficulty: (difficulty: AIDifficulty) => void;
  theme?: "light" | "dark";
}

export default function AiOpponents({ activeDifficulty, onSelectDifficulty, theme = "dark" }: AiOpponentsProps) {
  const isDark = theme === "dark";

  const opponents: AiOpponentProfile[] = [
    {
      id: "NOVICE",
      name: "Novice AI",
      elo: 800,
      style: "Casual Play",
      description: "Makes occasional tactical mistakes and random moves. Perfect for beginners learning the basic flow of five-in-a-row.",
      icon: <Radio className="w-4 h-4 text-amber-500 animate-pulse" />,
      themeColorDark: "border-amber-500/10 hover:border-amber-500/35 bg-amber-950/5",
      themeColorLight: "border-slate-200 hover:border-amber-400/50 bg-amber-50/10",
    },
    {
      id: "SENTINEL",
      name: "Standard AI",
      elo: 1400,
      style: "Defensive Play",
      description: "Focuses on defending and actively blocking your lines. This bot is great practice for learning how to bypass straight defensive setups.",
      icon: <Shield className="w-4 h-4 text-slate-300" />,
      themeColorDark: "border-slate-300/10 hover:border-slate-300/35 bg-slate-900/5",
      themeColorLight: "border-slate-200 hover:border-slate-400/50 bg-slate-50/30",
    },
    {
      id: "OVERLORD",
      name: "Strategic AI",
      elo: 2000,
      style: "Balanced Play",
      description: "A balanced player that creates dual diagonal setups and looks to build open-threes to create inescapable traps.",
      icon: <Zap className="w-4 h-4 text-cyan-400" />,
      themeColorDark: "border-cyan-500/10 hover:border-cyan-500/35 bg-cyan-950/5",
      themeColorLight: "border-slate-200 hover:border-cyan-400/50 bg-cyan-50/20",
    },
    {
      id: "SINGULARITY",
      name: "Expert AI",
      elo: 2600,
      style: "Grandmaster Play",
      description: "An advanced algorithm evaluating moves with exceptional foresight. It will exploit any small openings and plays near-perfectly.",
      icon: <Sparkles className="w-4 h-4 text-rose-400" />,
      themeColorDark: "border-rose-500/10 hover:border-rose-500/35 bg-rose-950/5",
      themeColorLight: "border-slate-200 hover:border-rose-400/50 bg-rose-50/10",
    },
  ];

  return (
    <div className={`p-5 rounded-xl border transition-all duration-300 ${
      isDark 
        ? "bg-slate-900/60 border-cyan-500/15 shadow-[0_0_20px_rgba(6,182,212,0.05)]" 
        : "bg-white border-slate-200 shadow-sm"
    }`}>
      <div className={`flex items-center gap-3 mb-5 border-b pb-4 ${
        isDark ? "border-cyan-500/20" : "border-slate-200"
      }`}>
        <Cpu className={`w-5 h-5 ${isDark ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]" : "text-cyan-600"}`} />
        <div>
          <h2 className={`text-sm font-sans font-semibold tracking-wide ${isDark ? "text-slate-100" : "text-slate-800"}`}>AI Opponents</h2>
          <p className={`text-[10px] font-sans ${isDark ? "text-cyan-400/60" : "text-cyan-600/70"}`}>Choose an opponent difficulty to challenge</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {opponents.map((opponent) => {
          const isActive = activeDifficulty === opponent.id;
          const tier = getRankTier(opponent.elo);
          const currentBgThemeClass = isDark ? opponent.themeColorDark : opponent.themeColorLight;

          return (
            <div
              key={opponent.id}
              id={`ai-profile-${opponent.id}`}
              className={`p-4 rounded-lg border flex flex-col justify-between transition-all duration-300 cursor-pointer group ${currentBgThemeClass} ${
                isActive
                  ? isDark
                    ? "bg-slate-950 border-cyan-400/70 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-400/30"
                    : "bg-cyan-50/65 border-cyan-400 shadow-sm"
                  : isDark
                    ? "bg-slate-950/30 hover:bg-slate-950/70"
                    : "bg-slate-50 hover:bg-white"
              }`}
              onClick={() => {
                onSelectDifficulty(opponent.id);
                synth.playPlace();
              }}
            >
              {/* Header: Avatar, Name & ELO */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <SciFiAvatar seed={opponent.name} className="w-10 h-10 group-hover:scale-105 transition-transform" />
                  <div className="flex flex-col">
                    <span className={`text-xs font-sans font-bold flex items-center gap-1.5 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                      {opponent.name}
                      {opponent.icon}
                    </span>
                    <span className={`text-[9px] font-sans uppercase tracking-wider font-semibold ${isDark ? "text-cyan-400/60" : "text-cyan-600/80"}`}>
                      {opponent.style}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${tier.borderColor} ${tier.colorClass}`}>
                    {opponent.elo} ELO
                  </span>
                  <span className={`text-[8px] font-sans uppercase mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    {tier.title.split(" ")[0]}
                  </span>
                </div>
              </div>

              {/* Bio description */}
              <p className={`text-[11px] font-sans leading-relaxed mb-4 flex-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                {opponent.description}
              </p>

              {/* Deploy / Status Indicator */}
              <div className={`flex justify-between items-center border-t pt-3 ${isDark ? "border-cyan-500/5" : "border-slate-100"}`}>
                <span className={`text-[9px] font-sans ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  Status: <span className="text-emerald-500 font-semibold">Ready</span>
                </span>
                <button
                  id={`deploy-btn-${opponent.id}`}
                  className={`px-3 py-1 text-[10px] font-sans uppercase tracking-wider rounded font-bold cursor-pointer transition-all ${
                    isActive
                      ? isDark
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_8px_rgba(6,182,212,0.2)]"
                        : "bg-cyan-100 text-cyan-700 border border-cyan-200"
                      : isDark
                        ? "bg-slate-900 text-slate-400 hover:text-white border border-slate-750 group-hover:border-cyan-500/30"
                        : "bg-white text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {isActive ? "Selected" : "Select"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
