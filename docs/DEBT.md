# PRD — Debt & Receivable Module

## Nama Modul
Debt & Receivable — Finnnance Trawwwcker

## Background

Modul Debt & Receivable dibuat untuk mencatat hutang dan piutang secara terpisah dari income dan expense.

Dalam kehidupan sehari-hari, ada beberapa case yang tidak cocok dicatat sebagai pengeluaran biasa, misalnya:

```txt
Adik pinjam uang Rp500.000
Teman bayar balik sebagian Rp200.000
Saya pinjam uang ke Awaaa Rp1.000.000
Saya bayar hutang Rp300.000
```

Jika semua case tersebut dicatat sebagai income atau expense, laporan keuangan akan menjadi misleading.

Contoh:

```txt
Adik pinjam uang Rp500.000
```

Secara cashflow, uang memang keluar dari wallet. Tetapi secara finansial, itu bukan expense karena uang tersebut diharapkan kembali. Maka transaksi tersebut harus dicatat sebagai **Piutang**.

Sebaliknya:

```txt
Saya pinjam uang Rp1.000.000 ke Awaaa
```

Secara cashflow, uang masuk ke wallet. Tetapi itu bukan income karena ada kewajiban untuk membayar kembali. Maka transaksi tersebut harus dicatat sebagai **Hutang**.

---

## Objective

Modul ini bertujuan untuk:

- Memisahkan hutang/piutang dari income dan expense
- Mencatat uang yang dipinjamkan kepada orang lain
- Mencatat uang yang dipinjam dari orang lain
- Mendukung pembayaran dicicil / partial payment
- Menampilkan sisa hutang/piutang sampai lunas
- Menjaga cashflow tetap akurat
- Menjaga laporan expense dan income tidak misleading
- Memberikan warning jika user meminjamkan uang melebihi dana bebas
- Mengintegrasikan debt dengan budgeting, wallet, dan dashboard

---

## Core Concept

Sistem membedakan:

```txt
Hutang  = saya harus bayar ke orang lain
Piutang = orang lain harus bayar ke saya
```

### Debt Type

```txt
RECEIVABLE = Piutang / orang lain hutang ke saya
PAYABLE    = Hutang / saya hutang ke orang lain
```

### Financial Treatment

```txt
Piutang baru:
wallet turun
piutang naik
expense tidak naik

Pembayaran piutang:
wallet naik
piutang turun
income tidak naik

Hutang baru:
wallet naik
hutang naik
income tidak naik

Pembayaran hutang:
wallet turun
hutang turun
expense tidak naik
```

---

## User Story

### 1. Create Receivable / Saya Meminjamkan Uang

Sebagai user, saya ingin mencatat ketika saya meminjamkan uang kepada orang lain agar saya tahu siapa yang harus membayar kembali ke saya.

#### Importance
High

#### Acceptance Criteria
- User dapat memilih tipe `Saya meminjamkan uang`
- User dapat input nama orang
- User dapat input amount
- User dapat memilih wallet sumber dana
- User dapat input tanggal
- User dapat input due date optional
- User dapat input note
- Sistem mencatat wallet berkurang
- Sistem mencatat piutang aktif
- Sistem tidak menambah expense
- Sistem menampilkan sisa piutang

#### Example

```txt
Adik pinjam uang Rp500.000 dari Finnn
```

System effect:

```txt
Wallet BCA turun Rp500.000
Piutang aktif naik Rp500.000
Expense tidak bertambah
```

---

### 2. Create Payable / Saya Meminjam Uang

Sebagai user, saya ingin mencatat ketika saya meminjam uang dari orang lain agar saya tahu kewajiban yang harus saya bayar.

#### Importance
High

#### Acceptance Criteria
- User dapat memilih tipe `Saya meminjam uang`
- User dapat input nama pemberi pinjaman
- User dapat input amount
- User dapat memilih wallet penerima dana
- User dapat input tanggal
- User dapat input due date optional
- User dapat input note
- Sistem mencatat wallet bertambah
- Sistem mencatat hutang aktif
- Sistem tidak menambah income
- Sistem menampilkan sisa hutang

