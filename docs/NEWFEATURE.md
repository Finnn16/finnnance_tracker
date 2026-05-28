# PRD — Planning Features Module

## Project
Finnnance Trawwwcker

## Module Scope
Dokumen ini mencakup 4 fitur planning tambahan:

1. Budget Rollover
2. Wish List / Planned Purchase
3. Recurring Transaction
4. What If Simulator

Fitur-fitur ini dibuat untuk memperkuat fungsi utama aplikasi sebagai **personal money control system**, bukan hanya finance tracker biasa.

---

# 1. Background

Saat core app sudah memiliki cashflow, budgeting, savings, debt, dan FinBot, user mulai membutuhkan fitur yang membantu sebelum dan sesudah uang keluar.

Masalah yang ingin diselesaikan:

- User punya sisa budget, tapi bingung harus dibawa ke bulan depan, masuk savings, atau dibiarkan sebagai dana bebas.
- User ingin membeli sesuatu, tapi belum tahu apakah aman untuk kondisi budget.
- User punya fixed cost rutin seperti kost, internet, subscription, dan transfer rutin yang sebaiknya tidak perlu diinput manual terus-menerus.
- User ingin simulasi kondisi finansial sebelum membuat keputusan seperti belanja, meminjamkan uang, menambah savings, atau transfer wallet.

Karena itu, fitur planning ini bertujuan untuk membantu user berpikir sebelum spending, mengatur sisa budget, menghindari lupa fixed cost, dan melihat dampak keputusan finansial sebelum transaksi dibuat.

---

# 2. Goals

## Main Goals

- Membantu user membuat keputusan uang sebelum transaksi terjadi.
- Mengurangi impulse spending.
- Membantu user mengatur sisa budget di akhir bulan.
- Membantu user mengingat fixed cost dan transaksi rutin.
- Memberikan simulasi before/after terhadap cash, budget, savings, dan debt.
- Menjaga input transaksi tetap ringan dan tidak terlalu banyak flow.

## Non-Goals

- Tidak membuat app menjadi sistem akuntansi kompleks.
- Tidak membuat auto-debit atau integrasi bank.
- Tidak membuat fitur investasi.
- Tidak membuat rekomendasi keuangan formal.
- Tidak membuat semua transaksi otomatis tanpa kontrol user.
- Tidak membuat budgeting terlalu kaku.

---

# 3. Product Principles

Fitur ini harus mengikuti prinsip app:

```txt
Simple first
User remains in control
Backend calculates
AI explains
No silent financial mutation
```

Artinya:

- Sistem boleh memberi saran.
- Sistem boleh melakukan simulasi.
- Sistem boleh membuat reminder.
- Tapi perubahan data keuangan tetap harus jelas dan terkonfirmasi oleh user.

---

# 4. Feature Overview

## 4.1 Budget Rollover

Budget Rollover membantu user menentukan apa yang harus dilakukan terhadap sisa budget bulan berjalan.

Contoh:

```txt
Budget Makan Juni: Rp1.200.000
Terpakai: Rp1.000.000
Sisa: Rp200.000
```

User dapat memilih:

```txt
1. Bawa sisa ke budget bulan depan
2. Masukkan ke savings
3. Kembalikan ke unallocated cash
4. Tutup tanpa aksi khusus
```

## 4.2 Wish List / Planned Purchase

Wish List adalah tempat parkir keinginan sebelum menjadi transaksi.

Contoh:

```txt
Beli sepatu Rp700.000
Beli casing Rp150.000
Keyboard baru Rp500.000
Hadiah Awa Rp800.000
```

Tujuannya agar user tidak langsung membeli secara impulsif, tetapi bisa menunda, mensimulasikan, atau merencanakan pembelian.

## 4.3 Recurring Transaction

Recurring Transaction adalah template untuk transaksi rutin.

Contoh:

```txt
Kost setiap tanggal 1
Internet setiap tanggal 10
Transfer Awa setiap tanggal 25
Spotify setiap tanggal 15
Gaji setiap tanggal 28
```

Untuk MVP, fitur ini lebih disarankan sebagai **Reminder Only**, bukan auto-create langsung, agar tidak terjadi transaksi dobel.

## 4.4 What If Simulator

What If Simulator membantu user melihat dampak sebuah keputusan sebelum data disimpan.

Contoh pertanyaan:

```txt
Kalau gue beli sepatu Rp700.000 sekarang aman gak?
Kalau gue pinjemin adik Rp500.000, budget terganggu gak?
Kalau gue tambah savings Rp1.000.000, sisa uang bebas berapa?
Kalau gue bayar kost lebih awal, cashflow bulan ini gimana?
```

Simulator tidak boleh mengubah data. Ia hanya memberi preview.

---

