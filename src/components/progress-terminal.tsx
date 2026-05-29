"use client";

import { clsx } from "clsx";

export type ProgressStatus = "checking" | "complete" | "error";

interface ProgressStep {
  key: string;
  label: string;
  status: ProgressStatus;
}

function LoadingDots() {
  return (
    <span className="ml-1 inline-flex items-center gap-1">
      {Array.from({ length: 3 }).map((_, index) => (
        <span
          key={index}
          className="dot inline-block h-1 w-1 rounded-full bg-secondary"
          style={{ animationDelay: `${index * 0.2}s` }}
        />
      ))}
    </span>
  );
}

export function ProgressTerminal({ steps }: { steps: ProgressStep[] }) {
  return (
    <div className="col-span-12 rounded-2xl border border-border bg-white/80 px-6 py-5 font-mono text-xs text-secondary shadow-[0_12px_40px_-32px_rgba(15,23,42,0.3)]">
      <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-secondary">
        Live checks
      </div>
      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.key} className="flex items-center gap-2">
            <span
              className={clsx(
                "text-[10px]",
                step.status === "complete" && "text-success",
                step.status === "error" && "text-error",
              )}
            >
              {step.status === "complete"
                ? "✓"
                : step.status === "error"
                  ? "✕"
                  : ">"}
            </span>
            <span className="text-primary">Checking {step.label}</span>
            {step.status === "checking" && <LoadingDots />}
            {step.status === "complete" && (
              <span className="text-success">Complete</span>
            )}
            {step.status === "error" && (
              <span className="text-error">Error</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
