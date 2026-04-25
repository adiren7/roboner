import { useEffect, useState } from "react";
import {
  listProjects,
  downloadJson,
  exportValidated,
  exportPending,
  deleteProject,
  renameProject,
  type ProjectListItem,
} from "../api/client";
import { ProjectForm } from "./ProjectForm";

type Props = {
  onOpenProject: (p: ProjectListItem) => void;
};

export function ProjectsHub({ onOpenProject }: Props) {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ProjectListItem | null>(null);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const list = await listProjects();
      setProjects(list);
    } finally {
      setLoading(false);
    }
  };

  const handleExportAnnotations = async (p: ProjectListItem) => {
    try {
      const validated = await exportValidated(p.id);
      const pending = await exportPending(p.id);
      downloadJson(`${p.name}-validated.json`, validated);
      downloadJson(`${p.name}-pending.json`, pending);
    } catch (e) {
      alert("Export failed: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleExportConfig = (p: ProjectListItem) => {
    downloadJson(`${p.name}-config.json`, {
      id: p.id,
      name: p.name,
      model: p.model,
      labels: p.labels
    });
  };

  const handleDelete = async (p: ProjectListItem) => {
    if (!window.confirm(`Are you sure you want to delete "${p.name}"? This action cannot be undone.`)) return;
    try {
      await deleteProject(p.id);
      load();
    } catch (e: any) {
      alert("Delete failed: " + e.message);
    }
  };

  const handleRename = async () => {
    if (!renameTarget || !newName.trim()) return;
    try {
      await renameProject(renameTarget.id, newName);
      setRenameTarget(null);
      setNewName("");
      load();
    } catch (e: any) {
      alert("Rename failed: " + e.message);
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <header style={{ marginBottom: "4rem" }}>
        <h1 style={{ fontSize: "3.5rem", marginBottom: "0.5rem", background: "linear-gradient(to right, #fff, #8b949e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Workspace
        </h1>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <p style={{ color: "var(--text-dim)", fontSize: "1.1rem" }}>
            Select a project to begin annotating or export your results.
          </p>
          <button className="btn-premium" onClick={() => setShowCreate(true)} style={{ fontSize: "1rem", padding: "0.8rem 2rem" }}>
            <span>+</span> New Project
          </button>
        </div>
      </header>

      {loading ? (
        <div style={{ textAlign: "center", padding: "8rem", opacity: 0.5 }}>
          <div className="spinner" style={{ marginBottom: "1rem" }}>◌</div>
          Loading projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="glass-card" style={{ textAlign: "center", padding: "6rem", borderStyle: "dashed" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📁</div>
          <h2 style={{ marginBottom: "1rem" }}>No projects found</h2>
          <p style={{ color: "var(--text-dim)", marginBottom: "2rem" }}>Get started by creating your first NER benchmark project.</p>
          <button className="btn-premium" style={{ margin: "0 auto" }} onClick={() => setShowCreate(true)}>Create Project</button>
        </div>
      ) : (
        <div className="project-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "2.5rem" }}>
          {projects.map((p) => (
            <div key={p.id} className="glass-card project-card" style={{ padding: "2rem", border: "1px solid var(--border)", background: "rgba(22, 27, 34, 0.4)" }}>
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div style={{ padding: "4px 10px", background: "rgba(124, 58, 237, 0.15)", color: "var(--accent)", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase" }}>
                    {p.model}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button 
                      className="btn-outline" 
                      style={{ padding: "0.4rem", fontSize: "1rem", borderRadius: "8px", border: "none", background: "transparent" }}
                      onClick={(e) => { e.stopPropagation(); setRenameTarget(p); setNewName(p.name); }}
                      title="Rename"
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn-outline" 
                      style={{ padding: "0.4rem", fontSize: "1rem", borderRadius: "8px", border: "none", background: "transparent", color: "var(--danger)" }}
                      onClick={(e) => { e.stopPropagation(); handleDelete(p); }}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{p.name}</h2>
                <div style={{ fontSize: "0.85rem", color: "var(--text-dim)", fontWeight: 600 }}>
                    {p.doc_count} documents
                </div>
              </div>

              <div style={{ marginBottom: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                  <span style={{ color: "var(--text-dim)" }}>Validation Progress</span>
                  <span style={{ fontWeight: 700, color: p.validation_percent === 100 ? "var(--success)" : "var(--text)" }}>{p.validation_percent}%</span>
                </div>
                <div className="progress-container" style={{ height: "10px", background: "rgba(255,255,255,0.05)", borderRadius: "99px", overflow: "hidden" }}>
                  <div className="progress-bar" style={{ 
                    width: `${p.validation_percent}%`, 
                    height: "100%",
                    transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                    background: p.validation_percent === 100 
                      ? "var(--success)" 
                      : p.validation_percent > 70 
                        ? "#10b981" 
                        : p.validation_percent > 30 
                          ? "#f59e0b" 
                          : "#ef4444" 
                  }} />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <button className="btn-premium" style={{ width: "100%", justifyContent: "center", padding: "1rem" }} onClick={() => onOpenProject(p)}>
                   Annotate ⚡
                </button>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <button className="btn-outline" style={{ justifyContent: "center" }} onClick={() => handleExportConfig(p)}>
                    Config
                  </button>
                  <button className="btn-outline" style={{ justifyContent: "center" }} onClick={() => handleExportAnnotations(p)}>
                    Export
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="glass-card" style={{ padding: "3rem" }}>
              <ProjectForm 
                onCreated={(p) => {
                  setShowCreate(false);
                  load();
                  onOpenProject({
                    ...p,
                    doc_count: 0,
                    validated_count: 0,
                    all_validated: false,
                    validation_percent: 0
                  });
                }} 
                onCancel={() => setShowCreate(false)}
              />
            </div>
          </div>
        </div>
      )}
      {renameTarget && (
        <div className="modal-backdrop" onClick={() => setRenameTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="glass-card" style={{ padding: "3rem" }}>
               <h2 style={{ marginBottom: "1.5rem" }}>Rename Project</h2>
               <input 
                  className="form-input" 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleRename()}
                  autoFocus
               />
               <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
                  <button className="btn-premium" style={{ flex: 1, justifyContent: "center" }} onClick={handleRename}>Save Name</button>
                  <button className="btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={() => setRenameTarget(null)}>Cancel</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
