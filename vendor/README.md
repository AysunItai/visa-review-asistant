# Yerel bağımlılık arşivleri

Bu dosyalar, çalışma ortamında npm DNS/ağ erişimi bulunmadığı için kullanılmıştır. Arşivler npm tarafından kurulabilir; `package-lock.json` bütünlük değerlerini içerir.

| Paket | Kaynak | Değişiklik |
| --- | --- | --- |
| class-variance-authority 0.7.1 | Önceden kurulu yerel npm dağıtımı | `npm pack` ile yeniden paketlendi |
| clsx 2.1.1 | Önceden kurulu yerel npm dağıtımı | `npm pack` ile yeniden paketlendi |
| tailwind-merge 2.6.1 | Önceden kurulu yerel npm dağıtımı | `npm pack` ile yeniden paketlendi; bu projede kullanılan ortak sınıf sözdizimiyle sınırlı kullanım |
| react-hook-form 7.83.0+vizelens.1 | [Resmî 7.83.0 ESM dağıtımı](https://app.unpkg.com/react-hook-form@7.83.0/files/dist/index.esm.mjs) | Kaynak haritası yorumu çıkarıldı; yalnızca kullanılan API için yerel TypeScript tanımları eklendi |

React Hook Form'un JavaScript davranışı yeniden uygulanmamıştır. Çalışma zamanı, açık kaynak dağıtımının tamamıdır. Arşivdeki `dist/index.d.ts`, **resmî tip dosyası değildir**: `useForm`, `useFieldArray`, `useWatch` ve kullanılan alan yolu/sonuç tiplerini kapsar. Yeni API kullanımı için tam resmî pakete geçin. Lisans arşivin içindedir; [asıl proje MIT lisanslıdır](https://github.com/react-hook-form/react-hook-form/blob/master/LICENSE).

Arşiv içeriği `tar -tzf vendor/<paket>.tgz` ile incelenebilir. Normal ağ erişimi sağlandığında standart React Hook Form paketini kurun:

```sh
npm install react-hook-form@7.83.0
npm run typecheck
npm test
npm run build
```
