import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Circular } from "../types/orbital";
import { circulars } from "../data/mockData";
import {
  type PipelineStage,
  type ValidationIssue,
  resetStages,
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
  | "map_ready";

type PipelineWorkflowContextValue = {
  status: WorkflowStatus;
  selectedFileName: string;
  sourceUrl: string;
  sourceVerified: boolean;
  steps: PipelineStage[];
  metadata: Circular | null;
  validationIssues: ValidationIssue[];
  validationScore: number;
  validationThreshold: number;
  mapCardsReady: boolean;
  suggestion: string;
  selectFile: (fileName: string) => void;
  setSourceUrl: (value: string) => void;
  verifySource: () => void;
  startProcessing: () => Promise<void>;
  continueValidation: () => Promise<void>;
  setSuggestion: (value: string) => void;
  repairValidation: () => Promise<void>;
  createMapCards: () => Promise<void>;
};

const PipelineWorkflowContext = createContext<PipelineWorkflowContextValue | null>(null);

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

export function PipelineWorkflowProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<WorkflowStatus>("idle");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceVerified, setSourceVerified] = useState(false);
  const [steps, setSteps] = useState<PipelineStage[]>(resetStages);
  const [metadata, setMetadata] = useState<Circular | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [validationScore, setValidationScore] = useState(0);
  const [suggestion, setSuggestion] = useState("");
  const validationThreshold = 0.85;

  const selectFile = useCallback((fileName: string) => {
    setSelectedFileName(fileName);
    setStatus("file_selected");
  }, []);

  const verifySource = useCallback(() => {
    setSourceVerified(Boolean(sourceUrl.trim()));
    if (sourceUrl.trim() && !selectedFileName) {
      setSelectedFileName("Verified regulator source URL");
      setStatus("file_selected");
    }
  }, [selectedFileName, sourceUrl]);

  const startProcessing = useCallback(async () => {
    if (!selectedFileName) {
      setSelectedFileName("Sample RBI circular.pdf");
    }

    setStatus("processing");
    setMetadata(null);
    setValidationIssues([]);
    setValidationScore(0);
    setSteps(resetStages());

    const stageIds = resetStages().map((stage) => stage.id);
    for (const id of stageIds) {
      setSteps((current) =>
        current.map((step) => (step.id === id ? { ...step, status: "running" } : step)),
      );
      await waitForMockStage();
      setSteps((current) =>
        current.map((step) =>
          step.id === id ? { ...step, status: "completed", duration: "00:04" } : step,
        ),
      );
    }

    setMetadata({ ...circulars[0], status: "processed", validationStatus: "valid" });
    setStatus("intake_complete");
  }, [selectedFileName]);

  const continueValidation = useCallback(async () => {
    setStatus("validation_running");
    await waitForMockStage(520);
    setValidationIssues(sampleValidationIssues);
    setValidationScore(0.72);
    setStatus("validation_failed");
  }, []);

  const repairValidation = useCallback(async () => {
    setStatus("repair_running");
    await waitForMockStage(520);

    for (const id of ["obligation_extraction", "normalization"] as const) {
      setSteps((current) =>
        current.map((step) => (step.id === id ? { ...step, status: "running" } : step)),
      );
      await waitForMockStage(360);
      setSteps((current) =>
        current.map((step) => (step.id === id ? { ...step, status: "completed" } : step)),
      );
    }

    setValidationIssues([]);
    setValidationScore(0.94);
    setStatus("validation_passed");
  }, []);

  const createMapCards = useCallback(async () => {
    setStatus("map_generating");
    await waitForMockStage(640);
    setStatus("map_ready");
  }, []);

  const value = useMemo(
    () => ({
      status,
      selectedFileName,
      sourceUrl,
      sourceVerified,
      steps,
      metadata,
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
    }),
    [
      status,
      selectedFileName,
      sourceUrl,
      sourceVerified,
      steps,
      metadata,
      validationIssues,
      validationScore,
      suggestion,
      selectFile,
      verifySource,
      startProcessing,
      continueValidation,
      repairValidation,
      createMapCards,
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
