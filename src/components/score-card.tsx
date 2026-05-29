"use client";

import { animate, motion } from "framer-motion";
import { useEffect, useState } from "react";

interface ScoreCardProps {
  score: number;
  label: string;
}

function getScoreColor(score: number) {
  if (score >= 75) return { stroke: "#16a34a", text: "text-emerald-600", bg: "bg-emerald-50" };
  if (score >= 50) return { stroke: "#d97706", text: "text-amber-600", bg: "bg-amber-50" };
  return { stroke: "#dc2626", text: "text-rose-600", bg: "bg-rose-50" };
}

export function ScoreCard({ score, label }: ScoreCardProps) {
  const [display, setDisplay] = useState(0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  useEffect(() => {
    const controls = animate(0, score, {
      duration: 1,
      ease: "easeOut",
      onUpdate: (value) => setDisplay(Math.round(value)),
    });
    return () => controls.stop();
  }, [score]);

  return (
    <div className="col-span-12 overflow-hidden rounded-3xl border border-border bg-white shadow-[0_20px_60px_-40px_rgba(15,23,42,0.2)]">
      <div className="flex flex-col gap-6 px-8 py-8 md:flex-row md:items-center md:gap-12">
        <div className="flex items-center gap-6">
          <div className="relative flex h-[128px] w-[128px] shrink-0 items-center justify-center">
            <svg className="h-[128px] w-[128px] -rotate-90" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r={radius} fill="transparent" stroke="#f3f4f6" strokeWidth="10" />
              <motion.circle
                cx="64"
                cy="64"
                r={radius}
                fill="transparent"
                stroke={color.stroke}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
            <span className={`absolute text-2xl font-bold tabular-nums ${color.text}`}>
              {display}%
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Availability Score</p>
            <h2 className="mt-1 text-2xl font-bold text-primary">{label}</h2>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:ml-auto">
          {[
            { label: "App Store" },
            { label: "Play Store" },
            { label: "Domains" },
            { label: "GitHub" },
            { label: "npm" },
            { label: "Bundle IDs" },
          ].map((item) => (
            <span key={item.label} className="rounded-full border border-border px-3 py-1 text-xs font-medium text-secondary">
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