# 5. Navigation / Menu Structure

Rekomendasi struktur menu:

```txt
Dashboard
Transactions
Budget
Savings
Debt
Planning
Settings
```

Isi menu `Planning`:

```txt
Planning
├── Wish List
└── What If Simulator
```

Isi menu `Settings`:

```txt
Settings
├── Recurring Transactions
├── Categories
├── Wallets
└── Budget Preferences
```

Budget Rollover diletakkan di:

```txt
Budget → Monthly Closing / Rollover
```

atau jika nanti ada menu review:

```txt
Monthly Review → Budget Rollover
```

---

# 6. Feature 1 — Budget Rollover

## 6.1 Objective

Membantu user mengatur sisa budget setelah bulan berjalan selesai atau ketika masuk ke periode budget berikutnya.

## 6.2 User Problem

User sering memiliki sisa budget, tetapi tidak jelas apakah sisa tersebut harus dibawa ke bulan depan, masuk savings, menjadi dana bebas, atau diabaikan.

## 6.3 User Stories

### Story 1 — Melihat Sisa Budget Bulan Ini

Sebagai user, saya ingin melihat kategori budget yang masih punya sisa agar saya tahu dana mana yang belum terpakai.

Acceptance Criteria:
- Sistem menampilkan list kategori dengan sisa budget.
- Sistem menampilkan total remaining budget.
- Sistem membedakan kategori fixed dan flexible.
- Sistem tidak menampilkan kategori yang overbudget sebagai sisa.

### Story 2 — Memilih Aksi Rollover

Sebagai user, saya ingin memilih aksi terhadap sisa budget agar sisa tersebut tidak hilang secara konteks.

Acceptance Criteria:
- User dapat memilih action per kategori.
- User dapat memilih bulk action untuk semua kategori.
- Pilihan action:
  - Rollover to next month
  - Move to savings
  - Return to unallocated
  - No action
- Sistem menampilkan preview before/after.

### Story 3 — Manual Rollover

Sebagai user, saya ingin rollover dilakukan manual agar budget bulan depan tidak membengkak tanpa sadar.

Acceptance Criteria:
- Default behavior adalah `Return to Unallocated`.
- Auto-rollover tidak aktif secara default.
- User harus memilih kategori yang akan di-rollover.
- Sistem menyimpan histori rollover.

## 6.4 Recommended Flow

```txt
User buka Budget bulan berjalan
        ↓
Klik Monthly Closing / Rollover
        ↓
Sistem tampilkan sisa budget per kategori
        ↓
User pilih action
        ↓
Sistem tampilkan preview
        ↓
User confirm
        ↓
Sistem apply rollover
```

## 6.5 Rollover Actions

### 1. Rollover to Next Month

Sisa budget ditambahkan ke budget kategori yang sama di bulan berikutnya.

Example:

```txt
Budget Kopi Juni sisa Rp100.000
Budget Kopi Juli normal Rp200.000
Setelah rollover:
Budget Kopi Juli = Rp300.000
```

### 2. Move to Savings

Sisa budget dipindahkan ke savings.

Effect:

```txt
Savings balance bertambah
Available to spend berkurang
Expense tidak bertambah
```

### 3. Return to Unallocated

Sisa budget kembali menjadi dana bebas.

Effect:

```txt
Budget bulan berikutnya tidak berubah
Savings tidak berubah
Unallocated cash tetap menjadi dana bebas
```

### 4. No Action

Tidak ada perubahan finansial khusus, hanya menutup review.

## 6.6 Rollover Policy

Untuk pengembangan lanjutan, kategori dapat memiliki policy:

```txt
NO_ROLLOVER
ASK_EVERY_MONTH
AUTO_ROLLOVER
```

MVP:

```txt
ASK_EVERY_MONTH
```

## 6.7 Data Model Recommendation

```prisma
model BudgetRollover {
  id              String   @id @default(uuid())
  userId          String
  fromBudgetMonth DateTime
  toBudgetMonth   DateTime
  categoryId      String
  amount          Int
  action          BudgetRolloverAction
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user     User     @relation(fields: [userId], references: [id])
  category Category @relation(fields: [categoryId], references: [id])

  @@index([userId])
  @@index([fromBudgetMonth])
  @@index([toBudgetMonth])
  @@index([categoryId])
}

enum BudgetRolloverAction {
  ROLLOVER_TO_NEXT_MONTH
  MOVE_TO_SAVINGS
  RETURN_TO_UNALLOCATED
  NO_ACTION
}
```

## 6.8 UI Requirements

Budget Rollover page should show:

```txt
Month
Total Remaining Budget
Category List
Action Dropdown
Preview
Confirm Button
```

Example row:

```txt
Makan
Budget: Rp1.200.000
Spent: Rp1.000.000
Remaining: Rp200.000
Action: Return to Unallocated
```

## 6.9 MVP Scope

Included:
- Show remaining budget.
- Manual rollover.
- Bulk action.
- Preview.
- Save rollover history.

Not included:
- Auto-rollover.
- Complex rule per category.
- Multi-month rollover chain.
- AI automatic action.

---

# 7. Feature 2 — Wish List / Planned Purchase

## 7.1 Objective

Membantu user menunda dan merencanakan pembelian sebelum menjadi expense.

## 7.2 User Problem

User sering memiliki keinginan membeli sesuatu, tetapi belum tahu apakah aman dibeli sekarang, apakah mengganggu budget, apakah sebaiknya ditunda, atau apakah perlu dijadikan savings goal.

Wish List membantu user membuat jarak antara keinginan dan transaksi.

## 7.3 Difference Between Wish List and Savings Goal

```txt
Wish List = barang/keinginan yang sedang dipertimbangkan
Savings Goal = target tabungan yang sudah diputuskan
```

Example:

```txt
Wish List:
Beli sepatu Rp700.000
Status: CONSIDERING

Savings Goal:
Dana Darurat Rp5.000.000
Status: ACTIVE
```

## 7.4 User Stories

### Story 1 — Create Wish List Item

Sebagai user, saya ingin mencatat rencana pembelian agar tidak langsung menjadi expense.

Acceptance Criteria:
- User dapat input nama item.
- User dapat input estimasi harga.
- User dapat memilih kategori.
- User dapat memilih target month.
- User dapat memilih priority.
- User dapat menulis note.
- Default status adalah `CONSIDERING`.

### Story 2 — Simulate Purchase

Sebagai user, saya ingin mensimulasikan wishlist item agar tahu apakah aman dibeli.

Acceptance Criteria:
- Setiap wishlist item punya tombol `Simulate Purchase`.
- Sistem membuka What If Simulator dengan data item tersebut.
- Sistem menampilkan efek terhadap cash, budget, dan savings.
- Wishlist tidak otomatis menjadi transaksi.

### Story 3 — Convert to Transaction

Sebagai user, saya ingin mengubah wishlist menjadi transaksi saat sudah benar-benar dibeli.

Acceptance Criteria:
- User dapat klik `Create Expense`.
- Sistem membuka transaction form dengan field terisi otomatis.
- User tetap harus confirm.
- Status wishlist berubah menjadi `PURCHASED` setelah transaksi tersimpan.

### Story 4 — Cancel Wish

Sebagai user, saya ingin membatalkan wishlist jika saya memutuskan tidak jadi membeli.

Acceptance Criteria:
- User dapat mengubah status menjadi `CANCELLED`.
- Item tidak hilang dari histori.
- Item tidak memengaruhi wallet/budget.

## 7.5 Wish List Status

```txt
CONSIDERING
PLANNED
READY_TO_BUY
PURCHASED
CANCELLED
```

Status meaning:

```txt
CONSIDERING  = masih dipikirkan
PLANNED      = sudah ada rencana bulan tertentu
READY_TO_BUY = hasil simulasi aman / user merasa siap
PURCHASED    = sudah dikonversi menjadi transaksi
CANCELLED    = dibatalkan
```

## 7.6 Priority

```txt
LOW
MEDIUM
HIGH
```

## 7.7 Recommended Flow

```txt
User buka Planning → Wish List
        ↓
Klik Add Wish
        ↓
Isi item, amount, category, target month, priority
        ↓
Save as CONSIDERING
        ↓
User klik Simulate Purchase
        ↓
What If Simulator menampilkan efek
        ↓
Jika aman:
  Mark as READY_TO_BUY
  atau Create Expense
Jika tidak aman:
  Keep as PLANNED / postpone
```

## 7.8 Data Model Recommendation

```prisma
model WishListItem {
  id              String         @id @default(uuid())
  userId          String
  name            String
  estimatedAmount Int
  categoryId      String?
  targetMonth     DateTime?
  priority        WishPriority   @default(MEDIUM)
  status          WishStatus     @default(CONSIDERING)
  note            String?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  purchasedAt     DateTime?
  transactionId   String?

  user        User         @relation(fields: [userId], references: [id])
  category    Category?    @relation(fields: [categoryId], references: [id])
  transaction Transaction? @relation(fields: [transactionId], references: [id])

  @@index([userId])
  @@index([status])
  @@index([targetMonth])
  @@index([categoryId])
}

enum WishStatus {
  CONSIDERING
  PLANNED
  READY_TO_BUY
  PURCHASED
  CANCELLED
}

enum WishPriority {
  LOW
  MEDIUM
  HIGH
}
```

## 7.9 UI Requirements

Wish List page should show:

