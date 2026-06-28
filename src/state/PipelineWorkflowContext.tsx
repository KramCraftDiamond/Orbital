import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { AuditEvent, Circular, Evidence, MAPCard, Obligation, Regulator, ValidationStatus } from "../types/orbital";
import { auditEvents as mockAuditEvents, circulars, evidence as mockEvidence, mapCards as mockMapCards, obligations as mockObligations } from "../data/mockData";
import {
  type BackendMapCard,
  type BackendObligation,
  type BackendValidation,
  type DocumentSummary,
  type PipelineStage,
  type PipelineStageId,
  type RegulatorFinding,
  type ValidationIssue,
  checkRegulators,
  fetchAuditEvents,
  fetchGraph,
  fetchMapCards,
  fetchObligations,
  fetchPipelineJob,
  resetStages,
  uploadCircular,
  uploadEvidence,
  waitForMockStage,
} from "../services/pipelineApi";

type WorkflowStatus =
  | "idle"
  | "file_selected"
  | "processing"
  | "intake_complete"
  | "validation_running"
  | "validation_failed"
  | "validation_passed"
  | "repair_running"
  | "map_generating"
  | "map_ready"
  | "failed";

type WorkflowDataset = "live" | "mock";

type PipelineWorkflowContextValue = {
  status: WorkflowStatus;
  dataset: WorkflowDataset;
  selectedFileName: string;
  selectedFile: File | null;
  sourceUrl: string;
  sourceVerified: boolean;
  steps: PipelineStage[];
  metadata: Circular | null;
  jobId: string;
  obligations: Obligation[];
  rawObligations: BackendObligation[];
  mapCards: MAPCard[];
  evidenceItems: Evidence[];
  auditEvents: AuditEvent[];
  auditVerified: boolean;
  regulatorFindings: RegulatorFinding[];
  graph: unknown;
  apiError: string;
  validationIssues: ValidationIssue[];
  validationScore: number;
  validationThreshold: number;
  mapCardsReady: boolean;
  suggestion: string;
  selectFile: (file: File | string) => void;
  setSourceUrl: (value: string) => void;
  verifySource: () => Promise<void>;
  startProcessing: () => Promise<void>;
  continueValidation: () => Promise<void>;
  setSuggestion: (value: string) => void;
  repairValidation: () => Promise<void>;
  createMapCards: () => Promise<void>;
  submitEvidence: (mapCardId: string, file: File) => Promise<void>;
};

const PipelineWorkflowContext = createContext<PipelineWorkflowContextValue | null>(null);

const validationThreshold = 0.85;

