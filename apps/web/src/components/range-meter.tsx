export function RangeMeter({ low, high }: { low: number; high: number }) {
  const start = Math.min(100, Math.max(0, low));
  const end = Math.min(100, Math.max(start, high));
  return (
    <div className="range-meter" dir="ltr" aria-hidden="true">
      <span style={{ marginLeft: `${start}%`, width: `${Math.max(4, end - start)}%` }} />
    </div>
  );
}