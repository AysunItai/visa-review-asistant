import { CircleCheck, ArrowRight, Clock3 } from "lucide-react";
import { Button } from "./ui/button";
import { CaseStatus } from "./case-status";
import { formatTimestamp, type ApplicantReceipt } from "@/lib/demo-cases";

export function ApplicantConfirmation({ receipts, onNew }: { receipts: ApplicantReceipt[]; onNew: () => void }) {
  return <section className="applicant-confirmation" aria-labelledby="confirmation-heading">
    <div className="success-mark"><CircleCheck size={32} /></div>
    <p className="eyebrow mt-6">GÖNDERİM TAMAMLANDI</p>
    <h1 id="confirmation-heading" className="mt-3 text-3xl font-semibold tracking-tight">Başvurunuz alındı.</h1>
    <p className="mx-auto mt-4 max-w-lg text-muted-foreground leading-7">Bilgileriniz yönetici incelemesine hazır. Bu ekrana döndüğünüzde başvurunuzun güncel demo durumunu görebilirsiniz.</p>
    <div className="mt-8 space-y-4 text-left" aria-live="polite">
      {[...receipts].reverse().map((receipt) => <article key={receipt.id} className="receipt-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><p className="text-xs font-medium text-muted-foreground">BAŞVURU REFERANSI</p><h2 className="mt-2 break-words text-xl font-semibold">{receipt.reference}</h2><p className="mt-1 text-sm text-muted-foreground">{receipt.destination}</p></div>
          <CaseStatus status={receipt.status} />
        </div>
        <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="size-4 shrink-0" />{formatTimestamp(receipt.submittedAt)}</p>
        {receipt.decisionAt && <p className="mt-3 text-sm leading-6">Demo durumu güncellendi: {formatTimestamp(receipt.decisionAt)}. Bu durum resmî bir vize kararı değildir.</p>}
      </article>)}
    </div>
    <Button className="mt-7" variant="outline" onClick={onNew}>Yeni kurgusal başvuru <ArrowRight /></Button>
    <p className="mt-6 text-sm leading-6 text-muted-foreground">Veriler yalnızca bu oturumda tutulur. Yenileme tüm demo verilerini siler.</p>
  </section>;
}
