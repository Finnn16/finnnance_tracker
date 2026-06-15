# PRD — Refactor Budget Coverage & Spendable Balance

## Project
Finnnance Trawwwcker

## Module Scope
Dokumen ini membahas refactor konsep dashboard dan budget status agar user tidak bingung antara:

1. saldo wallet asli,
2. savings yang dikunci,
3. sisa budget/envelope aktif,
4. uang yang benar-benar bebas dipakai,
5. budget plan yang aman atau overplanned,
6. cash coverage gap / funding shortfall.

Tujuan utama refactor ini adalah membuat dashboard lebih sederhana, lebih manusiawi, dan tidak membuat user salah mengira bahwa semua saldo wallet adalah uang bebas.

---

# 1. Background

Pada versi sebelumnya, dashboard menampilkan banyak metrik seperti:

```txt
Total Saldo
Savings
Budgetable Income
Budget Used
Budget Status
Available to Budget
Funding Shortfall
Net Cashflow
Income
Expense
```

Secara data, metrik tersebut berguna. Namun untuk user personal, terlalu banyak istilah mirip membuat dashboard terasa berat dan membingungkan.

Masalah utama yang muncul:

```txt
User melihat Total Saldo besar,
padahal sebagian saldo sudah dikunci sebagai savings
dan sebagian lain sebenarnya dibutuhkan untuk sisa budget aktif.
```

Akibatnya user bisa merasa uang masih banyak, padahal sebenarnya tidak semua saldo boleh dianggap bebas dipakai.

Selain itu, konsep `Funding Shortfall` juga membuat user bingung.

Rumus saat ini:

```txt
Funding Shortfall =
(saldo savings + sisa budget/envelope aktif)
- total saldo semua wallet
```

Dengan rumus ini, ketika user melakukan pengeluaran unbudgeted, total saldo wallet turun. Namun saldo savings dan sisa budget aktif masih dianggap harus dilindungi. Maka muncul funding shortfall.

Secara logic benar, tetapi secara UX membingungkan jika ditampilkan sebagai:

```txt
Budget Status: Underfunded
```

Karena user bisa mengira budget plan-nya salah, padahal masalahnya adalah saldo wallet saat ini tidak lagi cukup menutup dana yang sudah dikunci untuk savings dan budget aktif.

---

# 2. Problem Statement

User membutuhkan jawaban sederhana:

```txt
Uang yang benar-benar bebas dipakai sekarang berapa?
Budget bulan ini aman atau tidak?
Savings yang dikunci berapa?
Sisa budget aktif masih tertutup saldo wallet atau tidak?
```

Namun dashboard sebelumnya terlalu banyak menampilkan istilah teknis.

Masalah UX utama:

- `Total Saldo` membuat user merasa uang masih banyak.
- `Savings` ditampilkan terpisah, tetapi tidak mengurangi persepsi saldo.
- `Available to Budget` ambigu antara dana budget dan saldo real.
- `Funding Shortfall` benar secara logic, tapi membingungkan secara bahasa.
- `Budget Status: Underfunded` misleading jika budget plan sebenarnya masih aman.
- User tidak langsung paham bahwa pengeluaran unbudgeted dapat membuat dana budget/savings menjadi tidak fully covered.

---

# 3. Product Goals

## Main Goals

- Menjadikan angka utama dashboard sebagai uang yang benar-benar aman dipakai.
- Memisahkan status budget planning dan cash coverage.
- Mengurangi istilah teknis di dashboard utama.
- Membuat user paham bahwa savings dan sisa budget aktif adalah dana yang harus dilindungi.
- Menjelaskan funding shortfall dengan bahasa yang lebih manusiawi.
- Menghindari user salah menganggap semua saldo wallet sebagai uang bebas.
- Membuat dashboard lebih ringan dan mudah dipahami.

## Non-Goals

- Tidak menghapus data total saldo wallet.
- Tidak mengubah prinsip savings sebagai reserved money.
- Tidak membuat budget menjadi terlalu kaku.
- Tidak mengubah transaksi unbudgeted menjadi budgeted otomatis.
- Tidak menjadikan funding shortfall sebagai budget overplanned.
- Tidak memaksa user selalu mengikuti warning.

---

# 4. Core Concept

