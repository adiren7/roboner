import type { NerEntity } from "../api/client";

export function hasOverlap(
  start: number,
  end: number,
  entities: Pick<NerEntity, "id" | "start" | "end">[],
  exceptId?: string
): boolean {
  const sorted = [...entities]
    .filter((e) => e.id !== exceptId)
    .map((e) => ({ s: e.start, e: e.end }))
    .sort((a, b) => a.s - b.s);
  for (let i = 0; i < sorted.length; i++) {
    if (end <= sorted[i].s) break;
    if (start < sorted[i].e && end > sorted[i].s) return true;
  }
  return false;
}

export function validateNoOverlap(entities: Pick<NerEntity, "start" | "end">[]): boolean {
  const sorted = [...entities].sort((a, b) => a.start - b.start);
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].end > sorted[i + 1].start) return false;
  }
  return true;
}
