import { Sparkles, MessageCircleQuestion, LoaderCircle } from "lucide-react";
import { Badge } from "./ui/badge";
import {
  aiFailureMessages, evidenceSources, toAIRequest, assessmentLabels,
  assessmentLimitations, orderedFindings, priorityLabels, type AIState, type AIFinding,
} from "@/lib/ai-contract";
import type { Application } from "@/lib/validation";

export function AIObservations({ state, application }: { state: AIState; application: Application }) {
  const sources = new Map(evidenceSources(toAIRequest(application)).map((source) => [source.fieldId, source]));
  const result = state.status === "success" ? state.result : null;
  const priorityStyle = {
    low: "border-border bg-muted text-muted-foreground",
    medium: "border-amber-200 bg-amber-50 text-amber-900",
    high: "border-rose-200 bg-rose-50 text-rose-900",
  };
  function evidenceList(evidence: AIFinding["evidence"]) {
    return <dl className="my-3 space-y-3 border-l-2 border-border pl-3">
      {evidence.map((item, i) => <div key={`${item.fieldId}-${i}`}>
        <dt className="text-sm font-medium">{sources.get(item.fieldId)?.label}</dt>
        <dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{item.value}</dd>
      </div>)}
    </dl>;
  }
  return (
    <section className="mt-6 border-t pt-5" aria-labelledby="ai-assessment-title" aria-busy={state.status === "loading"}>
      <h3 id="ai-assessment-title" className="mb-3 flex items-center gap-2 text-base font-semibold">
        <Sparkles className="size-4" /> AI Ön Değerlendirme
      </h3>
      <div role={state.status === "unavailable" ? "alert" : "status"} aria-atomic="true" className="text-sm leading-6 text-muted-foreground">
        {state.status === "local" && "AI kullanılmadı. Yalnızca yerel kontroller çalıştırıldı."}
        {state.status === "loading" && <span className="flex items-center gap-2"><LoaderCircle className="size-4 animate-spin" />OpenAI yanıtı bekleniyor. Yerel rapor hazır.</span>}
        {state.status === "unavailable" && aiFailureMessages[state.reason]}
        {result && `OpenAI ön değerlendirmesi hazır: ${assessmentLabels[result.overallAssessment]}.`}
      </div>
      {result && <div className="mt-4 space-y-5">
        <div className="rounded-lg border bg-muted p-4">
          <h4 className="font-semibold text-primary">{assessmentLabels[result.overallAssessment]}</h4>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{result.summary}</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Bu durum başvurudaki bilgilerin incelemesini anlatır. Önemli bir sorun tespit edilmemesi vize uygunluğunu veya vize onayını doğrulamaz.</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Açıklama gerektiren konular</h4>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Yerel tarih ve bütçe kontrolleri yukarıdadır. Aşağıdakiler AI tarafından belirlenen ek konulardır. Öncelik, açıklama ihtiyacını belirtir.</p>
          {!result.findings.length && <p className="mt-3 text-sm leading-6">AI ek bir konu bildirmedi. Bu, bilgilerin veya belgelerin doğrulandığı anlamına gelmez.</p>}
          <div className="mt-3 space-y-3">
            {orderedFindings(result).map((finding, index) => <article key={index} className="ai-observation-card rounded-lg border p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge className={priorityStyle[finding.priority]}>{priorityLabels[finding.priority]}</Badge>
                <span className="text-sm text-muted-foreground">{finding.category} · AI-{index + 1}</span>
              </div>
              <h5 className="text-sm font-semibold">{finding.title}</h5>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{finding.explanation}</p>
              {evidenceList(finding.evidence)}
              <div className="flex gap-2 rounded-md bg-muted p-3 text-sm leading-6">
                <MessageCircleQuestion className="mt-1 size-4 shrink-0 text-primary" />
                <p><span className="font-medium">Netleştirme sorusu: </span>{finding.clarificationQuestion}</p>
              </div>
            </article>)}
          </div>
        </div>
        <section aria-labelledby="consistent-points-title">
          <h4 id="consistent-points-title" className="text-sm font-semibold">Tutarlı noktalar</h4>
          {!result.consistentPoints.length && <p className="mt-2 text-sm leading-6 text-muted-foreground">AI ayrıca desteklenmiş bir tutarlı nokta bildirmedi.</p>}
          {result.consistentPoints.map((point, index) => <div key={index} className="mt-3 rounded-lg border p-4">
            <p className="text-sm leading-6">{point.explanation}</p>{evidenceList(point.evidence)}
          </div>)}
        </section>
        <section aria-labelledby="assessment-limitations-title" className="rounded-lg border bg-muted p-4">
          <h4 id="assessment-limitations-title" className="text-sm font-semibold">Değerlendirme sınırları</h4>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
            {assessmentLimitations(result).map((limit, index) => <li key={index}>{limit}</li>)}
          </ul>
        </section>
      </div>}
    </section>
  );
}
