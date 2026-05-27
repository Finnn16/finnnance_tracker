# PRD — Savings Module

## Nama Modul
Savings — Finnnance Trawwwcker

## Background

Modul Savings dibuat untuk membantu user menyisihkan sebagian uang dari income sebagai dana tabungan atau reserved money.

Aplikasi ini tidak terintegrasi langsung dengan m-banking, rekening bank, atau ATM. Karena itu, savings di dalam sistem tidak bisa dianggap sebagai saldo bank yang benar-benar terkunci. Savings harus dipahami sebagai **virtual reserved money** atau **alokasi tabungan secara manual**.

Contoh:

```txt
Income: Rp7.000.000
User alokasikan ke savings: Rp1.000.000
```

Secara sistem:

```txt
Total Wallet Balance     : Rp7.000.000
Savings Reserved         : Rp1.000.000
Available to Spend       : Rp6.000.000
```

Savings bukan expense, karena uang tersebut tidak habis. Savings hanya mengubah status uang dari uang bebas menjadi uang yang disisihkan.

---

## Objective

Modul Savings bertujuan untuk:

- Membantu user menyisihkan uang dari income
- Membuat savings tidak dihitung sebagai expense
- Mengurangi available to spend agar user lebih aware
- Menampilkan total savings yang sudah tercatat
- Memberikan mekanisme jika savings terpakai
- Memberikan fitur adjustment/reconciliation jika saldo actual berbeda dari sistem
- Menjaga laporan income, expense, cashflow, dan savings tetap akurat

---

## Core Concept

Savings menggunakan konsep:

```txt
Savings = Reserved Money
```

Artinya:

```txt
Savings bukan expense
Savings bukan wallet fisik
Savings adalah alokasi virtual dari total saldo
```

### Formula Dasar

```txt
Available to Spend = Total Wallet Balance - Savings Balance
```

### Savings Balance

```txt
Savings Balance = SUM(ADD) - SUM(WITHDRAW) + SUM(ADJUSTMENT)
```

---

## User Story

### 1. Allocate Savings from Income

Sebagai user, saya ingin saat mencatat income bisa langsung menyisihkan sebagian uang ke savings.

#### Importance
High

#### Acceptance Criteria
- Saat user input income, tersedia checkbox `Masukkan ke Savings`
- Jika checkbox aktif, user dapat input nominal savings
- Nominal savings tidak boleh lebih besar dari nominal income
- Income tetap dicatat penuh sebagai income
- Savings dicatat sebagai ledger terpisah
- Savings tidak dihitung sebagai expense
- Available to Spend otomatis berkurang sesuai nominal savings

---

### 2. View Savings Balance

Sebagai user, saya ingin melihat total savings yang sudah saya sisihkan.

#### Importance
High

#### Acceptance Criteria
- Sistem menampilkan current savings balance
- Sistem menampilkan histori savings
- Sistem menampilkan savings masuk dan keluar
- Sistem menampilkan available to spend
- Savings tampil di dashboard dan module savings

---

### 3. Use Savings

Sebagai user, saya ingin bisa mencatat jika uang savings terpakai.

#### Importance
High

#### Acceptance Criteria
- User dapat klik `Use Savings`
- User dapat memilih alasan penggunaan savings:
  - Dipakai untuk pengeluaran
  - Dikembalikan ke available balance
  - Koreksi saldo savings
- Sistem mengurangi savings balance
- Sistem menyimpan histori penggunaan savings
- Sistem menampilkan warning jika penggunaan savings melebihi saldo savings

---

### 4. Use Savings for Expense

Sebagai user, saya ingin jika savings dipakai untuk pengeluaran, sistem tetap mencatat expense dengan benar.

#### Importance
High

#### Acceptance Criteria
- User dapat memilih kategori expense
- User dapat memilih wallet
- Sistem mencatat pengeluaran sesuai kategori
- Sistem mencatat withdrawal dari savings
- User tidak perlu input dua kali
- Expense masuk ke laporan expense
- Savings balance berkurang

#### Example

