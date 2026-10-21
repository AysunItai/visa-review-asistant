import {
  ArrowRight,
  ClipboardList,
  ListChecks,
  UserRoundCheck,
  LockKeyhole,
  Globe2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SCOPE_NOTE } from "@/lib/review";

export function HowItWorks({ onStart }: { onStart: () => void }) {
  return (
    <div className="mx-auto max-w-4xl py-3">
      <div className="eyebrow mb-4">YAKLAŞIMIMIZ</div>
      <h1 className="page-title">
        Bilgiler netleşir. Değerlendirme insanda kalır.
      </h1>
      <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
        VizeLens, başvuruda açıklama gerektiren noktaları görünür kılan bir ön
        inceleme çalışma alanıdır.
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          {
            icon: ClipboardList,
            title: "Bilgileri girin",
            text: "Örnek veya manuel başvuru bilgilerini girin. Ad, pasaport numarası veya hassas kişisel bilgi paylaşmayın.",
          },
          {
            icon: ListChecks,
            title: "Kontroller çalışsın",
            text: "Sistem belirli tarih, bütçe ve bilgi tutarlılığı kontrollerini çalıştırır. Bulgular girilen verilerden yerel olarak hesaplanır.",
          },
          {
            icon: UserRoundCheck,
            title: "Bulguları inceleyin",
            text: "Bulgular insan incelemesine sunulur. Her bulguda dayanak ve netleştirmeye yardımcı bir soru yer alır.",
          },
        ].map((step, i) => (
          <article key={step.title} className="rounded-lg border bg-white p-6">
            <div className="mb-8 flex items-center justify-between">
              <step.icon className="size-6 text-primary" />
              <span className="font-mono text-xs text-muted-foreground">
                0{i + 1}
              </span>
            </div>
            <h2 className="font-semibold">{step.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {step.text}
            </p>
          </article>
        ))}
      </div>
      <div className="my-7 grid gap-6 rounded-lg border bg-white p-6 md:grid-cols-2">
        <div>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Globe2 className="size-4 text-primary" />
            Örnek tutarlılık kontrolleri
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Bu sürüm resmî vize kurallarına başvurmaz. Ülke seçimi yalnızca
            bağlam sağlar. Bütçe, yalnızca girilen maliyet tahminiyle
            karşılaştırılır.
          </p>
        </div>
        <div>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <LockKeyhole className="size-4 text-primary" />
            Geçici çalışma alanı
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Form bilgileri bu sayfanın belleğinde tutulur; yenilemede silinir.
            AI seçeneği ve gönderim onayıyla, belirtilen seyahat alanları ve
            anonim açıklamalar OpenAI’a gönderilir. Yerel seçenek dışarıya bilgi
            göndermez. Belge yüklenmez ve beyanların gerçekliği doğrulanmaz.
          </p>
        </div>
      </div>
      <div className="mb-7 rounded-lg border bg-white p-6 text-sm leading-6 text-muted-foreground">
        <h2 className="mb-2 font-semibold text-foreground">
          İsteğe bağlı AI incelemesi
        </h2>
        <p>
          OpenAI, verilen metinlerdeki çelişkiler, eksik açıklamalar ve
          belirsizlikler için ek gözlemler üretebilir. Her gözlem kaynak alanı,
          alıntı ve netleştirme sorusuyla ayrı gösterilir. AI hata yapabilir;
          metinler insan tarafından doğrulanmalıdır. Bağlantı veya yanıt sorunu
          olduğunda yerel rapor kullanılabilir. Kişisel risk puanı, güvenilirlik
          yargısı veya vize sonucu tahmini üretilmez.
        </p>
      </div>
      <p className="max-w-3xl text-xs leading-6 text-muted-foreground">
        {SCOPE_NOTE}
      </p>
      <Button onClick={onStart} className="mt-6">
        Başvuru incelemeye başla <ArrowRight />
      </Button>
    </div>
  );
}