#### Example

```txt
Finnn pinjam uang Rp1.000.000 dari Awaaa
```

System effect:

```txt
Wallet BCA naik Rp1.000.000
Hutang aktif naik Rp1.000.000
Income tidak bertambah
```

---

### 3. Partial Payment / Pembayaran Dicicil

Sebagai user, saya ingin mencatat pembayaran hutang/piutang secara bertahap agar histori pembayaran tetap jelas sampai lunas.

#### Importance
Very High

#### Acceptance Criteria
- User dapat membuka detail hutang/piutang
- User dapat klik `Record Payment`
- User dapat input nominal pembayaran
- User dapat memilih wallet pembayaran / wallet penerima
- User dapat input tanggal pembayaran
- User dapat input note pembayaran
- Sistem menyimpan payment history
- Sistem menghitung total paid amount
- Sistem menghitung remaining amount
- Sistem update status:
  - `UNPAID`
  - `PARTIAL`
  - `PAID`
- Sistem mencegah pembayaran melebihi sisa hutang/piutang secara default

#### Example

```txt
Adik pinjam Rp500.000
Adik bayar dulu Rp200.000
```

System result:

```txt
Total Piutang : Rp500.000
Paid          : Rp200.000
Remaining     : Rp300.000
Status        : PARTIAL
```

---

### 4. Payment History

Sebagai user, saya ingin melihat histori pembayaran hutang/piutang agar catatannya transparan.

#### Importance
High

#### Acceptance Criteria
- Setiap hutang/piutang memiliki payment history
- Payment history menampilkan:
  - tanggal
  - nominal
  - wallet
  - note
- Payment history tidak boleh mengubah nominal hutang utama
- Sistem menghitung paid amount dari payment history
- User dapat melihat kapan hutang/piutang lunas

---

### 5. Safe to Lend Check

Sebagai user, saya ingin sistem memberi warning jika saya meminjamkan uang melebihi dana bebas agar budgeting saya tidak terganggu.

#### Importance
High

#### Acceptance Criteria
- Saat user membuat piutang, sistem menghitung `Safe to Lend`
- Jika amount pinjaman <= Safe to Lend, status aman
- Jika amount pinjaman > Safe to Lend, sistem menampilkan warning
- User tetap bisa melanjutkan dalam soft warning mode
- Jika strict mode aktif, sistem memblokir pinjaman yang melebihi Safe to Lend
- Sistem menjelaskan bahwa pinjaman dapat mengganggu budget

---

### 6. Debt Dashboard

Sebagai user, saya ingin melihat summary hutang dan piutang agar tahu posisi keuangan saya.

#### Importance
High

#### Acceptance Criteria
- Dashboard menampilkan:
  - Total Hutang Aktif
  - Total Piutang Aktif
  - Net Debt Position
  - List hutang/piutang aktif
  - List pembayaran terbaru
- Hutang dan piutang dipisah dari income/expense
- Debt net position dihitung dari:

```txt
Net Debt Position = Total Piutang Aktif - Total Hutang Aktif
```

---

## Flow

### Flow 1 — Saya Meminjamkan Uang

```txt
User pilih: Saya meminjamkan uang
        ↓
Input person
        ↓
Input amount
        ↓
Pilih wallet
        ↓
Sistem cek Safe to Lend
        ↓
Jika aman:
  save
Jika tidak aman:
  tampilkan warning
        ↓
Wallet turun
        ↓
Piutang aktif dibuat
```

---

### Flow 2 — Saya Meminjam Uang

```txt
User pilih: Saya meminjam uang
        ↓
Input person
        ↓
Input amount
        ↓
Pilih wallet penerima
        ↓
Save
        ↓
Wallet naik
        ↓
Hutang aktif dibuat
```

---

### Flow 3 — Pembayaran Piutang

```txt
Buka detail piutang
        ↓
Klik Record Payment
        ↓
Input amount
        ↓
Pilih wallet penerima
        ↓
Save
        ↓
Wallet naik
        ↓
Piutang berkurang
        ↓
Status update
```