Refactor ini memisahkan 3 konsep besar:

```txt
1. Wallet Reality
   Uang real yang benar-benar ada di semua wallet.

2. Protected Money
   Uang yang sudah dikunci untuk savings dan sisa budget aktif.

3. Free Money
   Uang yang benar-benar bebas dipakai setelah protected money diamankan.
```

---

# 5. Key Definitions

## 5.1 Total Wallet Balance

Total saldo asli semua wallet.

Formula:

```txt
Total Wallet Balance = SUM(wallet.currentBalance)
```

Contoh:

```txt
BCA: Rp800.000
Cash: Rp200.000
GoPay: Rp103.882

Total Wallet Balance = Rp1.103.882
```

Total Wallet Balance tetap penting, tetapi tidak boleh menjadi angka utama yang membuat user merasa semua saldo bebas dipakai.

---

## 5.2 Reserved Savings

Saldo savings yang dikunci.

Formula:

```txt
Reserved Savings = Savings Balance
```

Contoh:

```txt
Reserved Savings = Rp500.000
```

Savings bukan expense, tetapi juga bukan uang bebas.

---

## 5.3 Remaining Active Budget

Sisa budget/envelope aktif yang masih harus dilindungi.

Formula:

```txt
Remaining Active Budget =
SUM(budgetAmount - spentAmount)
untuk budget/envelope aktif
```

Contoh:

```txt
Budget Makan remaining: Rp400.000
Budget Transport remaining: Rp200.000
Budget Kopi remaining: Rp29.100

Remaining Active Budget = Rp629.100
```

Sisa budget aktif adalah dana yang sudah “dijanjikan” untuk kebutuhan tertentu, sehingga tidak boleh dianggap uang bebas.

---

## 5.4 Protected Money

Protected Money adalah total dana internal yang harus dilindungi oleh saldo wallet.

Formula:

```txt
Protected Money = Reserved Savings + Remaining Active Budget
```

Contoh:

```txt
Reserved Savings: Rp500.000
Remaining Active Budget: Rp629.100

Protected Money = Rp1.129.100
```

---

## 5.5 Free Cash / Uang Bebas

Uang Bebas adalah uang yang benar-benar aman dipakai setelah savings dan sisa budget aktif dilindungi.

Formula:

```txt
Free Cash = Total Wallet Balance - Reserved Savings - Remaining Active Budget
```

Jika hasil negatif, tampilkan sebagai Rp0 di UI utama.

Formula UI:

```txt
Display Free Cash = max(0, Free Cash)
```

Contoh:

```txt
Total Wallet Balance: Rp1.103.882
Reserved Savings: Rp500.000
Remaining Active Budget: Rp629.100

Free Cash = Rp1.103.882 - Rp500.000 - Rp629.100
Free Cash = -Rp25.218
```

UI utama:

```txt
Uang Bebas: Rp0
```

Lalu tampilkan coverage gap:

```txt
Ada Rp25.218 dana budget/savings yang belum tertutup.
```

---

## 5.6 Cash Coverage Gap

Cash Coverage Gap adalah selisih ketika saldo wallet tidak cukup menutup protected money.

Formula:

```txt
Cash Coverage Gap = max(0, Protected Money - Total Wallet Balance)
```

Atau:

```txt
Cash Coverage Gap =
max(0, (Reserved Savings + Remaining Active Budget) - Total Wallet Balance)
```

Contoh:

```txt
Protected Money: Rp1.129.100
Total Wallet Balance: Rp1.103.882

Cash Coverage Gap = Rp25.218
```

Cash Coverage Gap adalah istilah internal yang menggantikan konsep Funding Shortfall.

Untuk UI user, gunakan bahasa:

```txt
Dana budget/savings yang kepakai
```

atau:

```txt
Dana terkunci belum tertutup
```

---

## 5.7 Budget Plan Status

Budget Plan Status menjawab:

```txt
Apakah budget yang dibuat melebihi dana budget yang disiapkan?
```

Formula:

```txt
Budget Plan Gap = max(0, Budget Set - Ready to Budget)
```

Jika:

```txt
Budget Set <= Ready to Budget
```

Maka:

```txt
Budget Plan Status = SAFE
```

Jika:

```txt
Budget Set > Ready to Budget
```

