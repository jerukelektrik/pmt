# Google Business Profile Branch Analytics Dashboard PRD

Date: 2026-05-30

## 1. Ringkasan Produk

Google Business Profile Branch Analytics Dashboard adalah dashboard local/internal untuk memantau ribuan profil Google Business Profile dalam satu akun owner/manager.

MVP berfokus pada:

- Performance cabang: website clicks, phone call clicks, rating, dan total reviews.
- Status profil: verified, need verification, rejected, permanently closed, temporarily closed, dan unknown.
- Completion status cabang berdasarkan verifikasi, reputasi, dan checklist foto manual.
- Brand detection dari nama profil Google Business Profile.
- Manual correction untuk brand yang tidak jelas dan checklist foto cabang.
- Export CSV/XLSX berdasarkan filter aktif.

MVP memakai pendekatan local dashboard dengan SQLite. Dashboard dapat dikembangkan memakai mock/sample data saat Google API belum siap, tetapi live sync baru dianggap siap setelah prasyarat Google Cloud dan Google Business Profile API terpenuhi.

## 2. Latar Belakang

Tim mengelola ribuan Google Business Profile dari beberapa brand dalam satu akun. Brand yang perlu dipantau dalam MVP:

- Les Privat.
- Brainacademy.
- Englishacademy.
- Mathchamps.
- Ruangguru Coding.
- Workabroad Academy.
- Wonderlab.
- Altaglobalschool.

Saat jumlah profil besar, monitoring manual lewat Google Business Profile Manager menjadi tidak efisien. Tim perlu melihat cabang mana yang sudah verified, mana yang perlu verifikasi, mana yang rejected atau closed, serta cabang mana yang belum memenuhi target reputasi dan checklist foto.

Dashboard ini dirancang sebagai alat kontrol operasional internal: sync data dari Google, normalisasi data ke SQLite, lalu tampilkan kondisi cabang secara filterable dan exportable.

## 3. Tujuan Produk

- Operator dapat melihat kondisi semua profil bisnis dari satu layar.
- Operator dapat memantau status verifikasi dan status profil cabang.
- Operator dapat melihat performance utama: website clicks, phone call clicks, rating, dan total reviews.
- Operator dapat menghitung completion rate dengan aturan bisnis yang jelas.
- Operator dapat memperbaiki brand mapping dan checklist foto tanpa mengubah data Google.
- Operator dapat export daftar cabang terfilter untuk follow-up tim.
- Implementasi tetap ringan dan dapat berjalan lokal sebelum diputuskan apakah perlu hosted deployment.

## 4. Bukan Tujuan MVP

- Bukan hosted production app.
- Belum ada login internal, role management, atau permission per brand.
- Belum ada scheduled sync otomatis.
- Belum ada reply review dari dashboard.
- Belum ada AI/manual image recognition untuk memverifikasi isi foto.
- Belum ada integrasi master branch database eksternal.
- Belum ada Google Sheets sebagai database utama.
- Belum ada alerting otomatis ke Slack/WhatsApp/email.
- Phone call metric bukan panggilan tersambung, melainkan click pada call button dari Google Business Profile Performance API.

## 5. Infrastructure Prerequisites

Bagian ini adalah checklist yang perlu disediakan sebelum live sync Google Business Profile dapat berjalan.

### 5.1 Google Cloud Dan API

User perlu menyediakan:

- Google Cloud Project yang akan dipakai dashboard.
- OAuth consent screen yang sudah dikonfigurasi.
- OAuth Web Client untuk local dashboard.
- Redirect URI lokal yang sudah didaftarkan, misalnya `http://127.0.0.1:<port>/auth/google/callback`.
- OAuth scope `https://www.googleapis.com/auth/business.manage`.
- Google Business Profile API Basic Access aktif.
- Quota Google Business Profile API tidak `0`.
- Google account yang dipakai OAuth adalah owner atau manager untuk semua profil bisnis yang ingin dipantau.

Jika quota Google Business Profile API masih `0`, dashboard tidak bisa melakukan live sync. Google docs menyatakan kondisi itu berarti project belum diberi akses dan perlu submit Basic API Access, bukan request quota increase.

### 5.2 API Yang Dipakai

MVP membutuhkan akses ke API berikut untuk live sync:

- Account Management API untuk membaca account yang bisa diakses.
- Business Information API untuk membaca daftar locations/profiles dan field identitas seperti title, store code, address, metadata, dan open status.
- Verifications API, khususnya Voice of Merchant state, untuk membantu mapping verified, need verification, rejected, atau unknown.
- Reviews API untuk membaca average rating dan total review count ketika tersedia.
- Business Profile Performance API untuk `WEBSITE_CLICKS` dan `CALL_CLICKS`.

Media API bersifat optional untuk MVP. API ini dapat dipakai nanti untuk membaca jumlah/media metadata, tetapi checklist foto MVP tetap manual karena kebutuhan "interior, foto gedung, aktivitas belajar" perlu validasi konteks.

### 5.3 Local Runtime

MVP berjalan sebagai local/internal app:

- Node.js runtime.
- Frontend dashboard, misalnya React/Vite.
- Local backend, misalnya Node/Express.
- SQLite database lokal.
- Folder lokal untuk database, OAuth token, logs, dan export.
- `.env` untuk OAuth client ID, OAuth client secret, redirect URI, database path, dan konfigurasi port.

Backend adalah satu-satunya bagian yang memanggil Google APIs. Browser/frontend hanya membaca data dari backend lokal.

### 5.4 Local Data Safety

Data berikut tidak boleh masuk git:

- `.env`.
- OAuth refresh/access token.
- SQLite database.
- Export yang berisi data cabang sensitif.
- Sync logs mentah bila berisi response API.

Implementasi perlu memastikan folder data lokal di-ignore dari git.

## 6. Pengguna

### Primary Operator

Primary operator adalah pemilik atau pengelola akun Google Business Profile yang menjalankan dashboard lokal.

Operator dapat:

- Connect Google OAuth.
- Menjalankan manual sync.
- Melihat dashboard dan tabel cabang.
- Mengubah manual brand mapping.
- Mengisi manual photo checklist.
- Import CSV checklist foto.
- Export CSV/XLSX dari data terfilter.

### Internal Viewer

Internal viewer dapat membuka dashboard dari mesin/internal network yang sama bila operator menjalankan app untuk tim. MVP tidak menyediakan login internal. Kontrol akses ditangani lewat cara app dijalankan dan siapa yang diberi akses ke mesin/internal URL.

## 7. KPI Dan Definisi Metrik

### 7.1 Total Profiles

Jumlah semua Google Business Profile locations yang berhasil dibaca dari akun owner/manager dan masuk scope brand dashboard, termasuk verified, need verification, rejected, permanently closed, temporarily closed, dan unknown.

### 7.2 Verified Rate

```text
Verified Rate = verified profiles / total profiles
```

Denominator memakai semua profile dalam scope dashboard. Closed dan rejected tetap dihitung dalam denominator agar masalah operational tetap terlihat.

### 7.3 Completion Rate

Sebuah cabang dianggap complete jika semua kondisi berikut terpenuhi:

- Profile status adalah `verified`.
- Rating `>= 4.5`.
- Total reviews `>= 10`.
- Checklist foto interior sudah checked.
- Checklist foto gedung sudah checked.
- Checklist foto aktivitas belajar sudah checked.

Formula:

```text
Completion Rate = complete profiles / total profiles
```

Jika rating atau total reviews tidak tersedia, cabang dianggap not complete sampai data tersedia atau statusnya diperbaiki.

### 7.4 Website Clicks

Jumlah click pada website profile untuk date range aktif. Sumber utama adalah Google Business Profile Performance API metric `WEBSITE_CLICKS`.

### 7.5 Phone Call Clicks

Jumlah click pada tombol panggilan profile untuk date range aktif. Sumber utama adalah Google Business Profile Performance API metric `CALL_CLICKS`.

Metrik ini bukan jumlah panggilan tersambung.

### 7.6 Rating Dan Total Reviews

Rating dan total reviews diambil sebagai latest value dari Google reviews endpoint saat tersedia. Reviews API hanya valid untuk location yang verified menurut dokumentasi Google. Untuk profile yang belum verified atau gagal fetch review, UI menampilkan `N/A` dan menyimpan error ringan.

## 8. Status Profil

MVP menampilkan status berikut:

- `verified`: cabang memiliki Voice of Merchant atau sinyal valid lain yang menunjukkan profile sudah bisa dikelola/ditampilkan normal.
- `need_verification`: Google API memberi sinyal bahwa cabang perlu verifikasi atau belum memiliki Voice of Merchant.
- `rejected`: Google API memberi sinyal guideline/compliance/verification problem yang perlu diperbaiki. Karena istilah dan payload Google dapat berbeda antar endpoint, implementasi harus menyimpan raw status reason untuk audit.
- `permanently_closed`: Google Business Profile open status menunjukkan permanently closed.
- `temporarily_closed`: Google Business Profile open status menunjukkan temporarily closed.
- `unknown`: status belum bisa dipetakan dengan aman.

