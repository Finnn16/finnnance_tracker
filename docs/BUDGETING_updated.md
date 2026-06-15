# PRD — Personal Finance Tracking Web App

**Product Name:** Personal Finance Tracking App  
**Document Type:** Product Requirements Document (PRD)  
**Version:** 1.1  
**Prepared for:** Personal money management use case  
**Prepared by:** Theodore  
**Date:** 2026-06-11  

---

## 1. Ringkasan Produk

Aplikasi ini adalah web app untuk membantu user melakukan tracking keuangan pribadi, terutama untuk skenario umum di mana user menerima gaji di akhir bulan, tetapi uang tersebut dipakai untuk membiayai kebutuhan bulan berikutnya.

Contoh utama:

- User gajian tanggal **28 Mei 2026**.
- Gaji tersebut digunakan untuk kebutuhan **Juni 2026**.
- Beberapa pengeluaran Juni bisa terjadi di bulan Mei, seperti:
  - Bayar kost Juni
  - Transfer keluarga untuk Juni
  - Bayar tagihan awal bulan
- Dashboard tetap harus akurat:
  - Cashflow Mei menunjukkan uang benar-benar masuk/keluar di Mei.
  - Budget Juni menunjukkan uang yang dialokasikan dan digunakan untuk Juni.

Aplikasi menggunakan pendekatan **cash-first budgeting** dan **budget period-based tracking**, bukan income-calendar budgeting.

---

## 2. Masalah yang Ingin Diselesaikan

User bingung saat:

1. Income masuk di bulan sebelumnya.
2. Budget dibuat untuk bulan berikutnya.
3. Pengeluaran untuk bulan berikutnya bisa dibayar lebih awal.
4. Dashboard bulanan terlihat tidak akurat jika hanya berdasarkan tanggal transaksi.
5. Budget terlihat overplanned jika sistem menganggap budget Juni harus dibiayai oleh income bertanggal Juni.

Contoh masalah:

```text
Gaji masuk: 28 Mei 2026
Dipakai untuk: Budget Juni 2026
Bayar kost Juni: 29 Mei 2026

Jika dashboard hanya membaca tanggal transaksi:
- Mei terlihat income besar dan expense besar.
- Juni terlihat punya budget tapi tidak punya income.
- Juni terlihat overplanned, padahal sebenarnya tidak.
```

---

## 3. Tujuan Produk

Produk harus memungkinkan user untuk:

1. Mencatat income, expense, dan transfer wallet.
2. Menentukan income tersebut digunakan untuk budget bulan tertentu.
3. Menyimpan sebagian income langsung ke savings melalui checkbox **save to savings**.
4. Membuat budget hanya berdasarkan saldo budgetable yang tersedia untuk bulan yang dipilih.
5. Mencegah total budget melebihi saldo budgetable bulan tersebut.
6. Mencegah total alokasi uang melebihi total wallet balance.
7. Melihat dashboard cashflow berdasarkan tanggal aktual transaksi.
8. Melihat dashboard budget berdasarkan budget period.
9. Mencatat expense dengan transaction date berbeda dari budget period.
10. Membantu user memahami sisa saldo yang bisa dipakai, sisa budget, dan saldo savings.
11. Mengatur pola gajian dan siklus budget melalui konfigurasi payroll cycle dan budget cycle.
12. Memberikan default budget period otomatis berdasarkan tanggal gajian dan tanggal pembayaran wajib.

---

## 4. Bukan Tujuan Produk

Produk ini tidak bertujuan untuk:

1. Memberikan saran investasi.
2. Menggantikan financial planner profesional.
3. Mengelola keuangan bisnis.
4. Melakukan akuntansi formal.
5. Menghitung pajak secara detail.
6. Mengelola laporan laba rugi bisnis.
7. Memaksa user membuat transaksi income terpisah untuk bagian budget dan savings.

---

## 5. Prinsip Utama Produk

### 5.1 Transaction Date dan Budget Period Harus Dipisah

Setiap transaksi memiliki:

```text
transaction_date = tanggal uang benar-benar masuk atau keluar
budget_period = periode budget yang terdampak
```

Contoh:

| Transaksi | Transaction Date | Budget Period | Dampak |
|---|---:|---:|---|
| Gaji | 28 Mei 2026 | Juni 2026 | Menambah saldo budgetable Juni |
| Bayar kost Juni | 29 Mei 2026 | Juni 2026 | Mengurangi budget kategori Kost Juni |
| Makan harian | 3 Juni 2026 | Juni 2026 | Mengurangi budget Makan Juni |

---

### 5.2 Budget Tidak Boleh Melebihi Total Wallet

Sistem harus menjaga:

```text
Total alokasi uang <= Total wallet balance
```

Namun, untuk budgeting bulanan, kontrol utama adalah:

```text
Total budget bulan terpilih <= Budgetable balance bulan tersebut
```

Artinya ada dua level validasi:

1. **Validasi global:** seluruh uang yang dialokasikan tidak boleh melebihi total saldo wallet.
2. **Validasi budget period:** total budget bulan tertentu tidak boleh melebihi income yang dialokasikan ke bulan tersebut.

---

### 5.3 Income Tidak Otomatis Menjadi Budget

Saat user input income, income tidak otomatis dianggap sebagai uang untuk budget.

Income harus diklasifikasikan oleh user melalui form:

- Dialokasikan ke budget period tertentu.
- Sebagian bisa langsung masuk ke savings melalui checkbox **save to savings**.
- Sisanya bisa menjadi budgetable balance untuk bulan yang dipilih atau unallocated, tergantung input user.

---

### 5.4 Income Form Tetap Satu Transaksi

Catatan penting dari requirement:

> Form UI saat ini jika user memilih income sudah memiliki checkbox **save to savings**, dan user bisa input amount savings. Ranah ini tidak boleh diubah. Tujuannya agar user tidak perlu input transaksi dua kali ketika total gaji dipisah sebagian ke budget dan sebagian ke savings.

Maka sistem harus mendukung satu transaksi income yang bisa menghasilkan dua dampak internal:

1. Sebagian income menjadi saldo budgetable untuk budget period tertentu.
2. Sebagian income masuk ke savings.

Contoh:

```text
Income gaji: Rp10.000.000
Transaction date: 28 Mei 2026
Budget period: Juni 2026
Save to savings: checked
Savings amount: Rp1.500.000

Hasil internal:
- Budgetable income Juni: Rp8.500.000
- Savings balance bertambah: Rp1.500.000
- Wallet balance bertambah: Rp10.000.000
```

User hanya melihat ini sebagai satu transaksi income.

---

## 6. Target User

Target utama:

- Pekerja kantoran dengan gaji bulanan.
- Freelancer dengan income tidak selalu sama.
- Individu yang ingin budgeting bulanan.
- User yang gajian di akhir bulan dan memakai gaji untuk bulan berikutnya.
- User yang ingin tracking cashflow, budget, dan savings tanpa sistem akuntansi kompleks.

---

## 7. Definisi Konsep

### 7.1 Wallet

Wallet adalah tempat uang disimpan.

Contoh:

- BCA
- Mandiri
- GoPay
- OVO
- Cash
- Jago
- Blu

Wallet memiliki saldo aktual.

```text
wallet_balance = saldo uang nyata yang tersedia
```

---

### 7.2 Transaction

Transaction adalah pencatatan uang masuk, keluar, atau perpindahan antar-wallet.

Tipe transaksi:

1. Income
2. Expense
3. Transfer

---

### 7.3 Budget Period

Budget period adalah bulan alokasi budget.

Contoh:

```text
2026-06 = Budget Juni 2026
```

Budget period tidak harus sama dengan bulan dari transaction date.


### 7.3.1 Payroll Cycle

Payroll cycle adalah pola penerimaan gaji user.

Untuk use case utama:

```text
payday_date = 28
```

Artinya user menerima gaji setiap tanggal 28 di akhir bulan.

Contoh:

```text
Gaji masuk: 28 Mei 2026
Payroll cycle: Mei 2026 payroll
Budget period default: Juni 2026
```

Payroll cycle digunakan sistem untuk membantu menentukan default budget period saat user mencatat income.

### 7.3.2 Budget Cycle

Budget cycle adalah periode pemakaian uang dari satu gajian ke gajian berikutnya.

Untuk use case utama:

```text
budget_cycle_start = tanggal 28 saat gaji masuk
budget_cycle_end = sebelum payday berikutnya
default_budget_period = bulan berikutnya
```

Contoh:

```text
Gaji masuk: 28 Mei 2026
Budget cycle: 28 Mei 2026 sampai 27 Juni 2026
Budget period: Juni 2026
```

Dalam konteks user, uang yang diterima pada akhir bulan berjalan dipakai untuk membiayai kebutuhan bulan berikutnya.

### 7.3.3 Fixed Payment Date

Fixed payment date adalah tanggal default pembayaran kewajiban rutin untuk budget period berikutnya.

Untuk use case utama:

```text
fixed_payment_date = 29
```

Artinya pada tanggal 29 akhir bulan, user biasanya membayar pengeluaran wajib untuk bulan depan, seperti:

- Kost
- Transfer keluarga
- Tagihan
- Cicilan
- Kewajiban lain

Contoh:

```text
Transaction date: 29 Mei 2026
Expense: Bayar kost Juni
Budget period default: Juni 2026
```


---

### 7.4 Budgetable Income

Budgetable income adalah bagian income yang dialokasikan untuk budget bulan tertentu.

Formula:

```text
budgetable_income_for_period =
income_amount - savings_amount
```

Untuk income yang diarahkan ke budget period tertentu.

Contoh:

```text
Income: Rp10.000.000
Savings amount: Rp1.500.000
Budget period: Juni 2026

Budgetable income Juni = Rp8.500.000
```

---

### 7.5 Savings

Savings adalah bagian uang yang dipisahkan dari income untuk ditabung.

Savings tetap bagian dari total wallet balance, tetapi tidak boleh ikut dihitung sebagai saldo yang bisa dipakai untuk set budget bulanan.

Contoh:

```text
Total wallet balance: Rp10.000.000
Savings: Rp1.500.000
Budgetable Juni: Rp8.500.000
```

---

### 7.6 Budget Allocation

Budget allocation adalah nominal budget yang user tetapkan pada kategori tertentu untuk budget period tertentu.

Contoh:

| Budget Period | Category | Budget |
|---|---:|---:|
| Juni 2026 | Kost | Rp2.000.000 |
| Juni 2026 | Makan | Rp2.500.000 |
| Juni 2026 | Transport | Rp800.000 |
| Juni 2026 | Lifestyle | Rp1.000.000 |

---

### 7.7 Actual Spending

Actual spending adalah expense yang terjadi dan dikaitkan dengan budget period tertentu.

Contoh:

```text
Expense: Bayar kost
Transaction date: 29 Mei 2026
Budget period: Juni 2026
Category: Kost
Amount: Rp2.000.000
```

Efek:

- Cashflow Mei berkurang Rp2.000.000.
- Budget Kost Juni terpakai Rp2.000.000.

---

## 7.8 User Budgeting Settings

Aplikasi harus menyediakan konfigurasi sederhana untuk pola budgeting user.

### 7.8.1 Required Settings

