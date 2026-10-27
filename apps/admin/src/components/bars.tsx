const COURTS: Record<string, string> = {
  general: "العامة",
  criminal: "الجزائية",
  personal_status: "الأحوال",
  labor: "العمالية",
  commercial: "التجارية",
  enforcement: "التنفيذ",
  administrative: "المظالم",
  appeal: "الاستئناف",
  supreme: "العليا",
};

export function CourtBars({ rows }: { rows: Record<string, number> }) {
  const max = Math.max(1, ...Object.values(rows));
  const entries = Object.keys(COURTS).map((key) => [COURTS[key], rows[key] || 0] as const);
  return (
    <div className="mt-3 grid gap-2">
      {entries.map(([label, count]) => (
        <div key={label} className="grid grid-cols-[88px_1fr_32px] items-center gap-2 text-sm">
          <span>{label}</span>
          <div className="h-3 rounded-full bg-ink-100">
            <div className="h-3 rounded-full bg-teal-600" style={{ width: `${(count / max) * 100}%` }} />
          </div>
          <span>{count}</span>
        </div>
      ))}
    </div>
  );
}
