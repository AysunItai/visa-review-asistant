"use client";

import { useState } from "react";
import { ArrowUpRight, FileText, Search, Plus, Filter, Inbox } from "lucide-react";
import { Button } from "./ui/button";
import { CaseAIStatus, CaseStatus } from "./case-status";
import { statusLabels, formatTimestamp, type DemoCase, type CaseStatus as Status } from "@/lib/demo-cases";

export function AdminList({ cases, onOpen, onSeed }: { cases: DemoCase[]; onOpen: (id: string) => void; onSeed: () => void }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status | "all">("all");
  const matches = [...cases].reverse().filter((entry) => (status === "all" || entry.status === status) && entry.reference.toLocaleLowerCase("tr-TR").includes(search.trim().toLocaleLowerCase("tr-TR")));
  const seeded = cases.some((entry) => entry.source === "demo");
  return <>
    <div className="workspace-heading">
      <div><p className="eyebrow">YÖNETİCİ ÇALIŞMA ALANI</p><h1>Başvurular</h1><p>Yanıtları inceleyin, gerekçeleri değerlendirin, demo kararını kaydedin.</p></div>
      <Button variant="outline" onClick={onSeed} disabled={seeded}><Plus />{seeded ? "Demo başvuruları yüklendi" : "Kurgusal başvuruları yükle"}</Button>
    </div>
    <div className="summary-grid" aria-label="Başvuru özeti">
      {[
        ["Toplam başvuru", cases.length, "Tüm gönderimler"],
        ["İnceleme sırasında", cases.filter((c) => c.status === "pending" || c.status === "reviewing").length, "Bekleyen ve incelenen"],
        ["Ek bilgi gerekli", cases.filter((c) => c.status === "information_requested").length, "Açıklama bekleniyor"],
        ["Karar verildi", cases.filter((c) => c.status === "approved" || c.status === "rejected").length, "Simüle kararlar"],
      ].map(([label, count, hint]) => <div className="summary-card" key={label}><p>{label}</p><strong>{count}</strong><span>{hint}</span></div>)}
    </div>
    <section className="case-list-panel" aria-labelledby="case-list-title">
      <div className="case-list-heading"><h2 id="case-list-title"><FileText className="size-5" />Başvuru listesi <span className="count-pill">{matches.length}</span></h2><span className="text-xs text-muted-foreground">Yalnızca bu oturum</span></div>
      <div className="case-filters">
        <div className="search-control"><label className="sr-only" htmlFor="case-search">Başvuru referansı ara</label><Search aria-hidden="true" /><input id="case-search" type="search" placeholder="Başvuru referansı ara…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="filter-control"><Filter aria-hidden="true" className="size-4" /><label htmlFor="case-filter" className="sr-only">Duruma göre filtrele</label><select id="case-filter" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="all">Tüm durumlar</option>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
      </div>
      {!matches.length ? <div className="case-empty"><Inbox size={36} /><h3>{cases.length ? "Eşleşen başvuru bulunamadı" : "İlk başvuru için hazır"}</h3><p>{cases.length ? "Aramayı veya durum filtresini değiştirin." : "Başvuru sahibi rolünden bir başvuru gönderin veya kurgusal örneklerle başlayın."}</p>{cases.length > 0 && <Button variant="outline" onClick={() => { setSearch(""); setStatus("all"); }}>Filtreleri temizle</Button>}</div> :
        <table className="case-table"><thead><tr>{["Başvuru referansı", "Gidilecek ülke", "Seyahat amacı", "Başvuru tarihi", "Durum", "AI değerlendirmesi", "İşlem"].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead>
          <tbody>{matches.map((entry) => <tr key={entry.id}>
            <td data-label="Başvuru referansı"><strong className="case-reference">{entry.reference}</strong>{entry.source === "demo" && <span className="block text-xs text-muted-foreground mt-1">Kurgusal örnek</span>}</td>
            <td data-label="Gidilecek ülke">{entry.application.destination}</td>
            <td data-label="Seyahat amacı">{entry.application.purpose}</td>
            <td data-label="Başvuru tarihi" className="case-date">{formatTimestamp(entry.submittedAt)}</td>
            <td data-label="Durum"><CaseStatus status={entry.status} /></td>
            <td data-label="AI değerlendirmesi"><CaseAIStatus ai={entry.ai} /></td>
            <td><Button variant="ghost" onClick={() => onOpen(entry.id)} aria-label={`${entry.reference} başvurusunu incele`}>İncele <ArrowUpRight /></Button></td>
          </tr>)}</tbody>
        </table>}
    </section>
    <p className="mt-5 text-xs leading-6 text-muted-foreground">Demo rolleri erişim güvenliği sağlamaz. Aynı oturumdaki kurgusal başvurular bu listede paylaşılır.</p>
  </>;
}
