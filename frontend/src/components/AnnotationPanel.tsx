import { useRef, useState, useEffect } from "react";
import {
  addEntity,
  deleteEntity,
  patchDocValidated,
  patchLabel,
  patchSpan,
  addProjectLabel,
  updateProjectLabels,
  postValidateAll,
  type Doc,
  type NerEntity,
  type LabelHierarchy,
  type Project,
} from "../api/client";
import { getSelectionOffsets } from "../lib/nerOffsets";
import { hasOverlap } from "../lib/overlap";
import { EntityText } from "./EntityText";

type Props = {
  projectId: string;
  project: Project;
  onProjectChange: (p: Project) => void;
  doc: Doc;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onDocChange: (next: Doc) => void;
};

function flattenLabels(hierarchy: LabelHierarchy): string[] {
  let result: string[] = [];
  for (const [key, value] of Object.entries(hierarchy)) {
    result.push(key);
    result = result.concat(flattenLabels(value));
  }
  return Array.from(new Set(result));
}

export function AnnotationPanel({
  projectId,
  project,
  onProjectChange,
  doc,
  index,
  total,
  onPrev,
  onNext,
  onDocChange,
}: Props) {
  const textRef = useRef<HTMLDivElement>(null);
  const [selectedEntity, setSelectedEntity] = useState<NerEntity | null>(null);
  const [addRange, setAddRange] = useState<{ start: number; end: number; x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [newLabelName, setNewLabelName] = useState("");
  const [editSpanMode, setEditSpanMode] = useState(false);
  const [changeLabelMenu, setChangeLabelMenu] = useState<{ entity: NerEntity; x: number; y: number } | null>(null);

  const flatLabels = flattenLabels(project.labels);

  const handleMouseUp = (e: React.MouseEvent) => {
    if (editSpanMode) return;
    const el = textRef.current;
    if (!el) return;
    
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      
      const off = getSelectionOffsets(el, doc.text);
      if (!off || off.end <= off.start) return;

      setAddRange({ start: off.start, end: off.end, x: e.clientX, y: e.clientY });
      setChangeLabelMenu(null); // Fix: Clear label change menu if selecting new
    }, 50);
  };

  const handleAddEntity = async (label: string) => {
    if (!addRange) return;
    if (hasOverlap(addRange.start, addRange.end, doc.entities)) {
      alert("This span overlaps with an existing entity. Please select a clear range.");
      setAddRange(null);
      return;
    }
    try {
      const upperLabel = label.toUpperCase();
      if (!flatLabels.includes(upperLabel)) {
        const updatedProject = await addProjectLabel(projectId, upperLabel);
        onProjectChange(updatedProject);
      }
      const created = await addEntity(projectId, doc.id, {
        start: addRange.start,
        end: addRange.end,
        label: upperLabel,
      });
      onDocChange({
        ...doc,
        entities: [...doc.entities, created].sort((a, b) => a.start - b.start),
        validated: false,
      });
      setAddRange(null);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleValidate = async () => {
    try {
      const r = await patchDocValidated(projectId, doc.id, !doc.validated);
      onDocChange({ ...doc, validated: r.validated });
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleValidateAll = async () => {
    if (!window.confirm("Validate all documents in this project?")) return;
    try {
      await postValidateAll(projectId);
      onDocChange({ ...doc, validated: true });
      alert("All documents have been validated.");
    } catch (e: any) {
      alert(e.message);
    }
  };

  const onDragStart = (e: React.DragEvent, label: string) => {
    e.dataTransfer.setData("label", label);
    setIsDragging(label);
  };

  const onDrop = async (e: React.DragEvent, targetParent: string | null) => {
    e.preventDefault();
    setIsDragging(null);
    const draggedLabel = e.dataTransfer.getData("label");
    if (!draggedLabel || draggedLabel === targetParent) return;

    const newHierarchy = JSON.parse(JSON.stringify(project.labels));
    
    function removeNode(h: LabelHierarchy, target: string): LabelHierarchy | null {
      if (h[target]) {
        const node = h[target];
        delete h[target];
        return node;
      }
      for (const key in h) {
        const found = removeNode(h[key], target);
        if (found) return found;
      }
      return null;
    }

    function addNode(h: LabelHierarchy, target: string, node: LabelHierarchy): boolean {
      if (target in h) {
        h[target][draggedLabel] = node;
        return true;
      }
      for (const key in h) {
        if (addNode(h[key], target, node)) return true;
      }
      return false;
    }

    const nodeToMove = removeNode(newHierarchy, draggedLabel);
    if (!nodeToMove) return;

    if (targetParent === null) newHierarchy[draggedLabel] = nodeToMove;
    else addNode(newHierarchy, targetParent, nodeToMove);

    try {
      const updated = await updateProjectLabels(projectId, newHierarchy);
      onProjectChange(updated);
    } catch (e: any) {
      alert(e.message);
    }
  };

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Close if clicking outside menus and outside the interactive entity chips
      if (!target.closest(".floating-menu") && !target.closest(".entity-chip")) {
        setAddRange(null);
        setChangeLabelMenu(null);
      }
    };
    
    // Use mousedown to trigger before selection might change
    document.addEventListener("mousedown", handleGlobalClick);
    return () => document.removeEventListener("mousedown", handleGlobalClick);
  }, []);

  const handleSpanChange = async () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !selectedEntity || !textRef.current) return;
    const off = getSelectionOffsets(textRef.current, doc.text);
    if (!off) return;
    if (hasOverlap(off.start, off.end, doc.entities, selectedEntity.id)) {
        alert("New span overlaps with existing entity");
        return;
    }
    try {
      const updated = await patchSpan(projectId, doc.id, selectedEntity.id, off.start, off.end);
      onDocChange({
        ...doc,
        entities: doc.entities.map(e => e.id === selectedEntity.id ? updated : e).sort((a, b) => a.start - b.start)
      });
      setSelectedEntity(updated);
      setEditSpanMode(false);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const renderLabelTree = (h: LabelHierarchy, depth = 0) => {
    return Object.entries(h).map(([label, children]) => (
      <div key={label} style={{ marginLeft: depth * 12 }}>
        <div 
          draggable 
          onDragStart={(e) => onDragStart(e, label)}
          onDragOver={(e) => { 
            e.preventDefault(); 
            e.stopPropagation(); // Focus on THIS label zone
            if (isDragging !== label) setDropTarget(label); 
          }}
          onDragLeave={() => setDropTarget(null)}
          onDrop={(e) => { 
            e.stopPropagation(); // STRICT: Don't trigger parent or root drop
            setDropTarget(null); 
            onDrop(e, label); 
          }}
          className={`label-tree-item ${dropTarget === label ? "drop-active" : ""}`}
          onClick={() => {
            if (addRange) handleAddEntity(label);
            else if (selectedEntity) handleLabelChange(label);
          }}
        >
          <span style={{ color: "var(--accent)" }}>•</span>
          <span style={{ flex: 1, fontWeight: 700 }}>{label}</span>
          <span style={{ fontSize: "0.7rem", opacity: 0.5 }}>
            {doc.entities.filter(e => e.label === label).length}
          </span>
        </div>
        {renderLabelTree(children, depth + 1)}
      </div>
    ));
  };

  const handleLabelChange = async (label: string) => {
    const target = selectedEntity || changeLabelMenu?.entity;
    if (!target) return;
    try {
      const updated = await patchLabel(projectId, doc.id, target.id, label);
      onDocChange({
        ...doc,
        entities: doc.entities.map(e => e.id === target.id ? updated : e)
      });
      if (selectedEntity) setSelectedEntity(updated);
      setChangeLabelMenu(null);
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="workspace-wrapper fade-in">
      <div className="canvas-area" onMouseUp={handleMouseUp}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: "3rem",
          padding: "2rem 3rem",
          background: "rgba(22, 27, 34, 0.4)",
          backdropFilter: "blur(10px)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
        }}>
          <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
            <button className="btn-outline" style={{ padding: "0.8rem", width: "48px", justifyContent: "center" }} onClick={onPrev} disabled={index === 0}>←</button>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>Progress</span>
                <span style={{ fontWeight: 900, fontSize: "1.4rem", color: "var(--accent)" }}>{index + 1} <span style={{ color: "var(--text-dim)", fontSize: "1rem", fontWeight: 400 }}>/ {total}</span></span>
            </div>
            <button className="btn-outline" style={{ padding: "0.8rem", width: "48px", justifyContent: "center" }} onClick={onNext} disabled={index === total - 1}>→</button>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
             <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>Benchmarking Project</span>
             <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "1.1rem", fontWeight: 700 }}>
                <span style={{ color: "#fff" }}>{project.name}</span>
                <span style={{ height: "4px", width: "4px", borderRadius: "50%", background: "var(--border)" }} />
                <span style={{ color: "var(--accent)" }}>{project.model}</span>
             </div>
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            {index === total - 1 && (
              <button 
                className="btn-outline" 
                style={{ color: "var(--success)", borderColor: "var(--success)" }}
                onClick={handleValidateAll}
              >
                Validate All
              </button>
            )}
            <button 
                className={doc.validated ? "btn-outline" : "btn-premium"} 
                style={{ 
                  minWidth: "180px", 
                  background: doc.validated ? "var(--success)" : "", 
                  border: doc.validated ? "none" : "",
                  justifyContent: "center",
                  padding: "0.8rem 1.5rem"
                }}
                onClick={handleValidate}
            >
              {doc.validated ? "✓ Document Verified" : "Verify Document"}
            </button>
          </div>
        </div>

        <div className="glass-card" style={{ flex: 1, minHeight: "400px", position: "relative" }}>
          <EntityText 
            ref={textRef}
            text={doc.text} 
            entities={doc.entities} 
            onEntityClick={(e) => {
              const event = window.event as MouseEvent;
              setChangeLabelMenu({ 
                entity: e, 
                x: event.clientX, 
                y: event.clientY 
              });
              setSelectedEntity(e);
              setAddRange(null); 
            }}
            selectedEntityId={selectedEntity?.id || null}
            hideLabels={editSpanMode}
          />
        </div>
      </div>

      {/* Floating Menus moved to root for reliable fixed positioning */}
      {addRange && (
        <div className="floating-menu" style={{ left: addRange.x, top: addRange.y }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 800, marginBottom: "0.5rem", color: "var(--accent)" }}>Assign Category</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", maxHeight: "200px", overflowY: "auto", paddingRight: "4px" }}>
            {flatLabels.map(l => (
              <button 
                key={l} 
                className="btn-outline" 
                style={{ padding: "0.5rem", fontSize: "0.75rem", justifyContent: "center" }} 
                onMouseDown={(e) => e.preventDefault()} 
                onClick={() => handleAddEntity(l)}
              >
                {l}
              </button>
            ))}
          </div>
          <button className="btn-outline" style={{ width: "100%", marginTop: "0.75rem", fontSize: "0.7rem", justifyContent: "center", borderColor: "transparent" }} onClick={() => setAddRange(null)}>Cancel</button>
        </div>
      )}

      {changeLabelMenu && (
        <div className="floating-menu" style={{ left: changeLabelMenu.x, top: changeLabelMenu.y }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 800, marginBottom: "0.5rem", color: "var(--accent)" }}>Change label</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", maxHeight: "200px", overflowY: "auto", paddingRight: "4px" }}>
            {flatLabels.map(l => (
              <button key={l} className="btn-outline" style={{ padding: "0.5rem", fontSize: "0.75rem", justifyContent: "center", background: changeLabelMenu.entity.label === l ? "var(--accent-glow)" : "" }} onClick={() => handleLabelChange(l)}>{l}</button>
            ))}
          </div>
          <button className="btn-outline" style={{ width: "100%", marginTop: "0.75rem", fontSize: "0.7rem", justifyContent: "center", borderColor: "transparent" }} onClick={() => setChangeLabelMenu(null)}>Close</button>
        </div>
      )}

      <aside 
        className="right-panel"
        onDragOver={(e) => { e.preventDefault(); setDropTarget("root"); }}
        onDrop={(e) => { setDropTarget(null); onDrop(e, null); }}
      >
        {selectedEntity ? (
          <div 
            style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem", height: "100%" }}
            onDragOver={e => e.stopPropagation()} // Prevent triggering root drop when in inspector
          >
            <header>
              <h3 style={{ color: "var(--accent)", fontSize: "1.1rem" }}>Entity Inspector</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: "0.25rem" }}>Modify span or change category.</p>
            </header>
            
            <div style={{ background: "var(--panel-light)", padding: "1.25rem", borderRadius: 12, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>TEXT CONTENT</div>
              <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#fff" }}>"{doc.text.slice(selectedEntity.start, selectedEntity.end)}"</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {!editSpanMode ? (
                <button className="btn-premium" style={{ width: "100%", justifyContent: "center" }} onClick={() => setEditSpanMode(true)}>↔ Change Span</button>
              ) : (
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button className="btn-premium" style={{ flex: 1, justifyContent: "center" }} onClick={handleSpanChange}>Apply</button>
                  <button className="btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={() => setEditSpanMode(false)}>Cancel</button>
                </div>
              )}
              <button className="btn-outline" style={{ width: "100%", justifyContent: "center", color: "var(--danger)", borderColor: "var(--danger)" }} onClick={async () => {
                if(window.confirm("Delete entity?")) {
                  await deleteEntity(projectId, doc.id, selectedEntity.id);
                  onDocChange({...doc, entities: doc.entities.filter(e => e.id !== selectedEntity.id)});
                  setSelectedEntity(null);
                }
              }}>🗑 Delete Entity</button>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: "1rem", fontWeight: 800, textTransform: "uppercase" }}>HIERARCHY CATEGORIES</div>
              <div style={{ overflowY: "auto", flex: 1, paddingRight: "0.5rem" }}>
                {renderLabelTree(project.labels)}
              </div>
            </div>

            <button className="btn-outline" style={{ width: "100%", justifyContent: "center" }} onClick={() => setSelectedEntity(null)}>Back to Overview</button>
          </div>
        ) : (
          <div style={{ padding: "2.5rem", display: "flex", flexDirection: "column", gap: "2.5rem", height: "100%" }}>
             <header>
              <h3 style={{ fontSize: "1.2rem" }}>Label Hierarchy</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-dim)", marginTop: "0.5rem" }}>Drag labels onto each other to nest, or to the panel background for root level.</p>
            </header>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <input 
                className="form-input" 
                placeholder="New Label..." 
                value={newLabelName} 
                onChange={e => setNewLabelName(e.target.value)} 
                onKeyDown={e => { if(e.key === "Enter") { /* trigger add */ }}}
              />
              <button className="btn-premium" style={{ padding: "0 1.25rem" }} onClick={async () => {
                if(!newLabelName.trim()) return;
                const updated = await addProjectLabel(projectId, newLabelName.toUpperCase());
                onProjectChange(updated);
                setNewLabelName("");
              }}>+</button>
            </div>

            <div 
              style={{ 
                border: dropTarget === "root" ? "2px solid var(--accent)" : "1px dashed var(--border)",
                padding: "1.5rem",
                borderRadius: 16,
                flex: 1,
                background: dropTarget === "root" ? "var(--accent-glow)" : "rgba(255,255,255,0.02)",
                transition: "all 0.3s ease",
                overflowY: "auto"
              }}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDropTarget("root"); }}
              onDrop={e => { e.stopPropagation(); setDropTarget(null); onDrop(e, null); }}
            >
               <div style={{ fontSize: "0.65rem", textAlign: "center", color: "var(--text-dim)", marginBottom: "1.5rem", fontWeight: 800, letterSpacing: "0.1em" }}>
                 {dropTarget === "root" ? "RELEASE TO MOVE TO ROOT" : "ROOT LEVEL"}
               </div>
               <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {renderLabelTree(project.labels)}
               </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
