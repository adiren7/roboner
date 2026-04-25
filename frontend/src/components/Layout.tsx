import type { Project } from "../api/client";

type Props = {
  children: React.ReactNode;
  project: Project | null;
  projectDisplayName?: string;
  variant?: "default" | "hub" | "annotate";
  phaseLabel?: string;
  onGoHub?: () => void;
};

export function Layout({
  children,
  onGoHub,
}: Props) {
  return (
    <div className="app-container">
      <aside className="sidebar-nav">
        <div className="brand-logo" style={{ fontSize: "1.5rem", marginBottom: "2rem" }}>📌</div>
        <div className="nav-icon active" onClick={onGoHub} title="Projects">
          🏠
        </div>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
