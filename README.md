# VizeLens

Türkçe, başvuru sahibinden yönetici incelemesine uzanan bir sınıf demosu. Başvuru sahibi dört adımda bilgilerini gönderir; yönetici tüm yanıtları ve yerel kontrolleri görür, isterse OpenAI ön değerlendirmesi oluşturur ve **simüle bir insan kararı** kaydeder.

## Çalıştırma

Node.js **22.13 veya üzeri** gerekir (`.nvmrc`: Node 22).

```sh
nvm use
npm ci
npm run dev
```

Üretim sürümü:

```sh
npm run build
npm start
```

## Demo akışı

1. Giriş ekranında **Başvuru sahibi olarak devam et** seçin. Bunlar rol seçicilerdir; parola, gerçek kimlik doğrulama veya güvenlik sınırı yoktur.
2. Bir kurgusal örnek yükleyin veya uygulanabilir alanları doldurun. Dört adımda seyahat, profil/geçmiş, finansman/konaklama/beyanlar ve gönderim özeti bulunur.
3. Gönderilen yanıtların yönetici tarafından OpenAI üzerinden analiz edilebileceğini kabul edip **Başvuruyu gönder** seçin. Başvuru AI kullanılabilirliğinden bağımsız olarak kaydedilir.
4. **Yöneticiye geç** ile başvuru listesine dönün. Referans araması, durum filtresi ve özet sayıları kullanın. Boş liste için **Kurgusal başvuruları yükle** üç gönderilmiş örnek oluşturur; AI sonucu uydurmaz.
5. **İncele** ile gönderilen tüm uygulanabilir yanıtları, yerel kontrolleri ve iç inceleme panelini açın. **AI değerlendirmesi oluştur** yalnızca seçilen başvuruyu analiz eder.
6. İç not ekleyin. **Onayla**, **Reddet** veya **Ek bilgi iste** seçin; red ve ek bilgi için kısa gerekçe gerekir. Kararı gözden geçirip ayrı düğmeyle onaylayın. AI hiçbir insan kararını seçmez veya uygulamaz.
7. Başvuru sahibi görünümüne dönün: güncel demo durumu görünür, iç notlar ve AI bulguları görünmez. Yönetici kaydedilen kararı açık bir düzenleme eylemiyle değiştirebilir.

Yönetici raporu panoya kopyalanabilir veya tarayıcıdan yazdırılabilir. Tam gönderilen yanıtlar, yerel kontroller, AI değerlendirmesi ve insan kararı ayrı bölümlerdir. PDF kaydı tarayıcının yazdırma seçeneğine bağlıdır.

## Oturum modeli

- Tek React reducer içinde paylaşılan başvurular; rol değişimi gönderimleri korur. Veriler yalnızca açık sayfanın belleğinde yaşar. **Yenileme tüm demo verilerini siler.** Farklı tarayıcı sekmeleri ortak veri paylaşmaz.
- Her gönderimde benzersiz dahili kimlik, taslak kimliği, zaman damgası, değiştirilemeyen doğrulanmış yanıt kopyası, gönderim onayı, yerel sonuç, AI durumu, iç not ve ayrı insan kararı tutulur.
- Tekrarlanan tıklamalar aynı taslağı iki kez göndermez. Aynı referansla yeni bir taslak gönderilirse önceki başvuru üzerine yazılmaz.
- Başvuru durumları: **İnceleme bekliyor**, **İnceleniyor**, **Ek bilgi gerekli**, **Onaylandı**, **Reddedildi**.
- AI durumları: başlatılmadı, hazırlanıyor, başarılı veya başarısız. İstek kimliği ve başvuru kimliği kontrol edilir; geç gelen sonuç başka başvuruda gösterilemez. Görünüm değişse de sonuç kendi gönderimine bağlanır.
- İç yönetici notları başvuru kopyasından ayrıdır ve AI’a gönderilmez. Eski `notes` ve `fictionalExcerpts` sözleşme alanları API uyumluluğu için boş değer kabul eder; yeni başvuru akışında sorulmaz, zorunlu değildir ve boş tutulur.
- `localStorage`, veritabanı, gerçek kullanıcı hesabı, ayrı backend hizmeti, arka plan işi veya kalıcı karar geçmişi yoktur.

## Form ve yerel kontroller