```txt
Savings Balance: Rp1.000.000

User pakai savings Rp300.000 untuk service motor.
```

System effect:

```txt
Savings Balance: Rp700.000
Expense Service Motor: Rp300.000
```

---

### 5. Return Savings to Available Balance

Sebagai user, saya ingin bisa mengembalikan sebagian savings menjadi uang bebas tanpa dianggap expense.

#### Importance
Medium

#### Acceptance Criteria
- User dapat memilih `Return to Available Balance`
- Savings balance berkurang
- Available to Spend bertambah
- Tidak membuat expense
- Tidak membuat income baru
- Histori tetap tersimpan

#### Example

```txt
Savings Balance: Rp1.000.000
User return Rp300.000 to available balance.
```

System effect:

```txt
Savings Balance: Rp700.000
Available to Spend naik Rp300.000
Expense tidak bertambah
Income tidak bertambah
```

---

### 6. Savings Reconciliation / Adjustment

Sebagai user, saya ingin bisa menyesuaikan saldo savings jika realisasi uang actual berbeda dari catatan sistem.

#### Importance
High

#### Acceptance Criteria
- User dapat klik `Reconcile Savings`
- Sistem menampilkan:
  - savings balance di sistem
  - input actual savings
  - selisih
- User dapat mencatat selisih sebagai adjustment
- Adjustment tersimpan dalam ledger
- Sistem menampilkan histori adjustment
- Adjustment diberi label jelas agar tidak dianggap transaksi normal

#### Example

```txt
Savings di sistem: Rp1.000.000
Actual uang yang tersisa: Rp700.000
Selisih: -Rp300.000
```

System effect:

```txt
SavingLedger:
type = ADJUSTMENT
amount = -Rp300.000
note = Koreksi saldo savings karena uang terpakai
```

Savings balance menjadi:

```txt
Rp700.000
```

---

## Functional Requirements

### 1. Savings from Income
- Checkbox saat input income
- Input amount savings
- Validasi amount savings <= income amount
- Create income transaction
- Create saving ledger with type ADD
- Link saving ledger to income transaction

### 2. Savings Balance
- Calculate current savings balance
- Show total savings
- Show available to spend
- Show savings history

### 3. Use Savings
- Create withdrawal flow
- Support usage type:
  - expense
  - return to available balance
  - adjustment
- Validate amount <= savings balance unless adjustment is intentional
- Save savings ledger

### 4. Savings Expense Flow
- One user input
- System creates:
  - expense transaction
  - savings withdrawal ledger
- Expense affects budget/cashflow
- Savings balance decreases

### 5. Savings Adjustment
- Input actual savings
- Calculate difference
- Create adjustment ledger
- Add note/reason
- Update savings balance

---

## Non-Functional Requirements

- Savings calculation must be server-side
- Money values must use Decimal
- Savings must be auditable
- Savings ledger must not be hard deleted
- UI must be simple and mobile friendly
- Savings should not slow dashboard loading
- User must understand that savings is virtual/reserved money, not bank-locked money

---

## UI / UX Requirements

### Income Form

When transaction type is `INCOME`, show:

```txt
[ ] Masukkan sebagian ke Savings
```

If checked:

```txt
Savings Amount
```

Preview:

```txt
Income tercatat      : Rp7.000.000
Savings bertambah    : Rp1.000.000
Available to Spend   : Rp6.000.000
```

---

### Savings Page

Savings page displays:

```txt
Savings Balance
Available to Spend
Total Added This Month
Total Used This Month
Last Reconciled
```

Main actions:

```txt
Use Savings
Reconcile
View History
```

---

### Use Savings Modal

User chooses:

```txt
Uang savings ini dipakai untuk apa?

1. Dipakai untuk pengeluaran
2. Dikembalikan ke available balance
3. Koreksi saldo savings
```

---

### Use Savings for Expense

Fields:

```txt
Amount
Category
Wallet
Date
Note
Budget Month
```

Preview:

```txt
Savings akan berkurang Rp300.000.
Expense Service Motor akan tercatat Rp300.000.
```

---

### Return to Available Balance

Fields:

```txt
Amount
Wallet
Date
Note
```

Preview:

```txt
Savings akan berkurang Rp300.000.
Available to Spend akan bertambah Rp300.000.
Tidak dihitung sebagai expense.
```

---

### Reconcile Savings

Fields:

```txt
Actual Savings Amount
Reason / Note
Date
```

Preview:

```txt
Savings sistem : Rp1.000.000
Actual savings : Rp700.000
Adjustment     : -Rp300.000
```

---

## Recommended Database Design

### SavingLedger

```prisma
model SavingLedger {
  id                  String           @id @default(uuid())
  userId              String
  type                SavingLedgerType
  amount              Decimal
  note                String?
  date                DateTime
  sourceTransactionId String?
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt

  user User @relation(fields: [userId], references: [id])
  sourceTransaction Transaction? @relation(fields: [sourceTransactionId], references: [id])

  @@index([userId])
  @@index([date])
  @@index([type])
  @@index([sourceTransactionId])
}

enum SavingLedgerType {
  ADD
  WITHDRAW
  ADJUSTMENT
}
```

---

## Calculation Rules

### Savings Balance

```txt
Savings Balance =
SUM(SavingLedger.amount WHERE type = ADD)
- SUM(SavingLedger.amount WHERE type = WITHDRAW)
+ SUM(SavingLedger.amount WHERE type = ADJUSTMENT)
```

Important:

```txt
ADJUSTMENT can be positive or negative.
```

---

### Available to Spend

```txt
Available to Spend = Total Wallet Balance - Savings Balance
```

---

### Income with Savings

Input:

```txt
Income = Rp7.000.000
Savings = Rp1.000.000
```

System creates:

```txt
Transaction:
type = INCOME
amount = Rp7.000.000

SavingLedger:
type = ADD
amount = Rp1.000.000
sourceTransactionId = income transaction id
```

---

### Use Savings for Expense

Input:

```txt
Use Savings Rp300.000 for Service Motor
```

System creates:

```txt
Transaction:
type = EXPENSE
amount = Rp300.000
category = Service Motor

SavingLedger:
type = WITHDRAW
amount = Rp300.000
sourceTransactionId = expense transaction id
```

---

### Return Savings to Available Balance

Input:

```txt
Return savings Rp300.000
```

System creates:

```txt
SavingLedger:
type = WITHDRAW
amount = Rp300.000
note = Return to available balance
```

No expense or income transaction is created.

---

### Reconcile / Adjustment

Input:

```txt
System savings = Rp1.000.000
Actual savings = Rp700.000
```

System calculates:

```txt
Adjustment = Actual - System
Adjustment = Rp700.000 - Rp1.000.000
Adjustment = -Rp300.000
```

System creates:

```txt
SavingLedger:
type = ADJUSTMENT
amount = -Rp300.000
note = Reconciliation adjustment
```

---

## API Routes

```txt
GET    /api/savings
GET    /api/savings/history

POST   /api/savings/from-income
POST   /api/savings/use
POST   /api/savings/reconcile

GET    /api/savings/summary
```

---

## API Behavior

### POST /api/savings/from-income

Creates saving ledger from income transaction.

Payload:

```json
{
  "incomeTransactionId": "transaction_id",
  "amount": 1000000,
  "date": "2026-05-26",
  "note": "Savings from salary"
}
```

Validation:
- user must own transaction
- transaction type must be INCOME
- savings amount must be greater than 0
- savings amount must not exceed income amount

---

### POST /api/savings/use

Payload for expense usage:

```json
{
  "usageType": "EXPENSE",
  "amount": 300000,
  "categoryId": "category_service_motor",
  "walletId": "wallet_bca",
  "date": "2026-06-10",
  "budgetMonth": "2026-06-01",
  "note": "Service motor mendadak"
}
```

Payload for return to available balance:

```json
{
  "usageType": "RETURN_TO_AVAILABLE",
  "amount": 300000,
  "date": "2026-06-10",
  "note": "Return savings to available balance"
}
```

---

### POST /api/savings/reconcile

Payload:

```json
{
  "actualAmount": 700000,
  "date": "2026-06-15",
  "note": "Actual savings berbeda karena uang terpakai"
}
```

Server calculates adjustment automatically.

---

## Dashboard Integration

Dashboard should display:

```txt
Total Balance
Savings Balance
Available to Spend
Savings Added This Month
Savings Used This Month
Savings Leakage / Adjustment This Month
```

Example:

```txt
Total Wallet Balance : Rp7.000.000
Savings              : Rp1.000.000
Available to Spend   : Rp6.000.000
```

If savings is used:

```txt
Savings Used This Month: Rp300.000
```

If adjustment happens:

```txt
Savings Adjustment This Month: -Rp300.000
```

---

## Budgeting Integration

Savings affects budgeting because it reduces available money.

Budget formula should consider savings:

```txt
Available to Budget = Total Wallet Balance - Savings Balance - Reserved Balance - Active Debt Obligation
```

For MVP, if ReservedBalance is not implemented, use:

```txt
Available to Budget = Total Wallet Balance - Savings Balance
```

Savings must not be counted as expense budget.

---

## Edge Cases

### 1. Savings Amount Greater Than Income

If user inputs savings amount greater than income amount:

```txt
Reject save and show alert.
```

Message:

```txt
Nominal savings tidak boleh lebih besar dari income.
```

---

### 2. Use Savings Greater Than Savings Balance

If user tries to withdraw more than savings balance:

```txt
Show warning and block by default.
```

Optional future behavior:
- allow negative savings with explicit confirmation

---

### 3. Income Edited After Savings Created

If income amount is edited lower than linked savings amount:

```txt
Show warning.
Require user to update savings amount.
```

---

### 4. Income Deleted After Savings Created

If income transaction is deleted:

```txt
Ask user whether linked savings ledger should also be reversed.
```

Recommended MVP:
- prevent deleting income if linked savings exists
- user must remove/reverse savings first

---

### 5. Expense Created from Savings Deleted

If expense transaction created from savings is deleted:

```txt
Ask whether savings withdrawal should be reversed.
```

Recommended MVP:
- prevent deletion without confirmation
- create reversal ledger if needed

---

### 6. Actual Bank Balance Different from System

Use Reconcile feature.

Do not silently change savings balance.

---

## MVP Scope

### Included in MVP
- Savings as single virtual reserved account
- Checkbox on income form
- Savings amount input
- SavingLedger ADD from income
- Savings balance summary
- Use Savings
- Reconcile Savings
- Savings does not count as expense
- Available to Spend calculation

### Not Included in MVP
- Multiple saving goals
- Bank integration
- Auto-sync with m-banking
- Locking real bank balance
- Interest calculation
- Goal deadline
- Auto recurring saving rules
- Multi-wallet saving allocation

---

## Future Enhancements

- Multiple savings goals
- Auto saving percentage from income
- Saving target
- Saving deadline
- Monthly saving reminder
- Saving leakage insight
- AI saving recommendation
- Locked savings simulation
- Saving by wallet source
- Export savings history

---

## AI Agent Context

When FinBot discusses savings, provide:

```txt
Savings Balance
Available to Spend
Savings Added This Month
Savings Used This Month
Savings Adjustment This Month
Recent Saving Ledger
Income This Month
Expense This Month
```

FinBot can:
- explain savings condition
- warn if savings used too often
- suggest safer savings amount
- summarize savings progress

FinBot must not:
- create savings transaction without confirmation
- adjust savings without user confirmation
- treat savings as expense
- pretend savings is locked in real bank

---

## Implementation Notes for Codex

- Savings is virtual reserved money, not physical bank integration
- Do not count savings as expense
- Do not reduce income amount when allocating to savings
- Income stays full amount
- Savings reduces Available to Spend
- Use SavingLedger for audit trail
- Never overwrite savings balance directly
- Use server-side calculations
- Use Decimal for money
- Keep UI simple
- Always show clear preview before saving
- If actual money differs from system, use Reconcile / Adjustment
- Do not rely on user discipline as perfect; system must support correction
