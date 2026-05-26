# PRD — Budgeting Module

## Nama Modul
Budgeting — Finnnance Trawwwcker

## Background

Modul Budgeting dibuat untuk membantu user mengatur rencana pengeluaran bulanan berdasarkan dana yang benar-benar tersedia.

Dalam konteks aplikasi ini, user biasanya menerima income seperti gaji pada akhir bulan, misalnya tanggal 28 Mei. Income tersebut dapat digunakan sebagai dasar untuk membuat budget bulan berikutnya, misalnya budget Juni.

Namun sistem tidak boleh hanya melihat total income, karena income belum tentu masih utuh. Maka budgeting harus berbasis **available balance**, bukan sekadar income.

Contoh:

```txt
Income tanggal 28 Mei: Rp5.000.000
Sisa saldo akhir Mei: Rp4.200.000

Budget Juni idealnya tidak melebihi Rp4.200.000
```

Konsep utama modul ini adalah:

```txt
Budget bulan depan dibuat berdasarkan saldo yang tersedia dari bulan sebelumnya.
```

---

## Objective

Modul Budgeting bertujuan untuk:

- Membantu user membuat budget bulanan yang realistis
- Mencegah user membuat budget melebihi uang yang tersedia
- Memberikan gambaran dana yang sudah dialokasikan dan belum dialokasikan
- Membantu user mengontrol pengeluaran berdasarkan kategori
- Menampilkan warning jika budget melebihi available balance
- Menjadi dasar untuk dashboard, alert, dan AI financial insight

---

## Core Concept

Budgeting menggunakan konsep:

```txt
Available to Budget
Budgeted
Unallocated
Overplanned
```

### 1. Available to Budget

Jumlah uang yang aman untuk dialokasikan ke budget bulan berikutnya.

Formula awal:

```txt
Available to Budget = Total Wallet Balance Akhir Bulan Sebelumnya
```

Formula lebih advanced:

```txt
Available to Budget = Total Wallet Balance - Reserved Balance - Active Debt Obligation
```

### 2. Budgeted

Total budget yang sudah dialokasikan ke semua kategori.

```txt
Budgeted = SUM(Category Budget)
```

### 3. Unallocated

Sisa dana yang belum dialokasikan ke kategori manapun.

```txt
Unallocated = Available to Budget - Budgeted
```

### 4. Overplanned

Kondisi ketika budget melebihi dana tersedia.

```txt
Overplanned = Budgeted - Available to Budget
```

Jika nilai `Overplanned > 0`, sistem harus menampilkan warning.

---

## User Story

### 1. Set Monthly Budget

Sebagai user, saya ingin bisa membuat budget setiap bulan berdasarkan kategori agar pengeluaran saya lebih terarah.

#### Importance
High

#### Acceptance Criteria
- User dapat memilih bulan budget
- User dapat menambahkan budget per kategori
- User dapat mengubah nominal budget kategori
- User dapat menghapus budget kategori
- Sistem menghitung total budget otomatis
- Sistem menampilkan available to budget
- Sistem menampilkan unallocated amount
- Sistem memberi warning jika budget melebihi available balance

---

### 2. Category-Based Budget

Sebagai user, saya ingin budget dibagi berdasarkan kategori agar saya tahu uang saya dialokasikan untuk apa saja.

#### Importance
High

#### Acceptance Criteria
- User dapat membuat budget untuk kategori seperti:
  - Makanan Pokok
  - Kopi
  - Lifestyle
  - Transport
  - Tagihan
  - Tabungan
  - Biaya Admin
- Setiap kategori memiliki nominal budget
- Total budget bulan tersebut dihitung otomatis dari semua kategori
- Kategori tanpa budget tetap bisa menerima transaksi, tetapi ditandai sebagai `Unbudgeted Spending`

---

### 3. Budget Limit Based on Available Balance

Sebagai user, saya ingin sistem memberi tahu jika budget saya melebihi saldo tersedia agar saya tidak membuat rencana keuangan yang tidak realistis.

#### Importance
Very High

