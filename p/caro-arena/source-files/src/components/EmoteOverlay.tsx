/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Smile, MessageSquare, X, Send } from "lucide-react";
import { EmoteItem } from "../types";
import synth from "../utils/audio";

interface EmoteOverlayProps {
  emotes: EmoteItem[];
  onSendEmote: (content: string, type: "EMOJI" | "TEXT") => void;
  theme?: "light" | "dark";
  disabled?: boolean;
}

const PRESET_EMOJIS = ["😎", "😱", "😭", "👏", "🔥", "💀", "🤔", "🎯", "👑", "💥"];
const PRESET_PHRASES = [
  "GG! Ván đấu tuyệt vời!",
  "Nhanh lên bạn êi!",
  "Ảo thật đấy!",
  "Tính cả rồi nha!",
  "Đầu hàng đi bạn ơi!",
  "Hay lắm!",
  "Nước cờ hiểm quá!",
  "Chúc may mắn lần sau!",
];

export default function EmoteOverlay({
  emotes,
  onSendEmote,
  theme = "dark",
  disabled = false,
}: EmoteOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"EMOJIS" | "PHRASES">("EMOJIS");
  const isDark = theme === "dark";

  const handleSelect = (content: string, type: "EMOJI" | "TEXT") => {
    onSendEmote(content, type);
    synth.playTick();
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Animated Emotes in Board View */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
        <AnimatePresence>
          {emotes.map((e) => (
            <motion.div
              key={e.id}
              initial={{
                opacity: 0,
                scale: 0.3,
                y: e.sender === "PLAYER" ? 40 : -40,
                x: e.sender === "PLAYER" ? 20 : -20,
              }}
              animate={{
                opacity: 1,
                scale: 1.1,
                y: 0,
                x: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.7,
                y: -60,
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
              }}
              className={`absolute ${
                e.sender === "PLAYER"
                  ? "bottom-24 right-8"
                  : e.sender === "OPPONENT"
                  ? "top-24 left-8"
                  : "top-24 left-1/2 -translate-x-1/2"
              }`}
            >
              <div
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl border ${
                  e.sender === "PLAYER"
                    ? "bg-violet-600/90 text-white border-violet-400/50 shadow-violet-500/30"
                    : e.sender === "AI"
                    ? "bg-rose-600/90 text-white border-rose-400/50 shadow-rose-500/30"
                    : "bg-cyan-600/90 text-white border-cyan-400/50 shadow-cyan-500/30"
                }`}
              >
                {e.type === "EMOJI" ? (
                  <span className="text-3xl animate-bounce">{e.content}</span>
                ) : (
                  <span className="text-sm font-semibold tracking-wide">{e.content}</span>
                )}
                <span className="text-[10px] uppercase font-bold opacity-75">
                  {e.sender === "PLAYER" ? "Bạn" : e.sender === "AI" ? "AI" : "Đối thủ"}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Emote Button Trigger */}
      <div className="relative pointer-events-auto">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className={`p-2 rounded-xl border flex items-center justify-center transition shadow-lg cursor-pointer ${
            isDark
              ? "bg-slate-900/90 border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/40 hover:border-cyan-400"
              : "bg-white/95 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
          }`}
          title="Thả Emote / Chat nhanh"
        >
          <Smile size={16} />
        </button>

        {/* Emote Picker Drawer */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className={`absolute bottom-12 right-0 w-72 rounded-2xl border shadow-2xl backdrop-blur-2xl p-3 z-50 ${
                isDark
                  ? "bg-slate-900/95 border-cyan-500/30 text-slate-100 shadow-cyan-950/50"
                  : "bg-white/98 border-slate-200 text-slate-900 shadow-slate-300/60"
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-700/30 mb-2">
                <div className="flex gap-1">
                  <button
                    onClick={() => setActiveTab("EMOJIS")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                      activeTab === "EMOJIS"
                        ? "bg-cyan-500 text-slate-950 font-bold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Emoji
                  </button>
                  <button
                    onClick={() => setActiveTab("PHRASES")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                      activeTab === "PHRASES"
                        ? "bg-cyan-500 text-slate-950 font-bold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Chat nhanh
                  </button>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-slate-200 p-1"
                >
                  <X size={14} />
                </button>
              </div>

              {activeTab === "EMOJIS" ? (
                <div className="grid grid-cols-5 gap-1.5 p-1">
                  {PRESET_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleSelect(emoji, "EMOJI")}
                      className="text-2xl p-2 rounded-xl hover:scale-125 transition hover:bg-cyan-500/10 cursor-pointer flex items-center justify-center"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto p-1 pr-1.5 custom-scrollbar">
                  {PRESET_PHRASES.map((phrase) => (
                    <button
                      key={phrase}
                      onClick={() => handleSelect(phrase, "TEXT")}
                      className={`text-left text-xs px-2.5 py-2 rounded-xl transition flex items-center justify-between cursor-pointer ${
                        isDark
                          ? "hover:bg-slate-800 text-slate-200 hover:text-cyan-300"
                          : "hover:bg-slate-100 text-slate-700 hover:text-cyan-700"
                      }`}
                    >
                      <span>{phrase}</span>
                      <Send size={11} className="opacity-40" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
