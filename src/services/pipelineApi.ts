import type { Evidence, ProcessingStep } from "../types/orbital";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type PipelineStageId =
  | "upload"
  | "docling_parse"
  | "ocr_if_needed"
  | "metadata_extraction"
  | "section_extraction"
  | "clause_chunking"
  | "obligation_extraction"
  | "normalization";

export type PipelineStage = ProcessingStep & {
  id: PipelineStageId;
};

export type ValidationIssue = {
  id: string;
  obligationId: string;
  field: string;
  currentValue: string;
  reason: string;
  severity: "warning" | "failed";
};

export type UploadCircularOptions = {
  backend?: "groq" | "ollama";
  model?: string;
  batchSize?: number;
  runAnalysis?: boolean;
};

export type UploadCircularResponse = {
  job_id: string;
  status: "queued" | "running" | "completed" | "failed";
  filename: string;
};

export type PipelineJob = {
  job_id: string;
  status: "queued" | "running" | "completed" | "failed";
  filename: string;
  created_at: string;
  updated_at: string;
  summary: null | {
    document: string;
    pages: number;
    chunks: number;
    candidates: number;
    obligations: number;
    after_dedup: number;
    departments_affected: string[];
    graph_nodes: number;
    graph_edges: number;
    json_output: string;
    graph_output: string;
  };
  error: string | null;
};

export type DocumentSummary = {
  doc_id?: string;
  source?: string;
  title?: string;
  circular_number?: string;
  date?: string;
  effective_date?: string;
  total_pages: number;
  total_obligations: number;
  high_risk_count: number;
  validation?: unknown;
};

export type BackendValidationIssue = {
  obligation_id?: string;
  field?: string;
  current_value?: string;
  correct_value?: string;
  reason?: string;
};

export type BackendValidation = {
  missed_obligations?: string[];
  incorrect_extractions?: BackendValidationIssue[];
  missing_effective_date?: string | null;
  overall_confidence?: number;
  validation_notes?: string;
};

export type BackendObligation = {
  id?: string;
  section_id?: string;
  clause_number?: string;
  actor?: string;
  action?: string;
  obligation_type?: string;
  trigger?: string;
  deadline?: string | {
    text?: string;
    value?: string | null;
    absolute_date?: string | null;
    duration?: string | null;
    urgency?: string;
  } | null;
  effective_date?: string | null;
  domain?: string;
  departments?: string[];
  department?: string[];
  severity?: "low" | "medium" | "high" | "critical";
  severity_reason?: string;
  evidence_required?: string[];
  confidence?: number;
  notes?: string | null;
  penalty_if_missed?: string | null;
};

export type BackendMapCard = {
  id: string;
  obligationId: string;
  title: string;
  summary: string;
  sourceRegulator: string;
  circularTitle: string;
  sourceClause: string;
  assignedDepartments: string[];
  owner: string;
  severity: "low" | "medium" | "high" | "critical";
  deadline: string;
  status: string;
  evidenceRequired: string[];
  aiReasoning: string;
  validationChecklist: string[];
  actionVerb?: string;
  measurableOutcome?: string;
  acceptanceCriteria?: string[];
  evidenceValidationRules?: string[];
  ownerDepartment?: string;
  reviewerDepartment?: string;
  deadlineType?: string;
  escalationLevel?: string;
  closurePolicy?: string;
};

export type ObligationsResponse = {
  job_id: string;
  document: DocumentSummary;
  obligations: BackendObligation[];
  validation: BackendValidation;
};

export type MapCardsResponse = {
  job_id: string;
  document: DocumentSummary;
  map_cards: BackendMapCard[];
};

export type AuditEventsResponse = {
  events: unknown[];
  verified: boolean;
};

export type EvidenceValidationResponse = Evidence;

export type RegulatorFinding = {
  regulator: string;
  title: string;
  url: string;
  sourceUrl: string;
  checksum: string;
  status: "new" | "changed" | "seen";
};

export type RegulatorCheckResponse = {
  checkedAt: string;
  sourcesChecked: number;
  newCount: number;
  changedCount: number;
  findings: RegulatorFinding[];
  errors: Array<{ regulator: string; url: string; error: string }>;
};

export const intakeStages: PipelineStage[] = [
  {
    id: "upload",
    label: "Upload",
    description: "Secure document intake, checksum creation, and source capture",
    status: "pending",
  },
  {
    id: "docling_parse",
    label: "Docling Parse",
    description: "Document layout, text blocks, tables, and page structure parsed",
    status: "pending",
  },
  {
    id: "ocr_if_needed",
    label: "OCR if needed",
    description: "Scanned-page detection and fallback text extraction",
    status: "pending",
  },
  {
    id: "metadata_extraction",
    label: "Metadata Extraction",
    description: "Regulator, circular number, issue date, effective date, and authority",
    status: "pending",
  },
  {
    id: "section_extraction",
    label: "Section Extraction",
    description: "Clauses, headings, annexures, and non-obligation sections identified",
    status: "pending",
  },
  {
    id: "clause_chunking",
    label: "Clause Chunking",
    description: "Section data split into clause-level chunks for extraction",
    status: "pending",
  },
  {
    id: "obligation_extraction",
    label: "Obligation Extraction",
    description: "LLM extracts actor, action, deadline, evidence, severity, and source clause",
    status: "pending",
  },
  {
    id: "normalization",
    label: "Department Normalization",
    description: "Obligations matched against canonical departments and deduplicated",
    status: "pending",
  },
];

export function resetStages(): PipelineStage[] {
  return intakeStages.map((stage) => ({ ...stage, status: "pending" }));
}

export async function waitForMockStage(duration = 420) {
  await new Promise((resolve) => window.setTimeout(resolve, duration));
}

export async function checkApiHealth() {
  return request<{ status: string }>("/api/health");
}

export async function checkRegulators(sourceUrl = "") {
  const formData = new FormData();
  if (sourceUrl.trim()) {
    formData.append("source_url", sourceUrl.trim());
  }

  return request<RegulatorCheckResponse>("/api/regulators/check", {
    method: "POST",
    body: formData,
  });
}

export async function uploadCircular(file: File, options: UploadCircularOptions = {}) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("backend", options.backend ?? "groq");
  formData.append("model", options.model ?? "");
  formData.append("batch_size", String(options.batchSize ?? 5));
  formData.append("run_analysis", String(options.runAnalysis ?? false));

  return request<UploadCircularResponse>("/api/documents/upload", {
    method: "POST",
    body: formData,
  });
}

export async function fetchPipelineJob(jobId: string) {
  return request<PipelineJob>(`/api/jobs/${jobId}`);
}

export async function fetchDocument(jobId: string) {
  return request<unknown>(`/api/documents/${jobId}`);
}

export async function fetchObligations(jobId: string) {
  return request<ObligationsResponse>(`/api/documents/${jobId}/obligations`);
}

export async function fetchMapCards(jobId: string) {
  return request<MapCardsResponse>(`/api/documents/${jobId}/map-cards`);
}

export async function fetchGraph(jobId: string) {
  return request<unknown>(`/api/documents/${jobId}/graph`);
}

export async function fetchAuditEvents() {
  return request<AuditEventsResponse>("/api/audit/events");
}

export async function uploadEvidence(mapCardId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return request<EvidenceValidationResponse>(`/api/map-cards/${encodeURIComponent(mapCardId)}/evidence/upload`, {
    method: "POST",
    body: formData,
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.json();
      message = errorBody.detail || message;
    } catch {
      // Keep the HTTP status message when the response is not JSON.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}
