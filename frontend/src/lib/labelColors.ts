const palette = [
  "#6d28d9",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#22c55e",
];



function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function colorsForLabel(label: string): { base: string; bg: string; fg: string; border: string } {
  const idx = hash(label) % palette.length;
  const base = palette[idx];
  return {
    base,
    bg: base + "26", // 15% opacity
    fg: "#ffffff",
    border: base + "4d", // 30% opacity
  };
}
