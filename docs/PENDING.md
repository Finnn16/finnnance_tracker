# PRD — Quick Add Pending Transaction & Daily Closing Saldo

## 1. Background

Finance tracker pribadi sering gagal bukan karena fitur kurang lengkap, tapi karena user malas input transaksi secara detail. Form transaksi yang terlalu panjang membuat user menunda pencatatan, lalu akhirnya lupa. Akibatnya saldo di aplikasi berbeda dengan saldo asli di m-banking.

Untuk mengurangi selisih saldo, sistem perlu menyediakan cara input transaksi yang sangat cepat dan mekanisme pengecekan saldo berkala.

Fitur yang akan dibuat:

1. Quick Add / Pending Transaction
2. Daily Closing Saldo

Dua fitur ini bertujuan agar transaksi tetap tercatat meskipun belum lengkap, lalu saldo wallet bisa dicek secara rutin agar selisih tidak menumpuk.

---

# PART A — Quick Add / Pending Transaction

## 2. Objective

Menyediakan fitur pencatatan transaksi cepat dengan input seminimal mungkin.

User cukup mengisi:

- Nominal
- Wallet
- Type transaksi

Detail seperti kategori, note, budget category, dan budget period bisa dilengkapi nanti.

Tujuan utama fitur ini adalah menangkap transaksi sebelum user lupa.

---

## 3. Problem

Saat ini form transaksi terlalu lengkap dan terasa berat untuk input cepat.

Contoh kondisi nyata:

User beli makan Rp 25.000 pakai QRIS BNI. Karena sedang buru-buru, user malas buka form panjang. Transaksi tidak dicatat. Beberapa hari kemudian saldo web berbeda dengan saldo m-banking.

Masalah yang ingin diselesaikan:

- User malas input transaksi kecil
- Banyak transaksi lupa dicatat
- Saldo wallet di web jadi tidak akurat
- Budget dan report ikut kurang akurat
- User kehilangan trust terhadap aplikasi

---

## 4. Solution Overview

Buat fitur Quick Add.

Quick Add memungkinkan user mencatat transaksi dengan cepat tanpa perlu isi semua detail.

Contoh input:

```txt
Amount: Rp 25.000
Wallet: BNI Wondr
Type: Expense
```

Setelah disimpan, transaksi masuk ke database dengan status:

```txt
pending_detail
```

Transaksi ini tetap memengaruhi saldo wallet, tapi belum dianggap lengkap untuk laporan detail kategori dan budget.

---

## 5. User Flow

### 5.1 Quick Add dari Web App

Flow:

```txt
User klik tombol Quick Add
↓
User input nominal
↓
User pilih wallet
↓
User pilih type: Expense / Income
↓
User klik Save
↓
Transaksi masuk sebagai pending_detail
↓
Saldo wallet langsung berubah
↓
Dashboard menampilkan reminder transaksi belum lengkap
```

Contoh:

```txt
Saldo BNI sebelum transaksi: Rp 1.000.000
Quick Add Expense: Rp 25.000
Saldo BNI setelah transaksi: Rp 975.000
```

Namun transaksi masih belum punya kategori.

---

### 5.2 Quick Add dari iOS Shortcut

Fitur ini harus mendukung input dari iOS Shortcut melalui API.

Flow:

```txt
User tap Shortcut iOS
↓
Shortcut minta nominal
↓
Shortcut minta wallet
↓
Shortcut kirim POST request ke API
↓
API menyimpan transaksi sebagai pending_detail
↓
Saldo wallet berubah
```

Contoh Shortcut:

```txt
"Catat Pengeluaran"
```

Input:

```txt
Nominal: 23500
Wallet: BNI Wondr
```

Hasil di web app:

```txt
Rp 23.500 · BNI Wondr · Pending Detail · Source: iOS Shortcut
```

---

## 6. Functional Requirement

### 6.1 Quick Add Button

Sistem harus menyediakan tombol Quick Add yang mudah diakses.

Lokasi rekomendasi:

- Dashboard
- Transaction page
- Floating action button di mobile
- Wallet card

Label tombol:

```txt
Quick Add
```

atau versi lebih manusiawi:

```txt
Catat Cepat
```

---

### 6.2 Minimal Input

Quick Add hanya wajib meminta:

