# Dashboard Card Library — Finnnance Trawwwcker

Dokumen ini berisi daftar komponen/card data yang bisa ditampilkan di dashboard.

Konsep utama:

- Dashboard tidak harus menampilkan semua card.
- User bisa memilih sendiri card mana yang ingin ditampilkan.
- Setiap card berupa informasi sederhana: title, value, legend, dan optional status badge.
- Formula detail sebaiknya disimpan di tooltip atau detail drawer, bukan langsung di card utama.
- Dashboard utama harus tetap ringan dan tidak membuat user pusing.

---

# 1. Struktur Card

Setiap card idealnya memiliki struktur:

```txt
Title
Value
Legend
Optional Status Badge
```

Contoh:

```txt
Uang Bebas
Rp0
Saldo yang benar-benar aman dipakai
Badge: Perlu Perhatian
```

---

# 2. Grouping Card

Card dikelompokkan ke dalam kategori:

```txt
A. Wallet & Saldo
B. Income & Cashflow Kalender
C. Budget Period
D. Fixed Cost
E. Savings
F. Cash Coverage / Funding Shortfall
G. Unbudgeted Spending
H. Debt / Hutang Piutang
I. Recurring Transaction
J. Wishlist / Planned Purchase
K. What If / Planning
L. Analytics Ringkas
M. AI / FinBot Insight
```

---

# A. Wallet & Saldo

## 1. Saldo Operasional

```txt
Saldo Operasional: Rp603.882
```

Legend:

```txt
Saldo yang tersedia setelah savings dipisahkan dari semua saldo. Savings tidak dihitung sebagai saldo operasional.
```

---

## 2. Uang Bebas

```txt
Uang Bebas: Rp0
```

Legend:

```txt
Uang yang benar-benar aman dipakai setelah savings dipisahkan dan sisa budget aktif dilindungi.
```

Formula:

```txt
Saldo Operasional - Sisa Budget Aktif
```

---

## 3. Savings Terpisah

```txt
Savings Terpisah: Rp500.000
```

Legend:

```txt
Total savings yang terkunci dan tidak dihitung sebagai saldo.
```

Formula:

```txt
Savings ledger ADD - WITHDRAW + ADJUSTMENT
```

---

## 4. Saldo BCA

```txt
Saldo BCA: Rp800.000
```

Legend:

```txt
Saldo aktual wallet BCA.
```

---

## 5. Saldo Cash

```txt
Saldo Cash: Rp200.000
```

Legend:

```txt
Saldo aktual wallet Cash.
```

---

## 6. Saldo GoPay

```txt
Saldo GoPay: Rp103.882
```

Legend:

```txt
Saldo aktual wallet GoPay.
```

---

## 7. Wallet Terbesar

```txt
Wallet Terbesar: BCA — Rp800.000
```

Legend:

```txt
Wallet dengan saldo paling besar saat ini.
```

---

## 8. Wallet Terendah

```txt
Wallet Terendah: GoPay — Rp103.882
```

Legend:

```txt
Wallet dengan saldo paling kecil saat ini.
```

---

# B. Income & Cashflow Kalender

## 9. Income Masuk Bulan Ini

```txt
Income Masuk Mei: Rp4.989.400
```

Legend:

```txt
Total income berdasarkan tanggal uang benar-benar masuk di bulan kalender tersebut.
```

---

## 10. Expense Keluar Bulan Ini

```txt
Expense Keluar Mei: Rp3.340.000
```

Legend:

```txt
Total expense berdasarkan tanggal uang benar-benar keluar di bulan kalender tersebut.
```

---

## 11. Net Cashflow Bulan Ini

```txt
Net Cashflow Mei: Rp1.649.400
```

Legend:

```txt
Selisih income dan expense berdasarkan tanggal transaksi kalender.
```

Formula:

```txt
Income Masuk Bulan Ini - Expense Keluar Bulan Ini
```

---

## 12. Cashflow Kalender Status

```txt
Cashflow Kalender: Surplus Rp1.649.400
```

Legend:

```txt
Menunjukkan apakah bulan kalender ini surplus atau minus secara arus kas.
```

---

## 13. Income Terakhir

```txt
Income Terakhir: Gaji — Rp4.989.400
```

Legend:

```txt
Income terbaru yang tercatat.
```

---

## 14. Expense Terakhir

```txt
Expense Terakhir: Kost — Rp1.840.000
```

Legend:

```txt
Expense terbaru yang tercatat.
```

---

# C. Budget Period

