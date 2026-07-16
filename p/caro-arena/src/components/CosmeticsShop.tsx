/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Coins, Check, Lock, Palette, Sparkles, RefreshCw } from "lucide-react";
import { PlayerProfile } from "../types";
import synth from "../utils/audio";

export interface ShopThemeItem {
  id: string;
  name: string;
  price: number;
  description: string;
  bgPreviewClass: string;
  borderPreviewClass: string;
  textColor: string;
}

export interface ShopMarkingItem {
  id: string;
  name: string;
  price: number;
  description: string;
  previewX: string;
  previewO: string;
}

export const SHOP_THEMES: ShopThemeItem[] = [
  { id: "classic", name: "Classic Slate", price: 0, description: "Standard atmospheric deep slate grid with glowing cyan borders.", bgPreviewClass: "bg-slate-950", borderPreviewClass: "border-cyan-500/30", textColor: "text-cyan-400" },
  { id: "wood", name: "Warm Mahogany", price: 1000, description: "Organic reddish-brown wooden finish with amber grid coordinates.", bgPreviewClass: "bg-[#2c130b]", borderPreviewClass: "border-amber-600/30", textColor: "text-amber-500" },
  { id: "neon", name: "Cyberpunk Neon", price: 2500, description: "Pitch black grid with hot pink laser borders and retro vibes.", bgPreviewClass: "bg-black", borderPreviewClass: "border-pink-500/30", textColor: "text-pink-500" },
  { id: "sakura", name: "Sakura Blossom", price: 3000, description: "Delicate light pink board for peaceful and relaxed matches.", bgPreviewClass: "bg-[#fff5f5]", borderPreviewClass: "border-rose-400/30", textColor: "text-rose-500" },
  { id: "forest", name: "Forest Moss", price: 1800, description: "Serene deep evergreen theme with refreshing mint accents.", bgPreviewClass: "bg-[#062312]", borderPreviewClass: "border-emerald-500/30", textColor: "text-emerald-400" },
  { id: "world_cup", name: "World Cup Stadium", price: 3500, description: "Lush green stadium turf board with crisp white gridlines and championship gold accents.", bgPreviewClass: "bg-emerald-950", borderPreviewClass: "border-emerald-500/30", textColor: "text-amber-400" },
  { id: "countries_stadium", name: "Global Nations Field", price: 4000, description: "A vibrant green turf decorated with mini flags of competitive world-cup nations in a celebration atmosphere.", bgPreviewClass: "bg-[#023e1e]", borderPreviewClass: "border-emerald-400/40", textColor: "text-amber-300" },
  { id: "light", name: "Aero Crisp", price: 1200, description: "Pure, clean high-contrast white layout for ultimate clarity.", bgPreviewClass: "bg-white", borderPreviewClass: "border-blue-300", textColor: "text-blue-600" },
];

export const SHOP_MARKINGS: ShopMarkingItem[] = [
  { id: "classic", name: "Standard X / O", price: 0, description: "Classic tactical vector cross and ring markings.", previewX: "X", previewO: "O" },
  { id: "emoji", name: "Danger & Flow", price: 500, description: "Vibrant high-contrast emoji marks.", previewX: "❌", previewO: "⭕" },
  { id: "celestial", name: "Sun & Moon", price: 1500, description: "Ethereal day and night representation.", previewX: "☀️", previewO: "🌙" },
  { id: "cosmic", name: "Vortex & Star", price: 2000, description: "Stunning spiral galaxy paired with cosmic stars.", previewX: "🌀", previewO: "⭐" },
  { id: "world_cup_nations", name: "Championship Nations", price: 2000, description: "Battle with world football giants: Brazil vs Argentina flags.", previewX: "🇧🇷", previewO: "🇦🇷" },
  { id: "world_cup_cities", name: "Host City Finals", price: 1800, description: "Commemorate famous final destinations: Rio de Janeiro's mountains vs Paris's Eiffel Tower.", previewX: "⛰️", previewO: "🗼" },
  { id: "world_cup_icons", name: "Championship Icons", price: 1500, description: "Represent the beautiful game's peak achievements: Golden Cup vs Football.", previewX: "🏆", previewO: "⚽" },
  { id: "royal", name: "Diamond & Crown", price: 3500, description: "Luxurious pure gem stones paired with golden crowns.", previewX: "💎", previewO: "👑" },
  { id: "neon_power", name: "Spark & Fire", price: 4000, description: "Unleash electrical discharges and burning flames.", previewX: "⚡", previewO: "🔥" },
];

