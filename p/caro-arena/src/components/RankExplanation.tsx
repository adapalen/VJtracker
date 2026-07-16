/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { HelpCircle, Star, Target, Shield, Info } from "lucide-react";

interface RankExplanationProps {
  theme?: "light" | "dark";
}

export default function RankExplanation({ theme = "dark" }: RankExplanationProps) {
  const isDark = theme === "dark";

  const tiers = [
    {
      name: "Challenger Apex Master",
      elo: "2500+",
      color: "text-rose-400",
      bgClass: isDark ? "bg-rose-500/10 border-rose-500/20" : "bg-rose-50 border-rose-200",
      desc: "The absolute pinnacle of Caro tactical mastery. Only the top chess minds and elite pattern recognition masters occupy this legendary space.",
    },
    {
      name: "Diamond Elite Grandmaster",
      elo: "2200 - 2499",
      color: "text-cyan-400",
      bgClass: isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200",
      desc: "Highly formidable experts capable of seeing 10+ turns ahead on the infinite board. Excellent positional and defensive control.",
    },
    {
      name: "Platinum Super Grandmaster",
      elo: "1900 - 2199",
      color: "text-emerald-400",
      bgClass: isDark ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200",
      desc: "Exceptional players who understand the balance between active attacking lines and secure defensive blockades.",
    },
    {
      name: "Gold Grandmaster",
      elo: "1600 - 1899",
      color: "text-yellow-400",
      bgClass: isDark ? "bg-yellow-500/10 border-yellow-500/20" : "bg-yellow-50 border-yellow-200",
      desc: "Well-rounded masters who consistently execute advanced patterns, traps, and coordinate double-attacks.",
    },
    {
      name: "Silver International Master",
      elo: "1300 - 1599",
      color: "text-slate-300",
      bgClass: isDark ? "bg-slate-500/10 border-slate-500/20" : "bg-slate-50 border-slate-200",
      desc: "Experienced players skilled in basic tactics, recognizing standard 3-in-a-row traps, and managing center controls.",
    },
    {
      name: "Bronze FIDE Master",
      elo: "1000 - 1299",
      color: "text-amber-600",
      bgClass: isDark ? "bg-amber-500/10 border-amber-500/20" : "bg-[#fffaf0] border-amber-200",
      desc: "Amateur tacticians starting to formulate longer lines of attack and learning how to avoid immediate fork vulnerabilities.",
    },
    {
      name: "Iron Candidate Master",
      elo: "0 - 999",
      color: "text-zinc-400",
      bgClass: isDark ? "bg-zinc-500/10 border-zinc-500/20" : "bg-zinc-50 border-zinc-200",
      desc: "Apprentice level. Perfect ground for practicing primary pattern sequences and exploring free moves.",
    },
  ];

  return (
    <div className={`p-5 rounded-xl border flex flex-col h-full transition-all duration-300 ${
      isDark 
        ? "bg-slate-900/60 border-cyan-500/15 shadow-[0_0_20px_rgba(6,182,212,0.05)]" 
        : "bg-white border-slate-200 shadow-sm"
    }`}>
      {/* Header Panel */}
      <div className={`flex items-center gap-3 mb-6 border-b pb-4 ${
        isDark ? "border-cyan-500/20" : "border-slate-200"
      }`}>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isDark ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-100 text-cyan-600"}`}>
          <HelpCircle className="w-5 h-5" />
        </div>
        <div>
          <h2 className={`text-sm font-sans font-semibold tracking-wide ${isDark ? "text-slate-100" : "text-slate-800"}`}>Rankings Academy & ELO Rules</h2>
          <p className={`text-[10px] font-mono ${isDark ? "text-cyan-400/60" : "text-cyan-600/70"}`}>Master the grandmaster tiers and mathematical calculations</p>
        </div>
      </div>

      <div className="space-y-6 flex-1 overflow-y-auto max-h-[500px] pr-1 custom-scrollbar">
        {/* Section 1: Introduction */}
        <div className="space-y-2">
          <h3 className={`text-xs uppercase tracking-wider font-bold flex items-center gap-1.5 ${isDark ? "text-cyan-400" : "text-cyan-600"}`}>
            <Star className="w-3.5 h-3.5" />
            The Caro Arena Ranking System
          </h3>
          <p className={`text-[11px] leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            Caro Arena employs a competitive ladder inspired by <strong>FIDE International Chess titles</strong> blended with the progression aesthetics of <strong>League of Legends rank categories</strong>. Ranks are determined strictly by player ELO rating. Winning matches grants ELO points, while losing drops them.
          </p>
        </div>

        {/* Section 2: Formulas Explanation */}
        <div className={`p-4 rounded-lg border ${
          isDark ? "bg-slate-950/70 border-cyan-500/10" : "bg-slate-50 border-slate-200"
        }`}>
          <h4 className={`text-xs font-semibold mb-3 flex items-center gap-1.5 ${isDark ? "text-slate-200" : "text-slate-700"}`}>
            <Target className="w-3.5 h-3.5 text-amber-500" />
            FIDE ELO Calculations
          </h4>

          <div className="space-y-3">
            <div className="flex flex-col items-center justify-center py-2.5 px-4 bg-black/30 rounded border border-white/5 font-mono text-xs">
              <div className="text-cyan-400 mb-1">R_new = R_old + K * (S - E)</div>
              <div className="text-amber-400">E = 1 / (1 + 10 ^ ((R_opponent - R_player) / 400))</div>
            </div>

            <div className="text-[10px] space-y-1 text-slate-400">
              <p>
                <strong className={isDark ? "text-slate-200" : "text-slate-700"}>R_new / R_old:</strong> Your final rating after the match vs. your starting rating.
              </p>
              <p>
                <strong className={isDark ? "text-slate-200" : "text-slate-700"}>S (Actual Score):</strong> Represents the match outcome: <strong>1.0</strong> for a Win, <strong>0.5</strong> for a Draw, and <strong>0.0</strong> for a Loss.
              </p>
              <p>
                <strong className={isDark ? "text-slate-200" : "text-slate-700"}>E (Expected Score):</strong> Your probability of winning calculated from the relative difference in ratings. Defeating a higher-ranked player grants significantly higher ELO gains!
              </p>
              <p>
                <strong className={isDark ? "text-slate-200" : "text-slate-700"}>K (K-Factor Weight):</strong> The calibration multiplier. It is dynamic to accommodate player calibration phases:
              </p>
              <ul className="list-disc list-inside pl-2 space-y-0.5 mt-1 text-[9.5px]">
                <li><span className="font-semibold text-cyan-400">K = 40:</span> Calibration phase (for players with less than 10 total matches).</li>
                <li><span className="font-semibold text-amber-500">K = 20:</span> Standard competitive phase.</li>
                <li><span className="font-semibold text-rose-400">K = 10:</span> Master competitive phase (rating of 2400+).</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section 3: Rank Table */}
        <div className="space-y-3">
          <h3 className={`text-xs uppercase tracking-wider font-bold flex items-center gap-1.5 ${isDark ? "text-cyan-400" : "text-cyan-600"}`}>
            <Shield className="w-3.5 h-3.5" />
            Official Tiers & Cut-offs
          </h3>

          <div className="space-y-2">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`p-3 rounded-lg border flex flex-col sm:flex-row gap-2.5 items-start sm:items-center transition-all ${tier.bgClass}`}
              >
                <div className="sm:w-44 shrink-0">
                  <div className={`text-xs font-bold tracking-tight ${tier.color}`}>
                    {tier.name}
                  </div>
                  <div className="text-[9.5px] font-mono opacity-70 mt-0.5">
                    Rating: {tier.elo}
                  </div>
                </div>
                <div className={`text-[10px] leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  {tier.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Local vs Multiplayer Mode Rules */}
        <div className={`p-3 rounded-lg border flex gap-2.5 ${
          isDark ? "bg-cyan-950/10 border-cyan-500/10 text-cyan-400/80" : "bg-blue-50/50 border-blue-200 text-blue-800"
        }`}>
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="text-[10px] leading-relaxed">
            <span className="font-bold">Important Regulation:</span> Local PvP (Pass & Play) matches are intended for friendly offline fun. Rating computations are bypassed for local matches, leaving your ELO ranking completely unchanged to prevent self-rating boosting.
          </div>
        </div>
      </div>
    </div>
  );
}
