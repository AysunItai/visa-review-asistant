"use client";

import { useState } from "react";
import { ArrowLeft, Copy, Printer, Sparkles, LoaderCircle, FileText } from "lucide-react";
import { Button } from "./ui/button";
import { CaseStatus } from "./case-status";
import { ReviewReport } from "./review-report";
import { HumanReview } from "./human-review";
import { caseReportText, submittedSections } from "@/lib/case-report";
import { reportAIState, formatTimestamp, type DemoCase, type DecisionInput } from "@/lib/demo-cases";
import { formatDate } from "@/lib/dates";

export function AdminDetail({ entry, onBack, onAnalyze, onNote, onDecision }: {
  entry: DemoCase; onBack: () => void; onAnalyze: () => void; onNote: (note: string) => void; onDecision: (input: DecisionInput) => void;
}) {
  const [copied, setCopied] = useState<{ entry: DemoCase; message: string } | null>(null);
  const busy = entry.ai.status === "loading";
  return <div className="admin-detail">
    <div className="detail-toolbar no-print">
      <Button variant="ghost" onClick={onBack}><ArrowLeft />Başvurulara dön</Button>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={async () => {
        try { await navigator.clipboard.writeText(caseReportText(entry)); setCopied({ entry, message: "Yönetici raporu panoya kopyalandı." }); }
        catch { setCopied({ entry, message: "Kopyalanamadı. Tarayıcının pano iznini kontrol edin veya yazdırmayı kullanın." }); }
      }}><Copy />Raporu kopyala</Button><Button variant="outline" onClick={() => window.print()}><Printer />Raporu yazdır</Button></div>
    </div>
    <p role="status" className="no-print mb-3 text-sm text-muted-foreground">{copied?.entry === entry ? copied.message : ""}</p>
    <section className="case-overview" aria-labelledby="case-title">
      <div><p className="eyebrow">BAŞVURU DETAYI</p><h1 id="case-title" className="break-words">{entry.reference}</h1><p className="mt-2 text-muted-foreground">{entry.application.destination} · {entry.application.purpose}</p></div>
      <CaseStatus status={entry.status} />
      <dl className="case-overview-meta"><div><dt>Seyahat tarihleri</dt><dd>{formatDate(entry.application.departure)} – {formatDate(entry.application.returnDate)}</dd></div><div><dt>Başvuru tarihi</dt><dd>{formatTimestamp(entry.submittedAt)}</dd></div><div><dt>Gönderim türü</dt><dd>Kurgusal demo başvurusu</dd></div></dl>
    </section>
    <nav className="case-section-nav no-print" aria-label="Başvuru bölümleri"><a href="#submitted-answers">Gönderilen yanıtlar</a><a href="#analysis-section">Yerel kontroller ve AI</a><a href="#human-review">İnsan değerlendirmesi</a></nav>
    <div className="case-detail-grid">
      <div className="case-main">
        <section id="submitted-answers" className="answers-panel" aria-labelledby="answers-title">
          <div className="panel-title"><FileText className="size-5" /><h2 id="answers-title">Gönderilen başvuru yanıtları</h2></div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Gönderim anındaki yanıtlar korunur. Gizlenen koşullu bilgiler bu başvuruya dahil değildir.</p>
          {submittedSections(entry).map((section, index) => <section className="answer-section" key={section.title}>
            <h3><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{section.title}</h3>
            <dl className="answer-grid">{section.entries.map((answer) => <div key={answer.id} data-field-id={answer.id} className={answer.value.length > 95 ? "answer-wide" : ""}><dt>{answer.label}</dt><dd>{answer.value}</dd></div>)}</dl>
          </section>)}
          <p className="rounded-lg bg-muted p-3 text-xs leading-6 text-muted-foreground">Beyan kutuları yüklenmiş veya doğrulanmış belge anlamına gelmez. Bu demoda belge yükleme yoktur.</p>
        </section>
        <section id="analysis-section" aria-labelledby="analysis-heading">
          <div className="analysis-heading"><div><h2 id="analysis-heading">Yerel kontroller ve AI</h2><p>Hesaplanan kontroller ve gerekçeli ön değerlendirme.</p></div>
            <Button className="no-print" onClick={onAnalyze} disabled={busy || entry.ai.status === "successful"}>{busy ? <LoaderCircle className="animate-spin" /> : <Sparkles />}{busy ? "AI değerlendiriyor…" : entry.ai.status === "failed" ? "AI değerlendirmesini yeniden dene" : entry.ai.status === "successful" ? "AI değerlendirmesi hazır" : "AI değerlendirmesi oluştur"}</Button>
          </div>
          <p className="no-print mb-4 text-xs leading-6 text-muted-foreground">Başvuru sahibinin gönderim onayıyla yalnızca bu başvurunun yanıtları OpenAI’a gönderilir. İç notlar ve insan kararı gönderilmez. API kullanım ücreti oluşabilir.</p>
          <ReviewReport report={entry.local} stale={false} ai={reportAIState(entry.ai)} showActions={false} focusOnMount={false} showApplicationDetails={false} />
        </section>
      </div>
      <HumanReview entry={entry} onNote={onNote} onDecision={onDecision} />
    </div>
  </div>;
}
