export type Regulator = "RBI" | "SEBI" | "NPCI" | "CERT-In" | "IRDAI" | "FIU-IND" | "IBA";

export type Severity = "low" | "medium" | "high" | "critical";

export type ValidationStatus = "valid" | "warning" | "failed" | "review";

export type ProcessingStatus = "pending" | "running" | "completed" | "failed" | "review";

export type MAPStatus =
  | "New"
  | "Under Review"
  | "Assigned"
  | "In Progress"
  | "Evidence Submitted"
  | "AI Validation Pending"
  | "Human Review Pending"
  | "Closed"
  | "Rejected"
  | "Overdue";

export interface Circular {
  id: string;
  regulator: Regulator;
  title: string;
  circularNumber: string;
  issueDate: string;
  effectiveDate: string;
  status: "processed" | "processing" | "review" | "failed";
  totalClauses: number;
  totalObligations: number;
  highRiskCount: number;
  validationStatus: ValidationStatus;
  sourceUrl?: string;
}

export interface Obligation {
  id: string;
  circularId: string;
  sourceClause: string;
  sourceText: string;
  actor: string;
  actionRequired: string;
  obligationType: "mandatory" | "reporting" | "disclosure" | "advisory" | "prohibitory";
  deadline: string;
  domain: string;
  departments: string[];
  severity: Severity;
  severityReason: string;
  evidenceRequired: string[];
  confidence: number;
  policyImpact: string;
  validationStatus: ValidationStatus;
}

export interface MAPCard {
  id: string;
  obligationId: string;
  title: string;
  summary: string;
  sourceRegulator: Regulator;
  circularTitle: string;
  sourceClause: string;
  assignedDepartments: string[];
  owner: string;
  severity: Severity;
  deadline: string;
  status: MAPStatus;
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
}

export interface Evidence {
  id: string;
  mapCardId: string;
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
  validationResult: "Pass" | "Partial" | "Fail" | "Human Review Required";
  matchedRequirements: string[];
  missingRequirements: string[];
  contradictedRequirements?: string[];
  sourceSnippets?: Array<{
    requirement: string;
    snippet: string;
    status: "matched" | "contradicted";
  }>;
  recommendation: string;
  requiresHumanReview: boolean;
}

export interface AuditEvent {
  id: string;
  entityType: "Circular" | "Obligation" | "MAPCard" | "Evidence" | "Approval" | "System";
  entityId: string;
  action: string;
  actor: string;
  timestamp: string;
  details: string;
  eventHash: string;
  previousHash: string;
  severity?: Severity;
}

export interface DepartmentPerformance {
  department: string;
  assigned: number;
  closed: number;
  overdue: number;
  pendingEvidence: number;
  averageClosureTime: string;
  highRiskExposure: string;
  evidenceRejectionRate: number;
  closureRate: number;
}

export interface ProcessingStep {
  label: string;
  description: string;
  status: ProcessingStatus;
  duration?: string;
}