```text
payday_date = 28
fixed_payment_date = 29
default_income_budget_period_rule = next_month
default_fixed_expense_budget_period_rule = next_month
```

### 7.8.2 Default Behavior

Jika user mencatat income pada tanggal payday atau mendekati payday, sistem menyarankan budget period bulan berikutnya.

Contoh:

```text
Transaction type: Income
Transaction date: 28 Mei 2026
Suggested budget period: Juni 2026
```

Jika user mencatat expense wajib pada fixed payment date, sistem menyarankan budget period bulan berikutnya.

Contoh:

```text
Transaction type: Expense
Transaction date: 29 Mei 2026
Category: Kost
Suggested budget period: Juni 2026
```

### 7.8.3 User Override

Default budget period hanya berupa saran.

User tetap boleh mengganti budget period secara manual jika transaksi tersebut memang terkait periode lain.

Contoh:

```text
Transaction date: 29 Mei 2026
Expense: Bayar tunggakan April
Suggested budget period: Juni 2026
User override: April 2026
```

### 7.8.4 Rollover Month Handling

Untuk month-end edge case, sistem harus menghitung bulan berikutnya berdasarkan kalender aktual.

Contoh:

```text
Payday: 28 Desember 2026
Default budget period: Januari 2027
```

```text
Payday: 28 Januari 2026
Default budget period: Februari 2026
```


## 8. User Flow Utama

## 8.1 Flow Input Income

### Tujuan

User dapat mencatat income satu kali, lalu membagi income tersebut menjadi:

1. Budgetable amount untuk budget period tertentu.
2. Savings amount jika checkbox **save to savings** aktif.

### UI Fields

Saat user memilih transaction type = **Income**, form harus menampilkan:

| Field | Type | Required | Notes |
|---|---|---:|---|
| Amount | Number/Currency | Yes | Total income yang masuk ke wallet |
| Transaction Date | Date | Yes | Tanggal income benar-benar masuk |
| Wallet | Select | Yes | Wallet tujuan income |
| Income Category | Select | Yes | Contoh: Salary, Bonus, Freelance |
| Budget Period | Month Picker | Yes | Bulan budget yang akan menerima income |
| Save to Savings | Checkbox | No | Jika dicentang, tampilkan savings amount |
| Savings Amount | Number/Currency | Conditional | Required jika Save to Savings dicentang |
| Notes | Textarea | No | Catatan tambahan |

### Behavior

Saat user mengisi transaction date, sistem harus menggunakan payroll cycle setting untuk menyarankan budget period.

Default untuk use case utama:

```text
Jika transaction_date berada pada payday_date atau akhir bulan sesuai payroll cycle,
maka suggested budget_period = bulan berikutnya.
```

Contoh:

```text
Transaction date: 28 Mei 2026
Suggested budget period: Juni 2026
```

User tetap dapat mengubah suggested budget period secara manual.

Jika **Save to Savings** tidak dicentang:

```text
budgetable_amount = income_amount
savings_amount = 0
```

Jika **Save to Savings** dicentang:

```text
budgetable_amount = income_amount - savings_amount
```

Contoh:

```text
Income amount: Rp10.000.000
Save to savings: checked
Savings amount: Rp1.500.000
Budget period: Juni 2026

budgetable_amount = Rp8.500.000
```

### Validasi

Sistem harus mencegah:

```text
savings_amount > income_amount
```

Sistem juga harus mencegah:

```text
savings_amount < 0
income_amount <= 0
```

Jika savings amount sama dengan income amount:

```text
budgetable_amount = 0
```

Ini diperbolehkan, tetapi sistem harus memberi informasi bahwa income ini sepenuhnya masuk savings dan tidak menambah saldo budgetable bulan terpilih.

---

## 8.2 Flow Set Budget

### Tujuan

User dapat membuat budget kategori untuk bulan tertentu, tetapi total budget tidak boleh lebih dari budgetable balance bulan tersebut.

### UI Fields

Saat user membuka halaman budget:

| Field | Type | Required |
|---|---|---:|
| Budget Period | Month Picker | Yes |
| Category | Select | Yes |
| Budget Amount | Number/Currency | Yes |

### Data yang Ditampilkan

Untuk budget period yang dipilih, tampilkan:

```text
Budgetable Income
Total Budget Set
Available to Budget
Total Spent
Remaining Budget
```

Formula:

```text
Budgetable Income = SUM(budgetable_amount from income transactions for selected budget period)
```

```text
Total Budget Set = SUM(budget amount for selected budget period)
```

```text
Available to Budget = Budgetable Income - Total Budget Set
```

```text
Total Spent = SUM(expense amount for selected budget period)
```

```text
Remaining Budget = Total Budget Set - Total Spent
```

### Validasi

Sistem harus mencegah:

```text
Total Budget Set > Budgetable Income
```

Pesan error:

```text
Budget melebihi saldo budgetable bulan ini.
Kurangi nominal budget atau tambahkan income yang dialokasikan ke bulan ini.
```

Contoh:

```text
Budgetable Income Juni: Rp8.500.000
Total Budget Set Saat Ini: Rp8.000.000
User menambah budget Jajan: Rp700.000

Total Budget Baru: Rp8.700.000
Available: -Rp200.000

Sistem menolak perubahan.
```

---

## 8.3 Flow Input Expense

### Tujuan

User dapat mencatat expense berdasarkan tanggal aktual pembayaran dan menghubungkannya ke budget period tertentu.

### UI Fields

Saat user memilih transaction type = **Expense**, form harus menampilkan:

| Field | Type | Required | Notes |
|---|---|---:|---|
| Amount | Number/Currency | Yes | Nominal expense |
| Transaction Date | Date | Yes | Tanggal uang benar-benar keluar |
| Wallet | Select | Yes | Wallet sumber dana |
| Category | Select | Yes | Kategori expense |
| Budget Period | Month Picker | Yes | Budget period yang terdampak |
| Notes | Textarea | No | Catatan tambahan |

### Behavior

Saat user mengisi transaction date dan category, sistem harus menggunakan budget cycle setting untuk menyarankan budget period.

Default untuk use case utama:

```text
Jika transaction_date = fixed_payment_date
dan category termasuk kategori wajib/rutin,
maka suggested budget_period = bulan berikutnya.
```

Contoh:

```text
Transaction date: 29 Mei 2026
Category: Kost
Suggested budget period: Juni 2026
```

User tetap dapat mengganti budget period secara manual.

Expense mengurangi:

1. Wallet balance berdasarkan transaction date.
2. Actual spending kategori pada budget period yang dipilih.

Contoh:

```text
Expense: Bayar kost Juni
Amount: Rp2.000.000
Transaction date: 29 Mei 2026
Budget period: Juni 2026
Category: Kost
```

Dampak:

```text
Cashflow Mei: expense Rp2.000.000
Budget Juni > Kost: spent Rp2.000.000
```

### Validasi

Minimal sistem harus memberi warning jika:

```text
Expense amount > remaining budget category
```

Pilihan behavior:

- MVP: izinkan expense, tetapi tampilkan status overspent.
- Strict mode: tolak expense jika melebihi remaining budget.

Rekomendasi MVP:

```text
Expense tetap boleh dicatat, tetapi kategori akan ditandai Overspent.
```

Karena dalam kehidupan nyata, uang bisa tetap keluar walaupun budget terlampaui.

---

## 8.4 Flow Transfer Wallet

### Tujuan

User dapat memindahkan uang antar-wallet tanpa memengaruhi budget.

Contoh:

```text
Transfer Rp1.000.000 dari BCA ke GoPay
```

Dampak:

```text
BCA berkurang Rp1.000.000
GoPay bertambah Rp1.000.000
Total wallet balance tidak berubah
Budget tidak berubah
Savings tidak berubah
```

---

## 9. Dashboard Requirements

## 9.1 Dashboard Overview

Dashboard utama harus menampilkan ringkasan:

1. Total Wallet Balance
2. Total Savings
3. Total Budgetable Balance untuk selected period
4. Available to Budget untuk selected period
5. Total Budget Set untuk selected period
6. Total Spent untuk selected period
7. Remaining Budget untuk selected period

Contoh:

```text
Selected Period: Juni 2026

Total Wallet Balance: Rp10.000.000
Total Savings: Rp1.500.000
Budgetable Income Juni: Rp8.500.000
Total Budget Juni: Rp8.000.000
Available to Budget Juni: Rp500.000
Spent Juni: Rp3.000.000
Remaining Budget Juni: Rp5.000.000
```

---

## 9.2 Cashflow View

Cashflow view berdasarkan `transaction_date`.

Tujuan cashflow:

```text
Menjawab: uang benar-benar masuk dan keluar kapan?
```

Filter utama:

- Date range
- Wallet
- Transaction type
- Category

Contoh cashflow Mei 2026:

| Date | Type | Description | In | Out |
|---|---|---|---:|---:|
| 28 Mei 2026 | Income | Gaji | Rp10.000.000 | - |
| 29 Mei 2026 | Expense | Bayar Kost Juni | - | Rp2.000.000 |
| 30 Mei 2026 | Expense | Transfer keluarga Juni | - | Rp1.000.000 |

---

## 9.3 Budget View

Budget view berdasarkan `budget_period`.

Tujuan budget view:

```text
Menjawab: uang untuk periode ini sudah dialokasikan dan dipakai ke mana?
```

Filter utama:

- Budget period
- Category
- Status: normal, warning, overspent

Contoh budget Juni 2026:

| Category | Budget | Spent | Remaining | Status |
|---|---:|---:|---:|---|
| Kost | Rp2.000.000 | Rp2.000.000 | Rp0 | Done |
| Makan | Rp2.500.000 | Rp500.000 | Rp2.000.000 | On Track |
| Transport | Rp800.000 | Rp100.000 | Rp700.000 | On Track |
| Lifestyle | Rp1.000.000 | Rp1.200.000 | -Rp200.000 | Overspent |

---

## 9.4 Savings View

Savings view menampilkan:

1. Total savings.
2. Savings dari income.
3. Riwayat penambahan savings.
4. Riwayat penarikan savings jika fitur withdrawal tersedia.
5. Savings berdasarkan wallet jika dibutuhkan.

MVP minimal:

```text
Total Savings = SUM(savings_amount from income transactions) - SUM(savings withdrawals)
```

Jika belum ada fitur withdrawal, cukup:

```text
Total Savings = SUM(savings_amount from income transactions)
```

---

## 10. Business Rules

### BR-001 — Income Dapat Dibagi ke Budget dan Savings dalam Satu Form

Satu income transaction bisa menghasilkan:

```text
budgetable_amount
savings_amount
```

Namun user tetap hanya membuat satu transaksi income.

---

### BR-002 — Save to Savings Tidak Boleh Melebihi Income

```text
savings_amount <= income_amount
```

---

### BR-003 — Budgetable Amount Dihitung Otomatis

```text
budgetable_amount = income_amount - savings_amount
```

Jika checkbox save to savings tidak aktif:

```text
budgetable_amount = income_amount
```

---

### BR-004 — Income yang Dialokasikan ke Budget Period Hanya Berlaku untuk Period Tersebut

Income yang diset untuk budget Juni hanya boleh menjadi saldo budgetable Juni.

```text
Income budget_period = 2026-06
```

