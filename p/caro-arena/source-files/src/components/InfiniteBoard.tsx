/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from "react";
import { motion } from "motion/react";
import { Position, PlayerSymbol } from "../types";
import { Maximize2, Minimize2, Crosshair, HelpCircle, Volume2, VolumeX } from "lucide-react";
import synth from "../utils/audio";

interface InfiniteBoardProps {
  board: Record<string, PlayerSymbol>;
  winningCells: Position[] | null;
  onCellClick: (x: number, y: number) => void;
  currentPlayer: PlayerSymbol;
  isAiThinking: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  lastMove: Position | null;
  theme?: "light" | "dark";
  activeBoardTheme?: string;
  activeMarkingStyle?: string;
}

export default function InfiniteBoard({
  board,
  winningCells,
  onCellClick,
  currentPlayer,
  isAiThinking,
  isMuted,
  onToggleMute,
  lastMove,
  theme = "dark",
  activeBoardTheme = "classic",
  activeMarkingStyle = "classic",
}: InfiniteBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDark = theme === "dark";
  
  // Viewport offsets and zoom
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hoveredCell, setHoveredCell] = useState<Position | null>(null);

  const BASE_CELL_SIZE = 48;
  const currentCellSize = BASE_CELL_SIZE * zoom;

  // Track if mouse moved significantly during click to ignore place
  const totalDragDistance = useRef(0);

  // Center the grid coordinates (0,0) inside the container viewport on mount
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({
        x: rect.width / 2 - currentCellSize / 2,
        y: rect.height / 2 - currentCellSize / 2,
      });
    }
  }, []);

  // Jump camera focus to the latest placed move
  const focusOnPosition = (pos: Position) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({
        x: rect.width / 2 - (pos.x * currentCellSize + currentCellSize / 2),
        y: rect.height / 2 - (pos.y * currentCellSize + currentCellSize / 2),
      });
      synth.playTick();
    }
  };

  // Re-center on origin (0,0)
  const handleRecenter = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({
        x: rect.width / 2 - currentCellSize / 2,
        y: rect.height / 2 - currentCellSize / 2,
      });
      setZoom(1.0);
      synth.playTick();
    }
  };

  // Focus on the last move
  const handleFocusLastMove = () => {
    if (lastMove) {
      focusOnPosition(lastMove);
    } else {
      handleRecenter();
    }
  };

  // Mouse drag handles
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragOffset({ ...pan });
    totalDragDistance.current = 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Track mouse coordinates over cells
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const cellX = Math.floor((mouseX - pan.x) / currentCellSize);
    const cellY = Math.floor((mouseY - pan.y) / currentCellSize);
    
    setHoveredCell({ x: cellX, y: cellY });

    if (!isDragging) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    totalDragDistance.current += Math.sqrt(dx * dx + dy * dy);

    setPan({
      x: dragOffset.x + dx,
      y: dragOffset.y + dy,
    });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setIsDragging(false);

    // If mouse didn't drag much, trigger click on that cell coordinate
    if (totalDragDistance.current < 5) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const cellX = Math.floor((mouseX - pan.x) / currentCellSize);
      const cellY = Math.floor((mouseY - pan.y) / currentCellSize);

      onCellClick(cellX, cellY);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const zoomIntensity = 0.05;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Grid coordinates under cursor before zoom
    const gx = (mouseX - pan.x) / zoom;
    const gy = (mouseY - pan.y) / zoom;

    let nextZoom = zoom - e.deltaY * zoomIntensity * 0.005;
    nextZoom = Math.min(1.5, Math.max(0.5, nextZoom));

    // Shift pan to keep grid coordinates anchored under mouse
    setPan({
      x: mouseX - gx * nextZoom,
      y: mouseY - gy * nextZoom,
    });
    setZoom(nextZoom);
  };

  // Adjust zoom via HUD controls
  const handleZoomIn = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const midX = rect.width / 2;
      const midY = rect.height / 2;
      const gx = (midX - pan.x) / zoom;
      const gy = (midY - pan.y) / zoom;
      const nextZoom = Math.min(1.5, zoom + 0.15);
      setPan({ x: midX - gx * nextZoom, y: midY - gy * nextZoom });
      setZoom(nextZoom);
      synth.playTick();
    }
  };

  const handleZoomOut = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const midX = rect.width / 2;
      const midY = rect.height / 2;
      const gx = (midX - pan.x) / zoom;
      const gy = (midY - pan.y) / zoom;
      const nextZoom = Math.max(0.5, zoom - 0.15);
      setPan({ x: midX - gx * nextZoom, y: midY - gy * nextZoom });
      setZoom(nextZoom);
      synth.playTick();
    }
  };

  // Determine which cells are visible in the viewport (to optimize rendering)
  const getVisiblePieces = () => {
    if (!containerRef.current) return [];
    const rect = containerRef.current.getBoundingClientRect();

    return Object.entries(board).filter(([key]) => {
      const [xStr, yStr] = key.split(",");
      const px = parseInt(xStr, 10);
      const py = parseInt(yStr, 10);

      const posX = px * currentCellSize + pan.x;
      const posY = py * currentCellSize + pan.y;

      // Add simple buffer of 1 cell size around screen
      return (
        posX >= -currentCellSize &&
        posX <= rect.width + currentCellSize &&
        posY >= -currentCellSize &&
        posY <= rect.height + currentCellSize
      );
    });
  };

  const visiblePieces = getVisiblePieces();

  // Cosmetics themes config mapping
  const boardThemes: Record<string, {
    containerClass: string;
    bgStyle: React.CSSProperties;
    cellBorderClass: string;
    originClass: string;
    originCenterClass: string;
  }> = {
    classic: {
      containerClass: isDark
        ? "bg-slate-950 border-cyan-500/20 shadow-[inset_0_0_30px_rgba(6,182,212,0.15)]"
        : "bg-slate-50 border-slate-200 shadow-[inset_0_0_20px_rgba(6,182,212,0.04)]",
      bgStyle: {
        backgroundSize: `${currentCellSize}px ${currentCellSize}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
        backgroundImage: isDark
          ? `
            linear-gradient(to right, rgba(6, 182, 212, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(6, 182, 212, 0.08) 1px, transparent 1px)
          `
          : `
            linear-gradient(to right, rgba(6, 182, 212, 0.12) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(6, 182, 212, 0.12) 1px, transparent 1px)
          `,
      },
      cellBorderClass: isDark ? "border-cyan-500/10" : "border-slate-200/60",
      originClass: isDark ? "border-cyan-500/40 bg-cyan-950/20" : "border-cyan-500/50 bg-cyan-100/50",
      originCenterClass: "bg-cyan-500",
    },
    wood: {
      containerClass: "bg-[#2c130b] border-amber-800/40 shadow-[inset_0_0_30px_rgba(146,64,14,0.15)]",
      bgStyle: {
        backgroundSize: `${currentCellSize}px ${currentCellSize}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
        backgroundColor: "#2c130b",
        backgroundImage: `
          linear-gradient(to right, rgba(217, 119, 6, 0.12) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(217, 119, 6, 0.12) 1px, transparent 1px)
        `,
      },
      cellBorderClass: "border-amber-900/35",
      originClass: "border-amber-600 bg-amber-950/60",
      originCenterClass: "bg-amber-500",
    },
    neon: {
      containerClass: "bg-black border-pink-500/20 shadow-[inset_0_0_35px_rgba(236,72,153,0.18)]",
      bgStyle: {
        backgroundSize: `${currentCellSize}px ${currentCellSize}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
        backgroundColor: "#000000",
        backgroundImage: `
          linear-gradient(to right, rgba(236, 72, 153, 0.12) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(236, 72, 153, 0.12) 1px, transparent 1px)
        `,
      },
      cellBorderClass: "border-pink-500/10",
      originClass: "border-pink-500/60 bg-pink-950/30",
      originCenterClass: "bg-pink-500",
    },
    sakura: {
      containerClass: "bg-[#fff5f5] border-rose-300 shadow-[inset_0_0_20px_rgba(244,63,94,0.06)]",
      bgStyle: {
        backgroundSize: `${currentCellSize}px ${currentCellSize}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
        backgroundColor: "#fff5f5",
        backgroundImage: `
          linear-gradient(to right, rgba(244, 63, 94, 0.18) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(244, 63, 94, 0.18) 1px, transparent 1px)
        `,
      },
      cellBorderClass: "border-rose-200/80",
      originClass: "border-rose-400 bg-rose-100",
      originCenterClass: "bg-rose-500",
    },
    forest: {
      containerClass: "bg-[#062312] border-emerald-800 shadow-[inset_0_0_30px_rgba(16,185,129,0.12)]",
      bgStyle: {
        backgroundSize: `${currentCellSize}px ${currentCellSize}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
        backgroundColor: "#062312",
        backgroundImage: `
          linear-gradient(to right, rgba(52, 211, 153, 0.12) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(52, 211, 153, 0.12) 1px, transparent 1px)
        `,
      },
      cellBorderClass: "border-emerald-900/40",
      originClass: "border-emerald-500/60 bg-emerald-950/40",
      originCenterClass: "bg-emerald-400",
    },
    world_cup: {
      containerClass: "bg-[#022c22] border-emerald-500 shadow-[inset_0_0_35px_rgba(16,185,129,0.18)]",
      bgStyle: {
        backgroundSize: `${currentCellSize}px ${currentCellSize}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
        backgroundColor: "#022c22",
        backgroundImage: `
          linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
        `,
      },
      cellBorderClass: "border-emerald-500/15",
      originClass: "border-amber-400 bg-emerald-900/60",
      originCenterClass: "bg-amber-400",
    },
    countries_stadium: {
      containerClass: "bg-[#012e17] border-emerald-400 shadow-[inset_0_0_40px_rgba(52,211,153,0.25)]",
      bgStyle: {
        backgroundSize: `${currentCellSize}px ${currentCellSize}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
        backgroundColor: "#012e17",
        backgroundImage: `
          linear-gradient(to right, rgba(255, 255, 255, 0.12) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 255, 255, 0.12) 1px, transparent 1px)
        `,
      },
      cellBorderClass: "border-emerald-500/20",
      originClass: "border-amber-300 bg-emerald-800/80 shadow-[0_0_12px_rgba(251,191,36,0.3)] animate-pulse",
      originCenterClass: "bg-amber-300",
    },
    light: {
      containerClass: "bg-white border-blue-200 shadow-[inset_0_0_20px_rgba(59,130,246,0.03)]",
      bgStyle: {
        backgroundSize: `${currentCellSize}px ${currentCellSize}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
        backgroundColor: "#ffffff",
        backgroundImage: `
          linear-gradient(to right, rgba(59, 130, 246, 0.1) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
        `,
      },
      cellBorderClass: "border-blue-100",
      originClass: "border-blue-400 bg-blue-50",
      originCenterClass: "bg-blue-600",
    },
  };

  const currentThemeId = activeBoardTheme && boardThemes[activeBoardTheme] ? activeBoardTheme : "classic";
  const boardStyle = boardThemes[currentThemeId];

  // Marking styles config mapping
  const markingStyles: Record<string, {
    X: string;
    O: string;
  }> = {
    classic: { X: "svg_classic_x", O: "svg_classic_o" },
    emoji: { X: "❌", O: "⭕" },
    celestial: { X: "☀️", O: "🌙" },
    cosmic: { X: "🌀", O: "⭐" },
    world_cup_nations: { X: "🇧🇷", O: "🇦🇷" },
    world_cup_cities: { X: "⛰️", O: "🗼" },
    world_cup_icons: { X: "🏆", O: "⚽" },
    royal: { X: "💎", O: "👑" },
    neon_power: { X: "⚡", O: "🔥" },
  };

  const currentMarkingId = activeMarkingStyle && markingStyles[activeMarkingStyle] ? activeMarkingStyle : "classic";
  const activeMarkingObj = markingStyles[currentMarkingId];

  return (
    <div className={`relative w-full h-[400px] sm:h-[500px] md:h-[600px] lg:h-[620px] rounded-xl border overflow-hidden flex flex-col justify-end transition-all duration-300 ${boardStyle.containerClass}`}>
      
      {/* Draggable Active Sandbox Viewport */}
      <div
        id="game-board-viewport"
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing overflow-hidden outline-none relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDragging(false);
          setHoveredCell(null);
        }}
        onWheel={handleWheel}
        style={boardStyle.bgStyle}
      >
        {/* Center origin indicator (0,0 Station) */}
        <div
          id="station-origin"
          className={`absolute rounded-full pointer-events-none flex items-center justify-center border animate-pulse ${boardStyle.originClass}`}
          style={{
            left: `${0 * currentCellSize + pan.x}px`,
            top: `${0 * currentCellSize + pan.y}px`,
            width: `${currentCellSize}px`,
            height: `${currentCellSize}px`,
          }}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${boardStyle.originCenterClass}`} />
          <span className={`absolute -bottom-5 text-[9px] font-sans font-semibold tracking-wider uppercase ${isDark ? "text-cyan-400/60" : "text-cyan-600"}`}>
            Center Origin
          </span>
        </div>

        {/* Highlight reticle for active cursor */}
        {hoveredCell && !isDragging && !isAiThinking && !winningCells && (
          <div
            id="hover-reticle"
            className={`absolute border pointer-events-none transition-all duration-75 ${
              isDark ? "border-cyan-400/50" : "border-cyan-500/60"
            }`}
            style={{
              left: `${hoveredCell.x * currentCellSize + pan.x}px`,
              top: `${hoveredCell.y * currentCellSize + pan.y}px`,
              width: `${currentCellSize}px`,
              height: `${currentCellSize}px`,
              boxShadow: isDark ? `inset 0 0 8px rgba(34, 211, 238, 0.25)` : `inset 0 0 8px rgba(6, 182, 212, 0.15)`,
            }}
          >
            {/* Minimal corners for reticle */}
            <div className={`absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 ${isDark ? "border-cyan-400" : "border-cyan-500"}`} />
            <div className={`absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 ${isDark ? "border-cyan-400" : "border-cyan-500"}`} />
            <div className={`absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 ${isDark ? "border-cyan-400" : "border-cyan-500"}`} />
            <div className={`absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 ${isDark ? "border-cyan-400" : "border-cyan-500"}`} />
            
            {/* Small preview of token to be placed */}
            <div className="w-full h-full flex items-center justify-center opacity-35">
              {currentPlayer === "X" ? (
                activeMarkingObj.X === "svg_classic_x" ? (
                  <svg className="w-[60%] h-[60%] stroke-violet-500 stroke-[2.5]" viewBox="0 0 24 24">
                    <line x1="4" y1="4" x2="20" y2="20" />
                    <line x1="20" y1="4" x2="4" y2="20" />
                  </svg>
                ) : (
                  <span style={{ fontSize: `${20 * zoom}px` }}>{activeMarkingObj.X}</span>
                )
              ) : (
                activeMarkingObj.O === "svg_classic_o" ? (
                  <svg className="w-[60%] h-[60%] fill-none stroke-cyan-500 stroke-[2.5]" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="8" />
                  </svg>
                ) : (
                  <span style={{ fontSize: `${20 * zoom}px` }}>{activeMarkingObj.O}</span>
                )
              )}
            </div>
          </div>
        )}

        {/* Highlight the last placed move with a green pulse ring */}
        {lastMove && !winningCells && (
          <div
            id="last-move-ping"
            className="absolute border-2 border-emerald-500 rounded-lg pointer-events-none animate-ping opacity-60"
            style={{
              left: `${lastMove.x * currentCellSize + pan.x}px`,
              top: `${lastMove.y * currentCellSize + pan.y}px`,
              width: `${currentCellSize}px`,
              height: `${currentCellSize}px`,
            }}
          />
        )}

        {/* Render Placed Tokens */}
        {visiblePieces.map(([key, symbol]) => {
          const [xStr, yStr] = key.split(",");
          const px = parseInt(xStr, 10);
          const py = parseInt(yStr, 10);

          const isWinningCell = winningCells?.some((c) => c.x === px && c.y === py);

          return (
            <div
              key={key}
              id={`cell-${px}-${py}`}
              className={`absolute flex items-center justify-center border ${boardStyle.cellBorderClass}`}
              style={{
                left: `${px * currentCellSize + pan.x}px`,
                top: `${py * currentCellSize + pan.y}px`,
                width: `${currentCellSize}px`,
                height: `${currentCellSize}px`,
              }}
            >
              {symbol === "X" ? (
                activeMarkingObj.X === "svg_classic_x" ? (
                  <motion.svg
                    className={`w-[65%] h-[65%] ${isWinningCell ? "drop-shadow-[0_0_12px_#a78bfa] stroke-violet-500 stroke-[3]" : "stroke-violet-500/90 stroke-[2.5]"}`}
                    viewBox="0 0 24 24"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 150, damping: 15 }}
                  >
                    <motion.line
                      x1="4"
                      y1="4"
                      x2="20"
                      y2="20"
                      strokeWidth="3"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                    <motion.line
                      x1="20"
                      y1="4"
                      x2="4"
                      y2="20"
                      strokeWidth="3"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    />
                  </motion.svg>
                ) : (
                  <motion.span
                    style={{ fontSize: `${24 * zoom}px` }}
                    className={`select-none ${isWinningCell ? "animate-pulse drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] scale-110 font-bold" : ""}`}
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 150, damping: 12 }}
                  >
                    {activeMarkingObj.X}
                  </motion.span>
                )
              ) : (
                activeMarkingObj.O === "svg_classic_o" ? (
                  <motion.svg
                    className={`w-[65%] h-[65%] fill-none ${isWinningCell ? "drop-shadow-[0_0_12px_#22d3ee] stroke-cyan-500 stroke-[3]" : "stroke-cyan-500/95 stroke-[2.5]"}`}
                    viewBox="0 0 24 24"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 150, damping: 15 }}
                  >
                    <motion.circle
                      cx="12"
                      cy="12"
                      r="8"
                      strokeWidth="3"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.4 }}
                    />
                  </motion.svg>
                ) : (
                  <motion.span
                    style={{ fontSize: `${24 * zoom}px` }}
                    className={`select-none ${isWinningCell ? "animate-pulse drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] scale-110 font-bold" : ""}`}
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 150, damping: 12 }}
                  >
                    {activeMarkingObj.O}
                  </motion.span>
                )
              )}
            </div>
          );
        })}

        {/* Lasers connecting winning cells */}
        {winningCells && winningCells.length >= 5 && (
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
            {/* Draw laser glow lines */}
            <motion.line
              x1={winningCells[0].x * currentCellSize + pan.x + currentCellSize / 2}
              y1={winningCells[0].y * currentCellSize + pan.y + currentCellSize / 2}
              x2={winningCells[winningCells.length - 1].x * currentCellSize + pan.x + currentCellSize / 2}
              y2={winningCells[winningCells.length - 1].y * currentCellSize + pan.y + currentCellSize / 2}
              className="stroke-cyan-400/40"
              strokeWidth="10"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
            {/* Draw sharp core laser line */}
            <motion.line
              x1={winningCells[0].x * currentCellSize + pan.x + currentCellSize / 2}
              y1={winningCells[0].y * currentCellSize + pan.y + currentCellSize / 2}
              x2={winningCells[winningCells.length - 1].x * currentCellSize + pan.x + currentCellSize / 2}
              y2={winningCells[winningCells.length - 1].y * currentCellSize + pan.y + currentCellSize / 2}
              className="stroke-cyan-100"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </svg>
        )}
      </div>

      {/* Floating HUD overlay top bar */}
      <div className="absolute top-4 left-4 right-4 pointer-events-none flex justify-between items-start gap-4">
        {/* Active Coordinates HUD */}
        <div
          id="coordinates-hud"
          className={`backdrop-blur-md border px-3 py-1.5 rounded text-[11px] font-mono tracking-wide shadow-lg flex flex-col pointer-events-auto transition-all duration-300 ${
            isDark 
              ? "bg-slate-900/85 border-cyan-500/30 text-cyan-400" 
              : "bg-white/90 border-slate-200 text-cyan-700"
          }`}
        >
          <span className={`opacity-60 text-[9px] uppercase tracking-wider font-sans font-bold ${isDark ? "text-cyan-400" : "text-cyan-600"}`}>Coordinates</span>
          <span>
            X: {hoveredCell ? hoveredCell.x : 0} | Y: {hoveredCell ? hoveredCell.y : 0}
          </span>
        </div>

        {/* AI Action/System status */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          <div className="flex gap-2">
            {/* Mute Synth Button */}
            <button
              id="mute-hud-btn"
              onClick={onToggleMute}
              className={`backdrop-blur-md border p-2 rounded transition cursor-pointer shadow-lg ${
                isDark 
                  ? "bg-slate-900/85 border-cyan-500/30 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40 hover:border-cyan-400/50" 
                  : "bg-white/90 border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 hover:border-slate-300"
              }`}
              title={isMuted ? "Unmute audio" : "Mute audio"}
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>

            {/* Recenter HUD Control */}
            <button
              id="recenter-hud-btn"
              onClick={handleRecenter}
              className={`backdrop-blur-md border p-2 rounded transition cursor-pointer shadow-lg ${
                isDark 
                  ? "bg-slate-900/85 border-cyan-500/30 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40 hover:border-cyan-400/50" 
                  : "bg-white/90 border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 hover:border-slate-300"
              }`}
              title="Recenter Grid"
            >
              <Crosshair size={14} />
            </button>
          </div>

          {/* AI Processor State */}
          {isAiThinking && (
            <div
              id="ai-processing-hud"
              className="bg-red-500/10 backdrop-blur-md border border-red-500/30 px-3 py-1.5 rounded text-[10px] font-sans text-red-500 font-semibold tracking-wide shadow-lg flex items-center gap-2 animate-pulse"
            >
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
              Computer thinking...
            </div>
          )}
        </div>
      </div>

      {/* Navigation & Zoom HUD floating overlay */}
      <div className="absolute bottom-4 left-4 right-4 pointer-events-none flex justify-between items-center">
        {/* Navigation Instructions */}
        <div className={`hidden sm:flex backdrop-blur-md border px-3 py-1.5 rounded text-[10px] font-sans gap-3 items-center transition-all duration-300 ${
          isDark 
            ? "bg-slate-900/80 border-cyan-500/20 text-cyan-400/80" 
            : "bg-white/90 border-slate-200 text-slate-600"
        }`}>
          <HelpCircle size={12} className={isDark ? "text-cyan-400" : "text-cyan-600"} />
          <span>Drag grid to pan</span>
          <span className="opacity-25">|</span>
          <span>Scroll to zoom</span>
        </div>

        <div className="flex gap-2 pointer-events-auto ml-auto">
          {/* Focus Last Move Button */}
          {lastMove && (
            <button
              id="focus-move-btn"
              onClick={handleFocusLastMove}
              className={`backdrop-blur-md border px-3 py-1.5 rounded text-[11px] font-sans font-medium transition cursor-pointer shadow-lg ${
                isDark 
                  ? "bg-slate-900/85 border-cyan-500/30 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40 hover:border-cyan-400/50" 
                  : "bg-white/90 border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 hover:border-slate-300"
              }`}
              title="Focus on last move"
            >
              Last Move
            </button>
          )}

          {/* Zoom controls */}
          <div className={`backdrop-blur-md border rounded shadow-lg overflow-hidden flex transition-all duration-300 ${
            isDark 
              ? "bg-slate-900/85 border-cyan-500/30" 
              : "bg-white/90 border-slate-200"
          }`}>
            <button
              id="zoom-out-btn"
              onClick={handleZoomOut}
              className={`p-2 border-r transition cursor-pointer ${
                isDark 
                  ? "border-cyan-500/20 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40" 
                  : "border-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
              title="Zoom Out"
            >
              <Minimize2 size={13} />
            </button>
            <span className={`px-2.5 flex items-center justify-center text-[11px] font-mono w-12 select-none ${isDark ? "text-cyan-400" : "text-slate-700"}`}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              id="zoom-in-btn"
              onClick={handleZoomIn}
              className={`p-2 border-l transition cursor-pointer ${
                isDark 
                  ? "border-cyan-500/20 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40" 
                  : "border-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
              title="Zoom In"
            >
              <Maximize2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
