import { clsx } from "clsx";
import type { AvailabilityStatus } from "@/lib/types";

const styles: Record<AvailabilityStatus, string> = {
  available: "bg-emerald-50 text-emerald-700 border-emerald-200",
  taken: "bg-rose-50 text-rose-700 border-rose-200",
  partial: "bg-amber-50 text-amber-700 border-amber-200",
  error: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const labels: Record<AvailabilityStatus, string> = {
  available: "AVAILABLE",
  taken: "TAKEN",
  partial: "PARTIAL",
  error: "ERROR",
};

export function AvailabilityBadge({ status }: { status: AvailabilityStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        styles[status],
      )}
    >
      {labels[status]}
    </span>
  );
}
