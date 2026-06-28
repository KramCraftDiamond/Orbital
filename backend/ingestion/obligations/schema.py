import logging
import re
from typing import Literal, Optional, Any
from pydantic import BaseModel, field_validator, model_validator

logger = logging.getLogger(__name__)

# ── Canonical Vocabularies ────────────────────────────────────────────────────

DEPARTMENTS = [
    "Retail Banking", "Corporate Banking", "SME Banking",
    "Agriculture/Rural Banking", "NRI Banking", "Wealth Management",
    "IT/Core Banking", "Digital Banking", "Cybersecurity",
    "Data & Analytics", "Payments & Settlement", "Compliance",
    "Risk Management", "Internal Audit", "Legal",
    "AML/KYC", "Fraud Management", "Treasury", "Finance & Accounts",
    "Taxation", "HR", "Operations", "Customer Service",
    "Branch Network", "Marketing", "Financial Inclusion"
]

DOMAINS = [
    "KYC/AML",
    "Basel/Capital Adequacy",
    "Cybersecurity",
    "Data Privacy (DPDP)",
    "FEMA/Forex",
    "Priority Sector Lending",
    "Grievance Redressal",
    "Fraud Risk",
    "Interest Rate",
    "Liquidity",
    "Financial Inclusion",
    "Business Continuity",
    "Payments & Settlement",
    "Other"
]

DepartmentLiteral = Literal[
    "Retail Banking", "Corporate Banking", "SME Banking",
    "Agriculture/Rural Banking", "NRI Banking", "Wealth Management",
    "IT/Core Banking", "Digital Banking", "Cybersecurity",
    "Data & Analytics", "Payments & Settlement", "Compliance",
    "Risk Management", "Internal Audit", "Legal",
    "AML/KYC", "Fraud Management", "Treasury", "Finance & Accounts",
    "Taxation", "HR", "Operations", "Customer Service",
    "Branch Network", "Marketing", "Financial Inclusion"
]

DomainLiteral = Literal[
    "KYC/AML", "Basel/Capital Adequacy", "Cybersecurity", "Data Privacy (DPDP)",
    "FEMA/Forex", "Priority Sector Lending", "Grievance Redressal", "Fraud Risk",
    "Interest Rate", "Liquidity", "Financial Inclusion", "Business Continuity",
    "Payments & Settlement", "Other"
]

ClauseTypeLiteral = Literal["obligation", "permission", "effective_date", "definition", "other"]
ObligationTypeLiteral = Literal["mandatory", "discretionary"]
UrgencyLiteral = Literal["immediate", "short_term", "medium_term", "long_term", "ongoing"]


# ── Sub-models ────────────────────────────────────────────────────────────────

class DeadlineDetail(BaseModel):
    """Structured deadline, split into text label + parsed fields."""
    text: str = "None"                  # Human-readable: "within 30 days", "July 1, 2026", "ongoing"
    absolute_date: Optional[str] = None # ISO date string if a specific date is mentioned
    duration: Optional[str] = None      # e.g. "30 days", "6 months" for relative deadlines
    urgency: UrgencyLiteral = "short_term"


