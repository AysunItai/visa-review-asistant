import { Sparkles, MessageCircleQuestion, LoaderCircle } from "lucide-react";
import { Badge } from "./ui/badge";
import {
  aiFailureMessages,
  evidenceSources,
  toAIRequest,
  type AIState,
} from "@/lib/ai-contract";
import type { Application } from "@/lib/validation";

export function AIObservations({
  state,
  application,
}: {
  state: AIState;
  application: Application;
}) {
  const sources = new Map(
    evidenceSources(toAIRequest(application)).map((source) => [
      source.fieldId,
      source,
    ])
  );
  return (
    <section
      className="mt-6 border-t pt-5"
      aria-labelledby="ai-observations-title"
      aria-busy={state.status === "loading"}
    >
      <h3
        id="ai-observations-title"
        className="mb-3 flex items-center gap-2 text-sm font-semibold"
      >
        <Sparkles className="size-4 text-primary" />
        Yapay zekâ gözlemleri
      </h3>
      <div role="status" className="text-sm leading-6 text-muted-foreground">
        {state.status === "local" &&
          "AI kullanılmadı. Yalnızca yerel kontroller çalıştırıldı."}
        {state.status === "loading" && (
          <span className="flex items-center gap-2">
            <LoaderCircle className="size-4 animate-spin" />
            OpenAI yanıtı bekleniyor. Yerel rapor hazır.
          </span>
        )}
        {state.status === "unavailable" && aiFailureMessages[state.reason]}
        {state.status === "success" &&
          "OpenAI yanıtı · Bu gözlemler yerel kural bulgularından ayrıdır ve insan tarafından doğrulanmalıdır."}
      </div>
      {state.status === "success" && (
        <div className="mt-4 space-y-3">
          {!state.result.observations.length && (
            <p className="rounded-lg border p-4 text-sm leading-6">
              Sağlayıcı ek gözlem bildirmedi. Bu, bilgilerin doğrulandığı veya
              eksiksiz olduğu anlamına gelmez.
            </p>
          )}
          {state.result.observations.map((observation, index) => (
            <article
              key={index}
              className="ai-observation-card rounded-lg border p-4"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <Badge className="border-amber-200 bg-amber-50 text-amber-900">
                  {observation.category}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  AI-{index + 1} · OpenAI
                </span>
              </div>
              <h4 className="text-sm font-semibold">{observation.title}</h4>
              <p className="mt-2 text-sm leading-6">
                {observation.explanation}
              </p>
              <div className="my-3 space-y-2 border-l-2 border-border pl-3">
                {observation.evidence.map((evidence, i) => (
                  <div key={i}>
                    <p className="text-sm font-medium">
                      {sources.get(evidence.fieldId)?.label}
                    </p>
                    <code className="break-all text-sm text-muted-foreground">
                      {evidence.fieldId}
                    </code>
                    <blockquote className="mt-1 whitespace-pre-wrap text-sm leading-5">
                      {evidence.quote || "Alan boş bırakıldı."}
                    </blockquote>
                  </div>
                ))}
              </div>
              <p className="flex gap-2 rounded-md bg-muted p-3 text-sm leading-5">
                <MessageCircleQuestion className="mt-0.5 size-4 shrink-0 text-primary" />
                {observation.question}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
