import type { Doc } from "../api/client";

/** Index of the first non-validated document, or 0 if all are validated (or empty). */
export function firstUnvalidatedIndex(docs: Doc[]): number {
  if (docs.length === 0) return 0;
  const i = docs.findIndex((d) => !d.validated);
  return i === -1 ? 0 : i;
}