```txt
Item Name
Estimated Amount
Category
Target Month
Priority
Status
Action
```

Actions:
- Simulate Purchase
- Mark as Planned
- Mark as Ready
- Create Expense
- Cancel

Card example:

```txt
Sepatu Kerja
Rp700.000
Category: Lifestyle
Target: Juli 2026
Priority: Medium
Status: Considering

[Simulate] [Plan] [Create Expense]
```

## 7.10 MVP Scope

Included:
- Create wishlist item.
- Edit wishlist item.
- Delete/cancel wishlist item.
- Status update.
- Simulate purchase.
- Convert to transaction form.

Not included:
- Marketplace link tracking.
- Price tracking.
- Attachment/image.
- Installment planning.
- Collaborative wishlist.

---

# 8. Feature 3 — Recurring Transaction

## 8.1 Objective

Membantu user mengingat dan membuat transaksi rutin, terutama fixed cost dan income rutin.

## 8.2 User Problem

User memiliki banyak transaksi rutin seperti:

```txt
Kost
Internet
Subscription
Transfer rutin
Gaji
```

Jika semua harus dicatat manual, user bisa lupa atau double input.

## 8.3 Placement

Recurring Transaction sebaiknya berada di menu:

```txt
Settings → Recurring Transactions
```

Karena fitur ini lebih mirip rule/template, bukan transaksi langsung.

Alternative future placement:

```txt
Automation → Recurring Transactions
```

Untuk MVP, gunakan:

```txt
Settings → Recurring Transactions
```

## 8.4 Modes

### Reminder Only

Sistem hanya mengingatkan user bahwa transaksi rutin perlu dicatat.

Recommended default.

Example:

```txt
Kost Juni due tanggal 1. Mau catat sekarang?
```

### Auto Create

Sistem otomatis membuat transaksi pada tanggal tertentu.

Not recommended for MVP karena rawan double input.

## 8.5 Why Reminder Only for MVP

Fixed cost bisa dibayar lebih awal atau berbeda tanggal.

Example:

```txt
User bayar kost Juni pada 29 Mei
Recurring kost juga due tanggal 1 Juni
```

Jika auto-create langsung aktif, sistem bisa membuat transaksi dobel.

Karena itu MVP harus menggunakan:

```txt
Reminder Only + User Confirmation
```

## 8.6 User Stories

### Story 1 — Create Recurring Rule

Sebagai user, saya ingin membuat template transaksi rutin agar tidak perlu menginput data yang sama berulang.

Acceptance Criteria:
- User dapat membuat recurring rule.
- User dapat memilih type:
  - INCOME
  - EXPENSE
  - TRANSFER
- User dapat input name.
- User dapat input amount.
- User dapat pilih wallet.
- User dapat pilih category jika expense.
- User dapat menentukan frequency.
- User dapat menentukan day of month.
- User dapat memilih reminder mode.
- User dapat mengaktifkan/nonaktifkan rule.

### Story 2 — Upcoming Reminder

Sebagai user, saya ingin melihat transaksi rutin yang akan datang agar fixed cost tidak terlewat.

Acceptance Criteria:
- Dashboard menampilkan upcoming recurring reminders.
- Reminder menampilkan due date.
- Reminder menampilkan amount.
- Reminder menampilkan action `Create Transaction`.
- Reminder tidak langsung mengubah wallet.

### Story 3 — Create Transaction from Rule

Sebagai user, saya ingin membuat transaksi dari recurring rule agar form terisi otomatis.

Acceptance Criteria:
- User klik `Create Transaction`.
- Sistem membuka transaction form.
- Field otomatis terisi dari rule.
- User dapat mengubah date, amount, wallet, budgetMonth.
- User harus confirm untuk menyimpan.
- Setelah transaksi dibuat, reminder ditandai sebagai completed.

### Story 4 — Avoid Duplicate

Sebagai user, saya ingin sistem mencegah recurring transaksi dobel.

Acceptance Criteria:
- Sistem mengecek apakah transaksi mirip sudah ada.
- Jika ada, tampilkan warning.
- User dapat memilih:
  - use existing transaction
  - create anyway
  - cancel

## 8.7 Frequency

MVP frequency:

```txt
MONTHLY
```

Future:

```txt
WEEKLY
BIWEEKLY
YEARLY
CUSTOM
```

## 8.8 Budget Month Behavior

Recurring rule harus mendukung budgetMonth behavior.

Options:

```txt
SAME_AS_TRANSACTION_MONTH
NEXT_MONTH
ASK_WHEN_CONFIRMING
```

Recommended MVP:

```txt
ASK_WHEN_CONFIRMING
```

Example:

```txt
Kost due tanggal 1 Juni
Budget month: Juni
```

Jika user bayar early:

```txt
transactionDate: 29 Mei
budgetMonth: Juni
```

## 8.9 Recommended Flow

```txt
Settings
        ↓
Recurring Transactions
        ↓
+ New Recurring
        ↓
Isi template
        ↓
Save as Reminder Only
        ↓
Dashboard menampilkan upcoming reminder
        ↓
User klik Create Transaction
        ↓
Form transaksi terbuka dengan auto-filled data
        ↓
User confirm
        ↓
Transaction created
```

## 8.10 Data Model Recommendation

```prisma
model RecurringRule {
  id                  String                  @id @default(uuid())
  userId              String
  name                String
  type                TransactionType
  amount              Int
  walletId            String?
  toWalletId          String?
  categoryId          String?
  frequency           RecurringFrequency       @default(MONTHLY)
  dayOfMonth          Int?
  mode                RecurringMode            @default(REMINDER_ONLY)
  budgetMonthBehavior BudgetMonthBehavior      @default(ASK_WHEN_CONFIRMING)
  startDate           DateTime
  endDate             DateTime?
  isActive            Boolean                 @default(true)
  note                String?
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt

  user       User      @relation(fields: [userId], references: [id])
  wallet     Wallet?   @relation(fields: [walletId], references: [id])
  toWallet   Wallet?   @relation("RecurringToWallet", fields: [toWalletId], references: [id])
  category   Category? @relation(fields: [categoryId], references: [id])
  instances  RecurringInstance[]

  @@index([userId])
  @@index([isActive])
  @@index([frequency])
}

model RecurringInstance {
  id              String                  @id @default(uuid())
  recurringRuleId String
  userId          String
  dueDate         DateTime
  status          RecurringInstanceStatus @default(PENDING)
  transactionId   String?
  createdAt       DateTime                @default(now())
  updatedAt       DateTime                @updatedAt

  rule        RecurringRule @relation(fields: [recurringRuleId], references: [id])
  user        User          @relation(fields: [userId], references: [id])
  transaction Transaction?  @relation(fields: [transactionId], references: [id])

  @@index([recurringRuleId])
  @@index([userId])
  @@index([dueDate])
  @@index([status])
}

enum RecurringFrequency {
  MONTHLY
}

enum RecurringMode {
  REMINDER_ONLY
  AUTO_CREATE
}

enum BudgetMonthBehavior {
  SAME_AS_TRANSACTION_MONTH
  NEXT_MONTH
  ASK_WHEN_CONFIRMING
}

enum RecurringInstanceStatus {
  PENDING
  COMPLETED
  SKIPPED
  CANCELLED
}
```

## 8.11 UI Requirements

Recurring Rule list:

```txt
Name
Type
Amount
Due Date Pattern
Mode
Status
Action
```

Upcoming card:

```txt
Kost Juni
Due: 1 Juni 2026
Amount: Rp1.840.000
Mode: Reminder Only

[Create Transaction] [Skip]
```

Create transaction preview:

```txt
Type: Expense
Amount: Rp1.840.000
Category: Kost
Wallet: BCA
Transaction Date: Today
Budget Month: Ask / Juni

Lanjut simpan?
```

## 8.12 MVP Scope

Included:
- Create recurring rule.
- Monthly frequency.
- Reminder only.
- Upcoming reminder.
- Create transaction from reminder.
- Skip reminder.
- Duplicate warning.

Not included:
- Auto-create.
- Weekly/yearly frequency.
- Complex custom schedule.
- External notification.
- n8n reminder.
- WhatsApp reminder.

---

# 9. Feature 4 — What If Simulator

## 9.1 Objective

Membantu user melihat dampak keputusan finansial sebelum transaksi benar-benar dibuat.

## 9.2 User Problem

User sering bertanya:

```txt
Aman gak kalau gue beli ini?
Boleh gak kalau gue pinjemin uang?
Kalau gue tambah savings, sisa dana bebas berapa?
```

Tanpa simulator, user harus menebak dari saldo dan budget.

## 9.3 Core Rule

What If Simulator tidak boleh menyimpan data.

```txt
No wallet update
No transaction created
No savings ledger created
No debt created
No budget changed
```

Simulator hanya melakukan calculation preview.

## 9.4 Supported Scenario Types

MVP:

```txt
EXPENSE
LENDING
ADD_SAVINGS
TRANSFER
```

Future:

```txt
PAY_DEBT
RECEIVE_DEBT_PAYMENT
PAY_EARLY_FIXED_COST
WISHLIST_PURCHASE
RECURRING_FIXED_COST
```

## 9.5 User Stories

### Story 1 — Simulate Expense

Sebagai user, saya ingin mensimulasikan expense agar tahu efeknya terhadap cash dan budget.