Mevcut React Hook Form ve Zod doğrulaması korunur. Devam yalnızca mevcut adımı, gönderim tüm etkin yanıtları doğrular. Hatalı alan görünür kılınır ve odaklanır. Evet/Hayır cevapları açıktır; koşullu ayrıntılar uygulanabilir olduklarında zorunludur. Gizlenen yanıtlar taslakta korunur ancak gönderilen kopyadan, AI kanıtlarından ve rapordan çıkarılır.

Yerel motor; seyahat gecelerini, seyahat içindeki birleşik konaklama kapsamını, eksik geceleri, örtüşen/dışarı taşan kayıtları ve bütçenin kullanıcının maliyet tahmininin altında kalmasını hesaplar. UTC tarih aritmetiği kullanılır; çıkış gecesi sayılmaz, aynı gece kapsamda iki kez sayılmaz. Aynı gün dönüşte konaklama kaydı gerekmez. Tüm beyanlar ve gecelemeli seyahatte en az bir konaklama gönderim öncesinde zorunludur.

Ülke seçimi ABD, Kanada, Türkiye ve Almanya; amaç turizm, iş veya aile/arkadaş ziyareti; para birimi EUR, USD veya TRY ile sınırlıdır. Kur dönüşümü veya resmî mali eşik uygulanmaz. Serbest açıklamalar ve profil cevapları deterministik bulguları değiştirmez.

## OpenAI yapılandırması

`.env.local` içinde yalnızca sunucu ortamına:

```dotenv
OPENAI_API_KEY=kendi_api_anahtariniz
OPENAI_MODEL=hesabinizin_erisebildigi_model_kimligi
```

Kod model adı varsaymaz veya değiştirmez. Yapılandırılan model Responses API ve Structured Outputs desteklemelidir. `.env.example` boş alanlar içerir; gerçek ortam dosyaları Git dışında tutulur. `NEXT_PUBLIC_` kullanmayın. Ortam değişikliğinden sonra sunucuyu yeniden başlatın; üretim için yeniden derleyin.

Yönetici isteği mevcut **`POST /api/analyze`** üzerinden sunucudaki OpenAI SDK’sını kullanır. Tüm uygulanabilir gönderilmiş yanıtlar açık alan listesiyle kurulur. Gönderim zamanı onayı gereklidir. Gerçek AI çağrısı sağlayıcı ücreti doğurabilir. Başvuru içeriği veya anahtar günlüğe yazılmaz.

## AI değerlendirme sözleşmesi

Mevcut genel değerlendirme, bulgu, tutarlı nokta ve sınırlama yapısı korunur ve genişletilir:

- `concernLevel`: `low`, `medium`, `high`, `unable_to_assess`.
- `concernExplanation`: düzeyin kısa açıklaması.
- `concernEvidence`: gönderilmiş alan kimlikleri ve birebir değer/alıntılar.
- `evidenceSufficiency`: anlamlı ön inceleme için `sufficient` veya `insufficient`.
- `overallAssessment`, Türkçe `summary`, en fazla 12 bulgu, en fazla 8 tutarlı nokta ve sınırlamalar.

Arayüzde düzey **Başvuruya ilişkin ön inceleme riski** olarak etiketlenir. Bu, gönderilen bilgilerdeki açıklama/tutarlılık kaygılarını anlatır; ölçülmüş vize reddi olasılığı veya kişinin risk etiketi değildir. Bulgu önceliği ayrı bir kavramdır.

Orta/yüksek düzey için somut kanıtlı yerel veya AI bulgusu gerekir; yalnızca yerel bir sorun varsa modelin aynı bulguyu tekrar üretmesi gerekmez. Esas açıklamalar anlamlı inceleme için yetersizse sonuç değerlendirilemiyor olmalıdır. Düşük düzey için yalnızca sıfır yerel bulgu yetmez: yeterlilik beyanı ve anlatı alanlarıyla desteklenen tutarlı nokta gerekir; yerel veya AI bulgusu varken düşük kabul edilmez. Kanıt yeterliliğinin anlamsal doğruluğu model muhakemesine bağlıdır; şema doğrulaması bunun garantisi değildir.

Sunucu ve istemci aynı yapısal/kanıt doğrulamasını kullanır. Uydurma alanlar veya alıntılar, uygunsuz durum/öncelik birleşimleri, tekrarlar, yalnızca hesap alanlarına dayanan AI bulguları ve yalnızca demografik/akrabalık alanlarıyla desteklenen kaygılar reddedilir. Model; yaşı, medeni durumu, doğum yerini, dili, varlıkları, seyahat geçmişini veya yurt dışındaki akrabaları tek başına olumsuz sonuç gerekçesi saymamalıdır.

