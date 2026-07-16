import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface Particle {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  size: number;
  color: string;
  shape: "circle" | "square" | "triangle" | "plus" | "spark";
  delay: number;
  duration: number;
  spin: number;
}

interface ConfettiStreamer {
  id: number;
  left: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  spin: number;
}

const NEON_COLORS = [
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#a855f7", // Purple
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#3b82f6", // Royal Blue
];

export default function CelebrationOverlay({ isDark = true }: { isDark?: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [streamers, setStreamers] = useState<ConfettiStreamer[]>([]);
  const [shockwaves, setShockwaves] = useState<number[]>([1, 2, 3]);

  useEffect(() => {
    // 1. Generate core burst particles originating from the center
    const tempParticles: Particle[] = [];
    const count = 120;
    
    for (let i = 0; i < count; i++) {
      // Polar coordinates for a spherical burst
      const angle = Math.random() * Math.PI * 2;
      // Burst radius: some far, some close
      const distance = 100 + Math.random() * 500;
      
      const targetX = Math.cos(angle) * distance;
      const targetY = Math.sin(angle) * distance;
      
      const shapes: Particle["shape"][] = ["circle", "square", "triangle", "plus", "spark"];
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      
      tempParticles.push({
        id: i,
        x: 0,
        y: 0,
        targetX,
        targetY,
        size: Math.random() * 12 + 4,
        color: NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)],
        shape,
        delay: Math.random() * 0.4,
        duration: 1.5 + Math.random() * 1.5,
        spin: Math.random() * 720 - 360,
      });
    }
    setParticles(tempParticles);

    // 2. Generate a stream of falling digital rain/confetti from the top
    const tempStreamers: ConfettiStreamer[] = [];
    const streamerCount = 45;
    for (let i = 0; i < streamerCount; i++) {
      tempStreamers.push({
        id: i,
        left: Math.random() * 100, // percentage from left
        size: Math.random() * 8 + 4,
        color: NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)],
        delay: Math.random() * 1.5,
        duration: 3 + Math.random() * 3,
        spin: Math.random() * 360,
      });
    }
    setStreamers(tempStreamers);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-55 overflow-hidden">
      {/* 1. Cyber Center Burst */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 flex items-center justify-center">
        <AnimatePresence>
          {particles.map((p) => {
            const ShapeComponent = () => {
              switch (p.shape) {
                case "triangle":
                  return (
                    <svg
                      width={p.size}
                      height={p.size}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={p.color}
                      strokeWidth="2"
                    >
                      <polygon points="12,2 22,22 2,22" fill={`${p.color}20`} />
                    </svg>
                  );
                case "plus":
                  return (
                    <svg
                      width={p.size}
                      height={p.size}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={p.color}
                      strokeWidth="3.5"
                    >
                      <line x1="12" y1="2" x2="12" y2="22" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                    </svg>
                  );
                case "spark":
                  return (
                    <svg
                      width={p.size}
                      height={p.size}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={p.color}
                      strokeWidth="2"
                    >
                      <path d="M12 2v20M2 12h20M5.64 5.64l12.72 12.72M5.64 18.36L18.36 5.64" />
                    </svg>
                  );
                case "square":
                  return (
                    <div
                      style={{
                        width: p.size,
                        height: p.size,
                        backgroundColor: `${p.color}22`,
                        border: `2px solid ${p.color}`,
                        borderRadius: "2px",
                      }}
                    />
                  );
                default:
                  return (
                    <div
                      style={{
                        width: p.size,
                        height: p.size,
                        backgroundColor: p.color,
                        borderRadius: "50%",
                        boxShadow: `0 0 ${p.size * 1.5}px ${p.color}`,
                      }}
                    />
                  );
              }
            };

            return (
              <motion.div
                key={`burst-${p.id}`}
                className="absolute"
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.2 }}
                animate={{
                  x: p.targetX,
                  y: p.targetY,
                  opacity: [0, 1, 1, 0],
                  scale: [0.2, 1, 1.2, 0],
                  rotate: p.spin,
                }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  ease: "easeOut",
                }}
              >
                <ShapeComponent />
              </motion.div>
            );
          })}

          {/* Shockwave expanding rings */}
          {shockwaves.map((ringNum) => (
            <motion.div
              key={`ring-${ringNum}`}
              className="absolute rounded-full border-2 border-dashed pointer-events-none"
              style={{
                borderColor: NEON_COLORS[ringNum % NEON_COLORS.length],
                width: 10,
                height: 10,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 45 + ringNum * 15],
                opacity: [0, 0.7, 0],
              }}
              transition={{
                duration: 2.2,
                delay: ringNum * 0.3,
                ease: "easeOut",
              }}
            />
          ))}

          {/* Neon energy flare */}
          <motion.div
            className="absolute rounded-full blur-xl pointer-events-none"
            style={{
              width: 160,
              height: 160,
              background: "radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 70%)",
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 3, 4],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 2.0,
              ease: "easeOut",
            }}
          />
        </AnimatePresence>
      </div>

      {/* 2. Top-down Digital Confetti Stream */}
      <div className="absolute inset-x-0 top-0 h-full">
        {streamers.map((s) => (
          <motion.div
            key={`stream-${s.id}`}
            className="absolute"
            style={{
              left: `${s.left}%`,
              top: -20,
            }}
            initial={{ y: 0, opacity: 0, scale: 0.5, rotate: 0 }}
            animate={{
              y: [0, window.innerHeight + 100],
              opacity: [0, 1, 1, 0.6, 0],
              scale: [0.5, 1, 0.8],
              rotate: s.spin * 4,
              x: [0, Math.sin(s.id) * 30, Math.sin(s.id + 1) * 30, 0],
            }}
            transition={{
              duration: s.duration,
              delay: s.delay,
              repeat: Infinity,
              repeatType: "loop",
              ease: "easeInOut",
            }}
          >
            <div
              style={{
                width: s.size,
                height: s.size,
                backgroundColor: s.color,
                borderRadius: s.id % 2 === 0 ? "50%" : "2px",
                boxShadow: `0 0 8px ${s.color}`,
                transform: `skew(${s.id % 3 === 0 ? 15 : 0}deg)`,
              }}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