Maka:

```txt
Budget Plan Status = OVERPLANNED
```

Catatan penting:

```txt
Budget Plan Status tidak boleh memakai total saldo wallet.
Budget Plan Status hanya membandingkan budget plan dengan dana budget.
```

---

## 5.8 Cash Coverage Status

Cash Coverage Status menjawab:

```txt
Apakah saldo wallet saat ini cukup menutup savings + sisa budget aktif?
```

Formula:

```txt
Cash Coverage Status =
if Cash Coverage Gap = 0 → COVERED
if Cash Coverage Gap > 0 → GAP
```

Catatan:

```txt
Cash Coverage Status berbeda dari Budget Plan Status.
```

User bisa saja memiliki:

```txt
Budget Plan: Aman
Cash Coverage: Ada gap
```

Artinya rencana budget tidak bermasalah, tetapi saldo wallet real sudah tergerus oleh pengeluaran lain seperti unbudgeted spending.

---

# 6. Example Scenario

## 6.1 Kondisi Awal

```txt
Total Wallet Balance: Rp1.000.000
Reserved Savings: Rp300.000
Remaining Active Budget: Rp700.000
```

Protected Money:

```txt
Rp300.000 + Rp700.000 = Rp1.000.000
```

Cash Coverage Gap:

```txt
Rp1.000.000 - Rp1.000.000 = Rp0
```

Status:

```txt
Cash Coverage: Covered
Uang Bebas: Rp0
```

---

## 6.2 User Melakukan Unbudgeted Expense

User mencatat:

```txt
Unbudgeted Expense Rp100.000
```

Saldo wallet turun:

```txt
Total Wallet Balance: Rp900.000
Reserved Savings: Rp300.000
Remaining Active Budget: Rp700.000
```

Protected Money masih:

```txt
Rp1.000.000
```

Cash Coverage Gap:

```txt
Rp1.000.000 - Rp900.000 = Rp100.000
```

Status:

```txt
Cash Coverage: Gap Rp100.000
Uang Bebas: Rp0
```

Penjelasan untuk user:

```txt
Ada Rp100.000 dana budget/savings yang sudah terpakai oleh pengeluaran di luar budget.
```

Jangan tampilkan sebagai:

```txt
Budget Underfunded
```

Karena budget plan belum tentu salah.

---

# 7. UX Direction

## 7.1 Dashboard Must Answer Simple Questions

Dashboard utama harus menjawab:

```txt
Uang bebas saya sekarang berapa?
Budget plan bulan ini aman atau tidak?
Savings terkunci berapa?
Ada dana budget/savings yang bolong atau tidak?
```

Dashboard tidak perlu menampilkan semua istilah teknis sekaligus.

---

## 7.2 Main Hero Card

Hero card utama harus menampilkan:

```txt
Uang Bebas
Rp0
```

Jika ada gap:

```txt
Ada Rp25.218 dana budget/savings yang belum tertutup.
```

Jika aman:

```txt
Semua savings dan sisa budget masih tertutup saldo wallet.
```

Detail kecil:

```txt
Total wallet Rp1.103.882
Savings Rp500.000
Sisa budget aktif Rp629.100
```

---

## 7.3 Recommended Dashboard Cards

Dashboard utama cukup menampilkan 4 sampai 5 kartu utama:

```txt
1. Uang Bebas
2. Budget Bulan Ini
3. Savings Terkunci
4. Pengeluaran Bulan Ini
5. Cash Coverage
```

`Total Wallet Balance` boleh tampil sebagai detail kecil atau di wallet page, bukan sebagai angka utama.

---

## 7.4 Budget Status Section

Ganti satu status besar:

```txt
Budget Status: Underfunded
```

Menjadi dua status:

```txt
Budget Plan
Aman / Overplanned

Cash Coverage
Covered / Ada Gap
```

Contoh tampilan:

```txt
Budget Plan
Aman — budget masih di bawah dana budget.

Cash Coverage
Perlu perhatian — Rp25.218 dana budget/savings belum tertutup saldo wallet.
```

---

# 8. Naming Recommendation

## 8.1 Internal Naming

Gunakan naming internal:

```txt
totalWalletBalance
reservedSavings
remainingActiveBudget
protectedMoney
freeCash
cashCoverageGap
budgetPlanStatus
cashCoverageStatus
```

