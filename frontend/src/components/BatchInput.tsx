import { useState } from "react";
import { runBatch, type Doc } from "../api/client";

type Props = {
  projectId: string;
  onBatchDone: (docs: Doc[]) => void;
  /** When true, the card is nested (e.g. under details) and uses tighter top margin. */
  embedded?: boolean;
};

export function BatchInput({ projectId, onBatchDone, embedded = false }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function predict(e: React.FormEvent) {
    e.preventDefault();
    const lines = text
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setErr("Please enter at least one non-empty line of text.");
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      const docs = await runBatch(projectId, lines);
      onBatchDone(docs);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Inference failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={embedded ? "" : "card"} style={{ marginTop: embedded ? 0 : "2rem", maxWidth: embedded ? "100%" : "800px", margin: embedded ? "0" : "2rem auto" }}>
      {!embedded && <h2 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.025em" }}>Texts to Predict</h2>}
      
      <div style={{ background: "var(--warning-light)", color: "var(--warning)", padding: "1rem", borderRadius: 8, fontSize: "0.875rem", fontWeight: 500, marginBottom: "1.5rem", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
        <span style={{ fontWeight: 700 }}>⚠️ Warning:</span> Each prediction run replaces all existing documents for this project.
      </div>

      <form onSubmit={predict} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label htmlFor="batch" style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
            Input Texts (One per line)
          </label>
          <textarea
            id="batch"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="Enter your texts here, one per line..."
            style={{ width: "100%", resize: "vertical", padding: "1rem", minHeight: "200px" }}
          />
        </div>

        {err && <div className="error-box" style={{ fontSize: "0.875rem" }}>{err}</div>}

        <div>
          <button type="submit" className="btn-primary" style={{ padding: "0.875rem 2rem" }} disabled={loading || !text.trim()}>
            {loading ? "Processing Batch..." : "Run Predictions"}
          </button>
        </div>
      </form>
    </div>
  );
}
