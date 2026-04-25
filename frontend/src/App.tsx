import { useState } from "react";
import type { Doc, Project, ProjectListItem } from "./api/client";
import { getProjectDocs } from "./api/client";
import { AnnotationPanel } from "./components/AnnotationPanel";
import { Layout } from "./components/Layout";
import { ProjectsHub } from "./components/ProjectsHub";
import { firstUnvalidatedIndex } from "./lib/resume";

type AppView = "hub" | "annotate";

export default function App() {
  const [appView, setAppView] = useState<AppView>("hub");
  const [project, setProject] = useState<Project | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [docIndex, setDocIndex] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const goHub = () => {
    setAppView("hub");
    setProject(null);
    setDocs([]);
    setLoadError(null);
  };

  const handleOpenProject = async (p: ProjectListItem | Project) => {
    setLoadError(null);
    try {
      const d = await getProjectDocs(p.id);
      // ProjectListItem is compatible enough with Project for initial load
      setProject(p as Project);
      setDocs(d);
      setDocIndex(firstUnvalidatedIndex(d));
      setAppView("annotate");
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Could not load project documents");
    }
  };

  return (
    <Layout
      project={project}
      onGoHub={goHub}
    >
      {loadError && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 10000 }} className="error-box fade-in">
          {loadError}
          <button onClick={() => setLoadError(null)} style={{ marginLeft: "1rem", background: "none", border: "none", color: "white", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {appView === "hub" && (
        <ProjectsHub onOpenProject={handleOpenProject} />
      )}

      {appView === "annotate" && project && docs.length > 0 && (
        <AnnotationPanel
          projectId={project.id}
          project={project}
          onProjectChange={setProject}
          doc={docs[docIndex]!}
          index={docIndex}
          total={docs.length}
          onPrev={() => setDocIndex((i) => Math.max(0, i - 1))}
          onNext={() => setDocIndex((i) => Math.min(docs.length - 1, i + 1))}
          onDocChange={(next) => {
            setDocs((prev) => prev.map((d) => (d.id === next.id ? next : d)));
          }}
        />
      )}

      {appView === "annotate" && project && docs.length === 0 && (
        <div className="glass-card" style={{ textAlign: "center", padding: "4rem" }}>
          <h2>No documents found</h2>
          <p style={{ color: "var(--text-dim)" }}>This project appears to be empty.</p>
          <button className="btn-outline" style={{ marginTop: "1rem" }} onClick={goHub}>Back to Hub</button>
        </div>
      )}
    </Layout>
  );
}
