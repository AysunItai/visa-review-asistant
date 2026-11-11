"use client";

import { useState } from "react";
import { Check, Pencil, ShieldCheck } from "lucide-react";
import { Button } from "./ui/button";
import { decisionLabels, decisionSchema, statusLabels, formatTimestamp, type DemoCase, type DecisionInput } from "@/lib/demo-cases";

export function HumanReview({ entry, onNote, onDecision }: { entry: DemoCase; onNote: (note: string) => void; onDecision: (input: DecisionInput) => void }) {
  const [editing, setEditing] = useState(false);
  const [action, setAction] = useState<DecisionInput["action"] | "">("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<DecisionInput | null>(null);
  const [saved, setSaved] = useState(false);
  function reset() { setAction(""); setReason(""); setError(""); setPreview(null); setSaved(false); }
  return <aside className="human-review" id="human-review" aria-labelledby="human-review-title">
    <div className="panel-title"><ShieldCheck className="size-5" /><h2 id="human-review-title">İnsan değerlendirmesi</h2></div>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">Karar size aittir. AI değerlendirmesi karar seçmez veya uygulamaz.</p>
    <div className="no-print mt-6">
      <label htmlFor="reviewer-note" className="text-sm font-semibold">İç inceleme notu</label>
      <textarea id="reviewer-note" value={entry.reviewerNote} maxLength={2000} rows={4} className="field-control mt-2 resize-y" placeholder="İnceleme sırasında aldığınız notlar…" onChange={(e) => onNote(e.target.value)} aria-describedby="note-hint" />
      <p id="note-hint" className="mt-2 text-xs leading-5 text-muted-foreground">Oturumda otomatik tutulur. Başvuru sahibine gösterilmez, OpenAI’a gönderilmez.</p>
    </div>
    <div className="print-only mt-4"><h3 className="font-semibold">İç inceleme notu</h3><p className="whitespace-pre-wrap">{entry.reviewerNote || "Not eklenmedi."}</p></div>
    {entry.decision && <div className="decision-saved mt-6" aria-live="polite">
      <p className="flex items-center gap-2 font-semibold"><Check className="size-4" />{saved ? "Demo kararı kaydedildi" : "Kaydedilen demo kararı"}</p>
      <p className="mt-3 font-semibold">{statusLabels[entry.status]}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{entry.decision.reason || "Gerekçe eklenmedi."}</p>
      <p className="mt-3 text-xs text-muted-foreground">{formatTimestamp(entry.decision.decidedAt)}</p>
      {!editing && <Button className="no-print mt-4" variant="outline" onClick={() => { reset(); setEditing(true); }}><Pencil />Demo kararını düzenle</Button>}
    </div>}
    {(!entry.decision || editing) && <div className="no-print mt-6 border-t pt-5">
      {!preview ? <form noValidate onSubmit={(e) => {
        e.preventDefault();
        if (!action) { setError("Bir demo kararı seçin."); document.getElementById("decision-approve")?.focus(); return; }
        const parsed = decisionSchema.safeParse({ action, reason });
        if (!parsed.success) { setError(parsed.error.issues[0].message); document.getElementById("decision-reason")?.focus(); return; }
        setError(""); setPreview(parsed.data);
      }}>
        <fieldset aria-describedby={error ? "decision-error" : undefined}><legend className="mb-3 text-sm font-semibold">Simüle karar seçin</legend>
          <div className="space-y-2">{Object.entries(decisionLabels).map(([key, label]) => <label key={key} className={`decision-option ${action === key ? "selected" : ""}`}><input id={`decision-${key}`} type="radio" name="human-decision" value={key} checked={action === key} onChange={() => { setAction(key as DecisionInput["action"]); setError(""); }} /><span>{label}</span></label>)}</div>
        </fieldset>
        <label htmlFor="decision-reason" className="mt-5 block text-sm font-semibold">Karar gerekçesi {action && action !== "approve" ? "(zorunlu)" : "(isteğe bağlı)"}</label>
        <textarea id="decision-reason" className="field-control mt-2" rows={3} maxLength={2000} value={reason} onChange={(e) => { setReason(e.target.value); setError(""); }} required={action !== "" && action !== "approve"} aria-invalid={Boolean(error)} aria-describedby={error ? "decision-error" : undefined} />
        {error && <p id="decision-error" role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
        <Button type="submit" className="mt-4 w-full">Kararı gözden geçir</Button>
      </form> : <div className="decision-preview" role="region" aria-label="Karar onayı">
        <p className="text-xs font-semibold tracking-wider text-muted-foreground">ONAYLAMADAN ÖNCE</p>
        <h3 className="mt-3 text-lg font-semibold">{decisionLabels[preview.action]}</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{preview.reason || "Gerekçe eklenmedi."}</p>
        <p className="mt-4 text-xs leading-6 text-muted-foreground">Bu işlem yalnızca demo durumunu günceller. Resmî bir kuruma gönderim yapılmaz.</p>
        <Button className="mt-4 w-full" onClick={() => { onDecision(preview); setEditing(false); setPreview(null); setSaved(true); }}>Simüle kararı onayla</Button>
        <Button variant="ghost" className="mt-2 w-full" onClick={() => setPreview(null)}>Geri dön ve düzenle</Button>
      </div>}
      {editing && <Button variant="ghost" className="mt-3 w-full" onClick={() => { reset(); setEditing(false); }}>Değişiklikten vazgeç</Button>}
    </div>}
    {!entry.decision && <p className="print-only mt-4">Henüz insan kararı kaydedilmedi.</p>}
    <p className="mt-6 border-t pt-4 text-xs leading-6 text-muted-foreground">Simüle demo kararıdır. Bir elçiliğe başvuru göndermez veya vize vermez.</p>
  </aside>;
}