Acceptance Criteria:
- User dapat memilih scenario `Expense`.
- User dapat input amount.
- User dapat memilih wallet.
- User dapat memilih category.
- User dapat memilih budgetMonth.
- Sistem menampilkan before/after.
- Sistem menampilkan budget risk.

### Story 2 — Simulate Lending

Sebagai user, saya ingin mensimulasikan meminjamkan uang agar tahu apakah safe to lend cukup.

Acceptance Criteria:
- User dapat memilih scenario `Lending`.
- User dapat input amount.
- User dapat memilih wallet.
- Sistem menghitung safe to lend.
- Sistem menampilkan shortage jika ada.
- Sistem menjelaskan bahwa lending bukan expense.
- Sistem tidak membuat debt.

### Story 3 — Simulate Add Savings

Sebagai user, saya ingin mensimulasikan menambah savings agar tahu sisa available spending.

Acceptance Criteria:
- User dapat memilih scenario `Add Savings`.
- User dapat input amount.
- Sistem menampilkan savings balance after.
- Sistem menampilkan available to spend after.
- Sistem menjelaskan bahwa savings bukan expense.
- Sistem tidak membuat saving ledger.

### Story 4 — Simulate Transfer

Sebagai user, saya ingin mensimulasikan transfer wallet agar tahu efek saldo antar wallet.

Acceptance Criteria:
- User dapat memilih scenario `Transfer`.
- User dapat memilih source wallet.
- User dapat memilih destination wallet.
- User dapat input amount.
- User dapat input admin fee optional.
- Sistem menampilkan source wallet after.
- Sistem menampilkan destination wallet after.
- Jika ada fee, sistem menampilkan expense fee.
- Sistem tidak membuat transfer transaction.

### Story 5 — Convert Simulation to Action

Sebagai user, saya ingin membuat transaksi dari hasil simulasi jika saya setuju.

Acceptance Criteria:
- Setelah simulation result, user melihat CTA:
  - Create Transaction
  - Create Debt
  - Create Savings Entry
  - Cancel
- Action tetap membuka form confirmation.
- Tidak ada silent save.

## 9.6 Recommended Flow

```txt
User buka Planning → What If Simulator
        ↓
Pilih scenario type
        ↓
Input amount, wallet, category, budgetMonth jika perlu
        ↓
Klik Simulate
        ↓
Backend hitung before/after
        ↓
UI tampilkan result
        ↓
FinBot menjelaskan insight
        ↓
User bisa cancel atau convert to action
```

## 9.7 Simulation Output

Output minimal:

```txt
Scenario Type
Before
After
Impact
Risk
Recommendation
CTA
```

Example expense:

```txt
Simulasi beli sepatu Rp700.000

Before:
Dana bebas: Rp1.649.400
Budget Lifestyle remaining: Rp500.000

After:
Dana bebas: Rp949.400
Budget Lifestyle: over Rp200.000

Status:
Cash masih aman, tapi budget Lifestyle akan over.

Suggestion:
Tunda ke bulan depan atau ambil dari unallocated secara sadar.
```

## 9.8 Data Model Recommendation

Simulator tidak wajib menyimpan data.

Namun jika ingin menyimpan history, gunakan optional table:

```prisma
model SimulationHistory {
  id          String   @id @default(uuid())
  userId      String
  scenario    SimulationScenario
  input       Json
  result      Json
  createdAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([scenario])
  @@index([createdAt])
}

enum SimulationScenario {
  EXPENSE
  LENDING
  ADD_SAVINGS
  TRANSFER
}
```

MVP recommendation:

```txt
Do not store simulation history by default.
```

## 9.9 Calculation Requirements

Backend must calculate:

```txt
available cash before
available cash after
wallet balance before
wallet balance after
budget remaining before
budget remaining after
safe to lend before
safe to lend after
savings balance before
savings balance after
risk status
```

AI must only explain the calculated result.

## 9.10 AI / FinBot Integration

FinBot can explain simulation result in human language.

Example:

```txt
Masih aman secara cash, tapi kategori Lifestyle akan over Rp200.000. Kalau ini bukan kebutuhan penting, lebih sehat ditunda ke bulan depan.
```

Rules:
- FinBot must not create data directly.
- FinBot must not invent numbers.
- FinBot must use backend simulation result.
- FinBot can provide suggestion but not force decision.

## 9.11 UI Requirements

Form fields:

```txt
Scenario Type
Amount
Wallet
Category optional
Budget Month optional
Destination Wallet optional
Admin Fee optional
```

Result card:

```txt
Before
After
Risk
FinBot Insight
CTA
```

CTA:
- Create Transaction
- Create Debt
- Create Savings Entry
- Save to Wishlist
- Cancel

## 9.12 MVP Scope

