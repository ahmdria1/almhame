export function composerKeyAction(key: string, shift: boolean, composing: boolean): "send" | "newline" | "none" {
  if (key !== "Enter" || composing) return "none";
  if (shift) return "newline";
  return "send";
}

export function composerBox(scrollHeight: number, minLines: number, maxLines: number, linePx: number, padPx: number): { height: number; scroll: boolean } {
  const min = minLines * linePx + padPx;
  const max = maxLines * linePx + padPx;
  const height = Math.max(min, Math.min(max, scrollHeight || min));
  return { height, scroll: scrollHeight > max };
}
