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

## Dört adımlı inceleme akışı

1. **Başvuru ve seyahat:** referans, ülke, amaç, tarihler ve seyahat açıklaması. Süre, tarih farkı olarak gece; her iki tarih dahil olarak takvim günü cinsinden gösterilir.
2. **Kişisel bilgiler ve seyahat geçmişi:** çalışma, eğitim, seyahat geçmişi, vize/oturum, ret, diller ve akrabalık bilgileri.
3. **Finansman, konaklama ve belgeler:** bütçe, ödeme yöntemleri, varlıklar, konaklamalar, ilgili açıklamalar ve beyanlar.
4. **Açıklamalar ve inceleme:** önceki adımların düzenlenebilir özeti, inceleme notu, kurgusal alıntılar ve inceleme yöntemi.

Tek React Hook Form durumu kullanılır. Devam yalnızca geçerli adımı, son gönderim tüm etkin formu doğrular. Hatalar ilgili adımda gösterilir ve ilk hatalı alana odaklanılır. Geri dönüşler değerleri korur. Evet/Hayır sorularında açık bir cevap zorunludur; gizlenen cevaplar form belleğinde korunur, doğrulamadan **önce** etkin veriden çıkarılır. Ret açıklaması, akrabalık ilişkisi ve ek akraba açıklaması profil alanlarıdır; uygulanabilir olduklarında AI gönderimine dahildir. Sektör bir çalışma durumu değildir; işsizlik çıkarımı veya sektöre bağlı otomatik alan gizleme yapılmaz.

Başvuru referansı, kişisel bilgiler, tüm açıklamalar (kurgusal belge alıntıları dahil), inceleme notu ve beyan kutuları zorunludur. Yalnızca boşluk içeren metinler kabul edilmez. Çoklu seçimlerde en az bir seçenek gerekir. Evet cevabıyla açılan ayrıntılar gösterildiklerinde zorunludur; Hayır cevabında gizlenir ve doğrulamadan çıkarılır. Seyahat edilen ülke sayısı 0 ise bölgeler sorulmaz; aynı gün dönülen seyahatte konaklama kaydı gerekmez. Gecelemeli seyahatte en az bir konaklama kaydı zorunludur. AI kullanımı ve harici gönderim onayı ayrı, isteğe bağlı seçimlerdir.

Başarılı gönderim raporu ana görünümde açar. Başvuruyu düzenle formu koruyarak geri getirir. Düzenleme eski raporu güncel olmaktan çıkarır; kopyalama ve yazdırma kilitlenir. AI hatalarında yerel rapor ve form korunur; onaylı istek için yeniden deneme düğmesi vardır. AI isteği açık alan listesiyle kurulur; profil, inceleme notu ve referans dahil uygulanabilir tüm yanıtlar gönderilir; gizlenen koşullu yanıtlar çıkarılır.

## Demo davranışı

- Next.js App Router, strict TypeScript, Tailwind CSS, özelleştirilmiş shadcn/ui bileşenleri, Lucide, React Hook Form ve Zod kullanır.
- Beş kurgusal örnek, bugünden 30 gün sonrası için üretilir: tutarlı, eksik bilgi, konaklama süresi uyuşmazlığı, ters tarihler ve seçilen amaçla çelişen seyahat açıklaması. Örnek yüklemek önceki raporu ve hataları temizler; raporu otomatik oluşturmaz. Ters tarihler ilk adımda düzeltilmelidir; serbest metin çelişkileri isteğe bağlı AI incelemesine bırakılır.
- İlk örnek: 10 gece / 6 gece kapsam ve bütçe farkı; toplam 2 bulgu. Tutarlı örnek: 0 bulgu. Eksik bilgi örneği, zorunlu alanlar tamamlanana kadar ilerlemeyi engeller.
- Yerel kural bulguları deterministiktir; isteğe bağlı AI gözlemleri ayrı bir bölümde gösterilir ve yerel bulguları değiştirmez. Form bilgileri React belleğinde tutulur. Yenilemek veya **Temizle** işlemi yerel bilgileri siler. AI kullanılırsa aşağıdaki alanlar harici sağlayıcıya gönderilir. `localStorage`, veritabanı, kimlik doğrulama veya belge yükleme yoktur.
- Form değişince rapor eski olarak işaretlenir. Yeniden oluşturulana kadar kopyalama/yazdırma kapalıdır. Tarayıcının doğrudan yazdırma işleminde de eski raporun içeriği gizlenir.
- Kopyalama, tarayıcının pano iznine ve güvenli bağlama (localhost veya HTTPS) bağlıdır. Başarı/başarısızlık arayüzde bildirilir.
- Tarihler UTC gün numaralarıyla hesaplanır. Konaklama aralıkları `[giriş, çıkış)` şeklindedir; seyahat aralığına kırpılır ve birleştirilir. Aynı gece iki kez sayılmaz. Aynı gün dönüş 0 gecedir.
- Para birimi dönüşümü yapılmaz. Tutarlar virgül veya noktayla en fazla iki ondalık basamak kabul eder. Binlik ayırıcı kullanmayın. Giriş sınırı 1 trilyondur.
- İnceleme notu ve dört açıklama alanı AI seçeneği ve onayınızla OpenAI’a gönderilir. Not, yerel kuralları etkilemez; AI dayanağı olarak kullanılırsa rapor ve kopyada görünür. Kimlik/pasaport numarası veya ilgisiz iletişim bilgisi girmeyin.