Included:
- Expense simulation.
- Lending simulation.
- Add savings simulation.
- Transfer simulation.
- Before/after result.
- Risk status.
- Convert to action with confirmation.

Not included:
- Natural language scenario parsing.
- Stored simulation history.
- Multi-scenario comparison.
- AI-only calculation.
- Automatic decision making.

---

# 10. Cross-Feature Integration

## 10.1 Wish List + What If Simulator

Every wishlist item should have:

```txt
Simulate Purchase
```

Flow:

```txt
Wish List Item
        ↓
Simulate Purchase
        ↓
What If Simulator
        ↓
Result
        ↓
Mark as Ready / Create Expense / Postpone
```

## 10.2 Recurring Transaction + Budget

Recurring transaction can pre-fill budgetMonth.

For fixed cost:

```txt
Kost Juni
transactionDate: user selected
budgetMonth: Juni
```

If paid early:

```txt
transactionDate: Mei
budgetMonth: Juni
timingStatus: PAID_EARLY
```

## 10.3 Budget Rollover + Monthly Closing

Budget Rollover should be part of monthly closing.

Flow:

```txt
Review month
        ↓
See remaining budget
        ↓
Choose rollover actions
        ↓
Confirm close month
```

## 10.4 What If + Debt

Lending simulation should use Safe to Lend.

If safe:

```txt
Dana bebas cukup.
```

If not safe:

```txt
Pinjaman ini melebihi dana bebas sebesar RpX.
Budget kamu bisa terganggu.
```

## 10.5 What If + Savings

Add Savings simulation should show:

```txt
Savings balance after
Available to spend after
Budget risk if any
```

---

# 11. API Routes

## Budget Rollover

```txt
GET  /api/budget/rollover?month=2026-06
POST /api/budget/rollover/preview
POST /api/budget/rollover/apply
```

## Wish List

```txt
GET    /api/wishlist
GET    /api/wishlist/:id
POST   /api/wishlist
PUT    /api/wishlist/:id
DELETE /api/wishlist/:id
POST   /api/wishlist/:id/simulate
POST   /api/wishlist/:id/convert-to-transaction
```

## Recurring Transaction

```txt
GET    /api/recurring-rules
GET    /api/recurring-rules/:id
POST   /api/recurring-rules
PUT    /api/recurring-rules/:id
DELETE /api/recurring-rules/:id

GET    /api/recurring-instances/upcoming
POST   /api/recurring-instances/:id/create-transaction
POST   /api/recurring-instances/:id/skip
```

## What If Simulator

```txt
POST /api/simulator/expense
POST /api/simulator/lending
POST /api/simulator/add-savings
POST /api/simulator/transfer
```

Alternative unified endpoint:

```txt
POST /api/simulator
```

Payload:

```json
{
  "scenario": "EXPENSE",
  "amount": 700000,
  "walletId": "wallet_bca",
  "categoryId": "cat_lifestyle",
  "budgetMonth": "2026-06"
}
```

---

# 12. Permissions & Security

- All routes must require authenticated Clerk user.
- User can only access their own data.
- Never trust userId from request body.
- UserId must be resolved from session.
- Validate all payload with Zod.
- Amount must be integer Rupiah.
- Amount must be greater than 0.
- Wallet/category must belong to authenticated user.
- No financial mutation without explicit confirmation endpoint.

---

# 13. Money Handling

All money values must use integer Rupiah.

Example:

```txt
Rp500.000 = 500000
Rp1.840.000 = 1840000
```

Do not use floating point for money.

Use formatting only in UI display.

---

# 14. UI / UX Guidelines

General UI principles:

- Desktop-first.
- Simple and clean.
- Avoid too many nested flows.
- Use preview before saving.
- Use friendly language.
- Use warning instead of aggressive blocking.
- Keep technical terms hidden from user when possible.

Recommended labels:

```txt
Budget Rollover → Atur Sisa Budget
Wish List → Rencana Beli
What If Simulator → Cek Aman Gak?
Recurring Transaction → Transaksi Rutin
```

Possible friendly microcopy:

```txt
Mau diapakan sisa budget ini?
Cek dulu sebelum beli.
Fixed cost rutin biar gak kelupaan.
Simulasi ini belum mengubah data apapun.
```

---

# 15. Priority & Roadmap

## Phase 1 — Recurring Reminder

Reason:
- Mendukung fixed cost.
- Membantu user tidak lupa transaksi penting.
- Membantu input transaksi lebih cepat.

Scope:
- Recurring rule.
- Upcoming reminder.
- Create transaction from reminder.
- Skip reminder.

## Phase 2 — What If Simulator

Reason:
- Membantu user sebelum spending.
- Sangat relevan dengan budgeting, savings, dan debt.
- Bisa dikombinasikan dengan FinBot.

