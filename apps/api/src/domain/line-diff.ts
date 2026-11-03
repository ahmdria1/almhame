export interface DiffRow {
  kind: "same" | "add" | "del";
  text: string;
}

export function lineDiff(before: string, after: string): DiffRow[] {
  const left = before.split("\n");
  const right = after.split("\n");
  const rows: DiffRow[] = [];
  const max = Math.max(left.length, right.length);
  for (let index = 0; index < max; index += 1) {
    const a = left[index];
    const b = right[index];
    if (a === b && a !== undefined) rows.push({ kind: "same", text: a });
    else {
      if (a !== undefined) rows.push({ kind: "del", text: a });
      if (b !== undefined) rows.push({ kind: "add", text: b });
    }
  }
  return rows;
}
