import logging
import os
import json
from dotenv import load_dotenv
load_dotenv()
from typing import List, Dict, Any
import instructor
from openai import OpenAI
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

class ValidationResult(BaseModel):
    missing_details: str = Field(
        description="List any deadlines, exceptions, conditions, or cross-references in the clause that are NOT captured in the JSON. If none, output exactly 'complete'."
    )

_ollama_client = None
_groq_client = None

def get_client(backend: str) -> instructor.Instructor:
    global _ollama_client, _groq_client
    if backend == "ollama":
        if _ollama_client is None:
            _ollama_client = instructor.from_openai(
                OpenAI(
                    base_url="http://localhost:11434/v1",
                    api_key="ollama",
                ),
                mode=instructor.Mode.JSON
            )
        return _ollama_client
    elif backend == "groq":
        if _groq_client is None:
            _groq_client = instructor.from_openai(
                OpenAI(
                    base_url="https://api.groq.com/openai/v1",
                    api_key=os.environ.get("GROQ_API_KEY", "dummy"),
                ),
                mode=instructor.Mode.TOOLS
            )
        return _groq_client
    else:
        raise ValueError(f"Unknown backend: {backend}")

def validate_obligations(obligations: List[Dict[str, Any]], clause_texts: Dict[str, str], backend: str = "groq") -> List[Dict[str, Any]]:
    """
    Second-pass LLM validation. Compares the normalized obligation JSON against the raw clause text.
    Flags any missing conditions, exceptions, or cross-references.
    """
    client = get_client(backend)
    model = "llama3-70b-8192" if backend == "groq" else "phi3"
    
    validated_obs = []
    flagged_count = 0
    total = len(obligations)
    
    for obs in obligations:
        source_id = obs.get("source_section")
        clause_text = clause_texts.get(source_id, "")
        
        if not clause_text:
            logger.warning(f"No raw text provided for source section '{source_id}'. Flagging for review.")
            obs["review_flag"] = "Missing raw text for validation"
            flagged_count += 1
            validated_obs.append(obs)
            continue
            
        system_prompt = (
            "You are an expert compliance auditor. Your job is to verify if an extracted JSON captures all nuances of a regulatory clause.\n"
            "Given the clause text and the extracted obligation JSON, list any deadlines, exceptions, conditions, or cross-references in the clause that are NOT captured in the JSON.\n"
            "If the JSON captures everything accurately and nothing important is missing, you must output exactly 'complete'.\n"
        )
        
        user_prompt = f"CLAUSE TEXT:\n{clause_text}\n\nEXTRACTED JSON:\n{json.dumps(obs, indent=2)}"
        
        try:
            result: ValidationResult = client.chat.completions.create(
                model=model,
                response_model=ValidationResult,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_retries=2
            )
            
            missing = result.missing_details.strip()
            
            # If the model finds missing details, we attach it as a review flag instead of auto-discarding
            if missing.lower() != "complete":
                obs["review_flag"] = missing
                flagged_count += 1
            else:
                obs["review_flag"] = None
                
        except Exception as e:
            logger.error(f"Validation LLM failed for section '{source_id}': {e}")
            obs["review_flag"] = f"Validation LLM Error: {e}"
            flagged_count += 1
            
        validated_obs.append(obs)
        
    if total > 0:
        flag_rate = (flagged_count / total) * 100
        logger.info(f"Validation pass finished: {total} obligations validated, {flagged_count} flagged for review ({flag_rate:.1f}% flag rate).")
    
    return validated_obs