## 15. Dana Budget Bulan Ini

```txt
Dana Budget Juni: Rp4.989.400
```

Legend:

```txt
Dana yang disiapkan untuk membiayai budget bulan tersebut, walaupun income-nya bisa masuk di bulan sebelumnya.
```

---

## 16. Budget Bulan Ini

```txt
Budget Juni: Rp4.162.000
```

Legend:

```txt
Total budget yang dibuat untuk bulan tersebut.
```

---

## 17. Budget Terpakai

```txt
Budget Terpakai Juni: Rp3.000.000
```

Legend:

```txt
Total expense yang dibebankan ke budget bulan tersebut berdasarkan budgetMonth.
```

---

## 18. Sisa Budget

```txt
Sisa Budget Juni: Rp1.162.000
```

Legend:

```txt
Sisa budget yang belum terpakai.
```

Formula:

```txt
Budget Bulan Ini - Budget Terpakai
```

---

## 19. Sisa Dana Budget

```txt
Sisa Dana Budget Juni: Rp327.400
```

Legend:

```txt
Dana budget yang belum dialokasikan ke kategori manapun.
```

Formula:

```txt
Dana Budget Bulan Ini - Budget Bulan Ini
```

---

## 20. Budget Usage

```txt
Budget Usage Juni: 72%
```

Legend:

```txt
Persentase budget yang sudah digunakan.
```

Formula:

```txt
Budget Terpakai / Budget Bulan Ini × 100
```

---

## 21. Budget Plan Status

```txt
Rencana Budget: Aman
```

Legend:

```txt
Status apakah total budget melebihi dana budget yang tersedia.
```

Status:

```txt
Aman
Overplanned
```

---

## 22. Overplanned Amount

```txt
Overplanned: Rp0
```

Legend:

```txt
Jumlah budget yang melebihi dana budget.
```

Formula:

```txt
max(0, Budget Bulan Ini - Dana Budget Bulan Ini)
```

---

## 23. Kategori Budget Terbesar

```txt
Budget Terbesar: Kost — Rp1.840.000
```

Legend:

```txt
Kategori dengan alokasi budget terbesar di bulan tersebut.
```

---

## 24. Kategori Budget Paling Boros

```txt
Paling Boros: Kopi — 92%
```

Legend:

```txt
Kategori dengan persentase pemakaian budget tertinggi.
```

---

## 25. Kategori Hampir Habis

```txt
Kategori Hampir Habis: Kopi, Lifestyle
```

Legend:

```txt
Daftar kategori yang sudah melewati batas warning, misalnya 80% dari budget.
```

---

## 26. Kategori Overbudget

```txt
Kategori Overbudget: Lifestyle
```

Legend:

```txt
Kategori yang pengeluarannya sudah melebihi budget.
```

---

# D. Fixed Cost

## 27. Fixed Cost Bulan Ini

```txt
Fixed Cost Juni: Rp3.340.000
```

Legend:

```txt
Total budget fixed cost seperti kost, cicilan, transfer rutin, internet, dan subscription.
```

---

## 28. Fixed Cost Terbayar

```txt
Fixed Cost Terbayar: Rp3.340.000
```

Legend:

```txt
Total fixed cost yang sudah dibayar.
```

---

## 29. Fixed Cost Belum Terbayar

```txt
Fixed Cost Belum Terbayar: Rp0
```

Legend:

```txt
Total fixed cost yang masih harus dibayar.
```

---

## 30. Fixed Cost Status

```txt
Fixed Cost: Aman
```

Legend:

```txt
Menunjukkan apakah fixed cost bulan ini sudah ter-cover atau masih ada yang belum dibayar.
```

Status:

```txt
Aman
Belum Lengkap
Perlu Perhatian
```

---

## 31. Paid Early

```txt
Paid Early Juni: Rp3.340.000
```

Legend:

```txt
Total transaksi untuk budget bulan ini yang sudah dibayar sebelum bulan budget dimulai.
```

Contoh:

```txt
Kost Juni dibayar tanggal 29 Mei.
```

---

# E. Savings

## 32. Savings Terkunci

```txt
Savings Terkunci: Rp500.000
```

Legend:

```txt
Total uang yang sedang dikunci sebagai savings.
```

---

## 33. Savings Ditambahkan Bulan Ini

```txt
Savings Ditambahkan Mei: Rp500.000
```

Legend:

```txt
Total uang yang dimasukkan ke savings pada bulan kalender tersebut.
```

---

## 34. Savings Digunakan Bulan Ini

