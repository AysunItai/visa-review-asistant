"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type FieldPath,
} from "react-hook-form";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  FileCheck2,
  Info,
  LoaderCircle,
  MessageSquareText,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  UserRound,
  Wallet,
  Waypoints,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { ApplicantProfileFields } from "@/components/applicant-profile-fields";
import {
  applicationSchema,
  currencies,
  declarations,
  destinations,
  emptyApplication,
  purposes,
  stayTypes,
  type Application,
} from "@/lib/validation";
import { getSample, sampleLabels, sampleDescriptions, type SampleKey } from "@/lib/samples";
import { applicationSteps, stepForField, validateStep } from "@/lib/application-steps";
import { dayNumber } from "@/lib/dates";
import { ApplicationSummary } from "@/components/application-summary";
import { narrativeFields, type AnalysisOptions } from "@/lib/narratives";

export function ApplicationForm({
  onReview,
  onEdited,
  onClear,
  analyzing,
  active,
}: {
  onReview: (application: Application, options: AnalysisOptions) => void;
  onEdited: () => void;
  onClear: () => void;
  analyzing: boolean;
  active: boolean;
}) {
  const form = useForm<Application>({ defaultValues: emptyApplication() });
  const { register, control, formState, getFieldState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "stays" });
  const [sample, setSample] = useState<SampleKey>("clarification");
  const [feedback, setFeedback] = useState("");
  const [useAI, setUseAI] = useState(false);
  const [anonymized, setAnonymized] = useState(false);
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [summary, setSummary] = useState<Application | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const departure = useWatch({ control, name: "departure" });
  const returnDate = useWatch({ control, name: "returnDate" });
  const nights = dayNumber(returnDate) - dayNumber(departure);
  const wasActive = useRef(active);
  useEffect(() => {
    if (active && !wasActive.current) {
      headingRef.current?.focus({ preventScroll: true });
      headingRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
    }
    wasActive.current = active;
  }, [active]);
  const currency = useWatch({ control, name: "currency" });
  const notes = useWatch({ control, name: "notes" });
  const error = (path: FieldPath<Application>) =>
    getFieldState(path, formState).error?.message;
  const accessible = (path: FieldPath<Application>, hint = false) => ({
    id: path,
    "aria-invalid": Boolean(error(path)),
    "aria-describedby":
      [hint ? `${path}-hint` : "", error(path) ? `${path}-error` : ""]
        .filter(Boolean)
        .join(" ") || undefined,
  });
  function focusStep(next: number, invalid = false) {
    setStep(next);
    requestAnimationFrame(() => {
      const container = document.getElementById(`application-step-${next}`);
      const field = invalid ? container?.querySelector<HTMLElement>('[aria-invalid="true"]') : null;
      const target = field ?? headingRef.current;
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "start", behavior: "auto" });
    });
  }
  function showErrors(issues: { path: PropertyKey[]; message: string }[], final: boolean) {
    const firstStep = final ? Math.min(...issues.map((issue) => stepForField(issue.path.join(".")))) : step;
    const paths = new Set<string>();
    for (const issue of issues) {
      const path = issue.path.join(".");
      if (!paths.has(path)) {
        form.setError(path as FieldPath<Application>, { type: "validate", message: issue.message });
        paths.add(path);
      }
    }
    focusStep(firstStep, true);
    setFeedback("Lütfen işaretlenen alanları düzeltin.");
  }
  function navigate(next: number, data: Application) {
    if (analyzing) return;
    form.clearErrors();
    if (next > step) {
      const result = validateStep(data, step);
      if (!result.success) { showErrors(result.error.issues, false); return; }
    }
    setSummary(data);
    setReached((previous) => Math.max(previous, next));
    setFeedback("");
    focusStep(next);
  }
  function submit(data: Application) {
    if (analyzing) return;
    if (step < 3) { navigate(step + 1, data); return; }
    form.clearErrors();
    const result = applicationSchema.safeParse(data);
    if (!result.success) { showErrors(result.error.issues, true); return; }
    onReview(result.data, { useAI, anonymized });
  }
  function loadSample() {
    form.reset(getSample(sample));
    setAnonymized(false);
    setUseAI(false);
    setReached(0);
    setSummary(null);
    onClear();
    focusStep(0);
    setFeedback("Kurgusal örnek yüklendi. Bilgileri adım adım kontrol edin.");
  }
  function narrative(key: keyof typeof narrativeFields) {
    const path = `narratives.${key}` as const;
    const field = narrativeFields[key];
    return (
      <FormField id={path} label={field.label} optional error={error(path)}
        hint={key === "fictionalExcerpts"
          ? "Yalnızca kurgusal belge metni girin. Yapay zekâ incelemesini seçip onay verirseniz OpenAI’a gönderilir."
          : "Yapay zekâ incelemesini seçip onay verirseniz bu açıklama OpenAI’a gönderilir. Kişi adı, kimlik veya iletişim bilgisi eklemeyin."}>
        <textarea {...register(path)} {...accessible(path, true)} rows={3} maxLength={field.limit}
          className="field-control min-h-24 resize-y py-3" />
      </FormField>
    );
  }
  return (
    <div className="form-column">
      <div className="sample-bar">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Sparkles className="size-4" />
          Bir örnekle başlayın
        </div>
        <div className="sample-controls mt-3">
          <div className="select-wrap flex-1">
            <select
              id="sample"
              aria-label="Örnek başvuru seçin"
              value={sample}
              onChange={(event) => setSample(event.target.value as SampleKey)}
              className="field-control bg-white"
            >
              {Object.entries(sampleLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown />
          </div>
          <Button variant="outline" onClick={loadSample} disabled={analyzing} className="text-sm">
            Örnek Başvuru Yükle <ArrowRight className="size-3.5" />
          </Button>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{sampleDescriptions[sample]}</p>
      </div>
      <form
        // Firefox can restore enabled/checked states before React hydrates.
        // This session-only form must always start from its server-rendered state.
        autoComplete="off"
        noValidate
        onSubmit={(event) => void form.handleSubmit(submit)(event)}
        onChange={(event) => {
          if (
            !(
              event.target instanceof HTMLInputElement &&
              event.target.name === "ai-consent"
            )
          )
            setAnonymized(false);
          onEdited();
          setFeedback("");
        }}
        className="form-panel"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-6 py-5">
          <div>
            <p aria-live="polite" aria-atomic="true" className="mb-2 text-sm text-muted-foreground">Adım {step + 1} / 4</p>
            <h2 ref={headingRef} tabIndex={-1} id="form-step-title" className="text-lg font-semibold">{applicationSteps[step]}</h2>
          </div>
        </div>
        <nav aria-label="Başvuru adımları" className="step-navigation">
          <ol>
            {applicationSteps.map((label, index) => (
              <li key={label}>
                <button type="button" aria-current={step === index ? "step" : undefined}
                  aria-label={`${index + 1}. adım: ${label}`} disabled={index > reached || analyzing}
                  onClick={() => void form.handleSubmit((data) => navigate(index, data))()}>
                  <span className="step-number">{index + 1}</span><span className="step-name">{label}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <div id="application-step-0" hidden={step !== 0}>
        <Section title="Başvuru bilgileri" icon={<Waypoints />}>
          <FormField
            id="reference"
            label="Başvuru referansı"
            optional
            error={error("reference")}
            hint="Tam ad yerine bir takip kodu kullanın."
          >
            <Input
              {...register("reference")}
              {...accessible("reference", true)}
              placeholder="Örn. BSV-2026-014"
              maxLength={80}
              autoComplete="off"
            />
          </FormField>
          <div className="form-grid">
            <FormField
              id="destination"
              label="Gidilecek ülke"
              error={error("destination")}
            >
              <div className="select-wrap">
                <select required
                  {...register("destination")}
                  {...accessible("destination")}
                  className="field-control"
                >
                  {destinations.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
                <ChevronDown />
              </div>
            </FormField>
            <FormField
              id="purpose"
              label="Seyahat amacı"
              error={error("purpose")}
            >
              <div className="select-wrap">
                <select required
                  {...register("purpose")}
                  {...accessible("purpose")}
                  className="field-control"
                >
                  {purposes.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
                <ChevronDown />
              </div>
            </FormField>
          </div>
          <div className="form-grid">
            <FormField
              id="departure"
              label="Gidiş tarihi"
              error={error("departure")}
            >
              <Input
                type="date"
                {...register("departure")}
                {...accessible("departure")}
                required
              />
            </FormField>
            <FormField
              id="returnDate"
              label="Dönüş tarihi"
              error={error("returnDate")}
            >
              <Input
                type="date"
                {...register("returnDate")}
                {...accessible("returnDate")}
                required
              />
            </FormField>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {Number.isFinite(nights) && nights >= 0 ? `Seyahat süresi: ${nights} gece / ${nights + 1} takvim günü. ` : ""}
            Gece sayısı dönüş ile gidiş arasındaki farktır. Aynı gün dönüş 0 gece, 1 takvim günüdür.
          </p>
          {narrative("travelPurpose")}
          <p className="flex items-start gap-2 text-sm leading-5 text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Ülke seçimi yalnızca bağlam sağlar. Bu sürüm ülkeye özgü vize
            kurallarını kontrol etmez.
          </p>
        </Section>
        </div>
        <div id="application-step-1" hidden={step !== 1}>
        <Section title="Kişisel bilgiler ve çalışma durumu" icon={<UserRound />}>
          <ApplicantProfileFields form={form} group="personal" />
        </Section>
        <Section title="Seyahat geçmişi ve yurt dışı bağlantıları" icon={<Waypoints />}>
          <ApplicantProfileFields form={form} group="travel" />
        </Section>
        </div>
        <div id="application-step-2" hidden={step !== 2}>
        <Section title="Seyahat bütçesi ve varlıklar" icon={<Wallet />}>
          <FormField id="currency" label="Para birimi">
            <div className="select-wrap max-w-40">
              <select required
                {...register("currency")}
                {...accessible("currency")}
                className="field-control"
              >
                {currencies.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
              <ChevronDown />
            </div>
          </FormField>
          <div className="form-grid">
            <FormField
              id="budget"
              label="Kullanılabilir seyahat bütçesi"
              error={error("budget")}
            >
              <div className="relative">
                <Input
                  {...register("budget")}
                  {...accessible("budget")}
                  inputMode="decimal"
                  placeholder="0,00"
                  className="pr-14"
                  required
                />
                <span className="input-suffix">{currency}</span>
              </div>
            </FormField>
            <FormField
              id="estimatedCost"
              label="Tahmini toplam maliyet"
              error={error("estimatedCost")}
            >
              <div className="relative">
                <Input
                  {...register("estimatedCost")}
                  {...accessible("estimatedCost")}
                  inputMode="decimal"
                  placeholder="0,00"
                  className="pr-14"
                  required
                />
                <span className="input-suffix">{currency}</span>
              </div>
            </FormField>
          </div>
          <p className="text-sm leading-5 text-muted-foreground">
            Maliyet sizin tahmininizdir; resmî bir finansal gereklilik değildir.
            İki tutar aynı para birimindedir, kur dönüşümü yapılmaz. Ondalık
            ayırıcı olarak virgül veya nokta kullanın.
          </p>
          <ApplicantProfileFields form={form} group="financial" />
          {narrative("funding")}
        </Section>
        <Section title="Konaklama" icon={<Building2 />}>
          {!fields.length && (
            <div className="rounded-lg border border-dashed bg-muted px-4 py-5 text-center">
              <Building2 className="mx-auto mb-2 size-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Konaklama bilgisi henüz girilmedi
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Bilgi olmadan da incelemeye devam edebilirsiniz.
              </p>
            </div>
          )}
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="space-y-3 rounded-lg border bg-white p-3.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Konaklama {index + 1}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`${index + 1}. konaklamayı kaldır`}
                  onClick={() => {
                    remove(index);
                    setAnonymized(false);
                    onEdited();
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <FormField id={`stays.${index}.type`} label="Konaklama türü">
                <div className="select-wrap">
                  <select required
                    className="field-control"
                    {...register(`stays.${index}.type`)}
                    {...accessible(`stays.${index}.type`)}
                  >
                    {stayTypes.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                  <ChevronDown />
                </div>
              </FormField>
              <div className="form-grid">
                <FormField
                  id={`stays.${index}.checkIn`}
                  label="Giriş tarihi"
                  error={error(`stays.${index}.checkIn`)}
                >
                  <Input
                    type="date"
                    {...register(`stays.${index}.checkIn`)}
                    {...accessible(`stays.${index}.checkIn`)}
                    required
                  />
                </FormField>
                <FormField
                  id={`stays.${index}.checkOut`}
                  label="Çıkış tarihi"
                  error={error(`stays.${index}.checkOut`)}
                >
                  <Input
                    type="date"
                    {...register(`stays.${index}.checkOut`)}
                    {...accessible(`stays.${index}.checkOut`)}
                    required
                  />
                </FormField>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              append({ type: "Otel", checkIn: "", checkOut: "" });
              setAnonymized(false);
              onEdited();
            }}
          >
            <Plus />
            Konaklama ekle
          </Button>
          <p className="text-sm leading-5 text-muted-foreground">
            Çıkış günü gece sayısına dahil edilmez. Aynı gün dönülen
            seyahatlerde konaklama gecesi yoktur.
          </p>
        </Section>
        <div className="px-4 pb-6 sm:px-6">{narrative("accommodation")}</div>
        <Section title="Belge durumu" icon={<FileCheck2 />}>
          <p className="text-sm leading-5 text-muted-foreground">
            Yalnızca başvuru sahibinin bilgi beyanını işaretleyin. İşaretleme isteğe bağlıdır; eksik beyanlar raporda netleştirme sorusu olarak gösterilir.
          </p>
          <div className="space-y-1">
            {(
              Object.keys(declarations) as (keyof Application["declarations"])[]
            ).map((key) => (
              <label
                key={key}
                className="choice-label flex cursor-pointer items-center gap-3 rounded-md py-2 text-sm leading-5"
              >
                <span className="relative flex size-4 shrink-0 items-center justify-center">
                  <input
                    type="checkbox"
                    {...register(`declarations.${key}`)}
                    className="peer size-4 appearance-none rounded border border-border bg-white checked:border-accent checked:bg-accent"
                  />
                  <Check className="pointer-events-none absolute size-3 text-white opacity-0 peer-checked:opacity-100" />
                </span>
                {declarations[key]}
              </label>
            ))}
          </div>
          <p className="text-sm leading-5 text-muted-foreground">
            İşaretler belge yüklendiği, incelendiği veya doğrulandığı anlamına
            gelmez; yasal belge zorunluluğu belirtmez.
          </p>
        </Section>
        </div>
        <div id="application-step-3" hidden={step !== 3}>
        {summary && <ApplicationSummary application={summary} onEdit={(next) => focusStep(next)} />}
        <Section title="Açıklama" icon={<MessageSquareText />}>
          <FormField
            id="notes"
            label="İnceleme notu"
            optional
            error={error("notes")}
            hint="Yalnızca bu çalışma alanında kalır; OpenAI’a ve kopyalanan rapora eklenmez. Pasaport numarası veya hassas kişisel bilgi girmeyin."
          >
            <textarea
              {...register("notes")}
              {...accessible("notes", true)}
              rows={3}
              maxLength={2000}
              placeholder="Netleştirmek istediğiniz bir ayrıntı varsa buraya yazın…"
              className="field-control min-h-24 resize-y py-3"
            />
            <p className="text-right text-sm text-muted-foreground">
              {new Intl.NumberFormat("tr-TR").format(notes.length)} / 2.000
            </p>
          </FormField>
        </Section>
        <Section title="İnceleme yöntemi ve ek açıklama" icon={<Sparkles />}>
          {narrative("fictionalExcerpts")}
          <fieldset className="min-w-0 space-y-3 rounded-lg border bg-muted p-4">
            <legend className="px-1 text-sm font-semibold">
              İnceleme yöntemi
            </legend>
            <label className="choice-label flex cursor-pointer items-start gap-2 py-2 text-sm leading-5">
              <input
                type="radio"
                name="analysis-mode"
                checked={!useAI}
                onChange={() => {
                  setUseAI(false);
                  setAnonymized(false);
                }}
                className="mt-0.5 size-5 shrink-0 accent-accent"
              />
              Yalnızca yerel kontroller — dışarıya bilgi gönderilmez
            </label>
            <label className="choice-label flex cursor-pointer items-start gap-2 py-2 text-sm leading-5">
              <input
                type="radio"
                name="analysis-mode"
                checked={useAI}
                onChange={() => setUseAI(true)}
                className="mt-0.5 size-5 shrink-0 accent-accent"
              />
              Yerel kontroller + OpenAI gözlemleri
            </label>
            <p className="text-sm leading-6 text-muted-foreground">
              AI seçildiğinde ülke, seyahat amacı, tarihler, bütçe, konaklama
              kayıtları, beyan işaretleri; seyahat amacı, finansman, konaklama
              açıklamaları ve kurgusal belge alıntıları harici
              sağlayıcı OpenAI’a gönderilir. Başvuru referansı ve özel inceleme
              notu; kişisel/çalışma bilgileri, seyahat geçmişi, yurt dışı bağlantıları,
              varlıklar ve ödeme yöntemleri gönderilmez. Sağlayıcının veri işleme koşulları geçerlidir.
              İstek API kullanım ücreti doğurabilir.
            </p>
            {useAI && (
              <label className="choice-label flex cursor-pointer items-start gap-2 py-2 text-sm leading-5">
                <input
                  type="checkbox"
                  name="ai-consent"
                  checked={anonymized}
                  onChange={(event) => setAnonymized(event.target.checked)}
                  className="mt-0.5 size-5 shrink-0 accent-accent"
                />
                Gönderilecek açıklamaları kontrol ettim; ad, kimlik/pasaport
                numarası veya ilgisiz kişisel bilgi içermiyor. Bu alanların
                OpenAI’a gönderilmesini onaylıyorum.
              </label>
            )}
          </fieldset>
        </Section>
        </div>
        <div className="wizard-actions border-t bg-muted p-5 sm:px-6">
          <div className="form-actions">
            <Button type="button" variant="outline" disabled={step === 0 || analyzing}
              onClick={() => void form.handleSubmit((data) => navigate(step - 1, data))()}>Geri</Button>
            {step < 3 ? (
              <Button key="continue" type="button" disabled={analyzing} onClick={(event) => {
                event.preventDefault();
                void form.handleSubmit((data) => navigate(step + 1, data))();
              }}>Devam <ArrowRight /></Button>
            ) : <Button
              key="generate"
              type="submit"
              disabled={formState.isSubmitting || analyzing}
              className="text-sm"
            >
              {formState.isSubmitting || analyzing ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <FileCheck2 />
              )}
              İnceleme raporu oluştur <ArrowRight />
            </Button>}
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                form.reset(emptyApplication());
                setUseAI(false);
                setAnonymized(false);
                onClear();
                setReached(0);
                setSummary(null);
                focusStep(0);
                setFeedback("Form ve rapor temizlendi.");
              }}
              className="text-sm"
            >
              <RotateCcw />
              Temizle
            </Button>
          </div>
          <p
            role="status"
            className="mt-3 text-sm leading-5 text-muted-foreground"
          >
            {feedback ||
              "Form bilgileri bu sayfanın belleğinde tutulur. AI seçeneği, açıklanan alanları OpenAI’a gönderir."}
          </p>
        </div>
      </form>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <fieldset className="form-section">
      <legend className="sr-only">{title}</legend>
      <div className="mb-5 flex items-center gap-2.5">
        <span className="section-icon">{icon}</span>
        <h3 className="text-sm font-semibold">{title}</h3>

      </div>
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}
