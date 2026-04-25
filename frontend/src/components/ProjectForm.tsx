import { useState } from "react";
import { createProjectWithFile, type Project } from "../api/client";

type Props = {
  onCreated: (p: Project) => void;
  onCancel?: () => void;
};

export function ProjectForm({ onCreated, onCancel }: Props) {
  const [name, setName] = useState("");
  const [model, setModel] = useState("en_core_web_sm");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErr("Please select a valid dataset file (CSV/XLSX).");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const p = await createProjectWithFile(name, model, file);
      onCreated(p);
    } catch (e: any) {
      const msg = e.message || "Failed to create project.";
      setErr(`${msg} Please ensure the model name is correct (e.g. 'en_core_web_sm'). You can find valid model names at https://spacy.io/models`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div>
        <h2 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>New Benchmark</h2>
        <p style={{ color: "var(--text-dim)" }}>Initialize your NER pipeline with a custom dataset.</p>
      </div>

      {err && <div className="error-box">{err}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Project Identity</label>
        <input
          className="form-input"
          placeholder="e.g. Clinical NER v1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>SpaCy Model Architecture</label>
        <input
          className="form-input"
          placeholder="e.g. en_core_web_trf"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          required
        />
        <p style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Enter the full name of the spaCy model to download and use for inference.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Dataset Upload (CSV/XLSX)</label>
        <div style={{ 
          background: "rgba(255,255,255,0.02)", 
          padding: "2rem", 
          borderRadius: "var(--radius-md)", 
          border: "2px dashed var(--border)",
          textAlign: "center",
          position: "relative"
        }}>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ 
              position: "absolute",
              inset: 0,
              opacity: 0,
              cursor: "pointer"
            }}
            required
          />
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{file ? "📄" : "📤"}</div>
          <div style={{ fontWeight: 600 }}>{file ? file.name : "Click or drag to upload"}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.5rem" }}>Must include a 'texts' column for NER processing.</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
        <button type="submit" className="btn-premium" style={{ flex: 2, justifyContent: "center" }} disabled={busy}>
          {busy ? "Deploying Pipeline..." : "Initialize Project"}
        </button>
        {onCancel && (
          <button type="button" className="btn-outline" onClick={onCancel} disabled={busy} style={{ flex: 1, justifyContent: "center" }}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