Status closed dari open status lebih spesifik daripada verified. Jika sebuah profile verified tetapi permanently closed, UI menampilkannya sebagai `permanently_closed`.

## 9. Brand Detection

Brand detection MVP memakai nama profil Google Business Profile. Tidak ada master branch database eksternal.

### 9.1 Brand List

Brand canonical:

- `les-privat`: Les Privat.
- `brainacademy`: Brainacademy.
- `englishacademy`: Englishacademy.
- `mathchamps`: Mathchamps.
- `ruangguru-coding`: Ruangguru Coding.
- `workabroad-academy`: Workabroad Academy.
- `wonderlab`: Wonderlab.
- `altaglobalschool`: Altaglobalschool.

### 9.2 Detection Rules

Rules awal:

- Normalize lowercase.
- Hilangkan punctuation dan extra whitespace.
- Match brand aliases, misalnya `brain academy` dan `brainacademy`.
- Jika satu brand match kuat, set `brand_mapping_status = auto`.
- Jika tidak ada match atau lebih dari satu brand match ambigu, set `brand_mapping_status = needs_review`.
- Operator dapat memilih brand manual.
- Manual mapping tidak boleh tertimpa oleh sync berikutnya.

## 10. Photo Checklist

Photo checklist adalah data manual yang dikelola di dashboard atau bulk import CSV.

Field checklist per cabang:

- `has_interior_photo`.
- `has_building_photo`.
- `has_learning_activity_photo`.
- `photo_checklist_updated_at`.
- `photo_checklist_updated_by` opsional untuk future multi-user.
- `photo_checklist_note` opsional.

MVP menyediakan dua cara update:

- Manual checkbox di dashboard untuk satu cabang atau beberapa cabang.
- Bulk import CSV.

### 10.1 CSV Import

CSV template minimal:

```text
location_id,profile_name,interior_photo,building_photo,learning_activity_photo,note
```

Matching utama memakai `location_id`. Jika `location_id` kosong, sistem boleh mencoba match dari `profile_name`, tetapi hasil ambiguous harus masuk rejected import rows.

Import harus menampilkan:

- Jumlah rows berhasil.
- Jumlah rows gagal.
- Daftar rows gagal dengan reason, misalnya location tidak ditemukan atau nilai checkbox tidak valid.

## 11. Data Model SQLite

SQLite dipakai sebagai source of truth lokal untuk dashboard.

### 11.1 `profiles`

Menyimpan identitas cabang/profile terakhir dari Google.

Field utama:

- `location_id`.
- `account_id`.
- `profile_name`.
- `store_code`.
- `address`.
- `city`.
- `brand_id`.
- `brand_mapping_status`.
- `profile_status`.
- `raw_status_reason`.
- `last_seen_at`.
- `last_synced_at`.

### 11.2 `profile_metrics`

Menyimpan metric hasil sync untuk date range tertentu.

Field utama:

- `location_id`.
- `period_start`.
- `period_end`.
- `website_clicks`.
- `phone_call_clicks`.
- `rating`.
- `total_reviews`.
- `metric_sync_status`.
- `partial_error`.
- `synced_at`.

### 11.3 `photo_checklists`

Menyimpan manual checklist foto.

Field utama:

- `location_id`.
- `has_interior_photo`.
- `has_building_photo`.
- `has_learning_activity_photo`.
- `note`.
- `updated_at`.

### 11.4 `brand_mappings`

Menyimpan override manual.

Field utama:

- `location_id`.
- `brand_id`.
- `source`: `auto` atau `manual`.
- `updated_at`.

### 11.5 `sync_runs`

Menyimpan log sinkronisasi.

Field utama:

- `sync_run_id`.
- `status`: `running`, `success`, `partial_success`, `failed`.
- `started_at`.
- `finished_at`.
- `profiles_seen`.
- `profiles_success`.
- `profiles_failed`.
- `error_summary`.

### 11.6 `import_runs`

Menyimpan audit bulk import checklist foto.

Field utama:

- `import_run_id`.
- `file_name`.
- `status`.
- `total_rows`.
- `success_rows`.
- `failed_rows`.
- `created_at`.