---

### Flow 4 — Pembayaran Hutang

```txt
Buka detail hutang
        ↓
Klik Pay Debt
        ↓
Input amount
        ↓
Pilih wallet sumber
        ↓
Save
        ↓
Wallet turun
        ↓
Hutang berkurang
        ↓
Status update
```

---

## Example Scenario

### Scenario 1 — Adik Pinjam Uang dan Bayar Cicil

```txt
1 Juni 2026:
Adik pinjam Rp500.000

10 Juni 2026:
Adik bayar Rp200.000

20 Juni 2026:
Adik bayar Rp300.000
```

Debt record:

```txt
Type: RECEIVABLE
Person: Adik
Amount: Rp500.000
Status awal: UNPAID
```

Payment history:

```txt
10 Juni 2026 — Rp200.000 — BCA — Cicilan pertama
20 Juni 2026 — Rp300.000 — BCA — Pelunasan
```

Final result:

```txt
Total Piutang : Rp500.000
Paid          : Rp500.000
Remaining     : Rp0
Status        : PAID
```

---

### Scenario 2 — Saya Pinjam Uang dari Awaaa

```txt
Finnn pinjam Rp1.000.000 dari Awaaa
```

System effect:

```txt
Wallet naik Rp1.000.000
Hutang aktif Rp1.000.000
Income tidak bertambah
```

Ketika bayar Rp300.000:

```txt
Wallet turun Rp300.000
Hutang remaining Rp700.000
Expense tidak bertambah
Status PARTIAL
```

---

## Safe to Lend Concept

Saat user ingin meminjamkan uang, sistem harus mengecek apakah user punya dana bebas.

### Formula MVP

```txt
Safe to Lend = Total Wallet Balance - Savings Balance - Remaining Budget Needed
```

### Remaining Budget Needed

```txt
Remaining Budget Needed = Total Budgeted - Total Spent for selected budget month
```

### Interpretation

Jika:

```txt
Loan Amount <= Safe to Lend
```

Maka pinjaman aman.

Jika:

```txt
Loan Amount > Safe to Lend
```

Maka tampilkan warning.

---

## Safe to Lend Example

```txt
Total Wallet Balance       : Rp2.000.000
Savings Balance            : Rp500.000
Remaining Budget Needed    : Rp1.200.000

Safe to Lend:
Rp2.000.000 - Rp500.000 - Rp1.200.000 = Rp300.000
```

Jika user meminjamkan Rp500.000:

```txt
Safe to Lend: Rp300.000
Loan Amount : Rp500.000
Shortage    : Rp200.000
```

Warning:

```txt
Dana bebas kamu hanya Rp300.000.
Jika kamu meminjamkan Rp500.000, budget kamu berpotensi terganggu sebesar Rp200.000.
```

---

## Budgeting Treatment

### Debt Principal Tidak Masuk Budget

Pinjaman pokok tidak dihitung sebagai expense/income.

```txt
Piutang baru = bukan expense
Piutang dibayar = bukan income
Hutang baru = bukan income
Hutang dibayar = bukan expense
```

### Debt Tetap Mengubah Cashflow / Wallet

Walaupun tidak masuk income/expense, debt tetap mengubah wallet.

```txt
Piutang baru = wallet keluar
Piutang dibayar = wallet masuk
Hutang baru = wallet masuk
Hutang dibayar = wallet keluar
```

### Split Bill Treatment

Jika split bill digunakan:

```txt
Bagian pribadi = expense
Bagian orang lain = piutang
```

Contoh:

```txt
Finnn bayar makan Rp300.000
Share Finnn Rp150.000
Share Awaaa Rp150.000
```

System effect:

```txt
Wallet Finnn turun Rp300.000
Expense Finnn Rp150.000
Piutang ke Awaaa Rp150.000
```

---

## UI / UX Requirements

### Debt Menu

Menu utama:

```txt
Hutang Piutang
```

Primary button:

```txt
+ New Debt
```

Options:

```txt
1. Saya meminjamkan uang
   Orang lain harus bayar ke saya

2. Saya meminjam uang
   Saya harus bayar ke orang lain

3. Saya bayar dulu untuk orang lain
   Talangan / split bill
```

---

### Create Debt Form

Fields:

```txt
Debt Type
Person Name
Amount
Wallet
Date
Due Date
Note
```

If type = `RECEIVABLE`, show Safe to Lend summary:

```txt
Safe to Lend
Loan Amount
Shortage if any
```

---

### Debt Detail Page

Display:

```txt
Person Name
Type
Original Amount
Paid Amount
Remaining Amount
Status
Date
Due Date
Note
```

Payment History:

```txt
Date
Amount
Wallet
Note
```

Actions:

```txt
Record Payment
Edit
Cancel Debt
```

---

### Payment Modal

Fields:

```txt
Amount
Wallet
Date
Note
```

Validation:
- amount must be greater than 0
- amount must not exceed remaining amount
- wallet is required
- date is required

Preview:

```txt
Payment amount: Rp200.000
Remaining after payment: Rp300.000
```

---

## Recommended Database Design

### Debt

```prisma
model Debt {
  id          String     @id @default(uuid())
  userId      String
  personName  String
  type        DebtType
  amount      Decimal
  note        String?
  date        DateTime
  dueDate     DateTime?
  status      DebtStatus @default(UNPAID)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  user        User          @relation(fields: [userId], references: [id])
  payments    DebtPayment[]

  @@index([userId])
  @@index([type])
  @@index([status])
  @@index([date])
  @@index([dueDate])
}
```

### DebtPayment

```prisma
model DebtPayment {
  id        String   @id @default(uuid())
  debtId    String
  walletId  String?
  amount    Decimal
  note      String?
  date      DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  debt      Debt    @relation(fields: [debtId], references: [id])
  wallet    Wallet? @relation(fields: [walletId], references: [id])

  @@index([debtId])
  @@index([walletId])
  @@index([date])
}
```

### DebtType

```prisma
enum DebtType {
  RECEIVABLE
  PAYABLE
}
```

### DebtStatus

```prisma
enum DebtStatus {
  UNPAID
  PARTIAL
  PAID
  CANCELLED
}
```

---

## Calculation Rules

### Paid Amount

```txt
paidAmount = SUM(DebtPayment.amount WHERE debtId = selectedDebt)
```

### Remaining Amount

```txt
remainingAmount = Debt.amount - paidAmount
```

### Status

```txt
IF paidAmount = 0:
  status = UNPAID

IF paidAmount > 0 AND paidAmount < Debt.amount:
  status = PARTIAL

IF paidAmount >= Debt.amount:
  status = PAID
```

### Payment Over Remaining

```txt
IF paymentAmount > remainingAmount:
  reject payment
```

---

## Wallet Movement Rules

### RECEIVABLE Created

```txt
Wallet decreases by debt amount
```

### RECEIVABLE Payment

```txt
Wallet increases by payment amount
```

### PAYABLE Created

```txt
Wallet increases by debt amount
```

### PAYABLE Payment

```txt
Wallet decreases by payment amount
```

---

## API Routes

```txt
GET    /api/debts
GET    /api/debts/:id
POST   /api/debts
PUT    /api/debts/:id
DELETE /api/debts/:id

POST   /api/debts/:id/payments
GET    /api/debts/:id/payments

GET    /api/debts/summary
GET    /api/debts/safe-to-lend
```

---

## API Behavior

### POST /api/debts

Payload:

```json
{
  "type": "RECEIVABLE",
  "personName": "Adik",
  "amount": 500000,
  "walletId": "wallet_bca",
  "date": "2026-06-01",
  "dueDate": "2026-06-30",
  "note": "Adik pinjam uang"
}
```

Server behavior:
- Validate auth
- Validate amount > 0
- Validate wallet belongs to user
- If type is RECEIVABLE, calculate Safe to Lend
- If Safe to Lend is insufficient, return warning or require confirmation
- Create debt
- Apply wallet movement
- Do not create income/expense transaction

---

### POST /api/debts/:id/payments

Payload:

```json
{
  "amount": 200000,
  "walletId": "wallet_bca",
  "date": "2026-06-10",
  "note": "Cicilan pertama"
}
```

Server behavior:
- Validate auth
- Validate debt belongs to user
- Validate amount > 0
- Validate amount <= remaining amount
- Create payment history
- Apply wallet movement
- Recalculate debt status
- Do not create income/expense transaction

---

## Dashboard Integration

Dashboard should display:

```txt
Total Hutang Aktif
Total Piutang Aktif
Net Debt Position
Debt Payments This Month
Upcoming Due Date
```

Example:

```txt
Piutang Aktif : Rp500.000
Hutang Aktif  : Rp1.000.000
Net Position  : -Rp500.000
```

Interpretation:

```txt
Net positive = more money should come back to user
Net negative = user has more obligation to pay
```

---

## Cashflow Integration

Debt affects wallet cash movement but is not income/expense.

Dashboard can show:

```txt
Income
Expense
Debt Inflow
Debt Outflow
Net Cash Movement
```

### Example

```txt
Income: Rp7.000.000
Expense: Rp3.000.000
Debt Outflow: Rp500.000
Debt Inflow: Rp200.000
```

---

## AI Agent Context

When FinBot discusses debt, provide:

```txt
Total Active Receivable
Total Active Payable
Net Debt Position
Upcoming Due Dates
Recent Debt Payments
Safe to Lend
```

FinBot can:
- summarize debt condition
- remind upcoming due date
- warn if lending money can disturb budget
- explain remaining amount

FinBot must not:
- create debt without confirmation
- record payment without confirmation
- treat debt principal as income/expense
- promise that person will pay back

---

## Edge Cases

### 1. Payment Greater Than Remaining

System should block payment by default.

Message:

```txt
Pembayaran melebihi sisa hutang/piutang.
```

---

### 2. Debt Cancelled

If debt is cancelled:
- status becomes `CANCELLED`
- payment history remains for audit
- wallet reversal should require explicit confirmation

---

### 3. Debt Already Paid

If status is `PAID`, user cannot add more payment unless reopening debt.

---

### 4. Wallet Deleted

Wallet cannot be deleted if used by active debt/payment records.

---

### 5. Person Pays Back in Different Wallet

Allowed.

Example:
- Pinjaman keluar dari BCA
- Pembayaran diterima ke Cash

---

### 6. Partial Payment Multiple Times

Allowed until remaining amount becomes 0.

---

### 7. Debt from Split Bill

Split bill can create receivable automatically.

This should be phase 2 unless split bill module is ready.

---

## MVP Scope

### Included in MVP
- Create receivable
- Create payable
- Record partial payment
- Payment history
- Remaining amount calculation
- Status update
- Safe to Lend warning
- Debt summary dashboard
- Wallet movement
- No income/expense impact

### Not Included in MVP
- Interest
- Penalty
- Attachment proof
- Auto reminder
- Debt netting
- Multi-person debt in one record
- Split bill auto integration
- WhatsApp debt command
- Legal/contract notes

---

## Future Enhancements

- Reminder due date
- Attachment proof of transfer
- Split bill auto-create receivable
- WhatsApp command:
  - `adik pinjam 500k`
  - `adik bayar 200k`
- Debt netting
- Person/contact management
- Recurring debt/payment schedule
- Export debt report
- AI debt insight
- Reopen paid debt
- Soft-delete with audit trail

---

## Implementation Notes for Codex

- Debt principal must not be counted as income or expense
- Debt still affects wallet balance and cash movement
- Use separate `Debt` and `DebtPayment` tables
- Do not overwrite original debt amount
- Use payment history for partial payments
- Calculate paid amount from payment records
- Calculate remaining amount server-side
- Update status after every payment
- Validate payment cannot exceed remaining amount
- For receivable, check Safe to Lend before saving
- Safe to Lend warning should not hard block unless strict mode is active
- Keep UI language simple:
  - Saya meminjamkan uang
  - Saya meminjam uang
  - Record Payment
- Keep debt dashboard separate from income/expense dashboard
