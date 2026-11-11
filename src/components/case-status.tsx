import { statusLabels, type CaseStatus, type CaseAI } from "@/lib/demo-cases";
import { concernLabels } from "@/lib/ai-contract";

export function CaseStatus({ status }: { status: CaseStatus }) {
  return <span className={`case-badge status-${status}`}><span aria-hidden="true" className="status-dot" />{statusLabels[status]}</span>;
}
export function CaseAIStatus({ ai }: { ai: CaseAI }) {
  if (ai.status === "successful") return <span className={`case-badge concern-${ai.result.concernLevel}`}>{concernLabels[ai.result.concernLevel]}</span>;
  return <span className={`text-sm ${ai.status === "failed" ? "text-destructive" : "text-muted-foreground"}`}>
    {ai.status === "not_started" ? "Başlatılmadı" : ai.status === "loading" ? "Hazırlanıyor…" : "Tamamlanamadı"}
  </span>;
}
