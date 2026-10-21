"use client";

import { useState, type ReactNode } from "react";
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
  Wallet,
  Waypoints,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
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
import { getSample, sampleLabels, type SampleKey } from "@/lib/samples";
import { narrativeFields, type AnalysisOptions } from "@/lib/narratives";

export function ApplicationForm({
  onReview,
  onEdited,
  onClear,
  analyzing,
}: {
  onReview: (application: Application, options: AnalysisOptions) => void;
  onEdited: () => void;
  onClear: () => void;
  analyzing: boolean;
}) {
  const form = useForm<Application>({ defaultValues: emptyApplication() });
  const { register, control, formState, getFieldState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "stays" });
  const [sample, setSample] = useState<SampleKey>("clarification");
  const [feedback, setFeedback] = useState("");
  const [useAI, setUseAI] = useState(false);
  const [anonymized, setAnonymized] = useState(false);
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
  function submit(data: Application) {
    form.clearErrors();
    const result = applicationSchema.safeParse(data);
    if (!result.success) {
      const paths = new Set<string>();
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        if (!paths.has(path)) {
          form.setError(
            path as FieldPath<Application>,
            { type: "validate", message: issue.message },
            { shouldFocus: paths.size === 0 }
          );
          paths.add(path);
        }
      }
      setFeedback(
        "Lütfen işaretlenen alanları kontrol edin. Rapor oluşturulmadı."
      );
      return;
    }
    onReview(result.data, { useAI, anonymized });
    setFeedback(
      useAI
        ? "Yerel rapor oluşturuldu. AI isteğinin durumu raporda gösterilir."
        : "İnceleme raporu oluşturuldu."
    );
  }
  function loadSample() {
    form.reset(getSample(sample));
    setAnonymized(false);
    onEdited();
    setFeedback(
      "Örnek bilgiler yüklendi. Rapor oluşturmak için inceleme düğmesine basın."
    );
  }
  return (
    <div className="form-column">
      <div className="sample-bar">
        <div className="flex items-center gap-2 text-xs font-medium text-primary">
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
          <Button variant="outline" onClick={loadSample} className="text-xs">
            Örnek Başvuru Yükle <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>
      <form
        noValidate
        onSubmit={form.handleSubmit(submit)}
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
          <h2 className="text-sm font-semibold">Başvuru formu</h2>
          <span className="text-[11px] text-muted-foreground">
            6 kısa bölüm
          </span>
        </div>
        <Section number="01" title="Başvuru bilgileri" icon={<Waypoints />}>
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
                <select
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
                <select
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
          <p className="flex items-start gap-2 text-[11px] leading-5 text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Ülke seçimi yalnızca bağlam sağlar. Bu sürüm ülkeye özgü vize
            kurallarını kontrol etmez.
          </p>
        </Section>
        <Section number="02" title="Seyahat bütçesi" icon={<Wallet />}>
          <FormField id="currency" label="Para birimi">
            <div className="select-wrap max-w-40">
              <select
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
          <p className="text-[11px] leading-5 text-muted-foreground">
            Maliyet sizin tahmininizdir; resmî bir finansal gereklilik değildir.
            İki tutar aynı para birimindedir, kur dönüşümü yapılmaz. Ondalık
            ayırıcı olarak virgül veya nokta kullanın.
          </p>
        </Section>
        <Section number="03" title="Konaklama" icon={<Building2 />}>
          {!fields.length && (
            <div className="rounded-lg border border-dashed bg-muted px-4 py-5 text-center">
              <Building2 className="mx-auto mb-2 size-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Konaklama bilgisi henüz girilmedi
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
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
                <span className="text-xs font-medium text-muted-foreground">
                  Konaklama {index + 1}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`${index + 1}. konaklamayı kaldır`}
                  onClick={() => {
                    remove(index);
                    onEdited();
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <FormField id={`stays.${index}.type`} label="Konaklama türü">
                <div className="select-wrap">
                  <select
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
              onEdited();
            }}
          >
            <Plus />
            Konaklama ekle
          </Button>
          <p className="text-[11px] leading-5 text-muted-foreground">
            Çıkış günü gece sayısına dahil edilmez. Aynı gün dönülen
            seyahatlerde konaklama gecesi yoktur.
          </p>
        </Section>
        <Section number="04" title="Belge durumu" icon={<FileCheck2 />}>
          <p className="text-xs leading-5 text-muted-foreground">
            Yalnızca başvuru sahibinin bilgi beyanını işaretleyin.
          </p>
          <div className="space-y-1">
            {(
              Object.keys(declarations) as (keyof Application["declarations"])[]
            ).map((key) => (
              <label
                key={key}
                className="choice-label flex cursor-pointer items-center gap-3 rounded-md py-2 text-xs leading-5"
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
          <p className="text-[11px] leading-5 text-muted-foreground">
            İşaretler belge yüklendiği, incelendiği veya doğrulandığı anlamına
            gelmez; yasal belge zorunluluğu belirtmez.
          </p>
        </Section>
        <Section number="05" title="Açıklama" icon={<MessageSquareText />}>
          <FormField
            id="notes"
            label="İnceleme notu"
            optional
            error={error("notes")}
            hint="Pasaport numarası veya hassas kişisel bilgi girmeyin. Bu alan otomatik kurallarda değerlendirilmez."
          >
            <textarea
              {...register("notes")}
              {...accessible("notes", true)}
              rows={3}
              maxLength={2000}
              placeholder="Netleştirmek istediğiniz bir ayrıntı varsa buraya yazın…"
              className="field-control min-h-24 resize-y py-3"
            />
            <p className="text-right text-[10px] text-muted-foreground">
              {new Intl.NumberFormat("tr-TR").format(notes.length)} / 2.000
            </p>
          </FormField>
        </Section>
        <Section number="06" title="AI için açıklamalar" icon={<Sparkles />}>
          <p className="text-xs leading-6 text-muted-foreground">
            Bu alanlar yalnızca AI seçeneğiyle değerlendirilir. Sadece
            anonimleştirilmiş veya kurgusal seyahat bilgisi girin. Ad,
            pasaport/kimlik numarası, iletişim bilgisi ve ilgisiz kişisel bilgi
            eklemeyin. Gerçek belge yüklemeyin veya kopyalamayın.
          </p>
          {(
            Object.keys(narrativeFields) as (keyof typeof narrativeFields)[]
          ).map((key) => {
            const path = `narratives.${key}` as const;
            const field = narrativeFields[key];
            return (
              <FormField
                key={key}
                id={path}
                label={field.label}
                optional
                error={error(path)}
                hint={`En fazla ${new Intl.NumberFormat("tr-TR").format(
                  field.limit
                )} karakter. ${
                  key === "fictionalExcerpts"
                    ? "Yalnızca kişisel bilgi içermeyen, kurgusal belge metni kullanın."
                    : "Kişi ve kurum adları yerine genel ifadeler kullanın."
                }`}
              >
                <textarea
                  {...register(path)}
                  {...accessible(path, true)}
                  rows={3}
                  maxLength={field.limit}
                  className="field-control min-h-24 resize-y py-3"
                />
              </FormField>
            );
          })}
          <fieldset className="min-w-0 space-y-3 rounded-lg border bg-muted p-4">
            <legend className="px-1 text-xs font-semibold">
              İnceleme yöntemi
            </legend>
            <label className="choice-label flex cursor-pointer items-start gap-2 py-2 text-xs leading-5">
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
            <label className="choice-label flex cursor-pointer items-start gap-2 py-2 text-xs leading-5">
              <input
                type="radio"
                name="analysis-mode"
                checked={useAI}
                onChange={() => setUseAI(true)}
                className="mt-0.5 size-5 shrink-0 accent-accent"
              />
              Yerel kontroller + OpenAI gözlemleri
            </label>
            <p className="text-[11px] leading-6 text-muted-foreground">
              AI seçildiğinde ülke, seyahat amacı, tarihler, bütçe, konaklama
              kayıtları, beyan işaretleri ve bu dört açıklama alanı harici
              sağlayıcı OpenAI’a gönderilir. Başvuru referansı ve özel inceleme
              notu gönderilmez. Sağlayıcının veri işleme koşulları geçerlidir.
              İstek API kullanım ücreti doğurabilir.
            </p>
            {useAI && (
              <label className="choice-label flex cursor-pointer items-start gap-2 py-2 text-xs leading-5">
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
        <div className="border-t bg-muted p-5 sm:px-6">
          <div className="form-actions">
            <Button
              type="submit"
              disabled={formState.isSubmitting || analyzing}
              className="text-sm"
            >
              {formState.isSubmitting || analyzing ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <FileCheck2 />
              )}
              İnceleme Raporu Oluştur <ArrowRight />
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                form.reset(emptyApplication());
                setUseAI(false);
                setAnonymized(false);
                onClear();
                setFeedback("Form ve rapor temizlendi.");
              }}
              className="text-xs"
            >
              <RotateCcw />
              Temizle
            </Button>
          </div>
          <p
            role="status"
            className="mt-3 text-xs leading-5 text-muted-foreground"
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
  number,
  title,
  icon,
  children,
}: {
  number: string;
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
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">
          {number}
        </span>
      </div>
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}