## 12. Sync Flow

MVP memakai manual sync saja.

Alur:

1. Operator membuka Settings & Sync.
2. Operator memastikan Google OAuth connected.
3. Operator klik `Sync Data`.
4. Backend membuat `sync_runs` dengan status `running`.
5. Backend refresh access token bila perlu.
6. Backend membaca accounts yang dapat diakses.
7. Backend membaca locations/profiles dari setiap account.
8. Backend mengambil status/open state dan Voice of Merchant state bila tersedia.
9. Backend mengambil rating dan total review count saat endpoint valid.
10. Backend mengambil performance metrics `WEBSITE_CLICKS` dan `CALL_CLICKS` untuk date range aktif.
11. Backend menjalankan brand detection untuk profile baru atau profile yang belum punya manual mapping.
12. Backend upsert ke SQLite.
13. Backend mempertahankan manual brand mapping dan photo checklist.
14. Backend menandai sync sebagai `success`, `partial_success`, atau `failed`.
15. Frontend refresh data dari SQLite.

### 12.1 Date Range

MVP menyediakan date range untuk performance metrics:

- Last 7 days.
- Last 28 days sebagai default.
- Month to date.
- Custom range.

Rating, total reviews, status, dan checklist foto dianggap latest state, bukan time-series utama.

### 12.2 Rate Limit Strategy

Karena jumlah profile ribuan dan Google Business Profile API memiliki quota per minute, backend harus:

- Membatasi concurrency request.
- Melakukan retry terbatas untuk `429` dan transient `5xx`.
- Menyimpan partial error per profile.
- Tetap melanjutkan sync profile lain ketika satu profile gagal.
- Menampilkan progress stage kepada user.

## 13. Dashboard Pages

### 13.1 Overview

Default landing page setelah data tersedia.

Konten:

- Total profiles.
- Verified rate.
- Completion rate.
- Average rating.
- Total reviews.
- Website clicks.
- Phone call clicks.
- Breakdown per brand.
- Issue summary: need verification, rejected, temporarily closed, permanently closed, low rating, low reviews, missing photo checklist.
- Ringkas daftar cabang yang paling perlu perhatian.

### 13.2 Branches

Tabel utama semua profile.

Kolom:

- Brand.
- Profile name.
- Store code.
- City/address.
- Profile status.
- Rating.
- Total reviews.
- Website clicks.
- Phone call clicks.
- Interior photo.
- Building photo.
- Learning activity photo.
- Completion status.
- Last synced.

Fitur:

- Filter brand.
- Filter profile status.
- Filter completion status.
- Filter rating threshold.
- Filter review threshold.
- Filter checklist foto.
- Search profile name/store code/city.
- Sorting kolom penting.
- Export CSV/XLSX mengikuti filter aktif.

### 13.3 Profile Status

Halaman operasional untuk masalah status.

Konten:

- Count per status: verified, need verification, rejected, permanently closed, temporarily closed, unknown.
- Tabel issue untuk status non-verified/closed/rejected.
- Raw status reason jika tersedia.
- Filter brand dan search.

### 13.4 Needs Review

Halaman untuk brand mapping yang tidak bisa dideteksi otomatis.

Konten:

- Daftar profile `brand_mapping_status = needs_review`.
- Pilihan brand canonical.
- Save manual mapping.
- Indikator profile yang tetap unknown setelah manual review.

### 13.5 Photo Checklist

Halaman untuk completion input manual.

Konten:

- Count cabang yang sudah lengkap foto.
- Count cabang missing interior, building, atau learning activity.
- Tabel checklist per cabang.
- Bulk CSV import.
- Manual checkbox per cabang.
- Import result dan rejected rows.

### 13.6 Settings & Sync

Halaman teknis untuk operator.

Konten:

- Google connection status.
- API readiness checklist.
- OAuth connect/reconnect.
- Manual sync button.
- Date range untuk sync performance.
- Sync progress.
- Last sync summary.
- Error log ringkas.
- Local database path/status.

## 14. Filters And Export

Global filters:

- Date range.
- Brand.
- Profile status.
- Completion status.
- Branch search.

Export MVP:

- CSV export.
- XLSX export.
- Export mengikuti filter dan sort aktif.
- Export berisi branch-level rows, bukan hanya summary.

Export columns:

- Brand.
- Profile name.
- Store code.
- City/address.
- Profile status.
- Rating.
- Total reviews.
- Website clicks.
- Phone call clicks.
- Interior photo checklist.
- Building photo checklist.
- Learning activity photo checklist.
- Completion status.
- Blocking reason.
- Period start.
- Period end.
- Last synced at.

## 15. Completion Blocking Reason

Untuk membantu follow-up, setiap not complete profile memiliki blocking reason.

Possible reasons:

- `need_verification`.
- `rejected`.
- `closed`.
- `rating_below_4_5`.
- `reviews_below_10`.
- `missing_interior_photo`.
- `missing_building_photo`.
- `missing_learning_activity_photo`.
- `brand_needs_review`.
- `metric_unavailable`.

Jika ada lebih dari satu reason, UI menampilkan semua reason atau prioritas utama dengan detail expanded.

## 16. Error Handling

- Jika OAuth belum siap, dashboard tetap dapat dibuka dengan empty/mock state dan Settings menampilkan setup checklist.
- Jika API access/quota belum aktif, sync gagal dengan pesan jelas tentang Basic API Access dan quota `0`.
- Jika token expired, backend mencoba refresh token.
- Jika refresh token invalid/revoked, user diminta reconnect Google.
- Jika sebagian profile gagal sync, sync berakhir `partial_success` dan profile lain tetap tersimpan.
- Jika metric performance tidak tersedia, UI menampilkan `N/A`, bukan `0`.
- Jika rating/review tidak tersedia, UI menampilkan `N/A` dan completion menjadi not complete.
- Jika brand tidak terdeteksi, profile masuk Needs Review.
- Jika CSV import gagal sebagian, rows valid tetap diproses dan rows invalid ditampilkan untuk diperbaiki.

## 17. Testing Plan

Automated tests atau focused manual tests harus mencakup:

- Completion formula: verified + rating `>= 4.5` + reviews `>= 10` + tiga checklist foto.
- Verified rate formula.
- Status mapping untuk verified, need verification, rejected, permanently closed, temporarily closed, dan unknown.
- Brand detection untuk delapan brand.
- Ambiguous/no brand masuk Needs Review.
- Manual brand mapping tidak tertimpa sync.
- Manual photo checklist tidak tertimpa sync.
- Bulk CSV import checklist foto.
- Import rejected rows.
- Filter brand/status/completion/search.
- Sort tabel.
- CSV/XLSX export mengikuti filter aktif.
- SQLite upsert profiles dan metrics.
- Partial sync failure.
- API quota/access error message.
- `N/A` untuk metric yang tidak tersedia.

## 18. Acceptance Criteria

MVP dianggap berhasil jika:

- Operator dapat menjalankan dashboard lokal.
- Operator dapat melihat API readiness checklist di Settings.
- Operator dapat connect Google OAuth ketika credentials sudah tersedia.
- Operator dapat menjalankan manual sync.
- Dashboard menampilkan semua profile hasil sync atau mock state bila API belum siap.
- Operator dapat melihat website clicks, phone call clicks, rating, total reviews, dan profile status per cabang.
- Operator dapat melihat verified rate dan completion rate.
- Operator dapat update checklist foto secara manual.
- Operator dapat import CSV checklist foto.
- Operator dapat memperbaiki brand mapping yang ambiguous.
- Operator dapat filter dan export CSV/XLSX dari Branches table.

## 19. Open Implementation Notes

- Existing `gbp-dashboard` prototype dapat menjadi basis implementasi, tetapi storage perlu diganti atau ditingkatkan dari JSON cache menjadi SQLite.
- Status `rejected` perlu divalidasi saat API readiness test karena Google dapat mengembalikan reason dalam bentuk recommendation/action, bukan enum sederhana bernama rejected.
- Reviews endpoint dapat terbatas untuk verified locations. UI dan sync harus memperlakukan unavailable data sebagai `N/A`.
- Media API tersedia untuk list media, tetapi MVP tidak mengandalkan API untuk menentukan apakah foto berisi interior, gedung, atau aktivitas belajar.

## 20. UI/UX Design Guide

### 20.1 Design Direction

Dashboard harus terasa seperti operations command center untuk tim yang mengelola ribuan cabang, bukan landing page atau marketing dashboard.

Prinsip desain:

- Desktop-first.
- Data-dense tetapi tetap rapi.
- Table-first: tabel cabang adalah pusat kerja utama.
- KPI dipakai sebagai navigasi masalah, bukan dekorasi.
- Chart hanya dipakai untuk orientasi cepat.
- State dan status harus mudah dipahami tanpa bergantung pada warna saja.
- Interface harus tetap usable saat Google API belum siap, data kosong, atau sync gagal sebagian.