```txt
Savings Digunakan Mei: Rp0
```

Legend:

```txt
Total uang savings yang dipakai atau ditarik pada bulan tersebut.
```

---

## 35. Net Savings Movement

```txt
Net Savings Mei: +Rp500.000
```

Legend:

```txt
Selisih savings masuk dan savings keluar.
```

Formula:

```txt
Savings Ditambahkan - Savings Digunakan
```

---

## 36. Savings Ratio

```txt
Savings Ratio: 10%
```

Legend:

```txt
Persentase income yang masuk ke savings.
```

Formula:

```txt
Savings Ditambahkan / Income Masuk × 100
```

---

## 37. Savings Status

```txt
Savings Status: Aman
```

Legend:

```txt
Status apakah savings masih utuh, bertambah, atau mulai terpakai.
```

Status:

```txt
Bertambah
Aman
Terpakai
Perlu Perhatian
```

---

# F. Cash Coverage / Funding Shortfall

## 38. Budget yang Dilindungi

```txt
Budget yang Dilindungi: Rp629.100
```

Legend:

```txt
Total sisa budget aktif yang harus ditutup saldo operasional. Savings sudah terpisah dan tidak dihitung sebagai saldo.
```

Formula:

```txt
Sisa Budget Aktif
```

---

## 39. Cash Coverage Gap

```txt
Dana Budget/Savings yang Kepakai: Rp25.218
```

Legend:

```txt
Selisih ketika saldo operasional tidak cukup menutup sisa budget aktif.
```

Formula:

```txt
max(0, Budget yang Dilindungi - Saldo Operasional)
```

---

## 40. Cash Coverage Status

```txt
Perlindungan Dana: Perlu Perhatian
```

Legend:

```txt
Status apakah saldo operasional masih cukup untuk menutup sisa budget aktif.
```

Status:

```txt
Covered
Ada Gap
Perlu Perhatian
```

---

## 41. Sisa Budget Aktif

```txt
Sisa Budget Aktif: Rp629.100
```

Legend:

```txt
Total sisa budget yang masih aktif dan sebaiknya tidak dipakai untuk hal lain.
```

---

## 42. Protected Money Ratio

```txt
Protected Money Ratio: 102%
```

Legend:

```txt
Perbandingan sisa budget aktif terhadap saldo operasional.
```

Formula:

```txt
Budget yang Dilindungi / Saldo Operasional × 100
```

Jika lebih dari 100%, berarti ada coverage gap.

---

# G. Unbudgeted Spending

## 43. Unbudgeted Expense Bulan Ini

```txt
Unbudgeted Expense Mei: Rp100.000
```

Legend:

```txt
Total pengeluaran yang tidak masuk budget kategori manapun.
```

---

## 44. Jumlah Transaksi Unbudgeted

```txt
Transaksi Unbudgeted: 3 transaksi
```

Legend:

```txt
Jumlah transaksi yang tidak punya budget allocation.
```

---

## 45. Unbudgeted Impact

```txt
Unbudgeted Impact: Rp100.000
```

Legend:

```txt
Estimasi dampak pengeluaran unbudgeted terhadap cash coverage gap.
```

---

## 46. Unbudgeted Status

```txt
Unbudgeted Status: Perlu Perhatian
```

Legend:

```txt
Status berdasarkan besar pengeluaran unbudgeted bulan ini.
```

Status:

```txt
Aman
Perlu Perhatian
Tinggi
```

---

# H. Debt / Hutang Piutang

## 47. Piutang Aktif

```txt
Piutang Aktif: Rp500.000
```

Legend:

```txt
Total uang yang masih harus dibayar orang lain ke user.
```

---

## 48. Hutang Aktif

```txt
Hutang Aktif: Rp300.000
```

Legend:

```txt
Total uang yang masih harus user bayar ke orang lain.
```

---

## 49. Net Debt Position

```txt
Net Debt Position: +Rp200.000
```

Legend:

```txt
Selisih antara piutang aktif dan hutang aktif.
```

Formula:

```txt
Piutang Aktif - Hutang Aktif
```

Jika positif, lebih banyak uang yang harus kembali ke user.

Jika negatif, user punya kewajiban lebih besar.

---

## 50. Piutang Terbesar

```txt
Piutang Terbesar: Adik — Rp300.000
```

Legend:

```txt
Orang dengan sisa piutang terbesar.
```

---

## 51. Hutang Terbesar

```txt
Hutang Terbesar: Awaaa — Rp300.000
```

Legend:

```txt
Orang dengan sisa hutang terbesar.
```

---

## 52. Pembayaran Piutang Bulan Ini

```txt
Pembayaran Piutang Mei: Rp200.000
```

Legend:

```txt
Total pembayaran piutang yang diterima bulan ini. Ini bukan income.
```

---

## 53. Pembayaran Hutang Bulan Ini

```txt
Pembayaran Hutang Mei: Rp100.000
```

Legend:

```txt
Total pembayaran hutang yang dilakukan bulan ini. Ini bukan expense.
```

---

## 54. Debt Status

```txt
Debt Status: Aman
```

Legend:

```txt
Status ringkas hutang/piutang aktif.
```

Status:

```txt
Aman
Ada Piutang
Ada Hutang
Perlu Perhatian
```

---

# I. Recurring Transaction

## 55. Recurring Due Soon

```txt
Recurring Due Soon: Kost Juni
```

Legend:

```txt
Transaksi rutin terdekat yang perlu dicatat.
```

---

## 56. Jumlah Recurring Pending

```txt
Recurring Pending: 2
```

Legend:

```txt
Jumlah transaksi rutin yang belum ditandai selesai atau dicatat.
```

---

## 57. Recurring Amount Pending

```txt
Recurring Pending Amount: Rp2.140.000
```

Legend:

```txt
Total nominal transaksi rutin yang akan datang atau belum dicatat.
```

---

## 58. Fixed Cost Reminder

```txt
Reminder Fixed Cost: Kost belum tercatat
```

Legend:

```txt
Pengingat fixed cost yang penting agar tidak terlewat.
```

---

# J. Wishlist / Planned Purchase

## 59. Wishlist Total

```txt
Wishlist Total: Rp1.350.000
```

Legend:

```txt
Total estimasi semua item wishlist aktif.
```

---

## 60. Wishlist Ready to Buy

```txt
Ready to Buy: Sepatu Kerja
```

Legend:

```txt
Item wishlist yang sudah dianggap aman atau siap dibeli.
```

---

## 61. Wishlist Highest Priority

```txt
Prioritas Wishlist: Keyboard Baru — Rp500.000
```

Legend:

```txt
Item wishlist prioritas tertinggi.
```

---

## 62. Wishlist Count

```txt
Wishlist Aktif: 4 item
```

Legend:

```txt
Jumlah item wishlist yang masih aktif.
```

---

# K. What If / Planning

## 63. Last Simulation Result

```txt
Simulasi Terakhir: Lifestyle akan over Rp200.000
```

Legend:

```txt
Hasil simulasi terakhir yang dilakukan user.
```

---

## 64. Safe to Lend

```txt
Safe to Lend: Rp300.000
```

Legend:

```txt
Estimasi uang yang aman untuk dipinjamkan tanpa mengganggu savings dan budget aktif.
```

---

## 65. Spending Room

```txt
Spending Room: Rp150.000
```

Legend:

```txt
Ruang pengeluaran yang masih aman untuk kebutuhan fleksibel.
```

---

## 66. Budget Risk After Planned Spending

```txt
Risk After Planned Spending: Medium
```

Legend:

```txt
Risiko setelah planned purchase atau simulasi terakhir.
```

Status:

```txt
Low
Medium
High
```

---

# L. Analytics Ringkas

## 67. Top Expense Category

```txt
Top Expense: Kost — Rp1.840.000
```

Legend:

```txt
Kategori expense terbesar bulan ini.
```

---

## 68. Top Flexible Expense

```txt
Top Flexible Expense: Kopi — Rp250.000
```

Legend:

```txt
Kategori fleksibel dengan pengeluaran terbesar.
```

---

## 69. Average Daily Expense

```txt
Rata-rata Harian: Rp75.000
```

Legend:

```txt
Rata-rata pengeluaran harian pada bulan berjalan.
```

Formula:

```txt
Total Expense Bulan Ini / jumlah hari berjalan
```

---

## 70. Daily Safe Spend

```txt
Batas Aman Harian: Rp45.000
```

Legend:

```txt
Estimasi maksimal pengeluaran harian agar uang cukup sampai akhir bulan.
```

---

## 71. Days Left in Budget Period

```txt
Sisa Hari Budget: 12 hari
```

Legend:

```txt
Jumlah hari tersisa dalam periode budget aktif.
```

---

## 72. Projected End Balance

```txt
Projected End Balance: Rp250.000
```

Legend:

```txt
Estimasi saldo akhir bulan jika pola spending saat ini berlanjut.
```

