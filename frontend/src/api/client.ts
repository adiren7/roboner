const base = import.meta.env.VITE_API_BASE ?? "/api";

async function j<T>(res: Response | Promise<Response>): Promise<T> {
  const r = await res;
  if (!r.ok) {
    const text = await r.text();
    let detail: string = text;
    try {
      const j = JSON.parse(text) as { detail?: string | { msg?: string }[] };
      if (typeof j.detail === "string") detail = j.detail;
      else if (Array.isArray(j.detail)) detail = j.detail.map((d) => d.msg ?? String(d)).join(", ");
    } catch {
      /* keep text */
    }
    throw new Error(detail || r.statusText);
  }
  return r.json() as Promise<T>;
}

export type ModelConfig = {
  lang: string;
  type: string;
  genre: string;
  size: string;
};

export type LabelHierarchy = { [key: string]: LabelHierarchy };

export type Project = {
  id: string;
  name: string;
  model: string;
  labels: LabelHierarchy;
};

export type CreateProjectRequest = ModelConfig & { name: string };

export type ProjectListItem = {
  id: string;
  name: string;
  model: string;
  labels: LabelHierarchy;
  doc_count: number;
  validated_count: number;
  all_validated: boolean;
  validation_percent: number;
};

export type NerEntity = {
  id: string;
  start: number;
  end: number;
  label: string;
  source: string;
  confidence: number | null;
};

export type Doc = {
  id: string;
  text: string;
  entities: NerEntity[];
  validated: boolean;
};

export function createProject(body: CreateProjectRequest): Promise<Project> {
  return j(
    fetch(`${base}/projects/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

export function listProjects(): Promise<ProjectListItem[]> {
  return j(fetch(`${base}/projects/`));
}

export function getProjectConfig(projectId: string): Promise<Project> {
  return j(fetch(`${base}/projects/${encodeURIComponent(projectId)}/config`));
}

export function postValidateAll(projectId: string): Promise<{ status: string; count: number }> {
  return j(
    fetch(`${base}/annotation/${encodeURIComponent(projectId)}/validate-all`, { method: "POST" })
  );
}

export function runBatch(projectId: string, texts: string[]): Promise<Doc[]> {
  return j(
    fetch(`${base}/inference/${encodeURIComponent(projectId)}/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(texts),
    })
  );
}

export function patchLabel(
  projectId: string,
  docId: string,
  entityId: string,
  label: string
): Promise<NerEntity> {
  return j(
    fetch(
      `${base}/annotation/${encodeURIComponent(projectId)}/${encodeURIComponent(docId)}/${encodeURIComponent(entityId)}/label`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      }
    )
  );
}

export function patchSpan(
  projectId: string,
  docId: string,
  entityId: string,
  start: number,
  end: number
): Promise<NerEntity> {
  return j(
    fetch(
      `${base}/annotation/${encodeURIComponent(projectId)}/${encodeURIComponent(docId)}/${encodeURIComponent(entityId)}/span`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start, end }),
      }
    )
  );
}

export function deleteEntity(
  projectId: string,
  docId: string,
  entityId: string
): Promise<{ status: string }> {
  return j(
    fetch(
      `${base}/annotation/${encodeURIComponent(projectId)}/${encodeURIComponent(docId)}/${encodeURIComponent(entityId)}`,
      { method: "DELETE" }
    )
  );
}

export function addEntity(
  projectId: string,
  docId: string,
  body: { start: number; end: number; label: string }
): Promise<NerEntity> {
  return j(
    fetch(
      `${base}/annotation/${encodeURIComponent(projectId)}/${encodeURIComponent(docId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    )
  );
}

export function patchDocValidated(
  projectId: string,
  docId: string,
  validated: boolean
): Promise<{ status: string; validated: boolean }> {
  return j(
    fetch(
      `${base}/annotation/${encodeURIComponent(projectId)}/${encodeURIComponent(docId)}/validated`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ validated }),
      }
    )
  );
}

export function getProjectDocs(projectId: string): Promise<Doc[]> {
  return j(
    fetch(`${base}/projects/${encodeURIComponent(projectId)}/docs`)
  );
}

export function addProjectLabel(projectId: string, label: string, parent?: string): Promise<Project> {
  return j(
    fetch(`${base}/projects/${encodeURIComponent(projectId)}/labels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, parent }),
    })
  );
}

export function updateProjectLabels(projectId: string, labels: LabelHierarchy): Promise<Project> {
  return j(
    fetch(`${base}/projects/${encodeURIComponent(projectId)}/labels`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(labels),
    })
  );
}

export function deleteProject(projectId: string): Promise<{ status: string }> {
  return j(
    fetch(`${base}/projects/${encodeURIComponent(projectId)}`, {
      method: "DELETE",
    })
  );
}

export function renameProject(projectId: string, name: string): Promise<Project> {
  return j(
    fetch(`${base}/projects/${encodeURIComponent(projectId)}/rename`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
  );
}


export type SpacyExportItem = [string, { entities: [number, number, string][] }];

export function createProjectWithFile(name: string, model: string, file: File): Promise<Project> {
  const fd = new FormData();
  fd.append("name", name);
  fd.append("model", model);
  fd.append("file", file);
  return j(
    fetch(`${base}/projects/`, {
      method: "POST",
      body: fd,
    })
  );
}

export function exportValidated(projectId: string): Promise<SpacyExportItem[]> {
  return j(fetch(`${base}/projects/${encodeURIComponent(projectId)}/export/validated`));
}

export function exportPending(projectId: string): Promise<SpacyExportItem[]> {
  return j(fetch(`${base}/projects/${encodeURIComponent(projectId)}/export/pending`));
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

