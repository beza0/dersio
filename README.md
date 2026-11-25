# Dersio

**Bağımsız özel ders öğretmenleri için ders yönetim uygulaması.** Öğrencileri, grupları, ders takvimini, notları ve ödevleri tek yerde toplar; öğrenci ve veliler kendi ekranlarından derslerini, ödevlerini ve öğretmenin paylaştığı notları izler.

[**Uygulamayı aç →** dersio-app.vercel.app](https://dersio-app.vercel.app) · [**Android APK indir**](https://github.com/beza0/dersio/releases/latest/download/Dersio.apk)

Web, Android ve iPhone'da (ana ekrana eklenen web uygulaması olarak) çalışır. Arayüz Türkçedir.

## Özellikler

**Öğretmen için**
- **Öğrenci ve gruplar:** yalnızca ad zorunlu; seviye, hedef sınav, branş ve renk isteğe bağlı. Grup dersleri ve grup ödevleri.
- **Takvim:** gün, hafta ve ay görünümü; haftalık tekrar eden dersler, online veya yüz yüze ders, çakışma kontrolü. Ders sonunda işlenen konu ve sonraki ders planı.
- **Notlar ve değerlendirmeler:** her not için görünürlük (yalnızca öğretmen, öğrenci, öğrenci + veli); en az 3 sayısal sonuçtan sonra gelişim grafiği.
- **Ödev ve materyal:** dosya veya fotoğraf ekli ödev, teslim, geri bildirim, yeniden teslim isteği, cevap anahtarı ve materyal arşivi.
- **Asistan:** "Yarın 15:00'e Elif'e ders ekle", "Bu hafta boş saatlerim ne?" gibi Türkçe komutlarla ders ekleme, taşıma ve iptal, ödev verme, öğrenci özeti çıkarma. Değişiklik yapan işlemler önce önizleme olarak gösterilir ve öğretmen onaylayınca uygulanır.
- **Talepler:** öğrenci veya velinin iptal ve erteleme talepleri; öğretmen onaylayana kadar takvim değişmez.

**Öğrenci ve veli için**
- Yaklaşan dersler, ödevler, ödev teslimi ve öğretmenin paylaştığı notlar.
- Öğrenci, davet kodu veya bağlantısıyla hesap açar.
- **Veliler hesap açmadan izleyebilir:** öğretmenin gönderdiği kişisel bağlantı açılınca veli ekranı gelir. Öğretmen bağlantıyı kaldırınca erişim biter.

**Diğer**
- Ders hatırlatmaları ve uygulama içi bildirimler.
- E-posta doğrulama ve parola sıfırlama.
- Abonelik planları ve sistem yöneticisi paneli.

## Telefona kurulum

| Cihaz | Nasıl |
|---|---|
| **Android** | [Dersio.apk](https://github.com/beza0/dersio/releases/latest/download/Dersio.apk) dosyasını indirip açın. "Bilinmeyen kaynak" uyarısı çıkarsa izin verip **Yükle**'ye basın. |
| **iPhone / iPad** | Safari'de [dersio-app.vercel.app](https://dersio-app.vercel.app) adresini açın, **Paylaş → Ana Ekrana Ekle** seçin. |

Tüm sürümler: [Releases](https://github.com/beza0/dersio/releases).

## Teknoloji

| Katman | Kullanılan |
|---|---|
| API | NestJS, Drizzle ORM, PostgreSQL |
| Web | React 19, Vite (PWA) |
| Mobil | Expo SDK 58, React Native, expo-router |
| Ortak paket | zod şemaları, tipler, hata kodları, API istemcisi, Türkçe metinler |
| Barındırma | Vercel (web + sunucusuz API), Supabase (PostgreSQL) |

```
apps/api         REST API (/api)
apps/web         Web uygulaması: öğretmen, öğrenci/veli ve yönetim ekranları
apps/mobile      Mobil uygulama: öğretmen, öğrenci/veli ekranları
packages/shared  Ortak şemalar, tipler ve API istemcisi
api/index.js     Vercel sunucusuz giriş noktası
docs/            Gereksinimler, kararlar, veri modeli, API sözleşmesi
```

## Yerelde çalıştırma

Gereksinimler: Node.js 22+ ve PostgreSQL 16+ (Docker ile ya da Docker olmadan `npm run db:local`).

```bash
npm install
npm run build:shared
cp apps/api/.env.example apps/api/.env   # JWT_SECRET değerini değiştirin
```

Veritabanı (birini seçin):

```bash
docker compose up -d db        # Docker varsa
npm run db:local               # Docker yoksa; veri ./.pgdata klasöründe
```

Tabloları ve demo verisini oluşturun, sonra API'yi ve web uygulamasını ayrı terminallerde başlatın:

```bash
npm run db:migrate
npm run db:seed
npm run dev:api                # http://localhost:3000/api
npm run dev:web                # http://localhost:5173
```

Mobil uygulama (Expo Go veya geliştirme derlemesi):

```bash
cd apps/mobile && npx expo start
```

### Demo hesaplar

Yalnızca yerel geliştirme veritabanında bulunur. Parola: `demo-parola-123`

| E-posta | Rol |
|---|---|
| ogretmen@demo.derslik.test | Öğretmen (3 öğrenci) |
| ogrenci@demo.derslik.test | Öğrenci (Elif Demir) |
| veli@demo.derslik.test | Veli (Elif Demir) |
| admin@demo.derslik.test | Sistem yöneticisi |

### Testler

```bash
npm test                       # tüm testler
npm test -w @derslik/api       # yalnızca API entegrasyon testleri
```

API testleri gerçek PostgreSQL üzerinde çalışır. `TEST_DATABASE_URL` verilmezse 54329 portunda geçici bir PostgreSQL başlatılır.

## Yapılandırma

Ayarların tamamı ve açıklamaları [`apps/api/.env.example`](apps/api/.env.example) dosyasındadır. Öne çıkanlar:

- **Asistan (`AI_PROVIDER`):**
  - `rules`: ücretsiz, kural tabanlı Türkçe komut çözücü (canlıda kullanılan). Veri dışarı gönderilmez.
  - `anthropic`: Claude API ile tam yapay zekâ asistanı; `ANTHROPIC_API_KEY` gerekir.
  - `fake`: yalnızca geliştirme ve test için.
- **E-posta (`MAIL_MODE`):** `smtp` gerçek gönderim yapar (ör. Gmail uygulama şifresi). `console` ve `file` geliştirme içindir.
- **Ödeme (`PAYMENT_PROVIDER`):** şu an yalnızca `sandbox` (test) modu.

## Canlıya alma

Web ve API tek bir Vercel projesinde, veritabanı Supabase'te çalışır (ikisi de ücretsiz katman). Gizli değerler depoya girmeyen `apps/api/.env.production.local` dosyasında tutulur.

```bash
npm run db:migrate:prod -w @derslik/api    # önce veritabanı değişiklikleri
node scripts/vercel-env.mjs                # ortam değişkenlerini Vercel'e aktar
npx vercel deploy --prod
```

Yeni Android sürümü: `apps/mobile` içinde `npx eas-cli build -p android --profile preview` ile APK derlenir. Ardından APK adresi `.github/workflows/release-apk.yml` dosyasına yazılır ve `android-v*` etiketi gönderilir; GitHub Actions APK'yı Releases sayfasına yükler.

Ayrıntılar: [CLAUDE.md](CLAUDE.md).

## Dokümanlar

- [Ürün gereksinimleri, rol-yetki matrisi, kabul senaryoları](docs/01-urun-gereksinimleri.md)
- [Karar kaydı, varsayımlar, açık sorular](docs/02-karar-kaydi.md)
- [Veri modeli](docs/03-veri-modeli.md)
- [API sözleşmesi](docs/04-api.md)
- [Görev listesi: ne bitti, ne kaldı](docs/05-gorev-listesi.md)

## Bilinen sınırlamalar

- **iPhone:** App Store sürümü yok (ücretli Apple Developer hesabı gerekir); iPhone'da web uygulaması ana ekrana eklenerek kullanılır.
- **Ödeme:** yalnızca test modunda. iyzico, App Store ve Google Play bağlantıları henüz yok.
- **Asistan:** canlıdaki ücretsiz kip yalnızca tanımlı komut kalıplarını anlar. Belge ve fotoğraf okuma, ders planı ve rapor yazma için Claude API anahtarı gerekir.
- **Mobil:** dosyalı ödev oluşturma, cevap anahtarı ve grup üyelik önizlemesi yalnızca webde. Yönetim paneli de yalnızca webde.
- **Dosyalar:** canlıda dosyalar veritabanında tutulur ve tek dosya en fazla ~4 MB olabilir.
- **Veri dışa aktarma** (JSON/CSV) henüz yok.
- **Hukuki metinler** (KVKK, gizlilik) taslaktır; hukuki inceleme gerekir.
