"use client";

import { useState, useRef, useEffect } from "react";
import {
  ArrowUpRight,
  BookOpen,
  FileSearch,
  Focus,
  LockKeyhole,
  PanelLeftClose,
  ShieldCheck,
} from "lucide-react";
import { ApplicationForm } from "@/components/application-form";
import { ReviewReport } from "@/components/review-report";
import { HowItWorks } from "@/components/how-it-works";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { reviewApplication, type Review } from "@/lib/review";
import { toAIRequest, aiStatusLabel, type AIState } from "@/lib/ai-contract";
import { requestAI } from "@/lib/ai-client";
import type { Application } from "@/lib/validation";
import type { AnalysisOptions } from "@/lib/narratives";

export function Workspace() {
  const [view, setView] = useState<"review" | "how">("review");
  const [screen, setScreen] = useState<"form" | "report">("form");
  const [generationError, setGenerationError] = useState("");
  const [lastOptions, setLastOptions] = useState<AnalysisOptions>({ useAI: false, anonymized: false });
  const busy = useRef(false);
  const [report, setReport] = useState<Review | null>(null);
  const [stale, setStale] = useState(false);
  const [ai, setAI] = useState<AIState>({ status: "local" });
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  useEffect(() => () => controller.current?.abort(), []);
  function cancelPending() {
    generation.current++;
    controller.current?.abort();
    controller.current = null;
    busy.current = false;
  }
  function analyze(application: Application, options: AnalysisOptions) {
    if (busy.current) return;
    cancelPending();
    setGenerationError("");
    try {
      setReport(reviewApplication(application));
    } catch {
      setGenerationError("Rapor oluşturulamadı. Bilgileriniz korundu; inceleme düğmesiyle yeniden deneyebilirsiniz.");
      setStale(true);
      return;
    }
    setLastOptions(options);
    setStale(false);
    setScreen("report");
    if (!options.useAI) {
      setAI({ status: "local" });
      return;
    }
    if (!options.anonymized) {
      setAI({ status: "unavailable", reason: "consent_required" });
      return;
    }
    const current = generation.current;
    const pending = new AbortController();
    controller.current = pending;
    busy.current = true;
    setAI({ status: "loading" });
    void requestAI(toAIRequest(application), pending.signal).then((result) => {
      if (generation.current !== current || pending.signal.aborted) return;
      controller.current = null;
      busy.current = false;
      setAI(result);
    });
  }
  return (
    <div className="app-shell">
      <aside className="navigation-rail">
        <div className="brand-area">
          <a href="#main" onClick={() => setView("review")} className="brand">
            <span className="brand-mark">
              <Focus className="size-[22px]" strokeWidth={1.7} />
            </span>
            <span>
              Vize<span className="font-normal">Lens</span>
              <span className="brand-subtitle">İNCELEME ÇALIŞMA ALANI</span>
            </span>
          </a>
          <Badge className="prototype-badge">Araştırma prototipi</Badge>
        </div>
        <div className="nav-label">ÇALIŞMA ALANI</div>
        <nav aria-label="Ana gezinme">
          <button
            onClick={() => setView("review")}
            aria-current={view === "review" ? "page" : undefined}
            className={`nav-item ${view === "review" ? "active" : ""}`}
          >
            <FileSearch />
            Başvuru İncele{view === "review" && <span className="nav-dot" />}
          </button>
          <button
            onClick={() => setView("how")}
            aria-current={view === "how" ? "page" : undefined}
            className={`nav-item ${view === "how" ? "active" : ""}`}
          >
            <BookOpen />
            Nasıl Çalışır
          </button>
        </nav>
        <div className="rail-bottom">
          <div className="rail-note">
            <ShieldCheck className="mb-3 size-5 text-primary" />
            <p className="text-xs font-medium">Kanıta dayalı, insan odaklı.</p>
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
              Bilgileri netleştirin.
              <br />
              Son değerlendirme sizde.
            </p>
          </div>
          <div className="mt-5 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>VizeLens · Prototip v0.1</span>
            <PanelLeftClose className="size-3.5" aria-hidden="true" />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="flex items-center gap-2 text-xs text-white">
            <span className="hidden sm:inline">Çalışma alanı</span>
            <span className="hidden text-white/80 sm:inline">/</span>
            <span className="font-medium text-white">
              {view === "review" ? "Başvuru inceleme" : "Nasıl çalışır"}
            </span>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] text-white sm:text-xs">
            <span className="size-1.5 shrink-0 rounded-full bg-white" />
            {aiStatusLabel(ai)}
          </span>
        </header>
        <main id="main" tabIndex={-1} className="workspace-main">
          <div hidden={view !== "review"}>
            <div className="page-heading workflow-heading">
              <div>
                <div className="eyebrow mb-2">BAŞVURU ÖN İNCELEMESİ</div>
                <h1 className="page-title">
                  Ayrıntıları görün, soruları netleştirin.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Seyahat bilgilerini bir araya getirin. Eksikleri ve
                  tutarsızlıkları,
                  <br className="hidden xl:block" /> dayanaklarıyla birlikte
                  inceleyin.
                </p>
              </div>
              <span className="privacy-chip">
                <LockKeyhole className="size-3.5" />
                Form bu oturumda tutulur
              </span>
            </div>
            <div className="workflow-container">
              <div hidden={screen !== "form"}>
              {report && (
                <div role="status" className="workflow-notice">
                  <p>{stale ? "Bilgiler değişti. Son rapor güncel değil; düzenlemelerden sonra yeniden oluşturun." : "Başvurunuzu düzenliyorsunuz. Son raporunuz hazır."}</p>
                  <Button variant="outline" onClick={() => setScreen("report")}>Son raporu görüntüle</Button>
                </div>
              )}
              {generationError && <p role="alert" className="workflow-notice text-destructive">{generationError}</p>}
              <ApplicationForm
                active={screen === "form" && view === "review"}
                onReview={analyze}
                analyzing={ai.status === "loading"}
                onEdited={() => {
                  cancelPending();
                  setAI((previous) =>
                    previous.status === "loading"
                      ? { status: "unavailable", reason: "cancelled" }
                      : previous
                  );
                  if (report) setStale(true);
                }}
                onClear={() => {
                  cancelPending();
                  setAI({ status: "local" });
                  setReport(null);
                  setStale(false);
                }}
              />
              </div>
              {screen === "report" && report && (
                <>
                  <ReviewReport report={report} stale={stale} ai={ai}
                    onEdit={() => {
                      cancelPending();
                      setAI((previous) => previous.status === "loading" ? { status: "unavailable", reason: "cancelled" } : previous);
                      setScreen("form");
                    }} />
                  {!stale && ai.status === "unavailable" && lastOptions.anonymized && (
                    <div className="report-actions mt-4">
                      <Button variant="outline" onClick={() => analyze(report.application, lastOptions)}>Yapay zekâ incelemesini yeniden dene</Button>
                    </div>
                  )}
                </>
              )}
            </div>
            <footer className="workspace-footer">
              <span>
                Örnek tutarlılık kontrolleri · Resmî mevzuat sorgulanmaz
              </span>
              <button
                onClick={() => {
                  setView("how");
                  window.scrollTo({ top: 0 });
                }}
                className="inline-flex min-h-11 items-center gap-1.5 self-start text-accent hover:underline"
              >
                İnceleme yaklaşımımız <ArrowUpRight className="size-3.5" />
              </button>
            </footer>
          </div>
          {view === "how" && <HowItWorks onStart={() => setView("review")} />}
        </main>
      </div>
    </div>
  );
}