export function PipelineWorkflowProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<WorkflowStatus>("idle");
  const [dataset, setDataset] = useState<WorkflowDataset>("mock");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceVerified, setSourceVerified] = useState(false);
  const [steps, setSteps] = useState<PipelineStage[]>(resetStages);
  const [metadata, setMetadata] = useState<Circular | null>(null);
  const [jobId, setJobId] = useState("");
  const [obligations, setObligations] = useState<Obligation[]>(mockObligations);
  const [rawObligations, setRawObligations] = useState<BackendObligation[]>([]);
  const [mapCards, setMapCards] = useState<MAPCard[]>(mockMapCards);
  const [evidenceItems, setEvidenceItems] = useState<Evidence[]>(mockEvidence);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(mockAuditEvents);
  const [auditVerified, setAuditVerified] = useState(true);
  const [regulatorFindings, setRegulatorFindings] = useState<RegulatorFinding[]>([]);
  const [graph, setGraph] = useState<unknown>(null);
  const [apiError, setApiError] = useState("");
  const [backendValidation, setBackendValidation] = useState<BackendValidation | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [validationScore, setValidationScore] = useState(0);
  const [suggestion, setSuggestion] = useState("");

  const selectFile = useCallback((file: File | string) => {
    if (typeof file === "string") {
      setSelectedFile(null);
      setSelectedFileName(file);
    } else {
      setSelectedFile(file);
      setSelectedFileName(file.name);
    }
    setApiError("");
    setStatus("file_selected");
  }, []);

  const verifySource = useCallback(async () => {
    const trimmedSource = sourceUrl.trim();
    if (!trimmedSource) {
      setSourceVerified(false);
      setRegulatorFindings([]);
      return;
    }

    try {
      const result = await checkRegulators(trimmedSource);
      setRegulatorFindings(result.findings);
      setSourceVerified(result.errors.length === 0);
      setApiError(result.errors[0]?.error ?? "");
      if (!selectedFileName) {
        setSelectedFileName("Verified regulator source URL");
        setStatus("file_selected");
      }
    } catch (error) {
      setSourceVerified(false);
      setRegulatorFindings([]);
      setApiError(error instanceof Error ? error.message : "Source verification failed.");
    }
  }, [selectedFileName, sourceUrl]);

  const startProcessing = useCallback(async () => {
    if (!selectedFile) {
      setApiError("Select a PDF, DOCX, or PPTX file before starting the live backend pipeline.");
      setStatus(selectedFileName ? "file_selected" : "idle");
      return;
    }

    setStatus("processing");
    setDataset("live");
    setMetadata(null);
    setValidationIssues([]);
    setValidationScore(0);
    setBackendValidation(null);
    setRawObligations([]);
    setMapCards([]);
    setEvidenceItems([]);
    setGraph(null);
    setApiError("");
    setSteps(markStage(resetStages(), "upload", "running"));

    try {
      const upload = await uploadCircular(selectedFile);
      setJobId(upload.job_id);
      setSteps(markStage(resetStages(), "upload", "completed"));
      const job = await pollPipelineJob(upload.job_id, setSteps);

      const [obligationResponse, mapResponse, graphResponse] = await Promise.all([
        fetchObligations(job.job_id),
        fetchMapCards(job.job_id),
        fetchGraph(job.job_id).catch(() => null),
      ]);

      const circular = toCircular(obligationResponse.document, job.summary?.chunks ?? 0, sourceUrl);
      const liveObligations = obligationResponse.obligations.map((item, index) =>
        toFrontendObligation(item, obligationResponse.document, index),
      );
      const liveMapCards = mapResponse.map_cards.map(toFrontendMapCard);

      setMetadata(circular);
      setRawObligations(obligationResponse.obligations);
      setObligations(liveObligations);
      setMapCards(liveMapCards);
      setBackendValidation(obligationResponse.validation);
      setValidationScore(Number(obligationResponse.validation?.overall_confidence ?? 0));
      setValidationIssues(toValidationIssues(obligationResponse.validation));
      setGraph(graphResponse);
      setSteps(resetStages().map((stage) => ({ ...stage, status: "completed", duration: "live" })));
      await refreshAuditEvents(setAuditEvents, setAuditVerified);
      setStatus("intake_complete");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Pipeline processing failed.";
      setApiError(message);
      setSteps((current) => current.map((stage) => (stage.status === "running" ? { ...stage, status: "failed" } : stage)));
      setStatus("failed");
    }
  }, [selectedFile, selectedFileName, sourceUrl]);

  const continueValidation = useCallback(async () => {
    setStatus("validation_running");

    if (dataset === "live") {
      await waitForMockStage(260);
      const issues = toValidationIssues(backendValidation);
      const score = Number(backendValidation?.overall_confidence ?? 0.9);
      setValidationIssues(issues);
      setValidationScore(score);
      setStatus(score >= validationThreshold && !issues.some((issue) => issue.severity === "failed") ? "validation_passed" : "validation_failed");
      return;
    }

    await waitForMockStage(520);
    setValidationIssues(sampleValidationIssues);
    setValidationScore(0.72);
    setStatus("validation_failed");
  }, [backendValidation, dataset]);

  const repairValidation = useCallback(async () => {
    setStatus("repair_running");
    await waitForMockStage(520);

    for (const id of ["obligation_extraction", "normalization"] as const) {
      setSteps((current) => markStage(current, id, "running"));
      await waitForMockStage(360);
      setSteps((current) => markStage(current, id, "completed"));
    }

    setValidationIssues([]);
    setValidationScore(0.94);
    setStatus("validation_passed");
  }, []);

  const createMapCards = useCallback(async () => {
    setStatus("map_generating");
    await waitForMockStage(dataset === "live" ? 260 : 640);
    setStatus("map_ready");
  }, [dataset]);

  const submitEvidence = useCallback(async (mapCardId: string, file: File) => {
    setApiError("");
    if (dataset !== "live") {
      setEvidenceItems((current) => current.map((item) => (item.mapCardId === mapCardId ? { ...item, fileName: file.name } : item)));
      return;
    }

    try {
      const result = await uploadEvidence(mapCardId, file);
      setEvidenceItems((current) => [result, ...current.filter((item) => item.id !== result.id)]);
      await refreshAuditEvents(setAuditEvents, setAuditVerified);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Evidence validation failed.");
    }
  }, [dataset]);

  const value = useMemo(
    () => ({
      status,
      dataset,
      selectedFileName,
      selectedFile,
      sourceUrl,
      sourceVerified,
      steps,
      metadata,
      jobId,
      obligations,
      rawObligations,
      mapCards,
      evidenceItems,
      auditEvents,
      auditVerified,
      regulatorFindings,
      graph,
      apiError,
      validationIssues,
      validationScore,
      validationThreshold,
      mapCardsReady: status === "map_ready",
      suggestion,
      selectFile,
      setSourceUrl,
      verifySource,
      startProcessing,
      continueValidation,
      setSuggestion,
      repairValidation,
      createMapCards,
      submitEvidence,
    }),
    [
      status,
      dataset,
      selectedFileName,
      selectedFile,
      sourceUrl,
      sourceVerified,
      steps,
      metadata,
      jobId,
      obligations,
      rawObligations,
      mapCards,
      evidenceItems,
      auditEvents,
      auditVerified,
      regulatorFindings,
      graph,
      apiError,
      validationIssues,
      validationScore,
      suggestion,
      selectFile,
      verifySource,
      startProcessing,
      continueValidation,
      repairValidation,
      createMapCards,
      submitEvidence,
    ],
  );

  return <PipelineWorkflowContext.Provider value={value}>{children}</PipelineWorkflowContext.Provider>;
}

