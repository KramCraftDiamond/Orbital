import type { MAPStatus, ProcessingStatus, Regulator, Severity, ValidationStatus } from "../types/orbital";
import { regulatorColors } from "../data/mockData";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function severityClasses(severity: Severity) {
  switch (severity) {
    case "critical":
      return "border-accent-critical/40 bg-accent-critical/10 text-accent-critical";
    case "high":
      return "border-accent-warning/40 bg-accent-warning/10 text-accent-warning";
    case "medium":
      return "border-accent-violet/40 bg-accent-violet/10 text-accent-violet";
    default:
      return "border-accent-success/40 bg-accent-success/10 text-accent-success";
  }
}

export function statusClasses(status: MAPStatus | ProcessingStatus | ValidationStatus | string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("closed") || normalized === "completed" || normalized === "valid" || normalized === "pass") {
    return "border-accent-success/35 bg-accent-success/10 text-accent-success";
  }
  if (normalized.includes("overdue") || normalized.includes("failed") || normalized.includes("rejected") || normalized === "fail") {
    return "border-accent-critical/35 bg-accent-critical/10 text-accent-critical";
  }
  if (normalized.includes("review") || normalized.includes("partial") || normalized.includes("warning")) {
    return "border-accent-warning/35 bg-accent-warning/10 text-accent-warning";
  }
  if (normalized.includes("running") || normalized.includes("pending") || normalized.includes("validation")) {
    return "border-accent-cyan/35 bg-accent-cyan/10 text-accent-cyan";
  }
  return "border-border-default bg-surface-elevated text-text-secondary";
}

export function regulatorStyle(regulator: Regulator) {
  return {
    color: regulatorColors[regulator],
    borderColor: `${regulatorColors[regulator]}66`,
    background: `${regulatorColors[regulator]}1a`,
  };
}

export function percent(value: number) {
  return `${Math.round(value)}%`;
}