#### Acceptance Criteria
- Sistem menghitung available balance dari bulan sebelumnya
- Sistem membandingkan total budget bulan berjalan dengan available balance
- Jika total budget lebih kecil atau sama dengan available balance, status budget adalah `SAFE`
- Jika total budget lebih besar dari available balance, status budget adalah `OVERPLANNED`
- Sistem menampilkan nominal kelebihan budget
- User tetap bisa menyimpan budget dengan warning, kecuali strict mode aktif

---

### 4. Soft Warning Mode

Sebagai user, saya ingin tetap bisa menyimpan budget walaupun melebihi saldo tersedia, karena mungkin saya punya rencana income tambahan.

#### Importance
Medium

#### Acceptance Criteria
- Default mode adalah soft warning
- Jika budget melebihi available balance, sistem menampilkan alert
- User tetap bisa klik `Save Anyway`
- Budget yang disimpan diberi status `OVERPLANNED`
- Dashboard menampilkan indikator bahwa budget bulan tersebut overplanned

---

### 5. Strict Budget Mode

Sebagai user, saya ingin ada mode ketat agar budget tidak bisa melebihi saldo tersedia.

#### Importance
Medium

#### Acceptance Criteria
- User dapat mengaktifkan `Strict Budget Mode`
- Jika strict mode aktif, sistem tidak mengizinkan budget disimpan jika total budget melebihi available balance
- Sistem menampilkan pesan error yang jelas
- Strict mode bersifat optional

---

### 6. Budget Progress Tracking

Sebagai user, saya ingin melihat progres pemakaian budget per kategori agar saya tahu kategori mana yang hampir habis.

#### Importance
High

#### Acceptance Criteria
- Sistem menampilkan budget vs actual spending per kategori
- Sistem menampilkan persentase pemakaian budget
- Sistem menampilkan progress bar
- Status kategori:
  - `SAFE` jika pemakaian < 70%
  - `WARNING` jika pemakaian 70% sampai 89%
  - `DANGER` jika pemakaian 90% sampai 100%
  - `OVERBUDGET` jika pemakaian > 100%
- Transaksi tanpa budget masuk ke section `Unbudgeted Spending`

---

### 7. Budget Copy From Previous Month

Sebagai user, saya ingin bisa copy budget dari bulan sebelumnya agar tidak perlu input ulang semua kategori setiap bulan.

#### Importance
High

#### Acceptance Criteria
- User dapat klik `Copy from Previous Month`
- Sistem menyalin kategori dan nominal budget dari bulan sebelumnya
- User dapat mengedit hasil copy sebelum menyimpan
- Sistem tetap melakukan validasi terhadap available balance bulan yang dipilih

---

### 8. Reserved Balance

Sebagai user, saya ingin bisa menyisihkan sebagian saldo agar tidak ikut dihitung sebagai dana yang bisa dibudgetkan.

#### Importance
Medium

#### Acceptance Criteria
- User dapat membuat reserved balance
- Reserved balance dapat digunakan untuk:
  - dana darurat
  - tabungan
  - cicilan
  - pembayaran wajib
- Reserved balance mengurangi available to budget
- Dashboard budgeting menampilkan reserved amount

---

### 9. AI Budget Insight

Sebagai user, saya ingin FinBot memberi insight terhadap kondisi budget saya.

#### Importance
Medium

#### Acceptance Criteria
- AI dapat membaca summary budget
- AI dapat memberi warning jika ada kategori hampir habis
- AI dapat memberi saran kategori mana yang bisa dikurangi
- AI tidak boleh mengubah budget tanpa konfirmasi user
- AI hanya memberi insight berdasarkan data yang diberikan backend

---

## Example Scenario

### Scenario 1 — Budget Aman

```txt
Saldo akhir Mei: Rp4.200.000

Budget Juni:
Makanan Pokok: Rp1.800.000
Kopi: Rp200.000
Lifestyle: Rp500.000
Transport: Rp400.000
Tabungan: Rp1.000.000

Total Budget: Rp3.900.000
Available to Budget: Rp4.200.000
Unallocated: Rp300.000
Status: SAFE
```