interface CosmeticsShopProps {
  profile: PlayerProfile;
  onUpdateProfile: (updated: PlayerProfile) => void;
  theme?: "light" | "dark";
}

export default function CosmeticsShop({ profile, onUpdateProfile, theme = "dark" }: CosmeticsShopProps) {
  const isDark = theme === "dark";

  // Safe defaults
  const coins = profile.coins ?? 999999;
  const unlockedThemes = profile.unlockedThemes ?? ["classic"];
  const unlockedMarkings = profile.unlockedMarkings ?? ["classic"];
  const activeTheme = profile.activeTheme ?? "classic";
  const activeMarking = profile.activeMarking ?? "classic";

  const handleBuyTheme = (item: ShopThemeItem) => {
    if (unlockedThemes.includes(item.id)) {
      // Equip existing
      const updated: PlayerProfile = {
        ...profile,
        activeTheme: item.id,
      };
      onUpdateProfile(updated);
      synth.playTick();
      return;
    }

    if (coins >= item.price) {
      // Buy and equip
      const updated: PlayerProfile = {
        ...profile,
        coins: coins - item.price,
        unlockedThemes: [...unlockedThemes, item.id],
        activeTheme: item.id,
      };
      onUpdateProfile(updated);
      synth.playWin(); // Play triumph sound for purchase!
    } else {
      synth.playTick();
      alert("Insufficient virtual currency!");
    }
  };

  const handleBuyMarking = (item: ShopMarkingItem) => {
    if (unlockedMarkings.includes(item.id)) {
      // Equip existing
      const updated: PlayerProfile = {
        ...profile,
        activeMarking: item.id,
      };
      onUpdateProfile(updated);
      synth.playTick();
      return;
    }

    if (coins >= item.price) {
      // Buy and equip
      const updated: PlayerProfile = {
        ...profile,
        coins: coins - item.price,
        unlockedMarkings: [...unlockedMarkings, item.id],
        activeMarking: item.id,
      };
      onUpdateProfile(updated);
      synth.playWin();
    } else {
      synth.playTick();
      alert("Insufficient virtual currency!");
    }
  };

  return (
    <div className={`p-5 rounded-xl border flex flex-col h-full transition-all duration-300 ${
      isDark 
        ? "bg-slate-900/60 border-cyan-500/15 shadow-[0_0_20px_rgba(6,182,212,0.05)]" 
        : "bg-white border-slate-200 shadow-sm"
    }`}>
      {/* Header Panel */}
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b pb-4 ${
        isDark ? "border-cyan-500/20" : "border-slate-200"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isDark ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-100 text-cyan-600"}`}>
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-sm font-sans font-semibold tracking-wide ${isDark ? "text-slate-100" : "text-slate-800"}`}>Cosmetics Arena Shop</h2>
            <p className={`text-[10px] font-mono ${isDark ? "text-cyan-400/60" : "text-cyan-600/70"}`}>Customize board themes and marker icons</p>
          </div>
        </div>

        {/* Currency Display */}
        <div className="flex items-center gap-3.5">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
            isDark ? "bg-slate-950/80 border-amber-500/30 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700"
          }`}>
            <Coins className="w-4 h-4 animate-bounce" />
            <span className="text-xs font-mono font-bold">{coins.toLocaleString()}</span>
            <span className="text-[9px] uppercase font-bold tracking-wider opacity-75">Credits</span>
          </div>
        </div>
      </div>

      <div className="space-y-8 flex-1 overflow-y-auto max-h-[500px] pr-1 custom-scrollbar">
        {/* Section: Board Themes */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <h3 className={`text-xs uppercase tracking-wider font-bold ${isDark ? "text-slate-300" : "text-slate-600"}`}>Board Themes</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SHOP_THEMES.map((themeItem) => {
              const isUnlocked = unlockedThemes.includes(themeItem.id);
              const isActive = activeTheme === themeItem.id;

              return (
                <div
                  key={themeItem.id}
                  className={`p-3.5 rounded-lg border flex flex-col justify-between transition-all duration-300 ${
                    isActive
                      ? isDark
                        ? "bg-cyan-950/25 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                        : "bg-cyan-50 border-cyan-300 shadow-sm"
                      : isDark
                      ? "bg-slate-950/40 border-cyan-500/5 hover:border-cyan-500/20"
                      : "bg-slate-50 border-slate-100 hover:border-slate-200"
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                          {themeItem.name}
                        </span>
                        {isActive && (
                          <span className="text-[8px] px-1 py-0.25 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30 uppercase tracking-wide font-bold">
                            Equipped
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        {themeItem.description}
                      </p>
                    </div>

                    {/* Miniature Theme Swatch Preview */}
                    <div className={`w-12 h-12 rounded border flex flex-wrap p-1 shrink-0 ${themeItem.bgPreviewClass} ${themeItem.borderPreviewClass}`}>
                      <div className={`w-full h-full flex flex-col justify-between`}>
                        <div className={`w-full border-b ${themeItem.borderPreviewClass}`} />
                        <div className="flex justify-between">
                          <span className={`text-[8px] font-bold ${themeItem.textColor}`}>X</span>
                          <span className={`text-[8px] font-bold ${themeItem.textColor}`}>O</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-cyan-500/10 pt-3">
                    <div className="flex items-center gap-1">
                      {isUnlocked ? (
                        <span className={`text-[10px] font-semibold ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>Owned</span>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-500">
                          <Coins className="w-3.5 h-3.5" />
                          <span>{themeItem.price === 0 ? "FREE" : themeItem.price.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleBuyTheme(themeItem)}
                      className={`px-3 py-1 text-[10px] uppercase tracking-wider font-bold rounded cursor-pointer transition-all flex items-center gap-1 ${
                        isActive
                          ? "bg-slate-500/20 text-slate-400 border border-slate-500/30 cursor-default"
                          : isUnlocked
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/40"
                          : "bg-amber-600 hover:bg-amber-500 text-white shadow-md"
                      }`}
                      disabled={isActive}
                    >
                      {isActive ? (
                        <>
                          <Check className="w-3 h-3" />
                          Active
                        </>
                      ) : isUnlocked ? (
                        "Equip"
                      ) : (
                        <>
                          <Lock className="w-3 h-3" />
                          Buy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section: Markings Customization */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <h3 className={`text-xs uppercase tracking-wider font-bold ${isDark ? "text-slate-300" : "text-slate-600"}`}>Grid Markings (X & O replacement)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SHOP_MARKINGS.map((markingItem) => {
              const isUnlocked = unlockedMarkings.includes(markingItem.id);
              const isActive = activeMarking === markingItem.id;

              return (
                <div
                  key={markingItem.id}
                  className={`p-3.5 rounded-lg border flex flex-col justify-between transition-all duration-300 ${
                    isActive
                      ? isDark
                        ? "bg-cyan-950/25 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                        : "bg-cyan-50 border-cyan-300 shadow-sm"
                      : isDark
                      ? "bg-slate-950/40 border-cyan-500/5 hover:border-cyan-500/20"
                      : "bg-slate-50 border-slate-100 hover:border-slate-200"
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                          {markingItem.name}
                        </span>
                        {isActive && (
                          <span className="text-[8px] px-1 py-0.25 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30 uppercase tracking-wide font-bold">
                            Equipped
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        {markingItem.description}
                      </p>
                    </div>

                    {/* Miniature Swatch preview of Custom symbols */}
                    <div className={`w-12 h-12 rounded border flex items-center justify-center gap-1.5 shrink-0 bg-slate-950/60 border-cyan-500/10`}>
                      <span className="text-sm font-bold">{markingItem.previewX}</span>
                      <span className="text-xs opacity-40">/</span>
                      <span className="text-sm font-bold">{markingItem.previewO}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-cyan-500/10 pt-3">
                    <div className="flex items-center gap-1">
                      {isUnlocked ? (
                        <span className={`text-[10px] font-semibold ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>Owned</span>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-500">
                          <Coins className="w-3.5 h-3.5" />
                          <span>{markingItem.price === 0 ? "FREE" : markingItem.price.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleBuyMarking(markingItem)}
                      className={`px-3 py-1 text-[10px] uppercase tracking-wider font-bold rounded cursor-pointer transition-all flex items-center gap-1 ${
                        isActive
                          ? "bg-slate-500/20 text-slate-400 border border-slate-500/30 cursor-default"
                          : isUnlocked
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/40"
                          : "bg-amber-600 hover:bg-amber-500 text-white shadow-md"
                      }`}
                      disabled={isActive}
                    >
                      {isActive ? (
                        <>
                          <Check className="w-3 h-3" />
                          Active
                        </>
                      ) : isUnlocked ? (
                        "Equip"
                      ) : (
                        <>
                          <Lock className="w-3 h-3" />
                          Buy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
