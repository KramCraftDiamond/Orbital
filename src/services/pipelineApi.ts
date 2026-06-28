import type { ProcessingStep } from "../types/orbital";

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