---

## 73. Month-over-Month Expense

```txt
Expense vs Bulan Lalu: +12%
```

Legend:

```txt
Perbandingan expense bulan ini dengan bulan sebelumnya.
```

---

## 74. Month-over-Month Savings

```txt
Savings vs Bulan Lalu: +Rp500.000
```

Legend:

```txt
Perbandingan saldo savings dengan bulan sebelumnya.
```

---

# M. AI / FinBot Insight

## 75. FinBot Summary

```txt
FinBot Summary: Budget aman, tapi cash coverage perlu perhatian.
```

Legend:

```txt
Ringkasan singkat dari FinBot berdasarkan data dashboard.
```

---

## 76. FinBot Warning

```txt
FinBot Warning: Dana budget/savings kepakai Rp25.218
```

Legend:

```txt
Warning utama yang perlu diperhatikan user.
```

---

## 77. FinBot Suggestion

```txt
FinBot Suggestion: Tahan spending fleksibel dulu.
```

Legend:

```txt
Saran pendek dari FinBot berdasarkan kondisi keuangan.
```

---

## 78. Insight of the Month

```txt
Insight Bulan Ini: Kopi naik 30% dari bulan lalu.
```

Legend:

```txt
Insight utama bulan berjalan.
```

---

# Rekomendasi Default Card untuk Dashboard

Kalau user belum memilih card sendiri, default dashboard sebaiknya hanya menampilkan:

```txt
1. Uang Bebas
2. Budget Bulan Ini
3. Budget Terpakai
4. Savings Terkunci
5. Cash Coverage Status
6. Expense Bulan Ini
7. Piutang Aktif
8. Recurring Due Soon
9. FinBot Summary
```

Kenapa ini default terbaik?

```txt
Langsung menjawab:
- Uang bebas berapa?
- Budget aman atau tidak?
- Savings terkunci berapa?
- Ada gap atau tidak?
- Expense sejauh ini berapa?
- Ada piutang/hutang penting?
- Ada fixed cost yang belum dicatat?
- Apa insight paling penting?
```

---

# Rekomendasi Card yang Jangan Jadi Default

Card ini tetap boleh ada, tapi jangan default karena bisa membingungkan user:

```txt
Saldo mentah sebelum savings dipisah
Net Cashflow Bulan Ini
Budgetable Income
Budget Coverage Ratio
Cash Coverage Gap formula detail
Month-over-Month analytics
Projected End Balance
```

Alasannya:

```txt
Card-card ini lebih cocok untuk advanced user atau detail page, bukan first impression dashboard.
```

---

# UI Custom Dashboard

Saat user memilih card, tampilkan kategori:

```txt
Wallet & Saldo
Income & Cashflow
Budget
Fixed Cost
Savings
Cash Coverage
Unbudgeted
Debt
Recurring
Wishlist
Planning
Analytics
FinBot
```

---

# Implementation Notes

## Data Structure Suggestion

Setiap card bisa direpresentasikan sebagai konfigurasi:

```ts
type DashboardCardConfig = {
  id: string
  title: string
  group: string
  defaultVisible: boolean
  description: string
}
```

Contoh:

```ts
{
  id: "free_cash",
  title: "Uang Bebas",
  group: "Wallet & Saldo",
  defaultVisible: true,
  description: "Uang yang benar-benar aman dipakai setelah savings dipisahkan dan sisa budget aktif dilindungi."
}
```

---

## User Preference

User bisa memilih card yang tampil.

Preferensi dapat disimpan di:

```txt
localStorage untuk MVP
database untuk versi multi-device
```

Contoh database:

```prisma
model DashboardPreference {
  id        String   @id @default(uuid())
  userId    String
  cardId    String
  isVisible Boolean  @default(true)
  order     Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])

  @@unique([userId, cardId])
  @@index([userId])
}
```

---

## Card Rendering Rule

Setiap card maksimal menampilkan:

```txt
Title
Value
Legend
Optional Badge
```

Jangan tampilkan formula panjang di card utama.

Formula dapat ditampilkan di:

```txt
Tooltip
Detail Drawer
Help Icon
```

---

# Final Notes

Dashboard harus terasa seperti:

```txt
Personal finance cockpit yang bisa disesuaikan user.
```

Bukan dashboard yang memaksa user membaca semua angka sekaligus.

Dengan card library ini, user bisa mulai dari dashboard sederhana, lalu menambahkan card lain sesuai kebutuhan dan tingkat pemahaman finansialnya.
