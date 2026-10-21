# VizeLens

Türkçe vize başvurusu ön inceleme prototipi. Eksik bilgileri, tarih ve bütçe tutarsızlıklarını dayanaklarıyla ve insan incelemesine yönelik sorularla gösterir. Vize kararı, uygunluk tavsiyesi, kabul olasılığı veya kişi risk puanı üretmez.

## Yerel çalıştırma

Node.js **22.13 veya üzeri** ve npm gerekir. `.nvmrc`, Node 22'yi seçer.

```sh
nvm use
npm ci
npm run dev
```

Tarayıcıda `http://localhost:3000` adresini açın. Üretim sürümü için:

```sh
npm run build
npm start
```

## Demo davranışı

- Next.js App Router, strict TypeScript, Tailwind CSS, özelleştirilmiş shadcn/ui bileşenleri, Lucide, React Hook Form ve Zod kullanır.
- Üç kurgusal örnek, bugünden 30 gün sonrası için üretilir. Örnek yüklemek raporu otomatik oluşturmaz.
- İlk örnek: 10 gece / 6 gece kapsam, bütçe farkı ve bir eksik beyan; toplam 3 bulgu. Tutarlı örnek: 0 bulgu. Eksik bilgi örneği: 4 bulgu.
- Yerel kural bulguları deterministiktir; isteğe bağlı AI gözlemleri ayrı bir bölümde gösterilir ve yerel bulguları değiştirmez. Form bilgileri React belleğinde tutulur. Yenilemek veya **Temizle** işlemi yerel bilgileri siler. AI kullanılırsa aşağıdaki alanlar harici sağlayıcıya gönderilir. `localStorage`, veritabanı, kimlik doğrulama veya belge yükleme yoktur.
- Form değişince rapor eski olarak işaretlenir. Yeniden oluşturulana kadar kopyalama/yazdırma kapalıdır. Tarayıcının doğrudan yazdırma işleminde de eski raporun içeriği gizlenir.
- Kopyalama, tarayıcının pano iznine ve güvenli bağlama (localhost veya HTTPS) bağlıdır. Başarı/başarısızlık arayüzde bildirilir.
- Tarihler UTC gün numaralarıyla hesaplanır. Konaklama aralıkları `[giriş, çıkış)` şeklindedir; seyahat aralığına kırpılır ve birleştirilir. Aynı gece iki kez sayılmaz. Aynı gün dönüş 0 gecedir.
- Para birimi dönüşümü yapılmaz. Tutarlar virgül veya noktayla en fazla iki ondalık basamak kabul eder. Binlik ayırıcı kullanmayın. Giriş sınırı 1 trilyondur.
- Özel inceleme notu yerel kalır; kurallarda değerlendirilmez, AI’a gönderilmez ve kopyalanan rapora dahil edilmez. AI için dört ayrı açıklama alanı vardır. Hassas bilgi girmeyin.

## Kapsam ve isteğe bağlı AI

