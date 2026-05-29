export function SkeletonCard({ height = "h-40" }: { height?: string }) {
  return (
    <div
      className={`skeleton ${height} col-span-12 rounded-2xl border border-border/70`}
    />
  );
}
