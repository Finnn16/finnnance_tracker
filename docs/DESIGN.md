# UI DESIGN SYSTEM — Finnnance Trawwwcker

## Design Vision

Dashboard harus terasa seperti:
- modern banking app
- premium SaaS dashboard
- clean
- informative
- compact but readable
- mobile friendly

Gunakan referensi screenshot sebagai inspirasi layout dan composition, BUKAN untuk copy brand atau warna.

---

# VISUAL STYLE

## Vibe
- modern banking
- clean
- premium
- soft minimalism
- data-heavy but organized

## Yang Saya Suka dari Referensi
- dashboard terasa ramai tapi tetap rapi
- card banyak namun tidak berantakan
- spacing dan grid gap sangat konsisten
- sidebar compact
- summary cards di atas
- chart besar di tengah
- panel kanan untuk informasi tambahan
- banyak informasi tapi tetap nyaman dibaca
- white cards dengan soft shadow
- UI terlihat modern dan profesional

## Yang Tidak Saya Mau
- terlalu banyak warna
- gradient mencolok
- font terlalu besar
- dashboard kosong
- style crypto dashboard
- efek glow berlebihan
- shadow terlalu tebal
- UI playful seperti game

---

# COLOR SYSTEM

## Background
Gunakan:
- slate-50
- zinc-50
- off-white

## Card
- putih
- border soft
- shadow sangat halus

## Accent Color
Gunakan hanya sebagai aksen kecil:
- muted blue
- muted green
- muted red untuk expense

Jangan gunakan:
- neon
- gradient terang
- warna terlalu saturated

---

# TYPOGRAPHY

## Rules
- typography compact
- readable
- premium
- jangan oversized

## Suggested
- heading: semibold
- body: normal
- metric number: bold tapi tidak terlalu besar

---

# LAYOUT STRUCTURE

## Desktop Layout

```txt
┌────────────┬──────────────────────────────────────────────┬────────────────────┐
│ Sidebar    │ Summary Cards                                │ Right Panel        │
│            ├──────────────────────────────────────────────┤                    │
│            │ Main Chart                                   │ Recent Transaction │
│            ├───────────────────────┬──────────────────────┤                    │
│            │ Top Categories        │ Wallet Balances      │ AI Insight         │
│            └───────────────────────┴──────────────────────┘                    │
└────────────┴──────────────────────────────────────────────┴────────────────────┘
```

---

# SIDEBAR

## Sidebar Kiri
Menu:
- Dashboard
- Transactions
- Split Bills
- Budget
- Wallets
- AI Assistant
- Settings

## Style
- compact
- clean
- icon kecil
- active state subtle
- fixed sidebar desktop
- drawer/bottom nav mobile

---

# DASHBOARD CONTENT

## Header Dashboard

### Content
- greeting user
- date filter
- user filter
- customize button
- export optional

### Style
- clean
- compact
- spacing rapi

---

# SUMMARY CARDS

## Data Wajib
- Total Saldo
- Income
- Expense
- Net Cashflow

## Style
- rounded-2xl
- white card
- soft border
- subtle shadow
- compact metric card
- icon kecil
- trend optional

---

# MAIN CHART

## Content
- income vs expense
- cashflow trend
- monthly analytics

## Style
- clean
- muted colors
- no heavy gradients
- responsive
- large center focus

---

# TOP 5 CATEGORIES

## Content
- category name
- amount
- percentage
- progress bar

## Style
- compact card
- progress subtle
- informative

---

# RECENT TRANSACTIONS

## Content
- category
- note
- amount
- date
- type

## Style
- compact list
- clean rows
- subtle color difference income vs expense

---

# WALLET BALANCES

## Content
- Cash
- BCA
- GoPay
- Dana
- Other wallets

## Style
- mini cards atau compact list
- icon optional
- clean balance display

---

# AI INSIGHT WIDGET

## Content
- budget warning
- spending insight
- debt reminder
- recommendation

## Style
- clean AI card
- subtle indicator
- no flashy AI visuals

---

# DASHBOARD CUSTOMIZATION SYSTEM

## Feature
User bisa:
- show widget
- hide widget
- reorder widget
- memilih informasi dashboard

## Customize Dashboard Button
Saat diklik:
- open modal
- tampil widget list
- toggle visibility
- optional reorder

## MVP Storage
Gunakan:

```txt
localStorage
```

---

# WIDGET SYSTEM

## Widget Type

```ts
type DashboardWidget = {
  id: string
  title: string
  type:
    | "summary"
    | "chart"
    | "top_categories"
    | "recent_transactions"
    | "wallet_balances"
    | "budget_progress"
    | "debt_summary"
    | "ai_insight"
  visible: boolean
  order: number
  size: "small" | "medium" | "large"
}
```

---

# COMPONENT STRUCTURE

Buat komponen reusable:

```txt
DashboardLayout
Sidebar
DashboardHeader
WidgetGrid
WidgetCard
SummaryMetricCard
CashflowChartWidget
TopCategoriesWidget
RecentTransactionsWidget
WalletBalancesWidget
BudgetProgressWidget
DebtSummaryWidget
AIInsightWidget
CustomizeDashboardModal
```

---

# RESPONSIVE RULES

## Desktop
- sidebar fixed
- right panel visible
- grid multi-column

## Tablet
- sidebar collapse
- right panel turun
- chart full width

## Mobile
- bottom nav atau drawer
- cards stack vertical
- chart full width
- spacing tetap nyaman

---

# TECHNICAL DESIGN RULES

## Frontend
Gunakan:
- Next.js
- React
- TailwindCSS
- shadcn/ui
- lucide-react
- recharts

## Styling Rules
- gunakan whitespace dengan baik
- gunakan gap konsisten
- jangan overdesign
- jangan hardcode layout terlalu kaku

---

# MOCK DATA RULE

Gunakan mock data dulu jika API belum siap.

Tetapi:
- struktur data harus future-proof
- mudah dihubungkan ke Prisma/API nanti

---

# IMPORTANT NOTES

IMPORTANT:
The reference is only for:
- layout inspiration
- widget composition
- spacing
- dashboard density
- card arrangement

DO NOT:
- copy branding
- copy exact colors
- copy logos
- copy typography identically

The dashboard should feel like:
- premium finance tracker
- modern banking dashboard
- private financial workspace

NOT:
- crypto dashboard
- gaming UI
- colorful startup landing page