Hindari:

- Hero besar.
- Gradient dekoratif.
- Card bertumpuk terlalu banyak.
- Pie/donut chart untuk banyak status atau brand.
- Tabel yang tidak bisa discan.
- Warna status tanpa label/icon.
- Empty state yang hanya menampilkan layar kosong.

### 20.2 Visual System

Style visual yang direkomendasikan adalah clean enterprise dashboard dengan surface terang, border halus, dan kontras teks tinggi.

Warna:

- Background utama: putih atau abu sangat muda.
- Surface/table/card: putih.
- Primary action dan active navigation: teal.
- Success: green untuk `verified` dan `complete`.
- Warning: amber untuk `need_verification`, missing checklist, dan partial sync.
- Danger: red/rose untuk `rejected` dan sync failure.
- Muted gray untuk `unknown`, closed, disabled state, dan secondary metadata.

Warna tidak boleh menjadi satu-satunya pembeda status. Setiap status chip harus memakai kombinasi label, icon, dan warna.

Typography:

- Gunakan font sans-serif modern seperti Inter, Geist, atau Source Sans.
- Body text minimum 14-16px.
- Gunakan tabular numbers untuk KPI, rating, review count, website clicks, phone call clicks, dan table numeric columns.
- Heading di dashboard harus compact. Hindari display-scale typography yang memakan ruang kerja.

Spacing dan shape:

- Gunakan 4/8px spacing scale.
- Border radius kecil, sekitar 6-8px untuk cards, buttons, inputs, chips, dan table container.
- Shadow minimal. Pakai border dan background contrast untuk memisahkan area.
- Jangan menaruh card di dalam card kecuali modal atau repeated item yang memang perlu framing.

### 20.3 App Shell

Layout desktop:

```text
Sidebar | Header + metadata
        | Sticky filter bar
        | KPI strip
        | Main content per page
```

Sidebar:

- Berisi navigation utama: Overview, Branches, Profile Status, Photo Checklist, Needs Review, Settings & Sync.
- Active page harus jelas dengan icon, label, dan indicator.
- Navigation tidak boleh tersembunyi di desktop.

Header:

- Menampilkan nama dashboard.
- Menampilkan source status: mock/empty/cache/live Google API.
- Menampilkan last sync timestamp.
- Menyediakan action ringan seperti Refresh.

Sticky filter bar:

- Date range.
- Brand.
- Profile status.
- Completion status.
- Search branch/profile/store code/city.
- Export action bila relevan.

Filter bar harus tetap tersedia saat operator bekerja di tabel panjang.

### 20.4 Overview Page

Overview berfungsi sebagai triage cepat.

Komponen utama:

- KPI strip compact:
  - Total profiles.
  - Verified rate.
  - Completion rate.
  - Average rating.
  - Total reviews.
  - Website clicks.
  - Phone call clicks.
- Brand health table:
  - Brand.
  - Total profiles.
  - Verified rate.
  - Completion rate.
  - Need verification count.
  - Rejected count.
  - Missing checklist count.
- Issue summary:
  - Need verification.
  - Rejected.
  - Permanently closed.
  - Temporarily closed.
  - Rating below 4.5.
  - Reviews below 10.
  - Missing interior photo.
  - Missing building photo.
  - Missing learning activity photo.
- Attention list:
  - Cabang dengan blocking reason paling banyak atau issue paling kritikal.

Chart yang cocok:

- Horizontal bar untuk completion rate per brand.
- Stacked bar untuk status distribution per brand.

Jika data belum ada, Overview menampilkan setup-oriented empty state dengan tombol ke Settings & Sync.

### 20.5 Branches Page

Branches adalah halaman kerja utama dan harus dioptimalkan untuk ribuan rows.

Table behavior:

- Sticky table header.
- Sticky first column atau profile name column bila memungkinkan.
- Column sorting untuk status, rating, total reviews, website clicks, phone call clicks, completion status, dan last synced.
- Virtualized list/table bila row count besar.
- Search harus debounce agar input tetap responsif.
- Numeric columns rata kanan.
- Status dan completion columns harus mudah discan.
- Export CSV/XLSX mengikuti filter dan sort aktif.

Recommended columns:

- Brand.
- Profile name.
- Store code.
- City/address.
- Profile status.
- Rating.
- Total reviews.
- Website clicks.
- Phone call clicks.
- Photo checklist.
- Completion status.
- Blocking reason.
- Last synced.

Photo checklist display:

- Gunakan checklist mini dalam satu column:
  - Interior.
  - Gedung.
  - Aktivitas.
- Tiap item memakai icon/label pendek dan tooltip atau expanded detail.

Completion display:

- `Complete` memakai success chip.
- `Not complete` memakai warning chip dan menampilkan blocking reason.
- Jika ada lebih dari satu reason, tampilkan reason count dan detail saat row expanded.

### 20.6 Profile Status Page

Profile Status fokus pada masalah setup/verifikasi.

Struktur:

- Summary count per status.
- Grouped issue table untuk:
  - Need verification.
  - Rejected.
  - Permanently closed.
  - Temporarily closed.
  - Unknown.
- Raw status reason bila tersedia.
- Filter brand dan search.

Status chip:

- `verified`: success.
- `need_verification`: warning.
- `rejected`: danger.
- `permanently_closed`: muted/danger-muted.
- `temporarily_closed`: muted/warning-muted.
- `unknown`: neutral.

Closed status harus dibedakan jelas dari verification status karena closed adalah operational profile state.

### 20.7 Photo Checklist Page

Photo Checklist harus terasa seperti ops worksheet.

Fitur utama:

- Count cabang complete checklist.
- Count cabang missing masing-masing foto.
- Tabel checklist per cabang.
- Checkbox untuk interior, gedung, dan aktivitas belajar.
- Bulk CSV import.
- Import preview dan validation result.
- Rejected import rows dengan reason yang jelas.

CSV import flow:

1. Operator pilih file CSV.
2. UI menampilkan preview beberapa rows pertama.
3. UI menampilkan detected columns.
4. Operator confirm import.
5. UI menampilkan success rows dan rejected rows.

Checklist update harus memberi feedback cepat, misalnya inline saved state atau toast singkat. Untuk bulk import, tampilkan summary yang bisa dibaca ulang.

### 20.8 Needs Review Page

Needs Review dipakai untuk profile yang brand-nya tidak bisa dipetakan otomatis.

UI requirement:

- Tabel profile yang `brand_mapping_status = needs_review`.
- Search profile name/store code/city.
- Brand selector dengan delapan brand canonical.
- Save manual mapping per row.
- Bulk assign brand untuk selected rows.
- Manual mapping harus diberi label `manual` agar operator tahu ini override.

Setelah mapping disimpan, row keluar dari Needs Review dan masuk perhitungan normal.

### 20.9 Settings & Sync Page

Settings & Sync harus mengurangi kebingungan teknis Google API.

Tampilkan API readiness checklist:

- Google Cloud Project tersedia.
- OAuth consent screen configured.
- OAuth Web Client tersedia.
- Redirect URI lokal terdaftar.
- Scope `https://www.googleapis.com/auth/business.manage`.
- GBP Basic API Access aktif.
- GBP quota tidak `0`.
- Google account adalah owner/manager untuk semua profile.

Sync panel:

- Google connection status.
- Connect/Reconnect Google button.
- Manual Sync Data button.
- Date range untuk performance sync.
- Last sync timestamp.
- Sync progress stage:
  - accounts.
  - locations.
  - status.
  - reviews.
  - performance.
  - database save.
- Sync result:
  - success.
  - partial_success.
  - failed.
- Error summary dengan recovery step.

Jika quota `0`, error copy harus mengarahkan operator untuk submit Basic API Access, bukan quota increase.

### 20.10 Empty, Loading, And Error States

Empty states:

- No Google connection: arahkan ke Settings & Sync.
- No data after sync: jelaskan akun mungkin tidak punya accessible profiles atau filter terlalu sempit.
- No matching filter: tampilkan clear filters action.
- No Needs Review rows: tampilkan bahwa semua brand sudah mapped.

Loading states:

- Pakai skeleton untuk KPI, table, dan charts.
- Sync progress tidak boleh hanya spinner. Tampilkan stage dan counts jika tersedia.
- Button async harus disabled dan menampilkan loading state.

Error states:

- OAuth revoked: minta reconnect.
- API quota/access: tampilkan penyebab dan action.
- Partial sync: tampilkan jumlah sukses/gagal dan link ke error details.
- Metric unavailable: tampilkan `N/A`, bukan `0`.

