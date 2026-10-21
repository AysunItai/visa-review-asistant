"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCheck,
  ClipboardList,
  Copy,
  FileSearch,
  FileText,
  Info,
  ListChecks,
  MessageCircleQuestion,
  Printer,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatMoney, formatNumber } from "@/lib/dates";
import { reportText, SCOPE_NOTE, type Review } from "@/lib/review";
import { toAmount } from "@/lib/validation";
import { AIObservations } from "./ai-observations";
import {
  aiReportText,
  aiStatusLabel,
  toAIRequest,
  type AIState,
} from "@/lib/ai-contract";

export function ReviewReport({
  report,
  stale,
  ai,
}: {
  report: Review | null;
  stale: boolean;
  ai: AIState;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!report) return;
    // Run after the new report commits. Moving focus also dismisses a mobile
    // input keyboard; later AI updates must not pull focus away again.
    const heading = headingRef.current;
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }, [report]);
  const [copyStatus, setCopyStatus] = useState<{
    report: Review;
    message: string;
    ai: AIState;
    kind: "success" | "error";
  } | null>(null);
  async function copy() {
    if (!report || stale) return;
    try {
      await navigator.clipboard.writeText(
        `${reportText(report)}\n\n${aiReportText(
          ai,
          toAIRequest(report.application)
        )}`
      );
      setCopyStatus({
        report,
        ai,
        kind: "success",
        message: "Rapor panoya kopyalandı.",
      });
    } catch {
      setCopyStatus({
        report,
        ai,
        kind: "error",
        message:
          "Kopyalanamadı. Tarayıcınızın pano iznini kontrol edip yeniden deneyin.",
      });
    }
  }
  return (
    <section
      id="review-report"
      aria-labelledby="report-title"
      className={`report-panel ${stale ? "is-stale" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-5">
        <div className="flex items-center gap-2.5">
          <FileText className="size-[18px] text-primary" />
          <h2
            ref={headingRef}
            tabIndex={-1}
            id="report-title"
            className="text-sm font-semibold"
          >
            İnceleme raporu
          </h2>
        </div>
        <Badge
          className={
            report && stale
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-border bg-muted text-muted-foreground"
          }
        >
          {report
            ? stale
              ? "Güncelleme gerekli"
              : "İncelemeye hazır"
            : "Bilgi bekleniyor"}
        </Badge>
      </div>
      <p
        role="status"
        aria-atomic="true"
        className="sr-only report-announcement"
      >
        {report && !stale
          ? `İnceleme raporu oluşturuldu. ${formatNumber(
              report.findings.length
            )} yerel kural bulgusu incelemeye hazır.`
          : ""}
      </p>
      {!report ? (
        <div className="report-empty px-7 py-12 text-center sm:px-10">
          <div className="empty-illustration" aria-hidden="true">
            <div className="empty-paper">
              <span />
              <span />
              <div>
                <Check />
                <i />
              </div>
              <div>
                <Check />
                <i />
              </div>
              <div>
                <span className="empty-dot" />
                <i />
              </div>
            </div>
            <div className="empty-glass">
              <FileSearch className="size-6" />
            </div>
          </div>
          <div className="eyebrow mt-8">DAHA NET BİR İNCELEME</div>
          <h3 className="mt-3 text-[22px] font-semibold tracking-tight">
            Her bulgunun bir dayanağı var.
          </h3>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            Başvuru bilgilerini girin; eksikleri, tutarsızlıkları ve
            netleştirilmesi gereken noktaları birlikte görün.
          </p>
          <div className="mx-auto mt-8 max-w-sm space-y-4 text-left">
            {[
              {
                icon: CalendarDays,
                title: "Tarih ve konaklama",
                text: "Seyahat aralığı ve geceleme kapsamı",
              },
              {
                icon: ListChecks,
                title: "Bütçe ve beyanlar",
                text: "Girilen tutarlar ve bilgi eksikleri",
              },
              {
                icon: MessageCircleQuestion,
                title: "İncelemeyi destekleyen sorular",
                text: "Her bulgu için somut bir netleştirme sorusu",
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <div className="rounded-lg bg-muted p-2.5">
                  <item.icon className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-[13px] font-medium">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-9 border-t pt-5 text-xs leading-5 text-muted-foreground">
            Başlamak için bir örnek başvuru da yükleyebilirsiniz.
            <br />
            Rapor, siz oluşturduğunuzda hazırlanır.
          </p>
        </div>
      ) : (
        <div className="p-5 sm:p-6">
          {stale && (
            <div
              role="status"
              className="stale-alert mb-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900"
            >
              <RotateCcw className="mt-1 size-4 shrink-0" />
              <span>
                Başvuru bilgileri değişti. Güncel rapor için yeniden analiz
                edin.
              </span>
            </div>
          )}
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-[1_1_16rem]">
              <div className="eyebrow">ÖN İNCELEME</div>
              <h3 className="mt-1.5 text-lg font-semibold">
                {report.application.reference || "Referans belirtilmedi"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {report.application.destination} <span className="px-1">·</span>{" "}
                {report.application.purpose}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="size-3.5" />
                {formatDate(report.application.departure)} –{" "}
                {formatDate(report.application.returnDate)}
              </p>
            </div>
            <div className="report-actions flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={copy}
                disabled={stale}
                aria-label="Raporu kopyala"
                title="Raporu kopyala"
              >
                <Copy />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={stale}
                onClick={() => window.print()}
                aria-label="Raporu yazdır"
                title="Raporu yazdır"
              >
                <Printer />
              </Button>
            </div>
          </div>
          <div
            role="status"
            className={`report-actions text-xs ${
              copyStatus?.kind === "error" ? "text-destructive" : "text-success"
            }`}
          >
            {copyStatus?.report === report && copyStatus.ai === ai && !stale ? (
              <p className="mb-4">{copyStatus.message}</p>
            ) : null}
          </div>
          <div className="mb-5 rounded-lg border border-border bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary">
              <ClipboardList className="size-4" />
              İnceleme özeti
            </div>
            <p className="text-[13px] leading-[1.8] text-foreground">
              {report.summary}
            </p>
          </div>
          <div className="metrics mb-7 rounded-lg border">
            <Metric
              label="Seyahat süresi"
              value={`${formatNumber(report.nights)} gece`}
              detail={
                report.nights === 0 ? "Aynı gün dönüş" : "Gidiş ile dönüş arası"
              }
            />
            <Metric
              label="Konaklama kapsamı"
              value={`${formatNumber(report.coveredNights)} / ${formatNumber(
                report.nights
              )}`}
              detail="Seyahat içindeki geceler"
            />
            <Metric
              label="Açıklama gerektiren konu sayısı"
              value={formatNumber(report.findings.length)}
              detail="Yerel kural bulgusu"
            />
          </div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Yerel kural bulguları</h3>
            <span className="text-xs text-muted-foreground">
              {formatNumber(report.findings.length)} konu
            </span>
          </div>
          <div className="space-y-3">
            {report.findings.map((finding) => (
              <article
                key={finding.ruleId}
                className="finding-card overflow-hidden rounded-lg border"
              >
                <div className="p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <Badge
                      className={
                        finding.category === "İncelenecek bilgi"
                          ? "border-border bg-muted text-muted-foreground"
                          : "border-amber-200 bg-amber-50 text-amber-900"
                      }
                    >
                      {finding.category}
                    </Badge>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {finding.ruleId}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold leading-6">
                    {finding.title}
                  </h4>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {finding.explanation}
                  </p>
                  <div className="mt-3 border-l-2 border-amber-300 pl-3">
                    <span className="text-[10px] font-semibold tracking-wider text-muted-foreground">
                      DAYANAK
                    </span>
                    <p className="mt-1 text-[13px] leading-6">
                      {finding.evidence}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 border-t bg-muted px-4 py-3">
                  <MessageCircleQuestion className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-[10px] font-semibold tracking-wider text-primary">
                      NETLEŞTİRME SORUSU
                    </p>
                    <p className="mt-1 text-xs leading-5">{finding.question}</p>
                  </div>
                </div>
              </article>
            ))}
            {!report.findings.length && (
              <div className="rounded-lg border p-5">
                <CheckCheck className="mb-3 size-5 text-primary" />
                <h4 className="text-sm font-medium">
                  Bu kontrollerde tutarsızlık tespit edilmedi
                </h4>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Girilen tarih, bütçe ve beyan bilgileri bu sınırlı kontroller
                  içinde tutarlı. Bu bir vize uygunluk değerlendirmesi değildir.
                </p>
              </div>
            )}
          </div>
          <AIObservations state={ai} application={report.application} />
          <div className="mt-6 border-t pt-5">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold">
              <Info className="size-3.5" />
              Kullanılan bilgiler
            </h3>
            <dl className="report-details space-y-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Beyan edilen bütçe</dt>
                <dd>
                  {formatMoney(
                    toAmount(report.application.budget),
                    report.application.currency
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  Kullanıcı maliyet tahmini
                </dt>
                <dd>
                  {formatMoney(
                    toAmount(report.application.estimatedCost),
                    report.application.currency
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  Konaklama kaydı / işaretli beyan
                </dt>
                <dd>
                  {report.application.stays.length} /{" "}
                  {
                    Object.values(report.application.declarations).filter(
                      Boolean
                    ).length
                  }{" "}
                  beyan
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
              Tarihler, konaklama aralıkları, bütçe ve beyan işaretleri
              kullanıldı. Ülke yalnızca bağlamdır. Serbest açıklama kurallarda
              değerlendirilmez.
            </p>
          </div>
        </div>
      )}
      <div className="report-scope border-t bg-muted px-6 py-5">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" />
          İnsan değerlendirmesini destekler
        </div>
        <p className="text-[11px] leading-[1.8] text-muted-foreground">
          {SCOPE_NOTE}
        </p>
        <span className="mt-3 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          {aiStatusLabel(ai)} <ArrowUpRight className="size-3" />
        </span>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="metric">
      <div className="text-xs font-medium leading-5 text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold tracking-tight sm:text-[22px]">
        {value}
      </div>
      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
        {detail}
      </p>
    </div>
  );
}