export function usePipelineWorkflow() {
  const context = useContext(PipelineWorkflowContext);
  if (!context) {
    throw new Error("usePipelineWorkflow must be used inside PipelineWorkflowProvider");
  }
  return context;
}

async function pollPipelineJob(jobId: string, setSteps: React.Dispatch<React.SetStateAction<PipelineStage[]>>) {
  const processingStages: PipelineStageId[] = [
    "docling_parse",
    "ocr_if_needed",
    "metadata_extraction",
    "section_extraction",
    "clause_chunking",
    "obligation_extraction",
    "normalization",
  ];
  let currentIndex = 0;

  for (let attempt = 0; attempt < 400; attempt += 1) {
    const job = await fetchPipelineJob(jobId);
    if (job.status === "failed") {
      throw new Error(job.error || "Pipeline job failed.");
    }
    if (job.status === "completed") {
      return job;
    }

    const activeStage = processingStages[Math.min(currentIndex, processingStages.length - 1)];
    setSteps((current) =>
      current.map((stage) => {
        if (stage.id === "upload") return { ...stage, status: "completed" };
        const stageIndex = processingStages.indexOf(stage.id);
        if (stageIndex >= 0 && stageIndex < currentIndex) return { ...stage, status: "completed" };
        if (stage.id === activeStage) return { ...stage, status: "running" };
        return stage;
      }),
    );

    currentIndex = Math.min(currentIndex + 1, processingStages.length - 1);
    await waitForMockStage(3000);
  }

  throw new Error("Pipeline timed out after 20 minutes. The document may be too large — try a smaller batch size or check the backend logs.");
}

async function refreshAuditEvents(
  setAuditEvents: React.Dispatch<React.SetStateAction<AuditEvent[]>>,
  setAuditVerified: React.Dispatch<React.SetStateAction<boolean>>,
) {
  try {
    const response = await fetchAuditEvents();
    const events = response.events.map(toAuditEvent).filter(Boolean) as AuditEvent[];
    if (events.length) {
      setAuditEvents(events);
    }
    setAuditVerified(response.verified);
  } catch {
    // Older backend builds do not expose audit events; keep the current demo chain.
  }
}

function markStage(stages: PipelineStage[], id: PipelineStageId, status: PipelineStage["status"]) {
  return stages.map((stage) => (stage.id === id ? { ...stage, status } : stage));
}

function toCircular(document: DocumentSummary, totalClauses: number, sourceUrl: string): Circular {
  return {
    id: document.doc_id || "uploaded-circular",
    regulator: toRegulator(document.source),
    title: document.title || "Uploaded circular",
    circularNumber: document.circular_number || document.doc_id || "N/A",
    issueDate: document.date || "Not specified",
    effectiveDate: document.effective_date || "Not specified",
    status: "processed",
    totalClauses,
    totalObligations: document.total_obligations ?? 0,
    highRiskCount: document.high_risk_count ?? 0,
    validationStatus: toValidationStatus((document.validation as BackendValidation | undefined)?.overall_confidence),
    sourceUrl,
  };
}

function toFrontendObligation(item: BackendObligation, document: DocumentSummary, index: number): Obligation {
  const departments = cleanList(item.departments || item.department, ["Compliance"]);
  return {
    id: item.id || `OBL-${index + 1}`,
    circularId: document.doc_id || "uploaded-circular",
    sourceClause: item.clause_number || item.section_id || "N/A",
    sourceText: item.notes || item.penalty_if_missed || item.action || "Source text available in the generated document JSON.",
    actor: item.actor || "bank",
    actionRequired: item.action || "Review regulatory obligation",
    obligationType: item.obligation_type === "discretionary" ? "advisory" : "mandatory",
    deadline: deadlineToText(item.deadline, document.effective_date),
    domain: item.domain || "Other",
    departments,
    severity: item.severity || "medium",
    severityReason: item.severity_reason || "Generated by backend extraction.",
    evidenceRequired: cleanList(item.evidence_required, ["Compliance sign-off record"]),
    confidence: Number(item.confidence ?? 0.85),
    policyImpact: item.penalty_if_missed || item.severity_reason || "Requires department action and evidence-backed closure.",
    validationStatus: Number(item.confidence ?? 0.85) >= validationThreshold ? "valid" : "review",
  };
}