Varsayılan seçenek **“Yalnızca yerel kontroller”** seçeneğidir; ağ isteği yapmaz. **“Yerel kontroller + OpenAI gözlemleri”** seçeneği ve ayrı gönderim onayıyla analiz düğmesi `POST /api/analyze` çağrısı yapar. Resmî OpenAI JavaScript SDK’sı (`openai`, kilit dosyasında 6.49.0) sunucuda Responses API’yi kullanır: `responses.parse()`, `text.format: zodTextFormat(...)`, `output_parsed`. Sözdizimi [resmî SDK belgeleri](https://developers.openai.com/api/docs/libraries) ve [Structured Outputs kılavuzu](https://developers.openai.com/api/docs/guides/structured-outputs) üzerinden kontrol edildi.

### Kimlik bilgilerini ayarlama

Proje kökünde, `package.json` ile aynı dizinde **`.env.local`** oluşturun:

```dotenv
OPENAI_API_KEY=buraya_kendi_api_anahtarinizi_yazin
OPENAI_MODEL=hesabinizin_erisebildigi_model_kimligi
```

Bu gösterimler gerçek anahtar/model değildir. `OPENAI_MODEL`, hesabınızın erişebildiği, **Responses API ve Structured Outputs destekleyen** bir modelin tam kimliği olmalıdır. Kod bir model adı varsaymaz. `.env.example` boş yer tutucular içerir; `.env.local` dahil gerçek ortam dosyaları `.gitignore` ile dışlanır. `NEXT_PUBLIC_` öneki kullanmayın; anahtarı tarayıcıya veya sohbete yapıştırmayın.

Değişiklikten sonra terminalde çalışan sunucuyu **Ctrl+C** ile durdurun ve **`npm run dev`** ile yeniden başlatın. Üretim çalıştırıyorsanız **`npm run build`**, ardından **`npm start`** çalıştırın. Sonra formda AI seçeneğini seçip anonimlik/gönderim kutusunu onaylayın ve rapor oluşturun. Bu işlem API kullanım ücreti doğurabilir.

### Gönderilen bilgiler ve doğrulama

- Yalnızca izin verilen yapılandırılmış alanlar gönderilir: ülke, amaç, tarihler, para birimi, bütçe, maliyet tahmini, konaklamalar, beyan işaretleri; ayrıca seyahat amacı, finansman ve konaklama açıklamaları ile isteğe bağlı **kurgusal belge alıntıları**. Başvuru referansı ve özel inceleme notu gönderilmez.
- İstek için açık onay gerekir. Metinleri önceden anonimleştirin: kişi/kurum adları ve kimlik, pasaport, iletişim veya ilgisiz kişisel bilgiler kullanmayın. Tanımlayıcı benzeri kalıplara yönelik ek bir engel bulunur; bu **eksiksiz bir kişisel bilgi tespit sistemi değildir**, özellikle serbest yazılmış adları güvenilir biçimde ayıramaz. Gerçek belge içeriği kullanmayın.
- Zod doğrulaması: en fazla 20 konaklama, üç açıklama için ayrı ayrı 2.000 karakter, kurgusal alıntılar için 3.000 karakter; toplam istek gövdesi en fazla 64 KiB. Fazladan üst düzey alanlar reddedilir. Boyut sınırı akış okunurken de uygulanır.
- AI çelişkiler, eksik açıklamalar ve belirsizlikler için en fazla 8 gözlem üretir. Her gözlem, gerçekten gönderilen bir alan kimliğine ve o alanın metniyle eşleşen alıntıya dayanmalı, netleştirme sorusu içermelidir. Boş alanın alıntısı boş olabilir. Hatalı alan/alıntı veya şema dışı yanıt reddedilir; istemci de doğrulamayı tekrarlar.
- Metinler kullanıcı verisi olarak ayrı iletilir; içlerindeki talimatları izlememesi açıkça belirtilir. Kişisel risk puanı, niyet/güvenilirlik yargısı, vize sonucu tahmini ve mevzuat uydurması yasaktır. Şema ve ek kontroller bariz kişisel yargıları engeller; modelin anlam bakımından doğruluğunu garanti etmez. İnsan incelemesi gerekir.
- Yerel rapor hemen oluşur. Eksik yapılandırma, sağlayıcı hatası, zaman aşımı, ret veya doğrulanamayan yanıtta AI sonucu gösterilmez; neden açıkça belirtilir. Yerel rapor kullanılabilir. Başarılı fakat boş gözlem dizisi de gerçek sağlayıcı yanıtı olarak ayırt edilir; doğruluk/uygunluk onayı sayılmaz.
- Sağlayıcı zaman aşımı 25 saniye, istemci sınırı 30 saniyedir; otomatik tekrar yapılmaz. Düzenleme/temizleme bekleyen isteği iptal eder ve geç gelen yanıtı yok sayar. İptal, sağlayıcıda başlamış işlem veya ücretin geri alınacağı anlamına gelmez.
- SDK günlükleri kapalıdır; hata yanıtlarında sağlayıcı mesajı, gönderilen içerik veya kimlik bilgileri gösterilmez. `store: false` kullanılır; bu ayar sağlayıcının tüm veri saklama politikalarını ortadan kaldırmaz. Sunucu yanıtları `no-store` işaretlidir. Prototip yerel kullanım içindir; kimlik doğrulama veya üretim ölçeğinde kota/harcama sınırlaması eklenmemiştir.

Ülke seçimi yalnızca bağlamdır; ülkeye özgü resmî koşullar kontrol edilmez. Beyan kutuları belge yükleme, inceleme veya doğrulama değildir. Tahmini maliyet kullanıcı tarafından girilir ve resmî bir finansal eşik değildir.

> Bu rapor yalnızca girilen bilgilerdeki eksikleri ve tutarsızlıkları gösterir. Güncel ülke mevzuatını veya belge gerçekliğini doğrulamaz. Kabul/red kararı vermez; son değerlendirme insana aittir.

## Kontroller

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:browser
```

İnceleme motoru için 13, AI entegrasyonu için 9 odaklı test vardır. AI testleri resmî SDK’yı **taklit taşıma katmanıyla** çalıştırır: gerçek API çağrısı veya ücret yoktur. Alan izin listesi, onay, uzunluk sınırları, kanıt eşleşmesi, eksik yapılandırma, zaman aşımı/iptal, sağlayıcı hatası, geçersiz yanıt ve yerel motorun değişmemesi kontrol edilir. Ek saat dilimi kontrolü: `TZ=Europe/Berlin npm test`.

Playwright, kurulu Google Chrome'u kullanır ve üretim sunucusunu otomatik başlatır; önce `npm run build` çalıştırın. 320, 375, 390, 768, 1024 ve 1440 px için tanımlı projelerde üç örnek, doğrulama, kopyalama, eski rapor kilidi ve yazdırma senaryoları bulunur. `responsive.spec.ts` ayrıca uzun kurgusal AI metinlerini, konaklama ekleme/kaldırmayı, yüklenme/hata durumlarını, en az 44 px dokunma hedeflerini, en az 16 px alan yazısını, klavye odağını, azaltılmış hareket tercihini ve sayfa taşmasını kontrol etmek üzere hazırlanmıştır. En/boy değişimiyle yatay/dikey düzen ve 1440 px projesinde 720 px yeniden akış da kontrol edilir; bu, gerçek %200 tarayıcı yakınlaştırması değildir. AI senaryoları `/api/analyze` isteğini durdurup sentetik yanıt verir; **canlı sağlayıcıya gitmez**. Onaysız/yerel mod, ayrı AI kartları, hata durumunda yerel rapor ve geç gelen yanıtlar da test edilir. Çıktılar `test-results/` altında oluşur.

**Canlı doğrulama:** Gerçek sağlayıcı isteği yapılmadı; API bağlantısının başarıyla çalıştığı iddia edilmez. Faturalandırılabilecek bir doğrulama yalnızca ayrıca onay alındıktan sonra, sentetik bilgilerle yapılmalıdır. Testlerde gerçek ortam anahtarları okunmaz. Bu ortamda Playwright sunucusunun `127.0.0.1:3000` üzerinde dinlemesi `EPERM` ile engellendi ve Chrome başlatılamadı. Altı genişlik için testler tanımlıdır ancak çalıştırılamadı; görsel tarayıcı doğrulaması yapılmadı. Üretim öncesinde bu testleri izin verilen bir ortamda çalıştırın; ayrıca gerçek %200 yakınlaştırmayı, iOS/Android tarih seçicilerini ve ekran klavyesini fiziksel cihazlarda kontrol edin.

Üretim HTML/JS çıktısı ayrıca JSDOM ortamında çalıştırıldı. Yerel mod, gönderim onayı, istemci → sunucu işleyicisi → resmî SDK akışı (taklit sağlayıcı taşıması), ayrı AI kartları, kopyalama, düzenlemede eski rapor kilidi, eksik yapılandırmada yerel rapor, iptal ve geç yanıtın yok sayılması doğrulandı. Bu kontrol görsel tarayıcı testi veya canlı AI bağlantısı değildir.

## Duyarlı düzen

- Form ve rapor, çalışma alanının iç genişliği en az 60 rem olduğunda yan yanadır; daha dar alanda alt alta gelir. Okuma alanı sınırlıdır. Form alanları ve rapor ölçütleri kendi kart genişliklerine göre yerleşir.
- 1024 px altında iki gezinme düğmesi üstte, sürekli erişilebilir bir satırdadır; açılır menü veya iletişim kutusu kullanılmaz. Form ve rapor mobilde sabit/yapışkan değildir.
- Kontroller en az 16 px yazı, düğmeler ve tıklanabilir seçim etiketleri en az 44 px hedef kullanır. Uzun referanslar ve AI metinleri satır kırar; sayfa taşması `overflow-x: hidden` ile gizlenmez.
- Başarılı yerel analizden sonra rapor başlığına odak ve kaydırma yapılır, tamamlanma duyurulur. Azaltılmış hareket tercihinde yumuşak kaydırma yoktur. Sonradan gelen AI yanıtı odağı yeniden taşımaz. Yazdırma görünümünde yalnızca rapor kalır.

## Dosya düzeni

- `src/lib/validation.ts`: Zod giriş doğrulaması ve uygulama tipi.
- `src/lib/dates.ts`: saat diliminden bağımsız tarih hesabı, Türkçe biçimleme.
- `src/lib/review.ts`: saf inceleme motoru, kararlı kural kimlikleri ve metin raporu.
- `src/lib/samples.ts`: üç göreli tarihli örnek.
- `src/lib/ai-contract.ts`: istek/yanıt şemaları, alan izin listesi, kanıt doğrulaması.
- `src/lib/ai-client.ts`: opt-in API çağrısı, istemci doğrulaması ve hata eşlemesi.
- `src/lib/narratives.ts`: açıklama alanları, sınırlar ve tanımlayıcı kalıp kontrolü.
- `src/server/analyze.ts`: sunucu doğrulaması ve OpenAI SDK entegrasyonu.
- `src/app/api/analyze/route.ts`: yalnızca sunucuda ortam değişkenlerini okuyan POST rotası.
- `src/components/`: form, rapor, çalışma alanı ve açıklama görünümü.
- `src/components/ui/`: özelleştirilmiş shadcn/ui kaynak bileşenleri.
- `tests/`: motor testleri ve Playwright senaryoları.

## Paket kurulumu hakkında

Kurulum ortamında npm ağ erişimi kapalıydı. Next.js ve mevcut paketler yerel npm önbelleğinden kuruldu. Bazı küçük UI bağımlılıkları ve React Hook Form `vendor/` altında npm arşivleri olarak bulunur; kilit dosyası bu yerel arşivleri içerir. Başka bir makinede `npm ci` için diğer bağımlılıkların npm erişimi veya önbelleği gerekir.

React Hook Form arşivi, **7.83.0 resmî ESM çalışma zamanı** ile bu projede kullanılan üç hook için **yerel, dar kapsamlı TypeScript tanımlarını** içerir. Tam resmî npm paketi değildir; sınırlama ve kaynaklar [vendor/README.md](vendor/README.md) içinde açıklanır. Ağ erişimi olduğunda standart dağıtıma dönmek için `npm install react-hook-form@7.83.0` çalıştırın ve kontrolleri tekrarlayın.
