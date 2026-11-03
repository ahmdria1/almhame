export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-ink-100 dark:bg-white/10 ${className}`} />;
}