- Amount
- Wallet
- Transaction type

Field optional:

- Note
- Date

Default value:

```txt
Type: Expense
Date: Today
Status: pending_detail
Source: quick_add
Needs Review: true
```

---

### 6.3 Pending Transaction Status

Transaksi dari Quick Add harus memiliki status khusus:

```txt
pending_detail
```

Status ini berarti:

- Transaksi sudah memengaruhi saldo wallet
- Transaksi belum lengkap
- Transaksi masih perlu dikategorikan
- Transaksi boleh muncul di task/inbox review

---

### 6.4 Pending Transaction Inbox

Sistem harus menyediakan area khusus untuk menampilkan transaksi pending.

Contoh tampilan:

```txt
Pending Transactions

Rp 25.000 · BNI Wondr · Today 12:30
[ Makan Harian ] [ Transport ] [ Kopi ] [ Lainnya ]

Rp 15.000 · Cash · Yesterday
[ Makan Harian ] [ Laundry ] [ Lainnya ]
```

User bisa melengkapi:

- Category
- Budget category
- Note
- Transaction date jika salah

Setelah lengkap, status berubah menjadi:

```txt
completed
```

---

### 6.5 Quick Category Button

Untuk mempercepat review, sistem menyediakan tombol kategori cepat.

Contoh:

```txt
Makan Harian
Transport
Kopi
Laundry
Admin Fee
Lainnya
```

Saat user klik salah satu kategori, sistem langsung mengisi kategori transaksi.

Jika kategori tersebut sudah terhubung ke budget category, maka budget category otomatis terisi.

---

### 6.6 Saldo Wallet Harus Langsung Berubah

Walaupun status masih pending, saldo wallet tetap harus berubah.

Rule:

```txt
Expense pending → saldo wallet berkurang
Income pending → saldo wallet bertambah
```

Alasan:

Tujuan utama Quick Add adalah menjaga saldo web tetap dekat dengan saldo real.

---

### 6.7 Budget Handling untuk Pending Transaction

Untuk MVP, rule yang dipakai:

```txt
Pending transaction memengaruhi saldo wallet dan total expense/income.
Pending transaction belum masuk ke budget usage sampai category/budget category dilengkapi.
```

Jadi laporan budget tetap rapi.

Contoh:

```txt
Expense pending Rp 25.000
Wallet balance: berkurang
Total expense: bertambah
Budget Makan Harian: belum bertambah
```

Setelah user pilih kategori Makan Harian:

```txt
Budget Makan Harian: bertambah Rp 25.000
Status: completed
```

---

### 6.8 Duplicate Warning

Saat user membuat Quick Add, sistem perlu mengecek transaksi mirip.

Kondisi transaksi dianggap mirip:

- Wallet sama
- Amount sama
- Type sama
- Dibuat dalam rentang waktu dekat, misalnya 10 menit

Jika mirip, tampilkan warning:

```txt
Ada transaksi mirip 8 menit lalu:
Expense Rp 25.000 dari BNI Wondr.
Tetap simpan?
```

User bisa memilih:

```txt
Tetap Simpan
Batalkan
```

---

## 7. API Requirement

### 7.1 Endpoint Quick Add

Endpoint:

```txt
POST /api/quick-add
```

Payload:

```json
{
  "type": "expense",
  "amount": 23500,
  "walletId": "wallet_uuid",
  "note": "optional note",
  "source": "ios_shortcut"
}
```

Response success:

```json
{
  "success": true,
  "message": "Quick transaction saved",
  "data": {
    "id": "transaction_uuid",
    "status": "pending_detail"
  }
}
```

Response failed:

```json
{
  "success": false,
  "message": "Amount tidak valid"
}
```

---

### 7.2 Security untuk iOS Shortcut

Endpoint Quick Add harus dilindungi token khusus.

Shortcut mengirim header:

```txt
x-shortcut-token: TOKEN_RAHASIA
```

Backend melakukan validasi:

```txt
Jika token tidak cocok, return 401 Unauthorized.
```

Token disimpan di environment variable:

```txt
IOS_SHORTCUT_TOKEN
```

---

## 8. Database Design

### 8.1 Update Table Transactions

Tambahkan field:

```sql
ALTER TABLE transactions
ADD COLUMN status text DEFAULT 'completed',
ADD COLUMN source text DEFAULT 'manual',
ADD COLUMN needs_review boolean DEFAULT false;
```

Rekomendasi value status:

```txt
completed
pending_detail
void
```

Rekomendasi value source:

```txt
manual
quick_add
ios_shortcut
reconcile
transfer
system
```

---

### 8.2 Example Insert Quick Add

```sql
INSERT INTO transactions (
  user_id,
  wallet_id,
  type,
  amount,
  status,
  source,
  needs_review,
  transaction_date,
  note
)
VALUES (
  :user_id,
  :wallet_id,
  'expense',
  23500,
  'pending_detail',
  'ios_shortcut',
  true,
  NOW(),
  'quick add dari shortcut'
);
```

---

## 9. UI Requirement

### 9.1 Dashboard Pending Reminder

Dashboard harus menampilkan reminder kecil jika ada pending transaction.

Contoh:

```txt
3 transaksi belum lengkap
Lengkapi agar budget dan laporan makin akurat.
```

CTA:

```txt
Review sekarang
```

---

### 9.2 Transaction List Badge

Transaksi pending harus punya badge.

Contoh:

```txt
Rp 25.000 · BNI Wondr
Pending Detail
```

Badge jangan terlalu agresif. Cukup warna warning soft.

---

### 9.3 Empty State

Jika tidak ada pending transaction:

```txt
Semua transaksi sudah rapi.
```

---

# PART B — Daily Closing Saldo

## 10. Objective

Membantu user mencocokkan saldo wallet di aplikasi dengan saldo real di m-banking secara berkala.

Tujuannya agar selisih saldo tidak menumpuk terlalu lama.

---

## 11. Problem

Jika user tidak pernah mengecek saldo, selisih kecil bisa menumpuk menjadi besar.

Contoh:

Hari 1 lupa input Rp 15.000
Hari 2 lupa admin fee Rp 2.500
Hari 4 lupa QRIS Rp 35.000
Hari 7 saldo beda Rp 150.000+

Kalau sudah terlalu lama, user susah ingat penyebabnya.

---

## 12. Solution Overview

Buat fitur Daily Closing Saldo.

User bisa mengecek saldo wallet secara berkala.

Contoh:

```txt
BNI Wondr
Saldo Web: Rp 975.000
Saldo m-banking: [input manual]

[Saldo Cocok] [Ada Selisih]
```

Jika cocok, sistem membuat checkpoint.

Jika tidak cocok, sistem membuat record unmatched dan bisa diarahkan ke fitur reconcile.

---

## 13. User Flow

### 13.1 Saldo Cocok

```txt
User membuka dashboard
↓
Sistem menampilkan card cek saldo
↓
User melihat saldo web sama dengan m-banking
↓
User klik Saldo Cocok
↓
Sistem menyimpan checkpoint matched
↓
Wallet dianggap cocok sampai tanggal tersebut
```

Contoh hasil:

```txt
BNI Wondr cocok sampai 11 Juni 2026, 21:30
```

---

### 13.2 Saldo Tidak Cocok

```txt
User input saldo real dari m-banking
↓
Sistem menghitung selisih
↓
Jika real balance beda dari web balance
↓
Sistem menyimpan checkpoint unmatched
↓
User diarahkan ke flow reconcile
```

Contoh:

```txt
Saldo web: Rp 975.000
Saldo real: Rp 950.000
Selisih: -Rp 25.000
```

Message:

```txt
Saldo real lebih kecil Rp 25.000.
Kemungkinan ada pengeluaran yang belum dicatat.
```

CTA:

```txt
Cari Selisih
Biarkan Dulu
```

---

## 14. Functional Requirement

### 14.1 Wallet Balance Check Card

Dashboard harus menampilkan card cek saldo.

Contoh:

```txt
Cek saldo hari ini

BNI Wondr
Saldo web: Rp 975.000
Terakhir cocok: 3 hari lalu

[Saldo Cocok] [Input Saldo Real]
```

---

### 14.2 Manual Real Balance Input

User bisa memasukkan saldo real dari m-banking.

Input:

```txt
Real Balance
```

Sistem hitung:

```txt
difference_amount = real_balance - web_balance
```