Scope:
- Expense simulation.
- Lending simulation.
- Add savings simulation.
- Transfer simulation.

## Phase 3 — Wish List

Reason:
- Berguna setelah simulator ada.
- Membantu mengurangi impulse spending.
- Bisa convert ke transaction.

Scope:
- Create wishlist.
- Simulate purchase.
- Status management.
- Convert to transaction.

## Phase 4 — Budget Rollover

Reason:
- Paling cocok setelah monthly closing siap.
- Membantu evaluasi akhir bulan.

Scope:
- Remaining budget summary.
- Manual rollover action.
- Preview.
- Apply.

---

# 16. Success Metrics

## Budget Rollover

- User melakukan monthly closing minimal 1x per bulan.
- Sisa budget tidak hilang konteks.
- User lebih sering memindahkan sisa budget ke savings/unallocated dengan sadar.

## Wish List

- User mencatat planned purchase sebelum membeli.
- User melakukan simulate sebelum membeli item besar.
- Sebagian wishlist ditunda atau dibatalkan setelah melihat simulasi.

## Recurring Transaction

- Fixed cost lebih jarang lupa dicatat.
- Input transaksi rutin lebih cepat.
- Tidak terjadi duplicate transaction.

## What If Simulator

- User melakukan simulasi sebelum expense besar.
- User memahami impact terhadap budget/cash.
- User lebih jarang overbudget karena keputusan impulsif.

---

# 17. Edge Cases

## Budget Rollover

- Budget category sudah dihapus.
- Bulan berikutnya belum punya budget.
- Sisa budget negatif.
- User sudah pernah rollover kategori yang sama.
- User ingin undo rollover.

## Wish List

- Item sudah purchased tapi transaction dihapus.
- Estimated amount berbeda dari actual transaction.
- Category dihapus.
- User ingin cancel item.
- User ingin duplicate item.

## Recurring Transaction

- User sudah membuat transaksi manual sebelum reminder.
- Due date jatuh pada tanggal yang tidak ada di bulan tertentu.
- Wallet/category dihapus.
- Rule inactive.
- Transaction skipped.
- Amount berubah.

## What If Simulator

- Wallet balance tidak cukup.
- Category tidak punya budget.
- Budget month belum dibuat.
- Savings balance tidak cukup.
- Lending amount melebihi safe to lend.
- Transfer ke wallet yang sama.
- Admin fee lebih besar dari amount.

---

# 18. FinBot Behavior

FinBot boleh membantu menjelaskan fitur planning.

## For Budget Rollover

Example:

```txt
Sisa budget Makan Rp200.000. Kalau kamu rollover, budget Makan bulan depan akan naik. Kalau kamu masukkan savings, dana bebas akan berkurang tapi tabungan bertambah.
```

## For Wish List

Example:

```txt
Item ini masih aman secara cash, tapi akan membuat kategori Lifestyle over Rp200.000. Lebih sehat ditunda ke bulan depan.
```

## For Recurring Transaction

Example:

```txt
Kost Juni belum tercatat. Karena ini fixed cost, sebaiknya diamankan dulu sebelum pengeluaran fleksibel.
```

## For What If

Example:

```txt
Kalau kamu pinjamkan Rp500.000, dana bebas kamu kurang Rp200.000. Ini bisa mengganggu budget bulan ini.
```

Rules:
- FinBot must not invent numbers.
- FinBot must not mutate data.
- FinBot must explain backend result.
- FinBot must ask confirmation before action.

---

# 19. Implementation Notes for Codex

- Start with database schema and enums.
- Use integer Rupiah for all amount fields.
- Keep recurring as reminder only in MVP.
- Do not auto-create transaction without confirmation.
- Simulator must be pure calculation.
- Wishlist conversion must open confirmation form.
- Rollover must be previewed before applied.
- Validate all financial actions server-side.
- Use Clerk auth and resolve user from session.
- Do not trust client-side userId.
- Keep UI labels simple and friendly.
- Prioritize desktop UI.
- Avoid complex nested modals.
- Prefer drawer or dedicated detail page for forms.
- All mutations should return updated summary for dashboard refresh.

---

# 20. Final Expected Outcome

Dengan 4 fitur ini, user diharapkan tidak hanya mencatat uang setelah habis, tetapi mulai mengambil keputusan sebelum uang keluar.

Recurring Transaction membantu user mengingat kewajiban rutin.

What If Simulator membantu user mengecek dampak keputusan.

Wish List membantu user menunda impulse spending.

Budget Rollover membantu user mengelola sisa budget dengan sadar.

Gabungan fitur ini memperkuat Finnnance Trawwwcker sebagai:

```txt
Personal Money Control System
```

bukan sekadar aplikasi pencatat transaksi.
