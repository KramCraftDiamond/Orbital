from typing import List, Dict, Any, Union
from rapidfuzz import process, fuzz
from ingestion.obligations.schema import Obligation, ObligationOutput, DEPARTMENTS


def standardize_deadline(deadline) -> dict | None:
    """
    Standardize the deadline into a consistent {type, value} structure.
    Accepts a raw string, a DeadlineDetail object, or an existing dict.
    """
    # Already a structured dict — pass through
    if isinstance(deadline, dict):
        value = deadline.get("value") or deadline.get("text", "")
        # Still guard against "None"/"unknown" strings
        if not value or str(value).strip().lower() in ("none", "null", "n/a", "unknown", ""):
            return None
        return deadline

    # DeadlineDetail pydantic object
    if hasattr(deadline, "text"):
        text = deadline.text or ""
        if str(text).strip().lower() in ("none", "null", "n/a", "unknown", ""):
            return {
                "type": "relative" if hasattr(deadline, "urgency") and "ongoing" in str(getattr(deadline, "urgency", "")) else "absolute",
                "value": None
            }
        return {
            "type": "relative" if any(k in str(text).lower() for k in ["within", "days", "hours", "months", "after", "ongoing"]) else "absolute",
            "value": text,
            "absolute_date": getattr(deadline, "absolute_date", None),
            "duration": getattr(deadline, "duration", None),
            "urgency": str(getattr(deadline, "urgency", "short_term"))
        }

    # Raw string
    if not deadline or str(deadline).strip().lower() in ("none", "null", "n/a", "unknown", ""):
        return None

    lower_d = str(deadline).lower()
    absolute_indicators = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep",
                           "oct", "nov", "dec", "202", "203", "by ", "on ", "end of"]
    relative_indicators = ["within", "hours", "days", "months", "years", "after",
                           "prior to", "before", "from", "ongoing"]
    is_abs = any(ind in lower_d for ind in absolute_indicators)
    is_rel = any(ind in lower_d for ind in relative_indicators)

    if is_rel:
        return {"type": "relative", "value": deadline}
    elif is_abs:
        return {"type": "absolute", "value": deadline}
    else:
        return {"type": "absolute", "value": deadline}


def normalize_obligations(
    obligations: List[Union[Obligation, ObligationOutput]]
) -> List[Dict[str, Any]]:
    """
    Takes raw Obligation or ObligationOutput objects, standardizes their departments
    and deadlines, and deduplicates near-identical entries (keeping the latest occurrence).
    Returns a list of plain dicts ready for storage/graphing.
    """
    unique_obs: List[Dict[str, Any]] = []

    for obs in obligations:
        # Support both .department (Obligation) and .departments (ObligationOutput)
        raw_departments = (
            obs.departments if hasattr(obs, "departments") else
            obs.department if hasattr(obs, "department") else []
        )

        # Fuzzy-match departments against canonical list
        normalized_departments = []
        for dept in raw_departments:
            result = process.extractOne(dept, DEPARTMENTS, scorer=fuzz.WRatio)
            if result and result[1] >= 85:
                normalized_departments.append(result[0])
            else:
                normalized_departments.append(f"unmapped: {dept}")

        # Standardize deadline
        raw_deadline = getattr(obs, "deadline", None)
        std_deadline = standardize_deadline(raw_deadline)

        # Convert to dict
        obs_dict = obs.model_dump()
        obs_dict["department"] = normalized_departments    # normalizer canonical key
        obs_dict["departments"] = normalized_departments   # new schema key
        obs_dict["deadline"] = std_deadline

        # Deduplicate: same actor + action + deadline
        actor = getattr(obs, "actor", "")
        action = getattr(obs, "action", "")
        current_key = f"{actor} {action}".lower()
        cur_deadline_val = str(raw_deadline).lower() if raw_deadline else "none"

        is_duplicate = False
        for i, existing in enumerate(unique_obs):
            existing_key = f"{existing.get('actor', '')} {existing.get('action', '')}".lower()
            ext_deadline = existing.get("deadline")
            if ext_deadline and isinstance(ext_deadline, dict):
                ext_deadline_val = str(ext_deadline.get("value", "")).lower()
            else:
                ext_deadline_val = str(ext_deadline).lower() if ext_deadline else "none"

            if ext_deadline_val == cur_deadline_val:
                score = fuzz.token_sort_ratio(current_key, existing_key)
                if score >= 85:
                    unique_obs[i] = obs_dict
                    is_duplicate = True
                    break

        if not is_duplicate:
            unique_obs.append(obs_dict)

    return unique_obs