Başvuru metni talimat değil güvenilmeyen veridir. Gözden geçirilmiş ülke politikası ve doğrulanmış belge listeleri boştur. Model vize şartı, onay yüzdesi, yasal eşik veya nihai onay/red kararı üretemez. Kontroller yapısal güvencelerdir; tüm anlamsal hataları engelledikleri iddia edilmez.

## Hata ve veri sınırları

- Yerel rapor başvuru kaydında korunur; AI hatası gönderimi silmez. Türkçe hata ve elle yeniden deneme bulunur. Gerçek analiz yerine taklit sonuç gösterilmez.
- Sağlayıcı zaman aşımı 25 saniye, istemci sınırı 30 saniyedir. Otomatik tekrar yoktur. Aynı başvuruda eşzamanlı yinelenen istek engellenir.
- JSON/şema doğrulaması, akış sırasında 64 KiB gövde sınırı, uyumsuz Origin kontrolü ve temel tanımlayıcı kalıp taraması korunur. Bu tarama tam bir kişisel veri tespit sistemi değildir.
- Sunucu anahtarı tarayıcıya gönderilmez. SDK günlükleri kapalıdır, `store: false` ve `Cache-Control: no-store` kullanılır. Bunlar sağlayıcının tüm veri saklama koşullarını ortadan kaldırmaz.
- Demo kimlik doğrulaması veya üretim kota/harcama sınırlaması içermez. Yalnızca kurgusal başvurular kullanın.

## Doğrulama

```sh
nvm use
npm run lint
npm run typecheck
npm test
npm run build
npm run test:browser
```

Playwright kurulu Google Chrome'u kullanır, üretim sunucusunu başlatır; önce derleyin. Ayrı test portu:

```sh
PLAYWRIGHT_PORT=3126 npm run test:browser -- --project=desktop --project=mobile-375
```

Birim/entegrasyon testleri mevcut yerel motor, profil/adım doğrulaması ve SDK taklit taşıma katmanı testlerini; yeni değiştirilemeyen gönderim, rol koruma, yinelenen tıklama, tam yanıt görünümü, karar gerekçesi, durum güncellemesi, AI istek kimliği ve kaygı düzeyi kontrollerini kapsar.

Tarayıcı testleri örnek doldurma → gönderim → yönetici → AI → simüle karar → başvuru sahibi durumu akışını, filtreleri, dışlanan koşullu cevapları, iç notların görünmemesini, geç AI yanıtlarını, elle tekrar denemeyi, pano/yazdırmayı, odak davranışını, mobil düzeni ve yenilemeyle temizlemeyi kapsar. Otomatik testlerde **yalnızca taklit AI yanıtları** kullanılır; gerçek sağlayıcı çağrısı yapılmaz. Ekran görüntüleri ve başarısız test izleri `test-results/` altında oluşur.

### Bu değişiklikte çalıştırılan kontroller — 11 Kasım 2026

Node **22.21.0** ile lint, TypeScript kontrolü, **46 birim/entegrasyon testi** ve üretim derlemesi geçti. Google Chrome üzerinde `desktop` (1440 px) ve `mobile-375` projelerindeki **28 tarayıcı testi** geçti. Rol seçimi, yönetici listesi ve detay görünümünün masaüstü/mobil ekran görüntüleri incelendi. Diğer tanımlı Playwright projeleri ve fiziksel cihazlar bu değişiklikte ayrıca çalıştırılmadı. **Gerçek OpenAI sağlayıcı çağrısı yapılmadı.**

## Kapsam dışında

Gerçek giriş, kalıcı veri, resmî vize başvurusu, konsolosluk entegrasyonu, belge yükleme/OCR, ülke politikası araştırması, resmî uygunluk, çoklu kullanıcı oturumu ve tam karar denetim geçmişi yoktur. Simüle kararlar herhangi bir elçiliğe gönderilmez ve vize vermez.

`IMPLEMENTATION_AUDIT.md` ve `PRODUCT_CAPABILITIES_REPORT.md`, bu rol akışından önceki sürümün tarihli incelemeleridir; güncel davranış için bu README ve kaynak kod esas alınmalıdır.