### Scenario 2 — Budget Melebihi Saldo

```txt
Saldo akhir Mei: Rp4.200.000

Budget Juni:
Makanan Pokok: Rp1.800.000
Kopi: Rp200.000
Lifestyle: Rp1.000.000
Transport: Rp700.000
Tabungan: Rp1.000.000

Total Budget: Rp4.700.000
Available to Budget: Rp4.200.000
Overplanned: Rp500.000
Status: OVERPLANNED
```

Alert:

```txt
Budget Juni melebihi dana tersedia sebesar Rp500.000.
Kamu tetap bisa simpan, tetapi budget ini akan ditandai sebagai overplanned.
```

---

## Functional Requirements

### 1. Monthly Budget
- Create monthly budget
- Edit monthly budget
- Delete monthly budget
- Copy budget from previous month
- View monthly budget summary

### 2. Category Budget
- Add category budget
- Edit category budget amount
- Delete category budget
- Display budget progress per category
- Detect category without budget

### 3. Available Balance Calculation
- Calculate total wallet balance at previous month end
- Subtract reserved balance
- Subtract active debt obligation if enabled
- Generate available to budget

### 4. Budget Validation
- Compare total budget with available to budget
- Show safe / warning / overplanned status
- Support soft warning mode
- Support strict mode

### 5. Budget Dashboard
- Display available to budget
- Display budgeted amount
- Display unallocated amount
- Display overplanned amount
- Display category progress
- Display unbudgeted spending

### 6. Budget Alert
- Alert at 70%
- Alert at 90%
- Alert above 100%
- Alert if budget is overplanned

---

## Non-Functional Requirements

- Budget dashboard response should be under 2 seconds
- All calculations must be server-side
- Budget data must be auditable
- Budget calculation must use decimal-safe financial logic
- User input must be validated
- System must not rely only on frontend calculation
- UI must remain simple and mobile friendly

---

## UI / UX Requirements

### Budget Overview Card

Budget page should show:

```txt
Available to Budget
Budgeted
Unallocated
Overplanned
```

### Category Budget List

Each category row should show:

```txt
Category Name
Budget Amount
Actual Spending
Remaining
Progress %
Status
```

### Visual Status

```txt
SAFE        = neutral / green subtle
WARNING     = yellow subtle
DANGER      = orange subtle
OVERBUDGET  = red subtle
OVERPLANNED = red warning
```

### Main Actions

Buttons:
- Add Category Budget
- Copy Previous Month
- Save Budget
- Save Anyway
- Enable Strict Mode

---

## Recommended Database Design

### BudgetMonth

Stores monthly budgeting header.

```prisma
model BudgetMonth {
  id                String       @id @default(uuid())
  userId            String
  month             DateTime
  availableToBudget Decimal      @default(0)
  budgetedAmount    Decimal      @default(0)
  unallocatedAmount Decimal      @default(0)
  overplannedAmount Decimal      @default(0)
  status            BudgetStatus @default(DRAFT)
  strictMode         Boolean      @default(false)
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  user       User             @relation(fields: [userId], references: [id])
  categories BudgetCategory[]

  @@unique([userId, month])
  @@index([userId])
  @@index([month])
}
```

### BudgetCategory

Stores budget amount per category.

```prisma
model BudgetCategory {
  id            String   @id @default(uuid())
  budgetMonthId String
  categoryId    String
  amount        Decimal
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  budgetMonth BudgetMonth @relation(fields: [budgetMonthId], references: [id])
  category    Category    @relation(fields: [categoryId], references: [id])

  @@unique([budgetMonthId, categoryId])
  @@index([budgetMonthId])
  @@index([categoryId])
}
```

### ReservedBalance

Stores reserved money that should not be included in available budget.

```prisma
model ReservedBalance {
  id          String   @id @default(uuid())
  userId      String
  name        String
  amount      Decimal
  month       DateTime
  note        String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([month])
}
```

### BudgetStatus Enum