---

## 8.2 UI Label Recommendation

| Internal Name | UI Label |
|---|---|
| totalWalletBalance | Total Saldo Wallet |
| reservedSavings | Savings Terkunci |
| remainingActiveBudget | Sisa Budget Aktif |
| protectedMoney | Dana yang Dilindungi |
| freeCash | Uang Bebas |
| cashCoverageGap | Dana Budget/Savings yang Kepakai |
| budgetPlanStatus | Rencana Budget |
| cashCoverageStatus | Perlindungan Dana |

Catatan:

```txt
Hindari istilah Funding Shortfall di UI utama.
```

---

# 9. Formula Summary

## 9.1 Total Wallet Balance

```txt
totalWalletBalance = SUM(wallet.currentBalance)
```

## 9.2 Reserved Savings

```txt
reservedSavings = savingsBalance
```

## 9.3 Remaining Active Budget

```txt
remainingActiveBudget =
SUM(max(0, budgetAmount - spentAmount))
```

## 9.4 Protected Money

```txt
protectedMoney = reservedSavings + remainingActiveBudget
```

## 9.5 Free Cash

```txt
freeCash = totalWalletBalance - protectedMoney
```

UI:

```txt
displayFreeCash = max(0, freeCash)
```

## 9.6 Cash Coverage Gap

```txt
cashCoverageGap = max(0, protectedMoney - totalWalletBalance)
```

## 9.7 Budget Plan Gap

```txt
budgetPlanGap = max(0, budgetSet - readyToBudget)
```

## 9.8 Budget Plan Status

```txt
if budgetPlanGap == 0:
  budgetPlanStatus = SAFE
else:
  budgetPlanStatus = OVERPLANNED
```

## 9.9 Cash Coverage Status

```txt
if cashCoverageGap == 0:
  cashCoverageStatus = COVERED
else:
  cashCoverageStatus = GAP
```

---

# 10. Status Rules

## 10.1 Budget Plan Status

### SAFE

Condition:

```txt
budgetSet <= readyToBudget
```

Meaning:

```txt
Budget yang dibuat masih sesuai dana budget.
```

### OVERPLANNED

Condition:

```txt
budgetSet > readyToBudget
```

Meaning:

```txt
Budget yang dibuat lebih besar dari dana budget.
```

---

## 10.2 Cash Coverage Status

### COVERED

Condition:

```txt
totalWalletBalance >= protectedMoney
```

Meaning:

```txt
Saldo wallet masih cukup untuk menutup savings dan sisa budget aktif.
```

### GAP

Condition:

```txt
totalWalletBalance < protectedMoney
```

Meaning:

```txt
Sebagian dana budget/savings sudah tidak tertutup saldo wallet.
```

Possible causes:
- Pengeluaran unbudgeted.
- Wallet balance belum diperbarui.
- Savings terlalu besar dibanding saldo.
- Budget aktif terlalu besar dibanding cash saat ini.
- Ada expense yang tidak mengurangi budget/envelope aktif.

---

# 11. Copywriting / Microcopy

## 11.1 If Cash Coverage Covered

```txt
Semua savings dan sisa budget aktif masih tertutup saldo wallet.
```

## 11.2 If Cash Coverage Gap

```txt
Ada Rp25.218 dana budget/savings yang belum tertutup saldo wallet.
```

Alternative:

```txt
Sebagian dana budget/savings sudah terpakai oleh pengeluaran lain.
```

## 11.3 If Cause is Unbudgeted Spending

```txt
Kemungkinan karena ada pengeluaran di luar budget.
```

More specific if data available:

```txt
Pengeluaran unbudgeted bulan ini Rp100.000 membuat dana budget/savings tidak fully covered.
```

## 11.4 If Budget Plan Safe

```txt
Rencana budget aman. Budget yang dibuat masih di bawah dana budget bulan ini.
```

## 11.5 If Budget Plan Overplanned

```txt
Budget yang dibuat melebihi dana budget sebesar RpX.
```

## 11.6 If Free Cash is Zero

```txt
Uang bebas kamu Rp0 karena saldo wallet sudah tertutup oleh savings dan sisa budget aktif.
```

---