Jika `difference_amount = 0`, status checkpoint menjadi `matched`.

Jika tidak 0, status checkpoint menjadi `unmatched`.

---

### 14.3 Checkpoint History

Setiap pengecekan saldo harus disimpan sebagai checkpoint.

Checkpoint menyimpan:

- Wallet
- User
- Web balance
- Real balance
- Difference amount
- Status
- Checked at
- Note optional

---

### 14.4 Last Matched Checkpoint

Sistem harus bisa mengambil checkpoint terakhir dengan status matched.

Data ini digunakan untuk membatasi pencarian selisih.

Contoh:

```txt
Terakhir cocok: 10 Juni 2026 21:00
```

Jika ada selisih pada 11 Juni, sistem cukup fokus ke transaksi setelah 10 Juni 21:00.

---

### 14.5 Reconcile From Last Checkpoint

Jika saldo tidak cocok, sistem menampilkan konteks:

```txt
Saldo terakhir cocok pada 10 Juni 2026 21:00.
Cek transaksi setelah waktu tersebut.
```

Sistem menampilkan daftar transaksi setelah checkpoint terakhir.

Contoh:

```txt
Transaksi setelah saldo terakhir cocok:

- Rp 25.000 · Makan Harian · BNI Wondr
- Rp 15.000 · Transport · BNI Wondr
- Rp 100.000 · Transfer ke GoPay
```

Tujuannya agar user tidak perlu mengecek semua histori transaksi dari awal.

---

### 14.6 Frequency Reminder

Sistem bisa menampilkan reminder berdasarkan frekuensi.

Default rekomendasi:

```txt
Setiap 3 hari
```

Opsi setting:

```txt
Setiap hari
Setiap 3 hari
Setiap minggu
Mati
```

MVP boleh hanya pakai default 3 hari tanpa setting dulu.

---

### 14.7 Pending Transaction Integration

Jika saldo cocok tetapi masih ada pending transaction, sistem tetap memberi reminder.

Contoh:

```txt
Saldo sudah cocok.
Masih ada 2 transaksi belum lengkap.
Lengkapi agar laporan budget lebih akurat.
```

Ini penting karena:

```txt
Saldo cocok belum tentu laporan sudah rapi.
```

---

## 15. Database Design

### 15.1 Create Table Wallet Balance Checkpoints

```sql
CREATE TABLE wallet_balance_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL,
  user_id uuid NOT NULL,
  web_balance numeric(14,2) NOT NULL,
  real_balance numeric(14,2) NOT NULL,
  difference_amount numeric(14,2) NOT NULL,
  status text NOT NULL,
  checked_at timestamp DEFAULT now(),
  note text NULL
);
```

Status value:

```txt
matched
unmatched
resolved
ignored
```

---

### 15.2 Optional Wallet Fields

Tambahkan field di table wallets:

```sql
ALTER TABLE wallets
ADD COLUMN last_balance_checked_at timestamp NULL,
ADD COLUMN last_matched_at timestamp NULL;
```

Field ini berguna untuk mempercepat tampilan dashboard.

---

## 16. Business Rules

### 16.1 Saldo Cocok

Jika user klik Saldo Cocok:

```txt
real_balance = web_balance
difference_amount = 0
status = matched
```

Sistem update:

```txt
wallet.last_balance_checked_at
wallet.last_matched_at
```

---

### 16.2 Saldo Tidak Cocok

Jika user input real balance dan hasil beda:

```txt
difference_amount = real_balance - web_balance
status = unmatched
```

Sistem update:

```txt
wallet.last_balance_checked_at
```

Tapi `last_matched_at` tidak berubah.

---

### 16.3 Difference Direction

Jika difference negatif:

```txt
Saldo real lebih kecil dari saldo web.
Kemungkinan ada expense, transfer out, atau fee yang belum dicatat.
```

Jika difference positif:

```txt
Saldo real lebih besar dari saldo web.
Kemungkinan ada income, transfer in, cashback, refund, atau transaksi expense yang kebesaran.
```

---

### 16.4 Tidak Boleh Auto Adjustment

Daily Closing tidak boleh otomatis membuat adjustment.

Adjustment hanya boleh dilakukan jika user secara eksplisit memilih resolve as adjustment di flow reconcile.

---

## 17. UI Copy