```prisma
enum BudgetStatus {
  DRAFT
  SAFE
  OVERPLANNED
  LOCKED
}
```

---

## API Routes

```txt
GET    /api/budgets?month=
POST   /api/budgets
PUT    /api/budgets/:id
DELETE /api/budgets/:id

POST   /api/budgets/copy-previous
GET    /api/budgets/available-balance?month=
GET    /api/budgets/progress?month=

POST   /api/reserved-balances
GET    /api/reserved-balances?month=
PUT    /api/reserved-balances/:id
DELETE /api/reserved-balances/:id
```

---

## Calculation Rules

### Total Budgeted

```txt
budgetedAmount = SUM(BudgetCategory.amount)
```

### Unallocated

```txt
unallocatedAmount = availableToBudget - budgetedAmount
```

### Overplanned

```txt
overplannedAmount = budgetedAmount - availableToBudget
```

If `overplannedAmount <= 0`, set it to 0.

### Status

```txt
IF budgetedAmount <= availableToBudget:
  status = SAFE

IF budgetedAmount > availableToBudget:
  status = OVERPLANNED
```

### Strict Mode

```txt
IF strictMode = true AND budgetedAmount > availableToBudget:
  reject save
```

---

## Budget Progress Formula

```txt
spent = SUM(Transaction.amount WHERE categoryId = categoryId AND date in selected month AND type = EXPENSE)

progress = spent / budgetAmount * 100

remaining = budgetAmount - spent
```

### Status Rule

```txt
IF progress < 70:
  SAFE

IF progress >= 70 AND progress < 90:
  WARNING

IF progress >= 90 AND progress <= 100:
  DANGER

IF progress > 100:
  OVERBUDGET
```

---

## AI Agent Context

When calling FinBot for budget insight, send this context:

```txt
Current Month
User
Available to Budget
Budgeted Amount
Unallocated Amount
Overplanned Amount
Budget Status
Category Budget Progress
Unbudgeted Spending
Recent Transactions
```

FinBot may answer:
- budget condition summary
- category warning
- spending recommendation
- overplanned warning

FinBot must not:
- edit budget directly
- delete budget
- create category budget without confirmation

---

## Edge Cases

### 1. Budget Month Has No Income Yet
If no previous balance is available, system should show available to budget as current wallet balance or 0 depending on configuration.

### 2. Category Has Spending But No Budget
Transaction should be shown in `Unbudgeted Spending`.

### 3. Budget Is Overplanned But User Has Future Income
System should allow save in soft warning mode.

### 4. User Deletes Category Budget
Existing transactions remain unchanged.

### 5. User Changes Category Budget Mid-Month
System recalculates progress immediately.

### 6. Wallet Balance Changes After Budget Created
Budget does not automatically change unless user recalculates available balance.

Recommended behavior:
- show `Recalculate Available Balance` button

---

## MVP Scope

### Included in MVP
- Monthly budget
- Category-based budget
- Available to budget
- Budgeted / unallocated / overplanned summary
- Soft warning mode
- Budget progress per category
- Copy previous month
- Unbudgeted spending

### Not Included in MVP
- Reserved balance
- Strict budget mode
- AI insight automation
- Debt obligation deduction
- Auto budget from income
- Complex forecast

---

## Future Enhancements

- Strict Budget Mode
- Reserved Balance
- Auto Budget Suggestion
- AI budget recommendation
- Budget forecast
- Debt obligation integration
- Saving goal integration
- Auto allocate income to budget
- Multi-wallet budget source
- Budget lock after month starts

---

## Implementation Notes for Codex

- Do not calculate budget only on frontend
- Use server-side aggregate query
- Use Decimal for all money values
- Use month as first day of month
- Do not use income alone as budget limit
- Use available balance as budget limit
- Do not hard block overplanned budget unless strict mode is active
- Keep UI simple and mobile friendly
- Show clear warning when budget exceeds available balance
- Always allow user to review before saving
- Keep budgeting separate from transaction input
- Transactions update budget progress automatically