Maka income tersebut tidak boleh dipakai untuk set budget Mei atau Juli.

---

### BR-005 — Budget Bulanan Tidak Boleh Melebihi Budgetable Income Bulan Tersebut

```text
SUM(budget allocations for period) <= SUM(budgetable income for period)
```

---

### BR-006 — Total Alokasi Tidak Boleh Melebihi Total Wallet

```text
total_savings + total_active_budget_remaining + other_allocations <= total_wallet_balance
```

Catatan MVP:

Jika app belum memiliki konsep all-purpose allocation, validasi minimal adalah:

```text
total_savings + total_budgetable_remaining_across_periods <= total_wallet_balance
```

---

### BR-007 — Expense Boleh Berbeda Bulan dengan Budget Period

Expense tanggal Mei boleh masuk ke budget Juni.

Contoh:

```text
transaction_date = 2026-05-29
budget_period = 2026-06
category = Kost
```

---

### BR-008 — Cashflow Menggunakan Transaction Date

Cashflow tidak boleh menggunakan budget period.

---

### BR-009 — Budget Menggunakan Budget Period

Budget report tidak boleh menggunakan transaction date sebagai basis utama.

---

### BR-010 — Transfer Wallet Tidak Mempengaruhi Budget

Transfer hanya memindahkan saldo antar-wallet.

---

### BR-011 — Payroll Cycle Menentukan Default Budget Period Income

Jika user mencatat income pada tanggal gajian sesuai payroll cycle, sistem harus menyarankan budget period bulan berikutnya.

Contoh:

```text
payday_date = 28
transaction_date = 28 Mei 2026
suggested_budget_period = Juni 2026
```

Rule ini hanya menghasilkan default value, bukan validasi strict.

User tetap dapat memilih budget period lain.

### BR-012 — Fixed Payment Date Menentukan Default Budget Period Expense Wajib

Jika user mencatat expense pada tanggal pembayaran wajib sesuai budget cycle, sistem harus menyarankan budget period bulan berikutnya.

Contoh:

```text
fixed_payment_date = 29
transaction_date = 29 Mei 2026
category = Kost
suggested_budget_period = Juni 2026
```

Rule ini berlaku terutama untuk kategori expense yang ditandai sebagai wajib/rutin.

### BR-013 — Suggested Budget Period Boleh Diubah User

Sistem tidak boleh mengunci budget period hanya berdasarkan payroll cycle atau budget cycle.

Default budget period harus dapat diubah manual oleh user untuk menangani kondisi khusus.

Contoh:

```text
Tanggal transaksi: 29 Mei 2026
Default suggestion: Juni 2026
Actual need: Bayar tunggakan April 2026
User selected budget period: April 2026
```

### BR-014 — Month and Year Rollover Harus Didukung

Jika payroll cycle berada di akhir tahun, default budget period bulan berikutnya harus masuk ke tahun berikutnya.

Contoh:

```text
transaction_date = 28 Desember 2026
suggested_budget_period = Januari 2027
```


## 11. Data Model

## 11.1 wallets

```sql
wallets
- id
- name
- type
- balance
- currency
- is_active
- created_at
- updated_at
```

Contoh wallet type:

```text
bank_account
e_wallet
cash
```

---

## 11.2 user_budgeting_settings

```sql
user_budgeting_settings
- id
- user_id
- payday_date
- fixed_payment_date
- default_income_budget_period_rule
- default_fixed_expense_budget_period_rule
- created_at
- updated_at
```

Default values for primary use case:

```text
payday_date = 28
fixed_payment_date = 29
default_income_budget_period_rule = next_month
default_fixed_expense_budget_period_rule = next_month
```

Notes:

```text
payday_date dan fixed_payment_date disimpan sebagai angka tanggal dalam bulan.
Jika tanggal tidak tersedia pada bulan tertentu, sistem menggunakan fallback date terdekat sesuai kebijakan app.
```

---

## 11.3 transactions

```sql
transactions
- id
- type
- wallet_id
- destination_wallet_id
- amount
- transaction_date
- budget_period
- category_id
- description
- save_to_savings
- savings_amount
- budgetable_amount
- created_at
- updated_at
```

### Notes

Untuk income:

```text
type = income
wallet_id = wallet tujuan
destination_wallet_id = null
amount = total income
budget_period = budget period yang menerima budgetable amount
save_to_savings = true/false
savings_amount = amount yang masuk savings
budgetable_amount = amount - savings_amount
```

Untuk expense:

```text
type = expense
wallet_id = wallet sumber
destination_wallet_id = null
amount = total expense
budget_period = budget period yang terdampak
save_to_savings = false
savings_amount = 0
budgetable_amount = 0
```

Untuk transfer:

```text
type = transfer
wallet_id = wallet sumber
destination_wallet_id = wallet tujuan
amount = total transfer
budget_period = null
save_to_savings = false
savings_amount = 0
budgetable_amount = 0
```

---

## 11.4 categories

```sql
categories
- id
- name
- type
- is_fixed_or_required
- is_active
- created_at
- updated_at
```

Category type:

```text
income
expense
```

Contoh income category:

- Salary
- Bonus
- Freelance
- Gift

Contoh expense category:

- Kost
- Makan
- Transport
- Lifestyle
- Keluarga
- Tagihan
- Health
- Education

---

## 11.5 budgets

```sql
budgets
- id
- budget_period
- category_id
- amount
- created_at
- updated_at
```

Unique constraint recommendation:

```text
unique(budget_period, category_id)
```

Agar satu kategori hanya memiliki satu budget amount untuk satu period.

---

## 11.6 savings_ledger

Opsional, tetapi direkomendasikan agar savings lebih mudah diaudit.

