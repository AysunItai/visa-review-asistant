import type { Application } from "@/lib/validation";
import { declarations } from "@/lib/validation";
import { profileEntries, profileLabels } from "@/lib/applicant-profile";
import { applicationSteps } from "@/lib/application-steps";
import { dayNumber, formatDate } from "@/lib/dates";
import { Button } from "./ui/button";

export function ApplicationSummary({ application: a, onEdit }: {
  application: Application;
  onEdit: (step: number) => void;
}) {
  const financialLabels = [profileLabels.hasAssets, profileLabels.assets, profileLabels.fundingMethods];
  const profile = profileEntries(a.profile);
  const groups: [string, string][][] = [
    [
      ["Başvuru referansı", a.reference || "Belirtilmedi"],
      ["Ülke ve seyahat amacı", `${a.destination} · ${a.purpose}`],
      ["Seyahat tarihleri", `${formatDate(a.departure)} – ${formatDate(a.returnDate)}`],
      ["Süre", `${dayNumber(a.returnDate) - dayNumber(a.departure)} gece (dönüş günü hariç)`],
      ["Seyahat amacı açıklaması", a.narratives.travelPurpose || "Belirtilmedi"],
    ],
    profile.filter(([label]) => !financialLabels.includes(label)),
    [
      ["Bütçe / tahmini maliyet", `${a.budget} / ${a.estimatedCost} ${a.currency}`],
      ...profile.filter(([label]) => financialLabels.includes(label)),
      ["Finansman açıklaması", a.narratives.funding || "Belirtilmedi"],
      ["Konaklama", a.stays.length ? a.stays.map((stay) => `${stay.type}: ${formatDate(stay.checkIn)} – ${formatDate(stay.checkOut)}`).join("; ") : "Kayıt yok"],
      ["Konaklama açıklaması", a.narratives.accommodation || "Belirtilmedi"],
      ["Beyanlar", (Object.keys(declarations) as (keyof typeof declarations)[]).map((key) => `${declarations[key]}: ${a.declarations[key] ? "İşaretli" : "İşaretlenmedi"}`).join("; ")],
    ],
  ];
  return (
    <section className="application-summary p-4 sm:p-6" aria-labelledby="summary-title">
      <h3 id="summary-title" className="text-lg font-semibold">Bilgilerinizi kontrol edin</h3>
      <p className="mt-2 text-sm text-muted-foreground">Düzenle düğmeleriyle ilgili adıma dönebilirsiniz. Girdiğiniz bilgiler korunur.</p>
      {groups.map((entries, index) => (
        <section key={index} className="border-b py-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">{index + 1}. {applicationSteps[index]}</h4>
            <Button type="button" variant="ghost" onClick={() => onEdit(index)} aria-label={`${applicationSteps[index]}: Düzenle`}>Düzenle</Button>
          </div>
          <dl className="summary-details">
            {entries.length ? entries.map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            )) : <div><dt>Ek bilgiler</dt><dd>Belirtilmedi</dd></div>}
          </dl>
        </section>
      ))}
    </section>
  );
}
