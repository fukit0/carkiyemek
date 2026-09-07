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
- **Ortak çark** — "Ekiple paylaş" `…/c/ab12cd34` gibi kısa bir bağlantı üretir.
  Bağlantıyı açan herkes aynı listeyi görür ve düzenleyebilir; değişiklikler
  otomatik kaydedilir. Giriş/kayıt yok.
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
| `src/hooks/useWheel.ts` | yerel/ortak mod, otomatik kaydetme, tazeleme |
| `src/core/api.ts` | ortak çark API istemcisi (dönen veri yine doğrulanır) |
| `src/server/handlers.ts` | `/api/wheel` uçları: oluştur / oku / güncelle |
| `src/server/redisStore.ts` | Upstash Redis deposu ve hız sınırı |
| `src/server/devPlugin.ts` | `npm run dev` sırasında aynı uçları bellek içi depoyla sunar |

Çekirdek mantık React'ten bağımsız saf fonksiyonlardır ve testleri
`src/core/__tests__/` altındadır.

## Ortak çark nasıl çalışıyor

- Çark `wheel:<id>` anahtarıyla Redis'te durur; `id` karıştırılması kolay
  harfleri içermeyen 8 karakterlik rastgele bir dizedir.
- Yazma uçları herkese açık olduğu için: gövde 32 KB ile, seçenek sayısı 40 ile
  sınırlı, her alan sunucuda yeniden doğrulanıyor ve IP başına dakikada 40 yazma
  sınırı var.
- Çakışma çözümü "son yazan kazanır". Sürüm sayacı sayesinde sekme öne
  geldiğinde, 60 saniyede bir ve "↻ Yenile" ile başkasının değişikliği alınır.
- Altı ay boyunca hiç dokunulmayan çark kendiliğinden silinir (Redis TTL).
- Depo bağlı değilse API 503 döner, uygulama sessizce yerel moda düşer.

## Vercel'de yayınlama

Statik Vite build'i + `api/` altındaki tek fonksiyon; Hobby planında ücretsiz.

1. Depoyu GitHub'a gönder ve [vercel.com/new](https://vercel.com/new) üzerinden
   içe aktar. Vercel "Vite" ön ayarını kendi bulur: build `npm run build`,
   çıktı `dist`.
2. Proje → **Storage** → Marketplace'ten bir **Upstash Redis** ekle. Entegrasyon
   `KV_REST_API_URL` ve `KV_REST_API_TOKEN` değişkenlerini projeye kendisi yazar.
3. Yeniden dağıt (Redeploy). Bu adım yapılmazsa çark çalışır ama paylaşım
   uçları 503 döner ve uygulama yerel modda kalır.

Alternatif olarak terminalden:

```bash
npx vercel login
npx vercel --prod
```

Yerelde gerçek Redis'e karşı denemek için `KV_REST_API_URL` ve
`KV_REST_API_TOKEN` değişkenlerini dışa aktarıp `npm run dev` çalıştırmak yeterli;
değişken yoksa geliştirme sunucusu bellek içi depo kullanır (yeniden başlayınca sıfırlanır).