# 12. UI Layout Recommendation

## 12.1 Dashboard Hero

```txt
Uang Bebas
Rp0

Total wallet Rp1.103.882
Savings Rp500.000
Sisa budget aktif Rp629.100

Perlu perhatian:
Ada Rp25.218 dana budget/savings yang belum tertutup.
```

If safe:

```txt
Uang Bebas
Rp150.000

Semua savings dan sisa budget masih aman tertutup saldo wallet.
```

---

## 12.2 Summary Cards

Recommended cards:

```txt
Savings Terkunci
Rp500.000

Budget Terpakai
83%

Rencana Budget
Aman

Cash Coverage
Ada gap Rp25.218
```

Optional cards:

```txt
Pengeluaran Bulan Ini
Net Cashflow
Total Saldo Wallet
Dana Budget Bulan Ini
```

But optional cards should not overload the main dashboard.

---

## 12.3 Budget Detail Section

```txt
Rencana Budget
Dana Budget Bulan Ini: Rp4.489.382
Budget Dibuat: Rp4.162.000
Sisa Dana Budget: Rp327.382
Status: Aman
```

---

## 12.4 Cash Coverage Section

```txt
Perlindungan Dana
Total Saldo Wallet: Rp1.103.882
Savings Terkunci: Rp500.000
Sisa Budget Aktif: Rp629.100
Dana yang Dilindungi: Rp1.129.100
Gap: Rp25.218
```

Use collapsible section or tooltip so dashboard remains simple.

---

# 13. Technical Requirements

## 13.1 Backend Summary Endpoint

Create or refactor endpoint:

```txt
GET /api/dashboard/summary
```

Response should include:

```json
{
  "wallet": {
    "totalWalletBalance": 1103882
  },
  "savings": {
    "reservedSavings": 500000
  },
  "budget": {
    "readyToBudget": 4489382,
    "budgetSet": 4162000,
    "budgetSpent": 0,
    "remainingActiveBudget": 629100,
    "budgetPlanGap": 0,
    "budgetPlanStatus": "SAFE"
  },
  "coverage": {
    "protectedMoney": 1129100,
    "freeCash": -25218,
    "displayFreeCash": 0,
    "cashCoverageGap": 25218,
    "cashCoverageStatus": "GAP"
  }
}
```

---

## 13.2 Calculation Source of Truth

Backend must calculate:
- total wallet balance
- reserved savings
- remaining active budget
- protected money
- free cash
- cash coverage gap
- budget plan gap
- budget plan status
- cash coverage status

Frontend must not reimplement core financial formulas except for formatting.

---

## 13.3 Money Handling

All amounts must use integer Rupiah.

Example:

```txt
Rp500.000 = 500000
Rp1.103.882 = 1103882
```

Do not use floating point for money.

---

# 14. Impact on Existing Features

## 14.1 Transactions

Unbudgeted expense should reduce wallet balance.

If unbudgeted expense does not reduce any budget envelope, it may increase cash coverage gap.

This is expected behavior.

---

## 14.2 Budgeting

Budgeting should continue to track:
- ready to budget
- budget set
- budget spent
- remaining budget
- overplanned

But budget plan status must be separate from cash coverage status.

---

## 14.3 Savings

Savings remains reserved money.

Savings should reduce free cash.

Savings must be included in protected money.

---

## 14.4 Debt

Debt lending reduces wallet balance but does not reduce expense.

If lending uses money beyond free cash, it can create or increase cash coverage gap.

Debt payments increase wallet balance and may reduce cash coverage gap.

---

## 14.5 What If Simulator

Simulator should include:
- free cash before/after
- cash coverage gap before/after
- effect on budget plan
- effect on savings

Example:

```txt
Kalau kamu beli Rp100.000 unbudgeted,
cash coverage gap akan naik dari Rp0 menjadi Rp100.000.
```

---

## 14.6 FinBot

FinBot must explain the difference between:
- Budget Plan
- Cash Coverage
- Uang Bebas
- Total Saldo Wallet

Example:

```txt
Budget plan kamu aman, tapi cash coverage ada gap Rp25.218. Artinya rencana budget tidak salah, tapi sebagian dana budget/savings sudah kepakai oleh pengeluaran lain.
```

---

# 15. Edge Cases

