"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { ArrowRight, ArrowLeftRight, Focus } from "lucide-react";
import { ApplicationForm } from "./application-form";
import { ApplicantConfirmation } from "./applicant-confirmation";
import { AdminList } from "./admin-list";
import { AdminDetail } from "./admin-detail";
import { Button } from "./ui/button";
import { createCase, demoReducer, initialDemoState, applicantReceipt, caseAIRequest } from "@/lib/demo-cases";
import { requestAI } from "@/lib/ai-client";
import { getSample } from "@/lib/samples";

export function Workspace() {
  const [state, dispatch] = useReducer(demoReducer, initialDemoState);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftNumber, setDraftNumber] = useState(0);
  const [showReceipts, setShowReceipts] = useState(false);
  const draftId = `applicant-draft-${draftNumber}`;
  const pending = useRef(new Map<string, AbortController>());
  const submissions = useRef(new Set<string>());
  const seeded = useRef(false);
  const main = useRef<HTMLElement>(null);
  const navigation = useRef(`${state.role}:${selectedId}:${draftNumber}`);
  useEffect(() => {
    const requests = pending.current;
    return () => { requests.forEach((controller) => controller.abort()); requests.clear(); };
  }, []);
  useEffect(() => {
    const current = `${state.role}:${selectedId}:${draftNumber}`;
    if (navigation.current === current) return;
    navigation.current = current;
    main.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [state.role, selectedId, draftNumber]);
  const submitted = state.cases.some((entry) => entry.draftId === draftId);
  const receipts = state.cases.filter((entry) => entry.source === "applicant").map(applicantReceipt);
  const selected = state.cases.find((entry) => entry.id === selectedId);
  function seed() {
    if (seeded.current) return;
    seeded.current = true;
    for (const [index, key] of (["consistent", "clarification", "purposeConflict"] as const).entries()) {
      const application = getSample(key);
      application.reference = `DEMO-2026-${String(index + 1).padStart(3, "0")}`;
      dispatch({ type: "submit", entry: createCase(application, true, { id: crypto.randomUUID(), draftId: `seed-${key}`, submittedAt: new Date().toISOString(), source: "demo" }) });
    }
  }
  async function analyze(id: string) {
    const entry = state.cases.find((item) => item.id === id);
    if (!entry || entry.ai.status === "successful" || pending.current.has(id)) return;
    const controller = new AbortController();
    const requestId = crypto.randomUUID();
    pending.current.set(id, controller);
    dispatch({ type: "ai-start", id, requestId });
    try {
      const response = await requestAI(caseAIRequest(entry), controller.signal);
      if (!controller.signal.aborted) dispatch({ type: "ai-finish", id, requestId, response });
    } catch {
      if (!controller.signal.aborted) dispatch({ type: "ai-finish", id, requestId, response: { status: "unavailable", reason: "provider_error" } });
    } finally { if (pending.current.get(id) === controller) pending.current.delete(id); }
  }
  return <div className="demo-shell">
    <header className={`demo-header no-print ${state.role === "admin" ? "admin-header" : ""}`}>
      <button className="demo-brand" onClick={() => dispatch({ type: "role", role: null })} aria-label="VizeLens · Ana sayfaya dön"><Focus size={28} /><span>Vize<span className="font-normal">Lens</span></span></button>
      <div className="demo-header-actions">
        {state.role === "admin" ? <>
          <span className="role-label">Yönetici</span>
          <Button variant="outline" onClick={() => { setSelectedId(null); dispatch({ type: "role", role: "applicant" }); }}><ArrowLeftRight />Başvuru sahibine geç</Button>
        </> : <a className="admin-entry-link" href="#main" onClick={(event) => {
          event.preventDefault();
          setSelectedId(null);
          dispatch({ type: "role", role: "admin" });
        }}>Yönetici girişi</a>}
      </div>
    </header>
    <main id="main" ref={main} tabIndex={-1} className={`demo-main ${state.role === "admin" ? "admin-width" : "applicant-width"}`}>
      {state.role === null && <section className="applicant-hero" aria-labelledby="landing-heading">
        <p className="eyebrow">VİZE BAŞVURUSU</p>
        <h1 id="landing-heading">Seyahatinizin ilk adımı.</h1>
        <p className="hero-description">Vize başvurunuz için bilgilerinizi birkaç adımda tamamlayın ve başvurunuzu iletin.</p>
        <Button className="hero-primary-action" onClick={() => dispatch({ type: "role", role: "applicant" })}>Başvuruya başla <ArrowRight aria-hidden="true" /></Button>
      </section>}
      <div hidden={state.role !== "applicant"}>
        {(submitted || showReceipts) ? <ApplicantConfirmation receipts={receipts} onNew={() => { setShowReceipts(false); if (submitted) setDraftNumber((n) => n + 1); }} /> : <>
          <div className="workspace-heading"><div><p className="eyebrow">BAŞVURU SAHİBİ</p><h1>Yolculuğunuz burada başlıyor.</h1><p>Kurgusal bilgilerinizi tamamlayın ve yönetici incelemesine gönderin.</p></div></div>
          {receipts.length > 0 && <div className="mb-5 rounded-lg border bg-white p-4 text-sm">Bu oturumda {receipts.length} başvurunuz bulunuyor. <Button variant="ghost" onClick={() => setShowReceipts(true)}>Gönderimlerimi görüntüle</Button></div>}
          <ApplicationForm key={draftId} active={state.role === "applicant"} onSubmitApplication={(application, acknowledged) => {
            if (submissions.current.has(draftId)) return;
            const entry = createCase(application, acknowledged, { id: crypto.randomUUID(), draftId, submittedAt: new Date().toISOString() });
            submissions.current.add(draftId);
            dispatch({ type: "submit", entry });
            requestAnimationFrame(() => { main.current?.focus(); window.scrollTo({ top: 0, behavior: "instant" }); });
          }} />
        </>}
      </div>
      {state.role === "admin" && (selected ? <AdminDetail key={selected.id} entry={selected} onBack={() => setSelectedId(null)} onAnalyze={() => void analyze(selected.id)} onNote={(note) => dispatch({ type: "note", id: selected.id, note })} onDecision={(input) => dispatch({ type: "decision", id: selected.id, input, at: new Date().toISOString() })} /> :
        <AdminList cases={state.cases} onSeed={seed} onOpen={(id) => { dispatch({ type: "open", id }); setSelectedId(id); }} />)}
    </main>
    <footer className="demo-footer no-print"><p>Prototip sürüm. Bilgiler yalnızca bu oturumda tutulur; sayfa yenilendiğinde silinir.</p></footer>
  </div>;
}