```sql
savings_ledger
- id
- transaction_id
- type
- amount
- transaction_date
- description
- created_at
```

Type:

```text
deposit
withdrawal
adjustment
```

Untuk MVP, saat income dengan save_to_savings = true dibuat, sistem otomatis membuat record:

```text
type = deposit
amount = savings_amount
transaction_id = income transaction id
```

---

## 12. Formula Sistem

### 12.1 Total Wallet Balance

```text
Total Wallet Balance = SUM(wallet.balance)
```

Atau dihitung dari transaksi:

```text
Total Wallet Balance =
SUM(income)
- SUM(expense)
+/- SUM(wallet transfers per wallet)
```

Untuk akurasi MVP, wallet balance dapat disimpan dan diperbarui setiap transaksi.

---

### 12.2 Budgetable Income per Period

```text
Budgetable Income(period) =
SUM(transactions.budgetable_amount)
WHERE type = income
AND budget_period = period
```

---

### 12.3 Total Budget per Period

```text
Total Budget(period) =
SUM(budgets.amount)
WHERE budget_period = period
```

---

### 12.4 Available to Budget per Period

```text
Available to Budget(period) =
Budgetable Income(period) - Total Budget(period)
```

---

### 12.5 Total Spent per Period

```text
Total Spent(period) =
SUM(transactions.amount)
WHERE type = expense
AND budget_period = period
```

---

### 12.6 Spent per Category per Period

```text
Spent(category, period) =
SUM(transactions.amount)
WHERE type = expense
AND category_id = category
AND budget_period = period
```

---

### 12.7 Remaining Budget per Category

```text
Remaining Budget(category, period) =
Budget(category, period) - Spent(category, period)
```

---

### 12.8 Total Savings

```text
Total Savings =
SUM(savings_ledger.amount WHERE type = deposit)
- SUM(savings_ledger.amount WHERE type = withdrawal)
+ SUM(savings_ledger.amount WHERE type = adjustment)
```

Jika belum memakai savings_ledger:

```text
Total Savings =
SUM(transactions.savings_amount)
WHERE type = income
AND save_to_savings = true
```

---

### 12.9 Suggested Budget Period from Payroll Cycle

```text
If transaction.type = income
AND transaction_date day = payday_date
THEN suggested_budget_period = next calendar month
```

Contoh:

```text
transaction_date = 2026-05-28
payday_date = 28
suggested_budget_period = 2026-06
```

### 12.10 Suggested Budget Period from Fixed Payment Date

```text
If transaction.type = expense
AND transaction_date day = fixed_payment_date
AND category.is_fixed_or_required = true
THEN suggested_budget_period = next calendar month
```

Contoh:

```text
transaction_date = 2026-05-29
fixed_payment_date = 29
category = Kost
suggested_budget_period = 2026-06
```


## 13. Validation Rules

## 13.1 Income Validation

| Rule | Condition | Result |
|---|---|---|
| Income amount required | amount is empty | Reject |
| Income amount must be positive | amount <= 0 | Reject |
| Wallet required | wallet_id empty | Reject |
| Budget period required | budget_period empty | Reject |
| Savings amount required | save_to_savings = true and savings_amount empty | Reject |
| Savings amount cannot exceed income | savings_amount > amount | Reject |
| Savings amount cannot be negative | savings_amount < 0 | Reject |

---

## 13.2 Budget Validation

| Rule | Condition | Result |
|---|---|---|
| Budget period required | budget_period empty | Reject |
| Category required | category_id empty | Reject |
| Budget amount positive | amount <= 0 | Reject |
| Budget cannot exceed budgetable income | total_budget_after_save > budgetable_income | Reject |

---

## 13.3 Expense Validation

| Rule | Condition | Result |
|---|---|---|
| Expense amount required | amount empty | Reject |
| Expense amount positive | amount <= 0 | Reject |
| Wallet required | wallet_id empty | Reject |
| Category required | category_id empty | Reject |
| Budget period required | budget_period empty | Reject |
| Expense exceeds wallet balance | amount > wallet.balance | Reject or warn based on app policy |
| Expense exceeds category remaining budget | amount > remaining category budget | Warn or allow as overspent |

Recommended MVP behavior:

```text
Reject if amount > wallet.balance.
Allow if amount > remaining category budget, but mark as overspent.
```

---

## 14. UI Requirements

## 14.0 Budgeting Settings UI

Aplikasi harus menyediakan halaman atau section pengaturan untuk payroll cycle dan budget cycle.

### Fields

| Field | Type | Default | Notes |
|---|---|---:|---|
| Payday Date | Number / Select Day | 28 | Tanggal user biasanya menerima gaji |
| Fixed Payment Date | Number / Select Day | 29 | Tanggal user biasanya membayar kewajiban bulan depan |
| Default Income Budget Period | Select | Next Month | Default budget period untuk income di payday |
| Default Fixed Expense Budget Period | Select | Next Month | Default budget period untuk expense wajib di fixed payment date |

### Helper Copy

```text
Gaji yang masuk di akhir bulan dapat otomatis diarahkan sebagai budget bulan berikutnya.
```

```text
Pengeluaran wajib yang dibayar setelah gajian dapat otomatis diarahkan ke budget bulan berikutnya.
```


## 14.1 Income Form UI

Income form must preserve existing behavior:

```text
[ ] Save to savings
Savings amount input
```

### Required UI Behavior

When user selects transaction type = Income:

1. Show Amount.
2. Show Transaction Date.
3. Show Wallet.
4. Show Income Category.
5. Show Budget Period.
6. Show checkbox **Save to savings**.
7. If checkbox checked, show Savings Amount.
8. Show computed Budgetable Amount.

Example UI copy:

```text
Total Income
Rp10.000.000

Budget Period
Juni 2026

[✓] Save to savings
Savings Amount
Rp1.500.000

Budgetable for Juni 2026
Rp8.500.000
```

### Helper Text

Recommended helper text:

```text
Savings amount will be separated from this income and will not be available for monthly budgeting.
```

```text
The remaining amount will become budgetable balance for the selected budget period.
```

---

## 14.2 Budget Page UI

Budget page should show:

1. Selected budget period.
2. Budgetable income.
3. Total budget set.
4. Available to budget.
5. Category budget table.
6. Spent and remaining per category.

Example:

```text
Budget Period: Juni 2026

Budgetable Income: Rp8.500.000
Total Budget Set: Rp8.000.000
Available to Budget: Rp500.000
```

---

## 14.3 Expense Form UI

Expense form should show:

1. Amount.
2. Transaction date.
3. Wallet.
4. Category.
5. Budget period.
6. Remaining category budget after input.

Example:

```text
Category: Kost
Budget Period: Juni 2026
Current remaining: Rp2.000.000
Expense amount: Rp2.000.000
Remaining after save: Rp0
```

---

## 15. Example End-to-End Scenario

### Step 1 — User menerima gaji

```text
Date: 28 Mei 2026
Income: Rp10.000.000
Wallet: BCA
Budget Period: Juni 2026
Save to savings: checked
Savings amount: Rp1.500.000
```

Sistem menghitung:

```text
Budgetable Income Juni = Rp8.500.000
Savings = Rp1.500.000
Wallet Balance BCA + Rp10.000.000
```

---

### Step 2 — User membuat budget Juni

| Category | Budget |
|---|---:|
| Kost | Rp2.000.000 |
| Keluarga | Rp1.000.000 |
| Makan | Rp2.500.000 |
| Transport | Rp800.000 |
| Lifestyle | Rp1.000.000 |
| Tagihan | Rp700.000 |

Total budget:

```text
Rp8.000.000
```

Available to budget:

```text
Rp8.500.000 - Rp8.000.000 = Rp500.000
```

---

### Step 3 — User bayar kost Juni di bulan Mei

```text
Date: 29 Mei 2026
Expense: Rp2.000.000
Category: Kost
Budget Period: Juni 2026
Wallet: BCA
```

Dampak:

```text
Cashflow Mei: expense Rp2.000.000
Budget Juni > Kost spent: Rp2.000.000
Budget Juni > Kost remaining: Rp0
```

---

### Step 4 — User melihat dashboard Juni

```text
Budgetable Income Juni: Rp8.500.000
Total Budget Juni: Rp8.000.000
Available to Budget Juni: Rp500.000
Spent Juni: Rp2.000.000
Remaining Budget Juni: Rp6.000.000
Savings: Rp1.500.000
```

---

## 16. Edge Cases

### 16.1 Income Semua Masuk Savings

```text
Income: Rp10.000.000
Savings amount: Rp10.000.000
Budgetable amount: Rp0
```

Allowed.

UI warning:

```text
This income will not add any budgetable balance to the selected budget period.
```

---

### 16.2 User Membuat Budget Tanpa Income Budgetable

Jika:

```text
Budgetable Income Juni = Rp0
```

Maka user tidak boleh membuat budget Juni.

Pesan:

```text
Belum ada income yang dialokasikan untuk budget period ini.
Tambahkan income terlebih dahulu atau pilih budget period lain.
```

---

### 16.3 Expense Untuk Bulan Depan Dibayar Bulan Ini

Allowed.

Contoh:

```text
Transaction Date: Mei 2026
Budget Period: Juni 2026
```

Cashflow masuk Mei, budget masuk Juni.

---

### 16.4 Expense Melebihi Budget Kategori

MVP recommended:

```text
Allow, but mark category as Overspent.
```

Contoh:

```text
Lifestyle budget: Rp1.000.000
Lifestyle spent: Rp1.200.000
Remaining: -Rp200.000
Status: Overspent
```

---

### 16.5 User Mengubah Savings Amount Setelah Budget Dibuat

Jika user edit income dan menaikkan savings amount, maka budgetable amount berkurang.

Sistem harus validasi ulang:

```text
Total Budget Set selected period <= New Budgetable Income selected period
```

Jika tidak valid, sistem harus menolak perubahan atau meminta user mengurangi budget terlebih dahulu.

Recommended behavior:

```text
Reject edit and show message:
Perubahan savings membuat budget bulan ini melebihi saldo budgetable.
Kurangi budget terlebih dahulu sebelum menyimpan perubahan ini.
```

---

### 16.6 User Mengubah Budget Period Income

Jika user memindahkan income dari Juni ke Juli, maka budgetable income Juni berkurang.

Sistem harus validasi:

```text
Total Budget Juni <= New Budgetable Income Juni
```

Jika tidak valid, tolak perubahan.

---

### 16.7 User Menghapus Income

Jika income dihapus, budgetable income period terkait berkurang.

Sistem harus validasi:

```text
Total Budget period <= Budgetable Income period after deletion
```

Jika tidak valid, tolak hapus atau minta user menghapus/mengurangi budget terlebih dahulu.

---

## 17. Acceptance Criteria

### AC-001 — Income dengan Savings

Given user memilih transaction type Income  
And user mencentang Save to Savings  
And user mengisi income amount Rp10.000.000  
And user mengisi savings amount Rp1.500.000  
And user memilih budget period Juni 2026  
When user menyimpan transaksi  
Then sistem menyimpan satu income transaction  
And wallet balance bertambah Rp10.000.000  
And savings bertambah Rp1.500.000  
And budgetable income Juni bertambah Rp8.500.000  

---

### AC-002 — Income Tanpa Savings

