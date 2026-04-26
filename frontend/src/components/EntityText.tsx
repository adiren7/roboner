import { forwardRef, useMemo } from "react";
import type { NerEntity } from "../api/client";
import { colorsForLabel } from "../lib/labelColors";

type Seg =
  | { kind: "text"; str: string }
  | { kind: "ent"; entity: NerEntity };

function buildSegments(text: string, entities: NerEntity[]): Seg[] {
  const sorted = [...entities].sort((a, b) => a.start - b.start);
  const segs: Seg[] = [];
  let i = 0;
  for (const e of sorted) {
    if (e.start > i) segs.push({ kind: "text", str: text.slice(i, e.start) });
    if (e.end > e.start) {
      segs.push({ kind: "ent", entity: e });
    }
    i = Math.max(i, e.end);
  }
  if (i < text.length) segs.push({ kind: "text", str: text.slice(i) });
  return segs;
}

export type EntityTextProps = {
  text: string;
  entities: NerEntity[];
  onEntityClick: (e: NerEntity) => void;
  selectedEntityId: string | null;
  hideLabels?: boolean;
};

export const EntityText = forwardRef<HTMLDivElement, EntityTextProps>(function EntityText(
  { text, entities, onEntityClick, selectedEntityId, hideLabels },
  ref
) {
  const segs = useMemo(() => buildSegments(text, entities), [text, entities]);

  return (
    <div ref={ref} className={`entity-text ${hideLabels ? "hide-labels" : ""}`}>
      {segs.map((s, idx) => {
        if (s.kind === "text") {
          return <span key={idx}>{s.str}</span>;
        }
        const { entity } = s;
        const c = colorsForLabel(entity.label);
        const display = text.slice(entity.start, entity.end);
        const isSelected = selectedEntityId === entity.id;

        return (
          <span
            key={entity.id}
            data-label={entity.label}
            className="entity-chip"
            style={{
              background: hideLabels ? "transparent" : (isSelected ? "var(--accent-glow)" : c.bg),
              color: hideLabels ? "var(--text)" : "#ffffff",
              borderColor: hideLabels ? "transparent" : (isSelected ? "var(--accent)" : c.border),
              boxShadow: (isSelected && !hideLabels) ? `0 0 15px var(--accent-glow)` : "none",
              "--chip-base": c.base 
            } as any}
            onClick={(e) => { e.stopPropagation(); onEntityClick(entity); }}
          >
            {display}
          </span>
        );
      })}
    </div>
  );
});