## Kapsam ve isteğe bağlı AI

### Ek başvuru bilgileri

Form; çalışma sektörü, meslek, medeni durum, işe başlama yılı, yaş, doğum ülkesi, eğitim, ziyaret edilen ülke sayısı ve bölgeler (Schengen Alanı / ABD / Diğer ülkeler), geçerli yabancı vize/oturum ülkeleri, vize reddi ülkeleri, yabancı diller, gidilecek ülkedeki akrabalar, varlık türleri (ev/araba/tarla/arsa) ve ödeme yöntemlerini (kredi/kredi kartı/nakit) toplar. Bu alanlar zorunludur. Evet seçilen vize/oturum, ret, dil, akrabalık ve varlık sorularının tüm ayrıntıları istenir; cevap değiştiğinde gizlenen ayrıntılar rapora dahil edilmez. Aynı ülke seyahat sayısında bir kez sayılır. Yaş ve ülke sayısı negatif olmayan tam sayılardır; işe başlama yılı gelecekte olamaz.

Ek bilgiler yalnızca sayfa belleğinde tutulur; insan incelemesi için ekranda, kopyalanan ve yazdırılan raporda gösterilir. Yerel kural bulgularını değiştirmez; AI seçeneği ve onayınızla uygulanabilir tüm profil bilgileri OpenAI’a gönderilir. Temizleme ve örnek yükleme bu alanları da sıfırlar/değiştirir.