function toFrontendMapCard(item: BackendMapCard): MAPCard {
  return {
    id: item.id,
    obligationId: item.obligationId,
    title: item.title,
    summary: item.summary,
    sourceRegulator: toRegulator(item.sourceRegulator),
    circularTitle: item.circularTitle,
    sourceClause: item.sourceClause,
    assignedDepartments: cleanList(item.assignedDepartments, ["Compliance"]),
    owner: item.owner,
    severity: item.severity || "medium",
    deadline: item.deadline || "Not specified",
    status: item.status === "New" ? "New" : "Assigned",
    evidenceRequired: cleanList(item.evidenceRequired, ["Compliance sign-off record"]),
    aiReasoning: item.aiReasoning,
    validationChecklist: cleanList(item.validationChecklist, item.evidenceValidationRules || ["Human reviewer must approve closure."]),
    actionVerb: item.actionVerb,
    measurableOutcome: item.measurableOutcome,
    acceptanceCriteria: item.acceptanceCriteria,
    evidenceValidationRules: item.evidenceValidationRules,
    ownerDepartment: item.ownerDepartment,
    reviewerDepartment: item.reviewerDepartment,
    deadlineType: item.deadlineType,
    escalationLevel: item.escalationLevel,
    closurePolicy: item.closurePolicy,
  };
}

function toValidationIssues(validation: BackendValidation | null | undefined): ValidationIssue[] {
  return (validation?.incorrect_extractions || []).map((issue, index) => ({
    id: `VAL-${String(index + 1).padStart(3, "0")}`,
    obligationId: issue.obligation_id || "unknown",
    field: issue.field || "unknown",
    currentValue: issue.current_value || "Not provided",
    reason: issue.reason || "Validation flagged this field for review.",
    severity: "failed",
  }));
}

function toAuditEvent(item: unknown): AuditEvent | null {
  if (!item || typeof item !== "object") return null;
  const event = item as Record<string, unknown>;
  return {
    id: String(event.id || event.event_id || "AUD-live"),
    entityType: String(event.entityType || event.entity_type || "System") as AuditEvent["entityType"],
    entityId: String(event.entityId || event.entity_id || "system"),
    action: String(event.action || "Event recorded"),
    actor: String(event.actor || "ORBITAL"),
    timestamp: String(event.timestamp || new Date().toISOString()),
    details: String(event.details || ""),
    eventHash: String(event.eventHash || event.event_hash || ""),
    previousHash: String(event.previousHash || event.previous_hash || "GENESIS"),
    severity: event.severity as AuditEvent["severity"],
  };
}

function deadlineToText(deadline: BackendObligation["deadline"], fallback?: string | null) {
  if (!deadline) return fallback || "Not specified";
  if (typeof deadline === "string") return deadline;
  return deadline.absolute_date || deadline.value || deadline.text || fallback || "Not specified";
}

function cleanList(values: string[] | undefined, fallback: string[]) {
  const cleaned = (values || []).filter(Boolean);
  return cleaned.length ? cleaned : fallback;
}

function toRegulator(value: unknown): Regulator {
  const candidate = String(value || "RBI").toUpperCase();
  if (candidate === "CERT-IN") return "CERT-In";
  if (["RBI", "SEBI", "NPCI", "IRDAI", "FIU-IND", "IBA"].includes(candidate)) {
    return candidate as Regulator;
  }
  return "RBI";
}

function toValidationStatus(confidence: unknown): ValidationStatus {
  const score = Number(confidence ?? 0.85);
  if (score >= validationThreshold) return "valid";
  if (score >= 0.7) return "warning";
  return "review";
}

const sampleValidationIssues: ValidationIssue[] = [
  {
    id: "VAL-006",
    obligationId: "OBL-2026-104",
    field: "action",
    currentValue: "Update data archival policy",
    reason:
      "Action needs conditions for retention, deletion, review, and approval controls before MAP generation.",
    severity: "failed",
  },
  {
    id: "VAL-009",
    obligationId: "OBL-2026-102",
    field: "departments",
    currentValue: "Operations, Digital Banking",
    reason: "Internal Audit may need review ownership because this is a supervisory evidence-retention control.",
    severity: "warning",
  },
];