### 17.1 Card Reminder

```txt
Cek saldo wallet
Terakhir cocok 3 hari lalu. Cocokkan saldo biar tidak numpuk selisih.
```

CTA:

```txt
Cek Sekarang
```

---

### 17.2 Matched Message

```txt
Mantap, saldo BNI Wondr sudah cocok.
Checkpoint berhasil disimpan.
```

---

### 17.3 Unmatched Message

```txt
Saldo BNI Wondr beda Rp 25.000.
Kemungkinan ada transaksi yang belum dicatat.
```

CTA:

```txt
Cari Selisih
Biarkan Dulu
```

---

## 18. Acceptance Criteria

### Quick Add

- User bisa membuat transaksi cepat hanya dengan amount, wallet, dan type.
- Transaksi Quick Add tersimpan dengan status `pending_detail`.
- Transaksi Quick Add langsung memengaruhi saldo wallet.
- Transaksi pending muncul di Pending Transaction Inbox.
- User bisa melengkapi kategori dan note transaksi pending.
- Setelah dilengkapi, status berubah menjadi `completed`.
- API Quick Add bisa dipakai oleh iOS Shortcut.
- API Quick Add dilindungi dengan token.
- Sistem memberi warning jika ada transaksi mirip dalam waktu dekat.

### Daily Closing Saldo

- User bisa mencocokkan saldo wallet dengan saldo real.
- Jika saldo cocok, sistem membuat checkpoint `matched`.
- Jika saldo tidak cocok, sistem membuat checkpoint `unmatched`.
- Sistem menyimpan history pengecekan saldo.
- Sistem bisa menampilkan kapan terakhir saldo cocok.
- Jika ada selisih, sistem memberi informasi arah selisih.
- Sistem tidak membuat adjustment otomatis.
- Sistem bisa mengarahkan user ke flow reconcile.
- Pending transaction tetap ditampilkan meskipun saldo sudah cocok.

---

## 19. MVP Scope

Yang wajib dibuat dulu:

1. Quick Add dari web app
2. Status pending_detail di transaksi
3. Pending Transaction Inbox
4. Complete pending transaction
5. Quick Add API untuk iOS Shortcut
6. Token security untuk Shortcut
7. Daily Closing manual
8. Wallet balance checkpoint
9. Last matched checkpoint
10. Basic unmatched message

Yang ditunda dulu:

1. Reminder otomatis
2. Push notification
3. Smart suggestion kategori
4. AI parsing note
5. Auto detect duplicate yang kompleks
6. OCR mutasi bank
7. Full reconciliation split detail

---

## 20. Recommended Build Order

### Phase 1 — Database

- Tambahkan status, source, needs_review di transactions
- Buat table wallet_balance_checkpoints
- Tambahkan last_balance_checked_at dan last_matched_at di wallets jika diperlukan

### Phase 2 — Quick Add Web

- Buat UI Quick Add
- Buat API create quick transaction
- Update saldo wallet
- Tampilkan pending badge

### Phase 3 — Pending Inbox

- Buat list pending transaction
- Buat action complete transaction
- Tambahkan quick category button

### Phase 4 — iOS Shortcut API

- Buat endpoint `/api/quick-add`
- Tambahkan token validation
- Test POST dari iOS Shortcut

### Phase 5 — Daily Closing

- Buat card cek saldo wallet
- Buat input real balance
- Simpan checkpoint matched/unmatched
- Tampilkan last matched checkpoint

### Phase 6 — Reconcile Integration

- Jika unmatched, arahkan ke reconcile flow
- Tampilkan transaksi sejak checkpoint terakhir

---

## 21. Notes for Developer

Fitur ini jangan dibuat terasa seperti fitur accounting berat.

Gunakan bahasa yang ringan:

- Catat Cepat
- Transaksi Belum Lengkap
- Cek Saldo
- Saldo Cocok
- Cari Selisih

Hindari istilah yang terlalu teknis di UI:

- Reconciliation
- Ledger
- Checkpoint
- Allocation
- Adjustment

Istilah teknis boleh dipakai di database dan code, tapi UI harus tetap manusiawi.

Tujuan utamanya bukan membuat sistem accounting sempurna, tapi membuat user tetap rajin mencatat transaksi tanpa merasa ribet.