Varsayılan seçenek **“Yalnızca yerel kontroller”** seçeneğidir; ağ isteği yapmaz. **“Yerel kontroller + AI Ön Değerlendirme”** seçeneği ve ayrı gönderim onayıyla analiz düğmesi `POST /api/analyze` çağrısı yapar. Resmî OpenAI JavaScript SDK’sı (`openai`, kilit dosyasında 6.49.0) sunucuda Responses API’yi kullanır: `responses.parse()`, `text.format: zodTextFormat(...)`, `output_parsed`. Sözdizimi [resmî SDK belgeleri](https://developers.openai.com/api/docs/libraries) ve [Structured Outputs kılavuzu](https://developers.openai.com/api/docs/guides/structured-outputs) üzerinden kontrol edildi.

### Kimlik bilgilerini ayarlama

Proje kökünde, `package.json` ile aynı dizinde **`.env.local`** oluşturun:

```dotenv
OPENAI_API_KEY=buraya_kendi_api_anahtarinizi_yazin
OPENAI_MODEL=hesabinizin_erisebildigi_model_kimligi
```

Bu gösterimler gerçek anahtar/model değildir. `OPENAI_MODEL`, hesabınızın erişebildiği, **Responses API ve Structured Outputs destekleyen** bir modelin tam kimliği olmalıdır. Kod bir model adı varsaymaz. `.env.example` boş yer tutucular içerir; `.env.local` dahil gerçek ortam dosyaları `.gitignore` ile dışlanır. `NEXT_PUBLIC_` öneki kullanmayın; anahtarı tarayıcıya veya sohbete yapıştırmayın.

Değişiklikten sonra terminalde çalışan sunucuyu **Ctrl+C** ile durdurun ve **`npm run dev`** ile yeniden başlatın. Üretim çalıştırıyorsanız **`npm run build`**, ardından **`npm start`** çalıştırın. Sonra formda AI seçeneğini seçip tüm uygulanabilir yanıtların gönderimi için onay kutusunu onaylayın ve rapor oluşturun. Bu işlem API kullanım ücreti doğurabilir.

### Gönderilen bilgiler ve doğrulama

- İstek `application` ve `consent: true` alanlarından oluşur. Doğrulanmış şemadan açık, tipli bir alan listesi kurulur: referans, ülke, amaç, tarihler, bütçe/maliyet/para birimi, konaklamalar, beyanlar, kişisel/eğitim/çalışma bilgileri, seyahat/vize/ret geçmişi, diller, akrabalar, varlıklar, ödeme yöntemleri, inceleme notu ve tüm açıklamalar. React durumu, eski raporlar, kimlik bilgileri ve ilgisiz metadata gönderilmez. Gizli koşullu yanıtlar istemcide çıkarılır; sunucu da tam başvuruyu doğrulayıp aynı normalizasyonu uygular.
- Gönderim için ayrı onay gerekir. Onay metni profil ve inceleme notu dahil tüm uygulanabilir yanıtları kapsar. Yerel mod dışarıya istek yapmaz. Yanıtlarda kimlik/pasaport numarası veya ilgisiz iletişim bilgisi kullanmayın. Tanımlayıcı kalıp kontrolü tüm gönderilen metinlerde uygulanır; bu eksiksiz bir kişisel bilgi tespit sistemi değildir. Gizlenen yanıtlar bu kontrole ve modele girmez.
- Zod doğrulaması: en fazla 20 konaklama, üç açıklama için ayrı ayrı 2.000 karakter, kurgusal alıntılar için 3.000 karakter; toplam istek gövdesi en fazla 64 KiB. Fazladan üst düzey alanlar reddedilir. Boyut sınırı akış okunurken de uygulanır.
- AI sonucu `overallAssessment`, Türkçe `summary`, en fazla 12 `findings`, dayanaklı `consistentPoints` ve `limitations` içerir. Durumlar: `no_material_concern_identified`, `clarification_required`, `significant_concerns_identified`, `insufficient_information`. Bunlar başvurudaki bilgilerin incelemesini anlatır; vize kararı değildir. Bulguların `priority` değeri açıklama önceliğidir; kişi risk puanı değildir.
- Her bulgu ve tutarlı nokta bir veya daha fazla `fieldId` / `value` dayanağı içerir. Gönderilmemiş alanlar ve uydurma alıntılar reddedilir. Sayı/tarih/seçim/liste değerleri tam eşleşir; açıklamalarda birebir metin parçası kabul edilir. İstemci ve sunucu aynı doğrulamayı yapar. Şema, dayanak eşleşmesi ve bazı çelişki kontrolleri anlamsal doğruluğun garantisi değildir.
- Tarih ve bütçe kuralları güvenilir hesap girdisi olarak modele verilir ve ayrı gösterilir. Modelden bunları tekrar üretmesi istenmez; yalnızca bu hesap alanlarını dayanak gösteren AI bulguları reddedilir. Yerel bulgular varken “önemli sorun yok” sonucu kabul edilmez. Genel durum, öncelik ve bulguların tutarlılığı da kontrol edilir.
- Projede incelenmiş, kaynaklı vize kriterleri yoktur. Modele boş kriter listesi ve boş doğrulanmış belge listesi gönderilir. Kaynaksız kural/eşik üretmesi, doğum yerinden vatandaşlık çıkarması, demografik bilgiler veya seyahat geçmişini tek başına ret gerekçesi sayması yasaktır. Beyan kutuları belge varlığı/incelemesi/doğrulaması anlamına gelmez. Kurgusal alıntılar gerçek kanıt değildir. Bu sınırlar sonuç, kopya ve yazdırma görünümünde her zaman gösterilir.
- Tüm başvuru metinleri güvenilmeyen veri olarak kullanıcı mesajında ayrı iletilir; içlerindeki talimatlar analiz kurallarını değiştiremez. Yüzde veya desteklenmeyen risk puanı üretilmez. Yerel rapor hemen oluşur; AI başarısız olursa yanıt uydurulmaz, Türkçe hata ve tekrar deneme gösterilir. Form korunur. Bulgusuz gerçek AI sonucu ile AI kullanılmaması ayrı durumlardır.
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

**Tam başvuru AI güncellemesi — 4 Kasım 2026:** lint, TypeScript kontrolü, 33 birim/entegrasyon testi ve üretim derlemesi geçti. Masaüstü ve 375 px mobil projelerinde 22 tarayıcı kontrolü geçti; ardından genişletilen AI test dosyası ayrı üretim sunucusunda 8 başarılı kontrolle çalıştırıldı. Tam etkin veri gönderimi, koşullu alanların çıkarılması, hata/yeniden deneme, çift gönderim engeli, geç yanıtların yok sayılması, düzenleme sonrası rapor güncelliği, dört değerlendirme durumu, öncelik sırası, kanıtlar, kopyalama ve yazdırma doğrulandı. Mobil değerlendirme ekran görüntüsü incelendi. Ayrı üretim portu için `PLAYWRIGHT_PORT=3100` kullanılabilir.

Önceki akış güncellemesinde ayrıca 320, 375, 390, 768, 1024 ve 1440 px genişliklerde 48 tarayıcı senaryosu geçmişti; bu geçmiş kayıt, mevcut güncellemede tüm bu genişliklerin yeniden test edildiği anlamına gelmez.

İnceleme motoru, AI entegrasyonu, profil ve adım doğrulaması için odaklı testler vardır. AI testleri resmî SDK’yı **taklit taşıma katmanıyla** çalıştırır: gerçek API çağrısı veya ücret yoktur. Alan izin listesi, onay, uzunluk sınırları, kanıt eşleşmesi, eksik yapılandırma, zaman aşımı/iptal, sağlayıcı hatası, geçersiz yanıt ve yerel motorun değişmemesi kontrol edilir. Ek saat dilimi kontrolü: `TZ=Europe/Berlin npm test`.

Playwright, kurulu Google Chrome'u kullanır ve üretim sunucusunu otomatik başlatır; önce `npm run build` çalıştırın. 320, 375, 390, 768, 1024 ve 1440 px için tanımlı projelerde üç örnek, doğrulama, kopyalama, eski rapor kilidi ve yazdırma senaryoları bulunur. `responsive.spec.ts` ayrıca uzun kurgusal AI metinlerini, konaklama ekleme/kaldırmayı, yüklenme/hata durumlarını, en az 44 px dokunma hedeflerini, en az 16 px alan yazısını, klavye odağını, azaltılmış hareket tercihini ve sayfa taşmasını kontrol etmek üzere hazırlanmıştır. En/boy değişimiyle yatay/dikey düzen ve 1440 px projesinde 720 px yeniden akış da kontrol edilir; bu, gerçek %200 tarayıcı yakınlaştırması değildir. AI senaryoları `/api/analyze` isteğini durdurup sentetik yanıt verir; **canlı sağlayıcıya gitmez**. Onaysız/yerel mod, ayrı AI kartları, hata durumunda yerel rapor ve geç gelen yanıtlar da test edilir. Çıktılar `test-results/` altında oluşur.

**Canlı doğrulama — 4 Kasım 2026:** Kullanıcının talebiyle, yapılandırılmış model ve gerçek OpenAI SDK üzerinden sunucu işleyicisine tek bir kurgusal başvuru gönderildi. Sağlayıcı ve işleyici HTTP 200 döndürdü; çalışma zamanı şemasından geçen sonuç `no_material_concern_identified`, 0 bulgu, 5 tutarlı nokta ve 3 sınırlama içerdi. Anahtar, tam başvuru veya ham model yanıtı yazdırılmadı. Bu kontrol gerçek sunucu işleyicisi/sağlayıcı bağlantısını doğrular; canlı sağlayıcıyla uçtan uca tarayıcı testi değildir. Otomatik testler yalnızca taklit sağlayıcı kullanır ve gerçek ortam anahtarlarını okumaz. Tarayıcı testlerinde localhost ve Chrome erişimi için sandbox dışında çalıştırma izni gerekir. Gerçek %200 yakınlaştırma, iOS/Android tarih seçicileri ve ekran klavyesi fiziksel cihazlarda ayrıca kontrol edilmelidir.

Üretim HTML/JS çıktısı ayrıca JSDOM ortamında çalıştırıldı. Yerel mod, gönderim onayı, istemci → sunucu işleyicisi → resmî SDK akışı (taklit sağlayıcı taşıması), ayrı AI kartları, kopyalama, düzenlemede eski rapor kilidi, eksik yapılandırmada yerel rapor, iptal ve geç yanıtın yok sayılması doğrulandı. Bu kontrol görsel tarayıcı testi veya canlı AI bağlantısı değildir.

## Duyarlı düzen

- Form ve rapor sırayla, en fazla 1040 px genişliğinde ortalanmış bir alanda gösterilir. Kısa form alanları masaüstünde iki, mobilde tek sütundur. Açıklamalar, koşullu soru grupları ve özetler tam genişliktedir. Mobil adım göstergesi dört numara ve etkin adım başlığı kullanır; yatay kaydırma gerektirmez.
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