### 20.11 Accessibility

Accessibility requirement:

- Semua interactive controls bisa dipakai dengan keyboard.
- Visible focus ring untuk button, input, select, checkbox, table row action, dan nav item.
- Icon-only button wajib punya `aria-label`.
- Status tidak boleh disampaikan dengan warna saja.
- Tabel sortable harus punya indicator visual dan semantic state seperti `aria-sort`.
- Error dan import result harus diumumkan dengan region yang screen-reader friendly.
- Contrast text normal minimal 4.5:1.
- Touch/click target minimal 44x44px untuk controls penting.
- Jangan disable browser zoom.

### 20.12 Responsive Behavior

MVP adalah desktop-first, tetapi tidak boleh rusak di mobile.

Desktop:

- Sidebar persistent.
- Full table experience.
- Sticky filter bar.

Tablet:

- Sidebar boleh collapse.
- KPI strip bisa wrap.
- Table tetap horizontal dengan controlled scroll di table container.

Mobile:

- Navigation menjadi top menu atau compact drawer.
- KPI tampil 2 columns.
- Branch table boleh menjadi simplified list/card view.
- Export dan bulk import tetap tersedia, tetapi advanced table ops diarahkan ke desktop.

Mobile tidak perlu menjadi primary ops surface untuk MVP.

### 20.13 Chart And Data Visualization Rules

Gunakan chart hanya jika membantu keputusan.

Recommended:

- Horizontal bar untuk comparison antar brand.
- Stacked bar untuk distribusi status per brand.
- Small trend/sparkline hanya jika historical snapshots sudah tersedia.

Avoid:

- Pie/donut untuk lebih dari lima kategori.
- Chart 3D.
- Gradient-heavy charts.
- Warna chart tanpa legend/label.
- Chart tanpa table alternative.

Setiap chart harus punya:

- Title yang jelas.
- Unit/metric jelas.
- Tooltip atau direct labels.
- Empty state.
- Table/list alternative untuk data penting.

### 20.14 Component Guidelines

Buttons:

- Satu primary action per screen.
- Secondary actions memakai outline/ghost style.
- Destructive actions memakai danger style dan konfirmasi.

Forms:

- Semua fields punya label.
- Error muncul dekat field terkait.
- Helper text untuk input teknis seperti OAuth redirect URI atau CSV format.

Chips:

- Dipakai untuk status, completion, source, dan sync state.
- Harus berisi text, bukan warna saja.

Modals/drawers:

- Gunakan untuk CSV import preview, error details, dan bulk action confirm.
- Modal harus punya close button, escape behavior, dan unsaved-change confirmation bila ada data belum tersimpan.

Tooltips:

- Dipakai untuk icon/abbreviation yang tidak familiar.
- Jangan menyembunyikan informasi penting hanya di tooltip.

### 20.15 Acceptance Criteria Tambahan Untuk UI/UX

UI/UX dianggap siap jika:

- Operator dapat mengetahui status data live/mock/cache dari header.
- Operator dapat menemukan cabang bermasalah dari Overview dalam kurang dari 30 detik.
- Operator dapat memfilter Branches berdasarkan brand, status, completion, dan search.
- Operator dapat melihat blocking reason tanpa membuka banyak halaman.
- Operator dapat melakukan manual checklist update tanpa kehilangan posisi di tabel.
- Operator dapat melihat hasil import CSV, termasuk rejected rows.
- Operator dapat memahami error quota `0` dan OAuth revoked dari copy yang tampil.
- Tabel tetap responsif dengan ribuan rows.
- Tidak ada horizontal page scroll di viewport utama.
- Semua controls penting bisa diakses dengan keyboard.

## 21. References

- Google Business Profile OAuth docs: https://developers.google.com/my-business/content/implement-oauth
- Google Business Profile quota limits: https://developers.google.com/my-business/content/limits
- Business Information locations list: https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts.locations/list
- Verifications Voice of Merchant state: https://developers.google.com/my-business/reference/verifications/rest/v1/locations/getVoiceOfMerchantState
- Reviews list: https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list
- Performance daily metrics: https://developers.google.com/my-business/reference/performance/rest/v1/DailyMetric
- Performance multi-daily metrics endpoint: https://developers.google.com/my-business/reference/performance/rest/v1/locations/fetchMultiDailyMetricsTimeSeries
- Media list: https://developers.google.com/my-business/reference/rest/v4/accounts.locations.media/list
