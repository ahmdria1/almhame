export function halalasToAmount(halalas: number): string {
  const sign = halalas < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(halalas));
  const major = Math.trunc(abs / 100);
  const minor = abs % 100;
  if (minor === 0) return `${sign}${major}`;
  return `${sign}${major}.${String(minor).padStart(2, "0")}`;
}
