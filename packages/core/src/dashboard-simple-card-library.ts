export type DashboardSimpleCardGroup =
  | "Wallet & Saldo"
  | "Income & Cashflow"
  | "Budget"
  | "Fixed Cost"
  | "Savings"
  | "Cash Coverage"
  | "Unbudgeted"
  | "Debt"
  | "Recurring"
  | "Wishlist"
  | "Planning"
  | "Analytics"
  | "FinBot";

export type DashboardSimpleCardConfig = {
  id: string;
  title: string;
  group: DashboardSimpleCardGroup;
  defaultVisible: boolean;
  description: string;
  available: boolean;
};

export const dashboardSimpleCardGroups: DashboardSimpleCardGroup[] = [
  "Wallet & Saldo",
  "Income & Cashflow",
  "Budget",
  "Fixed Cost",
  "Savings",
  "Cash Coverage",
  "Unbudgeted",
  "Debt",
  "Recurring",
  "Wishlist",
  "Planning",
  "Analytics",
  "FinBot",
];

export const dashboardSimpleCardConfigs: DashboardSimpleCardConfig[] = [
  {
    id: "free_cash",
    title: "Uang Bebas",
    group: "Wallet & Saldo",
    defaultVisible: true,
    available: true,
    description:
      "Uang yang benar-benar aman dipakai setelah savings dipisahkan dan sisa budget aktif dilindungi.",
  },
  {
    id: "budget_total",
    title: "Budget Bulan Ini",
    group: "Budget",
    defaultVisible: true,
    available: true,
    description: "Total budget yang dibuat untuk periode budget berjalan.",
  },
  {
    id: "budget_spent",
    title: "Budget Terpakai",
    group: "Budget",
    defaultVisible: true,
    available: true,
    description:
      "Total expense yang dibebankan ke periode budget berdasarkan budget month.",
  },
  {
    id: "locked_savings",
    title: "Savings Terkunci",
    group: "Savings",
    defaultVisible: true,
    available: true,
    description: "Total uang yang sedang dikunci sebagai savings.",
  },
  {
    id: "cash_coverage_status",
    title: "Cash Coverage Status",
    group: "Cash Coverage",
    defaultVisible: true,
    available: true,
    description:
      "Status apakah saldo operasional masih cukup menutup sisa budget aktif.",
  },
  {
    id: "calendar_expense",
    title: "Expense Bulan Ini",
    group: "Income & Cashflow",
    defaultVisible: true,
    available: true,
    description:
      "Total expense berdasarkan tanggal uang benar-benar keluar di bulan kalender.",
  },
  {
    id: "active_receivable",
    title: "Piutang Aktif",
    group: "Debt",
    defaultVisible: true,
    available: true,
    description: "Total uang yang masih harus dibayar orang lain ke user.",
  },
  {
    id: "recurring_due_soon",
    title: "Recurring Due Soon",
    group: "Recurring",
    defaultVisible: true,
    available: false,
    description: "Transaksi rutin terdekat yang perlu dicatat.",
  },
  {
    id: "finbot_summary",
    title: "FinBot Summary",
    group: "FinBot",
    defaultVisible: true,
    available: true,
    description: "Ringkasan singkat dari FinBot berdasarkan data dashboard.",
  },
  {
    id: "spendable_balance",
    title: "Saldo Operasional",
    group: "Wallet & Saldo",
    defaultVisible: false,
    available: true,
    description:
      "Saldo yang tersisa setelah savings dipisahkan dari semua saldo.",
  },
  {
    id: "largest_wallet",
    title: "Wallet Terbesar",
    group: "Wallet & Saldo",
    defaultVisible: false,
    available: true,
    description: "Wallet dengan saldo paling besar saat ini.",
  },
  {
    id: "lowest_wallet",
    title: "Wallet Terendah",
    group: "Wallet & Saldo",
    defaultVisible: false,
    available: true,
    description: "Wallet dengan saldo paling kecil saat ini.",
  },
  {
    id: "calendar_income",
    title: "Income Masuk Bulan Ini",
    group: "Income & Cashflow",
    defaultVisible: false,
    available: true,
    description:
      "Total income berdasarkan tanggal uang benar-benar masuk di bulan kalender.",
  },
  {
    id: "calendar_net_cashflow",
    title: "Net Cashflow Bulan Ini",
    group: "Income & Cashflow",
    defaultVisible: false,
    available: true,
    description:
      "Selisih income dan expense berdasarkan tanggal transaksi kalender.",
  },
  {
    id: "calendar_cashflow_status",
    title: "Cashflow Kalender Status",
    group: "Income & Cashflow",
    defaultVisible: false,
    available: true,
    description:
      "Menunjukkan apakah bulan kalender ini surplus atau minus secara arus kas.",
  },
  {
    id: "latest_income",
    title: "Income Terakhir",
    group: "Income & Cashflow",
    defaultVisible: false,
    available: true,
    description: "Income terbaru yang tercatat.",
  },
  {
    id: "latest_expense",
    title: "Expense Terakhir",
    group: "Income & Cashflow",
    defaultVisible: false,
    available: true,
    description: "Expense terbaru yang tercatat.",
  },
  {
    id: "budget_income",
    title: "Dana Budget Bulan Ini",
    group: "Budget",
    defaultVisible: false,
    available: true,
    description:
      "Dana yang disiapkan untuk membiayai budget bulan tersebut, walaupun income bisa masuk di bulan sebelumnya.",
  },
  {
    id: "budget_remaining",
    title: "Sisa Budget",
    group: "Budget",
    defaultVisible: false,
    available: true,
    description: "Sisa budget yang belum terpakai.",
  },
  {
    id: "available_budget_funds",
    title: "Sisa Dana Budget",
    group: "Budget",
    defaultVisible: false,
    available: true,
    description:
      "Dana budget yang belum dialokasikan ke kategori manapun.",
  },
  {
    id: "budget_usage",
    title: "Budget Usage",
    group: "Budget",
    defaultVisible: false,
    available: true,
    description: "Persentase budget yang sudah digunakan.",
  },
  {
    id: "budget_plan_status",
    title: "Budget Plan Status",
    group: "Budget",
    defaultVisible: false,
    available: true,
    description:
      "Status apakah total budget melebihi dana budget yang tersedia.",
  },
  {
    id: "overplanned_amount",
    title: "Overplanned Amount",
    group: "Budget",
    defaultVisible: false,
    available: true,
    description: "Jumlah budget yang melebihi dana budget.",
  },
  {
    id: "largest_budget_category",
    title: "Kategori Budget Terbesar",
    group: "Budget",
    defaultVisible: false,
    available: true,
    description: "Kategori dengan alokasi budget terbesar di bulan tersebut.",
  },
  {
    id: "most_used_budget_category",
    title: "Kategori Budget Paling Boros",
    group: "Budget",
    defaultVisible: false,
    available: true,
    description:
      "Kategori dengan persentase pemakaian budget tertinggi.",
  },
  {
    id: "almost_empty_categories",
    title: "Kategori Hampir Habis",
    group: "Budget",
    defaultVisible: false,
    available: true,
    description: "Daftar kategori yang sudah melewati batas warning.",
  },
  {
    id: "overbudget_categories",
    title: "Kategori Overbudget",
    group: "Budget",
    defaultVisible: false,
    available: true,
    description: "Kategori yang pengeluarannya sudah melebihi budget.",
  },
  {
    id: "fixed_cost_total",
    title: "Fixed Cost Bulan Ini",
    group: "Fixed Cost",
    defaultVisible: false,
    available: false,
    description:
      "Total budget fixed cost seperti kost, cicilan, transfer rutin, internet, dan subscription.",
  },
  {
    id: "fixed_cost_paid",
    title: "Fixed Cost Terbayar",
    group: "Fixed Cost",
    defaultVisible: false,
    available: false,
    description: "Total fixed cost yang sudah dibayar.",
  },
  {
    id: "fixed_cost_unpaid",
    title: "Fixed Cost Belum Terbayar",
    group: "Fixed Cost",
    defaultVisible: false,
    available: false,
    description: "Total fixed cost yang masih harus dibayar.",
  },
  {
    id: "fixed_cost_status",
    title: "Fixed Cost Status",
    group: "Fixed Cost",
    defaultVisible: false,
    available: false,
    description:
      "Menunjukkan apakah fixed cost bulan ini sudah ter-cover atau masih ada yang belum dibayar.",
  },
  {
    id: "paid_early",
    title: "Paid Early",
    group: "Fixed Cost",
    defaultVisible: false,
    available: true,
    description:
      "Total transaksi untuk budget bulan ini yang sudah dibayar sebelum bulan budget dimulai.",
  },
  {
    id: "savings_added",
    title: "Savings Ditambahkan Bulan Ini",
    group: "Savings",
    defaultVisible: false,
    available: true,
    description:
      "Total uang yang dimasukkan ke savings pada bulan kalender tersebut.",
  },
  {
    id: "savings_used",
    title: "Savings Digunakan Bulan Ini",
    group: "Savings",
    defaultVisible: false,
    available: true,
    description:
      "Total uang savings yang dipakai atau ditarik pada bulan tersebut.",
  },
  {
    id: "net_savings_movement",
    title: "Net Savings Movement",
    group: "Savings",
    defaultVisible: false,
    available: true,
    description: "Selisih savings masuk dan savings keluar.",
  },
  {
    id: "savings_ratio",
    title: "Savings Ratio",
    group: "Savings",
    defaultVisible: false,
    available: true,
    description: "Persentase income yang masuk ke savings.",
  },
  {
    id: "savings_status",
    title: "Savings Status",
    group: "Savings",
    defaultVisible: false,
    available: true,
    description:
      "Status apakah savings masih utuh, bertambah, atau mulai terpakai.",
  },
  {
    id: "protected_money",
    title: "Budget yang Dilindungi",
    group: "Cash Coverage",
    defaultVisible: false,
    available: true,
    description:
      "Total sisa budget aktif yang harus ditutup saldo operasional.",
  },
  {
    id: "cash_coverage_gap",
    title: "Cash Coverage Gap",
    group: "Cash Coverage",
    defaultVisible: false,
    available: true,
    description:
      "Selisih ketika saldo operasional tidak cukup menutup sisa budget aktif.",
  },
  {
    id: "remaining_active_budget",
    title: "Sisa Budget Aktif",
    group: "Cash Coverage",
    defaultVisible: false,
    available: true,
    description:
      "Total sisa budget yang masih aktif dan sebaiknya tidak dipakai untuk hal lain.",
  },
  {
    id: "protected_money_ratio",
    title: "Budget Coverage Ratio",
    group: "Cash Coverage",
    defaultVisible: false,
    available: true,
    description:
      "Perbandingan sisa budget aktif terhadap saldo operasional.",
  },
  {
    id: "unbudgeted_expense",
    title: "Unbudgeted Expense Bulan Ini",
    group: "Unbudgeted",
    defaultVisible: false,
    available: true,
    description: "Total pengeluaran yang tidak masuk budget kategori manapun.",
  },
  {
    id: "unbudgeted_count",
    title: "Jumlah Transaksi Unbudgeted",
    group: "Unbudgeted",
    defaultVisible: false,
    available: false,
    description: "Jumlah transaksi yang tidak punya budget allocation.",
  },
  {
    id: "unbudgeted_impact",
    title: "Unbudgeted Impact",
    group: "Unbudgeted",
    defaultVisible: false,
    available: true,
    description:
      "Estimasi dampak pengeluaran unbudgeted terhadap cash coverage gap.",
  },
  {
    id: "unbudgeted_status",
    title: "Unbudgeted Status",
    group: "Unbudgeted",
    defaultVisible: false,
    available: true,
    description:
      "Status berdasarkan besar pengeluaran unbudgeted bulan ini.",
  },
  {
    id: "active_payable",
    title: "Hutang Aktif",
    group: "Debt",
    defaultVisible: false,
    available: true,
    description: "Total uang yang masih harus user bayar ke orang lain.",
  },
  {
    id: "net_debt_position",
    title: "Net Debt Position",
    group: "Debt",
    defaultVisible: false,
    available: true,
    description: "Selisih antara piutang aktif dan hutang aktif.",
  },
  {
    id: "largest_receivable",
    title: "Piutang Terbesar",
    group: "Debt",
    defaultVisible: false,
    available: false,
    description: "Orang dengan sisa piutang terbesar.",
  },
  {
    id: "largest_payable",
    title: "Hutang Terbesar",
    group: "Debt",
    defaultVisible: false,
    available: false,
    description: "Orang dengan sisa hutang terbesar.",
  },
  {
    id: "debt_status",
    title: "Debt Status",
    group: "Debt",
    defaultVisible: false,
    available: true,
    description: "Status ringkas hutang/piutang aktif.",
  },
  {
    id: "recurring_pending_count",
    title: "Jumlah Recurring Pending",
    group: "Recurring",
    defaultVisible: false,
    available: false,
    description:
      "Jumlah transaksi rutin yang belum ditandai selesai atau dicatat.",
  },
  {
    id: "recurring_pending_amount",
    title: "Recurring Amount Pending",
    group: "Recurring",
    defaultVisible: false,
    available: false,
    description:
      "Total nominal transaksi rutin yang akan datang atau belum dicatat.",
  },
  {
    id: "fixed_cost_reminder",
    title: "Fixed Cost Reminder",
    group: "Recurring",
    defaultVisible: false,
    available: false,
    description:
      "Pengingat fixed cost yang penting agar tidak terlewat.",
  },
  {
    id: "wishlist_total",
    title: "Wishlist Total",
    group: "Wishlist",
    defaultVisible: false,
    available: false,
    description: "Total estimasi semua item wishlist aktif.",
  },
  {
    id: "wishlist_ready",
    title: "Wishlist Ready to Buy",
    group: "Wishlist",
    defaultVisible: false,
    available: false,
    description:
      "Item wishlist yang sudah dianggap aman atau siap dibeli.",
  },
  {
    id: "wishlist_priority",
    title: "Wishlist Highest Priority",
    group: "Wishlist",
    defaultVisible: false,
    available: false,
    description: "Item wishlist prioritas tertinggi.",
  },
  {
    id: "wishlist_count",
    title: "Wishlist Count",
    group: "Wishlist",
    defaultVisible: false,
    available: false,
    description: "Jumlah item wishlist yang masih aktif.",
  },
  {
    id: "last_simulation_result",
    title: "Last Simulation Result",
    group: "Planning",
    defaultVisible: false,
    available: false,
    description: "Hasil simulasi terakhir yang dilakukan user.",
  },
  {
    id: "safe_to_lend",
    title: "Safe to Lend",
    group: "Planning",
    defaultVisible: false,
    available: true,
    description:
      "Estimasi uang yang aman untuk dipinjamkan tanpa mengganggu savings dan budget aktif.",
  },
  {
    id: "spending_room",
    title: "Spending Room",
    group: "Planning",
    defaultVisible: false,
    available: true,
    description:
      "Ruang pengeluaran yang masih aman untuk kebutuhan fleksibel.",
  },
  {
    id: "planned_spending_risk",
    title: "Budget Risk After Planned Spending",
    group: "Planning",
    defaultVisible: false,
    available: false,
    description:
      "Risiko setelah planned purchase atau simulasi terakhir.",
  },
  {
    id: "top_expense_category",
    title: "Top Expense Category",
    group: "Analytics",
    defaultVisible: false,
    available: true,
    description: "Kategori expense terbesar bulan ini.",
  },
  {
    id: "top_flexible_expense",
    title: "Top Flexible Expense",
    group: "Analytics",
    defaultVisible: false,
    available: false,
    description:
      "Kategori fleksibel dengan pengeluaran terbesar.",
  },
  {
    id: "average_daily_expense",
    title: "Average Daily Expense",
    group: "Analytics",
    defaultVisible: false,
    available: true,
    description: "Rata-rata pengeluaran harian pada bulan berjalan.",
  },
  {
    id: "daily_safe_spend",
    title: "Daily Safe Spend",
    group: "Analytics",
    defaultVisible: false,
    available: true,
    description:
      "Estimasi maksimal pengeluaran harian agar uang cukup sampai akhir bulan.",
  },
  {
    id: "days_left_budget_period",
    title: "Days Left in Budget Period",
    group: "Analytics",
    defaultVisible: false,
    available: true,
    description: "Jumlah hari tersisa dalam periode budget aktif.",
  },
  {
    id: "projected_end_balance",
    title: "Projected End Balance",
    group: "Analytics",
    defaultVisible: false,
    available: false,
    description:
      "Estimasi saldo akhir bulan jika pola spending saat ini berlanjut.",
  },
  {
    id: "mom_expense",
    title: "Month-over-Month Expense",
    group: "Analytics",
    defaultVisible: false,
    available: false,
    description:
      "Perbandingan expense bulan ini dengan bulan sebelumnya.",
  },
  {
    id: "mom_savings",
    title: "Month-over-Month Savings",
    group: "Analytics",
    defaultVisible: false,
    available: false,
    description:
      "Perbandingan saldo savings dengan bulan sebelumnya.",
  },
  {
    id: "finbot_warning",
    title: "FinBot Warning",
    group: "FinBot",
    defaultVisible: false,
    available: true,
    description: "Warning utama yang perlu diperhatikan user.",
  },
  {
    id: "finbot_suggestion",
    title: "FinBot Suggestion",
    group: "FinBot",
    defaultVisible: false,
    available: true,
    description: "Saran pendek dari FinBot berdasarkan kondisi keuangan.",
  },
  {
    id: "insight_of_month",
    title: "Insight of the Month",
    group: "FinBot",
    defaultVisible: false,
    available: true,
    description: "Insight utama bulan berjalan.",
  },
];
