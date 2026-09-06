# Çarkıyemek

Öğle yemeği seçme eziyetini bitiren ağırlıklı çark. Her seçeneğin dilim genişliği
tek tek ayarlanabilir; çark bu ağırlıklara göre gerçekten adaletsiz (ve istendiği
kadar adaletli) döner.

## Neler var

- **Ağırlıklı dilimler** — her seçeneğin ağırlığı 0,1 adımlarla 0,1–100 arasında ayarlanır,
  yanında çıkma ihtimali yüzde olarak görünür.
- **Çark üstünden ince ayar** — iki dilim arasındaki beyaz tutamağı sürükleyince
  o iki seçenek kendi arasında pay değiş tokuş eder, çarkın geri kalanı bozulmaz.
- **Gerçek ağırlıklı çekiliş** — kazanan önce ağırlıklara göre seçilir, animasyon
  ibreyi tam o dilimin içine oturtur; dilim kenarına denk gelmez.
- **Menü hatırlanır** — tarayıcıya kaydedilir, ertesi gün aynı liste açılır.
- **Ekiple paylaşım** — "Ekiple paylaş" menüyü bağlantının içine gömer; karşı taraf
  linki açınca aynı çarkı görür.
- Ses efektleri (kapatılabilir), klavye ve ekran okuyucu etiketleri, mobil uyumlu düzen.

## Geliştirme

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # çekirdek mantığın birim testleri
npm run build    # dist/ üretir
```

Node 20+ gerekir (bu makinede `nvm use v25.2.1`).

## Mimari

| Dosya | Sorumluluk |
| --- | --- |
| `src/core/wheel.ts` | ağırlık → açı geometrisi, ağırlıklı seçim, hedef dönüş açısı |
| `src/core/resize.ts` | dilim sınırı sürüklendiğinde iki komşu arasında ağırlık takası |
| `src/core/menu.ts` | menünün doğrulanması, link için kodlanması/çözülmesi |
| `src/core/svgPath.ts` | SVG dilim yolları (tam daire kenar durumu dahil) |
| `src/hooks/useSpin.ts` | requestAnimationFrame ile dönüş animasyonu ve tik sesleri |
| `src/hooks/useMenu.ts` | localStorage + paylaşım bağlantısı |

Çekirdek mantık React'ten bağımsız saf fonksiyonlardır ve testleri
`src/core/__tests__/` altındadır.

## Vercel'de yayınlama

Statik bir Vite uygulaması; Vercel'in ücretsiz Hobby planında çalışır.

1. Depoyu GitHub'a gönder.
2. [vercel.com/new](https://vercel.com/new) → depoyu içe aktar.
3. Vercel "Vite" ön ayarını kendi bulur: build `npm run build`, çıktı `dist`.
4. Deploy. Ortam değişkeni gerekmez, sunucu tarafı hiç yok.

Alternatif olarak terminalden:

```bash
npx vercel login
npx vercel --prod
```
