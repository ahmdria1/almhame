"use client";

export function DiffView({ before, after }: { before: string; after: string }) {
  const left = before.split("\n");
  const right = after.split("\n");
  const max = Math.max(left.length, right.length);
  const rows = [];
  for (let index = 0; index < max; index += 1) {
    if (left[index] === right[index]) continue;
    if (left[index] !== undefined) rows.push({ kind: "del", text: left[index] });
    if (right[index] !== undefined) rows.push({ kind: "add", text: right[index] });
  }
  if (!rows.length) return null;
  return (
    <ul className="mt-3 max-h-40 overflow-auto rounded-2xl border border-ink-200 p-3 text-sm dark:border-white/10">
      {rows.map((row, index) => (
        <li key={`${row.kind}-${index}`} className={row.kind === "add" ? "text-teal-700" : "text-danger line-through"}>
          {row.text || " "}
        </li>
      ))}
    </ul>
  );
}
