"use client";

import { animate, motion } from "framer-motion";
import { useEffect, useState } from "react";

interface ScoreCardProps {
  score: number;
  label: string;
}

export function ScoreCard({ score, label }: ScoreCardProps) {
  const [display, setDisplay] = useState(0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  useEffect(() => {
    const controls = animate(0, score, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (value) => setDisplay(Math.round(value)),
    });

    return () => controls.stop();
  }, [score]);

  return (
    <div className="col-span-12 flex flex-col gap-6 rounded-3xl border border-border bg-white px-8 py-10 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.25)]">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-secondary">
          Availability Score
        </p>
        <h2 className="text-xl font-semibold text-primary">{label}</h2>
      </div>
      <div className="flex flex-wrap items-center gap-8">
        <div className="relative flex h-32 w-32 items-center justify-center">
          <svg className="h-32 w-32 -rotate-90">
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="transparent"
              stroke="#E5E7EB"
              strokeWidth="10"
            />
            <motion.circle
              cx="64"
              cy="64"
              r={radius}
              fill="transparent"
              stroke="#111827"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </svg>
          <span className="absolute text-3xl font-semibold text-primary">
            {display}%
          </span>
        </div>
        <div className="flex flex-col gap-2 text-sm text-secondary">
          <p>
            Based on App Store, Play Store, domain, bundle ID, and GitHub
            availability.
          </p>
          <p className="text-xs uppercase tracking-[0.2em] text-secondary">
            Fast, parallel verification
          </p>
        </div>
      </div>
    </div>
  );
}