Given user memilih transaction type Income  
And Save to Savings tidak dicentang  
And income amount Rp10.000.000  
And budget period Juni 2026  
When user menyimpan transaksi  
Then budgetable income Juni bertambah Rp10.000.000  
And savings tidak bertambah  

---

### AC-003 — Savings Amount Melebihi Income

Given user input income Rp10.000.000  
And Save to Savings dicentang  
And savings amount Rp11.000.000  
When user menyimpan transaksi  
Then sistem menolak transaksi  
And menampilkan error bahwa savings amount tidak boleh melebihi income amount  

---

### AC-004 — Budget Tidak Boleh Melebihi Budgetable Income

Given budgetable income Juni Rp8.500.000  
And total budget Juni saat ini Rp8.000.000  
When user menambah budget Rp700.000  
Then sistem menolak karena total budget menjadi Rp8.700.000  
And sistem menampilkan error budget melebihi saldo budgetable  

---

### AC-005 — Expense Bulan Depan Dibayar Bulan Ini

Given user mencatat expense Rp2.000.000  
And transaction date 29 Mei 2026  
And budget period Juni 2026  
And category Kost  
When transaksi disimpan  
Then cashflow Mei menampilkan expense Rp2.000.000  
And budget Juni kategori Kost menampilkan spent Rp2.000.000  

---

### AC-006 — Cashflow dan Budget View Berbeda Basis

Given income terjadi pada 28 Mei 2026  
And budget period income adalah Juni 2026  
When user membuka cashflow Mei  
Then income muncul di cashflow Mei  

When user membuka budget Juni  
Then budgetable income muncul di budget Juni  

---

### AC-007 — Edit Income Tidak Boleh Membuat Budget Overplanned

Given budgetable income Juni Rp8.500.000  
And total budget Juni Rp8.000.000  
When user edit savings amount sehingga budgetable income Juni menjadi Rp7.500.000  
Then sistem menolak perubahan  
And meminta user mengurangi budget Juni terlebih dahulu  

---

### AC-008 — Income Payday Mendapat Suggested Budget Period Bulan Depan

Given user memiliki setting payday date 28  
And user mencatat income dengan transaction date 28 Mei 2026  
When income form dibuka atau transaction date dipilih  
Then sistem menyarankan budget period Juni 2026  

---

### AC-009 — Expense Wajib Fixed Payment Date Mendapat Suggested Budget Period Bulan Depan

Given user memiliki setting fixed payment date 29  
And category Kost ditandai sebagai fixed or required  
And user mencatat expense dengan transaction date 29 Mei 2026  
When expense form dibuka atau transaction date dan category dipilih  
Then sistem menyarankan budget period Juni 2026  

---

### AC-010 — Suggested Budget Period Bisa Diubah Manual

Given sistem menyarankan budget period Juni 2026  
When user mengganti budget period menjadi April 2026  
Then sistem menyimpan budget period April 2026 selama validasi lain terpenuhi  

---

### AC-011 — Payroll Cycle Akhir Tahun Mengarah ke Tahun Berikutnya

Given user memiliki setting payday date 28  
And user mencatat income dengan transaction date 28 Desember 2026  
When transaction date dipilih  
Then sistem menyarankan budget period Januari 2027  

---


## 18. MVP Scope

Fitur MVP:

1. CRUD wallet.
2. CRUD category.
3. CRUD transaction:
   - Income
   - Expense
   - Transfer
4. Income form dengan checkbox **Save to savings**.
5. Perhitungan budgetable amount otomatis.
6. Budget period pada income dan expense.
7. Budget category per period.
8. Validasi total budget tidak melebihi budgetable income.
9. Dashboard overview.
10. Cashflow view.
11. Budget view.
12. Savings summary.
13. User budgeting settings untuk payday date dan fixed payment date.
14. Suggested budget period otomatis untuk income payday dan expense wajib.

---

## 19. Future Enhancements

Fitur lanjutan yang bisa ditambahkan:

1. Multiple savings goals.
2. Savings withdrawal.
3. Emergency fund tracking.
4. Rollover remaining budget ke bulan berikutnya.
5. Recurring transactions.
6. Bill reminders.
7. Budget templates.
8. Monthly budget copy.
9. Forecasting saldo.
10. Export CSV/PDF.
11. Multi-currency.
12. Shared household budgeting.
13. Debt tracking.
14. Investment tracking.

---

## 20. Recommendation for Engineering

Untuk implementasi awal, simpan `savings_amount` dan `budgetable_amount` langsung di tabel `transactions`.

Alasannya:

1. Sesuai dengan UI saat ini.
2. User hanya input income satu kali.
3. Query dashboard lebih sederhana.
4. Tidak perlu membuat allocation table terpisah pada MVP.
5. Tetap bisa dikembangkan ke model allocation ledger di masa depan.

Namun, untuk audit yang lebih baik, tambahkan `savings_ledger` sebagai optional table.

Recommended MVP model:

```text
transactions.amount = total income
transactions.savings_amount = bagian income untuk savings
transactions.budgetable_amount = amount - savings_amount
transactions.budget_period = bulan budget untuk budgetable amount
```

---

## 21. Key Product Decision

Keputusan produk utama:

```text
Income tetap satu transaksi.
Savings diproses melalui checkbox save to savings.
Budgetable amount dihitung otomatis dari total income dikurangi savings amount.
Budgetable amount hanya berlaku untuk budget period yang dipilih user.
Budget tidak boleh melebihi budgetable income pada period tersebut.
Cashflow memakai transaction_date.
Budget memakai budget_period.
```

Ini adalah fondasi utama agar app tetap simpel untuk user, tetapi tetap akurat secara konsep money management pribadi.