class ObligationOutput(BaseModel):
    """
    Full obligation record — the canonical output format for every extracted obligation.
    Used in both the per-section and the flat top-level obligations list.
    """
    id: str = ""
    section_id: str = "N/A"
    clause_number: str = "N/A"
    actor: str = "bank"
    action: str = ""
    obligation_type: ObligationTypeLiteral = "mandatory"
    trigger: str = "shall"
    deadline: Optional[DeadlineDetail] = None
    effective_date: Optional[str] = None
    domain: DomainLiteral = "Other"
    departments: list[DepartmentLiteral] = []
    external_parties_referenced: list[str] = []
    severity: Literal["low", "medium", "high", "critical"] = "medium"
    severity_reason: str = "LLM Extracted"
    evidence_required: list[str] = []
    penalty_if_missed: Optional[str] = None
    fine_exposure_inr: Optional[float] = None
    cross_references: list[str] = []
    confidence: float = 0.85
    notes: Optional[str] = None

    # ── Defensive validators (guard against weak LLM hallucinations) ──────────

    @field_validator('confidence', mode='before')
    @classmethod
    def coerce_confidence(cls, v: Any) -> float:
        """Coerce string '0.85' → float, handle None/invalid."""
        try:
            return float(v)
        except (TypeError, ValueError):
            return 0.85

    @field_validator('actor', 'action', 'trigger', 'section_id', 'clause_number', mode='before')
    @classmethod
    def coerce_to_str(cls, v: Any) -> str:
        """
        Weak models (phi3) sometimes wrap scalar fields in lists or dicts.
        e.g. actor=['bank'] or action={'text': 'do X'} or trigger={'text': 'may'}
        """
        if v is None:
            return ""
        if isinstance(v, list):
            # Take first element if it's a string, else stringify
            if v and isinstance(v[0], str):
                return v[0]
            return str(v[0]) if v else ""
        if isinstance(v, dict):
            # Extract from {'text': ...} or {'original': ...}
            return str(v.get("text") or v.get("original") or v.get("value") or "")
        return str(v)

    @field_validator('obligation_type', mode='before')
    @classmethod
    def coerce_obligation_type(cls, v: Any) -> str:
        if v is None:
            return "mandatory"
        s = str(v).lower().strip()
        if "discret" in s or s == "optional" or s == "permissive":
            return "discretionary"
        return "mandatory"

    @field_validator('deadline', mode='before')
    @classmethod
    def coerce_deadline(cls, v: Any) -> dict:
        """Ensure deadline is always a valid DeadlineDetail dict, never null."""
        if v is None:
            return {"text": "None", "absolute_date": None, "duration": None, "urgency": "short_term"}
        if isinstance(v, dict):
            v.setdefault("text", "None")
            v.setdefault("urgency", "short_term")
            return v
        # Raw string (e.g. "within 30 days")
        if isinstance(v, str):
            return {"text": v, "absolute_date": None, "duration": None, "urgency": "short_term"}
        return {"text": "None", "absolute_date": None, "duration": None, "urgency": "short_term"}

    @field_validator('fine_exposure_inr', mode='before')
    @classmethod
    def coerce_fine(cls, v: Any) -> Optional[float]:
        """phi3 sometimes returns {'type': 'Decimal128'} — collapse to None."""
        if v is None or isinstance(v, dict):
            return None
        try:
            return float(v)
        except (TypeError, ValueError):
            return None

    @field_validator('cross_references', mode='before')
    @classmethod
    def coerce_cross_refs(cls, v: Any) -> list:
        """Filter out None values that phi3 inserts into cross_references: [null]."""
        if v is None:
            return []
        if isinstance(v, list):
            return [str(x) for x in v if x is not None]
        return []

    @field_validator('departments', mode='before')
    @classmethod
    def coerce_departments(cls, v: Any) -> list:
        if v is None:
            return []
        if isinstance(v, str):
            return [v] if v else []
        return v if isinstance(v, list) else []

    # ── Backwards-compat properties ───────────────────────────────────────────

    @property
    def mandatory(self) -> bool:
        return self.obligation_type == "mandatory"

    @property
    def department(self) -> list:
        """Alias for .departments — keeps normalizer/graph code working."""
        return self.departments


class SectionOutput(BaseModel):
    """A parsed section/clause of the document, with its obligations nested inside."""
    id: str
    heading: str
    text: str
    page_number: int = 1
    clause_type: ClauseTypeLiteral = "other"
    level: int = 1
    obligations: list[ObligationOutput] = []


class DocumentAnalysis(BaseModel):
    """High-level analytical summary produced after all obligations are extracted."""
    document_type: str = "guideline"
    primary_actor: str = ""
    secondary_actors: list[str] = []
    dominant_domains: list[str] = []
    contains_quoted_regulations: bool = False
    contains_enumerated_operational_clause: bool = False
    likely_effective_date_text: Optional[str] = None
    core_obligation_phrases: list[str] = []
    analysis_confidence: float = 0.9
    reasoning: str = ""


class ValidationIssue(BaseModel):
    obligation_id: str
    field: str
    current_value: str
    correct_value: str
    reason: str


class DocumentValidation(BaseModel):
    """Heuristic validation results for the extracted obligations."""
    missed_obligations: list[str] = []
    incorrect_extractions: list[ValidationIssue] = []
    missing_effective_date: Optional[str] = None
    overall_confidence: float = 0.85
    validation_notes: str = ""


class RichDocumentOutput(BaseModel):
    """
    Top-level output model — one per document. This is the canonical JSON
    that the pipeline writes to disk.
    """
    doc_id: str = ""
    source: str = "RBI"
    title: str = ""
    circular_number: Optional[str] = None
    reference_number: Optional[str] = None
    date: Optional[str] = None
    effective_date: Optional[str] = None
    issued_by: Optional[str] = None
    amends: Optional[str] = None
    language: str = "english"
    total_pages: int = 0
    sections: list[SectionOutput] = []
    tables: list[dict] = []
    annexures: list[dict] = []
    cross_references: list[str] = []
    obligations: list[ObligationOutput] = []   # Flat list — mirrors what's inside sections
    analysis: DocumentAnalysis = DocumentAnalysis()
    validation: DocumentValidation = DocumentValidation()


# ── Legacy model kept for backwards compatibility with normalizer / graph ──────
class Obligation(BaseModel):
    actor: str = "bank"
    action: str = ""
    deadline: Optional[str] = None
    effective_date: Optional[str] = None
    mandatory: bool = True
    domain: DomainLiteral = "Other"
    department: list[DepartmentLiteral] = []
    external_parties_referenced: list[str] = []
    evidence_required: list[str] = []
    severity: Literal["low", "medium", "high", "critical"] = "medium"
    source_section: str = "N/A"
    source_page: int = 0


class DocumentContext(BaseModel):
    document_title: str = ""
    issuing_authority: str = ""
    effective_date: Optional[str] = None
    referenced_documents: list[str] = []
    circular_number: Optional[str] = None
    reference_number: Optional[str] = None
    date: Optional[str] = None
    issued_by: Optional[str] = None
    amends: Optional[str] = None
