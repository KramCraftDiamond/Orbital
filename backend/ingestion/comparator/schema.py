import logging
from typing import Literal, Optional, Any
from pydantic import BaseModel, Field, field_validator, model_validator

logger = logging.getLogger(__name__)

# ── Coverage vocabulary ───────────────────────────────────────────────────────

CoverageStatus = Literal["covered", "partial", "gap", "conflict"]


# ── Sub-models ────────────────────────────────────────────────────────────────

class PolicyMatch(BaseModel):
    """A single matched section from the bank's internal policy document."""
    policy_section_id: str
    policy_excerpt: str


# ── LLM response models (minimal — avoid drift/hallucination) ─────────────────

class LLMComparisonItem(BaseModel):
    """
    What the LLM itself returns for one obligation.
    Intentionally minimal: obligation fields we already have (action, domain,
    departments, severity) are NOT re-stated here to prevent hallucination drift.
    """
    obligation_id: str
    status: CoverageStatus = "gap"
    matched_policy_sections: list[PolicyMatch] = []
    gap_description: Optional[str] = None
    conflict_description: Optional[str] = None
    recommended_policy_update: Optional[str] = None
    confidence: float = 0.85

    # ── Defensive validators (same style as obligations/schema.py) ────────────

    @field_validator('confidence', mode='before')
    @classmethod
    def coerce_confidence(cls, v: Any) -> float:
        """Coerce string '0.85' → float, handle None/invalid."""
        try:
            return float(v)
        except (TypeError, ValueError):
            return 0.85

    @field_validator('status', mode='before')
    @classmethod
    def coerce_status(cls, v: Any) -> str:
        """Lowercase + strip, fallback to 'gap' for unknown values."""
        if v is None:
            return "gap"
        s = str(v).lower().strip()
        if s in ("covered", "partial", "gap", "conflict"):
            return s
        logger.warning(f"Unknown coverage status '{v}', falling back to 'gap'")
        return "gap"

    @model_validator(mode='after')
    def gap_must_have_empty_matches(self) -> 'LLMComparisonItem':
        """If status is 'gap', matched_policy_sections must be empty."""
        if self.status == "gap" and self.matched_policy_sections:
            logger.warning(
                f"Obligation {self.obligation_id}: status='gap' but "
                f"{len(self.matched_policy_sections)} policy matches provided — clearing."
            )
            self.matched_policy_sections = []
        return self


class ComparisonBatchResult(BaseModel):
    """Wrapper for a batch of LLM comparison items — the instructor response_model."""
    items: list[LLMComparisonItem] = Field(
        default_factory=list,
        description=(
            "Comparison results for ALL obligations provided in this batch. "
            "Return one item per obligation_id. Do NOT omit any obligation."
        )
    )


# ── Merged output models (code-assembled, not LLM-produced) ──────────────────

class ObligationComparison(BaseModel):
    """
    Final merged record: LLM judgment + re-attached obligation fields.
    Built in code by joining LLMComparisonItem with the original obligation dict.
    """
    obligation_id: str
    action: str = ""
    domain: str = "Other"
    departments: list[str] = []
    severity: Literal["low", "medium", "high", "critical"] = "medium"
    status: CoverageStatus = "gap"
    matched_policy_sections: list[PolicyMatch] = []
    gap_description: Optional[str] = None
    conflict_description: Optional[str] = None
    recommended_policy_update: Optional[str] = None
    confidence: float = 0.85
    notes: Optional[str] = None


class ComparisonReport(BaseModel):
    """
    Top-level comparison report — one per run.
    Analogous to RichDocumentOutput in obligations/schema.py.
    """
    circular_doc_id: str = ""
    policy_doc_name: str = ""
    generated_at: str = ""
    summary: dict = {}          # {"covered": N, "partial": N, "gap": N, "conflict": N}
    comparisons: list[ObligationComparison] = []