## 15.1 Free Cash Negative

If:

```txt
freeCash < 0
```

UI must show:

```txt
Uang Bebas: Rp0
```

and show gap:

```txt
Dana budget/savings yang belum tertutup: RpX
```

Do not show negative free cash as spendable money.

---

## 15.2 No Active Budget

If no active budget exists:

```txt
remainingActiveBudget = 0
protectedMoney = reservedSavings
freeCash = totalWalletBalance - reservedSavings
```

---

## 15.3 No Savings

If no savings exists:

```txt
reservedSavings = 0
protectedMoney = remainingActiveBudget
```

---

## 15.4 Wallet Balance Lower Than Savings

If:

```txt
totalWalletBalance < reservedSavings
```

Then:

```txt
cashCoverageGap > 0
```

Explain:

```txt
Saldo wallet tidak cukup menutup savings yang dikunci.
```

---

## 15.5 Budget Overplanned but Cash Coverage Covered

Possible condition:

```txt
budgetSet > readyToBudget
totalWalletBalance >= protectedMoney
```

Meaning:

```txt
Budget plan melebihi dana budget, tapi saldo wallet saat ini masih cukup untuk protected money.
```

Show both statuses separately.

---

## 15.6 Budget Plan Safe but Cash Coverage Gap

Possible condition:

```txt
budgetSet <= readyToBudget
totalWalletBalance < protectedMoney
```

Meaning:

```txt
Budget plan aman, tapi saldo wallet sudah tergerus sehingga savings + sisa budget tidak fully covered.
```

This is the key case this PRD solves.

---

# 16. Acceptance Criteria

## 16.1 Dashboard

- Dashboard shows `Uang Bebas` as primary number.
- Dashboard no longer uses `Total Saldo` as primary spendable number.
- Total Saldo Wallet is still available as detail.
- Savings is clearly shown as locked/reserved.
- Cash Coverage Gap is shown only if greater than 0.
- Budget Plan Status and Cash Coverage Status are separated.

## 16.2 Formula

- Free Cash uses:
  ```txt
  totalWalletBalance - reservedSavings - remainingActiveBudget
  ```
- Cash Coverage Gap uses:
  ```txt
  max(0, protectedMoney - totalWalletBalance)
  ```
- Budget Plan Gap uses:
  ```txt
  max(0, budgetSet - readyToBudget)
  ```

## 16.3 UX

- UI does not show `Funding Shortfall` as primary label.
- UI uses user-friendly copy for coverage gap.
- UI explains that unbudgeted expense can make budget/savings not fully covered.
- UI does not call cash coverage gap as budget overplanned.
- User can understand why free cash is Rp0 even if wallet still has saldo.

## 16.4 FinBot

- FinBot explains cash coverage gap using backend result.
- FinBot does not invent formulas.
- FinBot differentiates budget plan issue and cash coverage issue.

---

# 17. Implementation Notes for Codex

- Refactor dashboard summary calculation first.
- Keep all money values as integer Rupiah.
- Do not remove total wallet balance; only demote it from primary UI.
- Add `coverage` object in summary response.
- Rename UI label from Funding Shortfall to a friendlier term.
- Separate budget plan status from cash coverage status.
- Avoid showing too many cards on dashboard.
- Use collapsible details for formula breakdown.
- Treat unbudgeted expense as a valid reason for cash coverage gap.
- Do not auto-adjust budget when unbudgeted expense happens.
- Make warning explanatory, not accusatory.

---

# 18. Final Expected Outcome

Setelah refactor ini, user tidak lagi melihat saldo wallet sebagai uang bebas.

User akan memahami:

```txt
Saldo wallet adalah uang real.
Savings adalah uang yang dikunci.
Sisa budget aktif adalah uang yang harus dilindungi.
Uang bebas adalah sisa setelah semua itu diamankan.
```

Jika user melakukan unbudgeted spending, sistem tidak lagi membingungkan user dengan status `Budget Underfunded`.

Sebaliknya, sistem menjelaskan:

```txt
Budget plan kamu masih aman,
tapi ada dana budget/savings yang belum tertutup karena saldo wallet sudah berkurang.
```

Dengan begitu, dashboard menjadi lebih sederhana, jujur, dan mudah dipahami.
