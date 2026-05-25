# PRD

## Nama Aplikasi : Finnnance Trawwwcker

---

# SYSTEM.md — AI Agent Workflow Guide

## FinanceTrack + SmartSplit AI Agent

> Versi: 1.0.0
> Stack: Next.js · React · Prisma · Supabase · n8n · OpenRouter AI

---

## Background Aplikasi

Aplikasi ini dibuat untuk dipakai secara lokal saja dengan 2 User utama Finnn dan Awaaa.

Fitur utama dari aplikasi ini adalah:

- mencatat transaksi masuk dan keluar keuangan
- budgeting
- dashboard analytics
- split bill otomatis
- AI assistant financial
- OCR upload bill
- debt & settlement tracking

Aplikasi ini harus bisa diakses dari device apapun:

- Laptop
- Android
- iPhone
- iPad

---

## Objective

Memudahkan pencatatan transaksi dan juga menghitung split bill beserta hutang piutang di split bills tersebut.

### Main Goals

- Membantu user tracking pemasukan & pengeluaran secara real-time
- Memudahkan pembagian tagihan antar user (split bills)
- Mengurangi konflik finansial dalam group
- Memberikan insight keuangan sederhana (analytics)
- Membantu user memahami kondisi finansial melalui AI agent
- Membuat proses split bill otomatis hanya dari upload foto bill

---

## Success Matrix

Membuat aplikasi berbasis web menggunakan Next.Js dan React digabung dengan Prisma ORM dan Supabase PostgreSQL.

Aplikasi harus:

- responsive di semua device
- cepat diakses
- memiliki dashboard interaktif
- memiliki AI assistant
- memiliki split bill OCR automation
- memiliki debt calculation yang akurat
- memiliki UX sederhana dan cepat

---

# AUTHENTICATION & ACCESS CONTROL

## Authentication System

Authentication menggunakan Google OAuth melalui Clerk.

Hanya 2 akun Google yang boleh mengakses sistem:

```txt
ADMIN : harfintaufiq@gmail.com
USER  : awliyanajwa255@gmail.com
```

Semua email lain harus ditolak walaupun berhasil login Google.

---

## Access Rules

### ADMIN

```txt
harfintaufiq@gmail.com
```

Hak akses:

- full access
- CRUD semua transaksi
- CRUD kategori
- CRUD split bill
- melihat semua dashboard
- manage AI setting

### USER

```txt
awliyanajwa255@gmail.com
```

Hak akses:

- create transaksi
- edit transaksi milik sendiri
- melihat dashboard
- menggunakan split bill

---

## Environment Variables

```env
ALLOWED_EMAILS=harfintaufiq@gmail.com,awliyanajwa255@gmail.com
ADMIN_EMAIL=harfintaufiq@gmail.com
USER_EMAIL=awliyanajwa255@gmail.com
```

---

## Authentication Flow

```txt
User Login Google
      ↓
Google OAuth Success
      ↓
Check Email Allowlist
      ↓
IF email allowed:
    allow access
ELSE:
    reject access
```

---

# REQUIREMENT

## Login (Core Feature)

### User Story

Saya ingin login hanya menggunakan akun Google.

### Importance

Low

### Acceptance Criteria

1. User login menggunakan Google OAuth
2. Sistem melakukan validasi email
3. Jika email tidak ada di allowlist maka akses ditolak
4. Session login tersimpan
5. Role user otomatis terbaca
6. User tidak perlu register manual

---

## Dashboard

### User Story

Sebagai user saya ingin setelah login melihat dashboard data dengan data-data informatif seperti pengeluaran bulanan, sisa budget bulanan, spend kategori tertinggi (top 5), dan lain-lain.

### Importance

High

### Acceptance Criteria

1. Dashboard interaktif
2. Dashboard informatif
3. Ada opsi graph dan nominal
4. Tanpa membuka menu lain user bisa memahami kondisi keuangan
5. Ada filter:

- tanggal
- kategori
- user

6. Menampilkan:

- total pemasukan
- total pengeluaran
- sisa budget
- top 5 kategori
- transaksi terakhir
- debt split bill
- alert AI

7. Data harus konsisten

---

## Finance Tracker (Core Feature)

### User Story

Saya sebagai user ingin dengan mudah mencatat pengeluaran dan pemasukan dengan mudah, ada input kalkulasi ketika input nominal.

### Importance

High

### Acceptance Criteria

1. User dapat menambahkan transaksi:

- tipe transaksi
- nominal
- keyboard custom kalkulasi
- note
- kategori
- tanggal

2. Sistem otomatis menghitung:

- pemasukan
- pengeluaran
- saldo

3. Data tersimpan langsung ke database

4. Ada mark transaksi dibuat oleh siapa

5. User dapat:

- edit transaksi
- hapus transaksi

6. Input nominal 0 tidak diterima

7. Semua transaksi dapat dilihat kedua user

8. Ada filter berdasarkan user

---

## Category Management

### User Story

Saya sebagai user ingin bisa mengatur kategori.

### Importance

Medium

### Acceptance Criteria

1. Tambah kategori
2. Edit kategori
3. Delete kategori
4. Kategori default tersedia
5. Tidak boleh delete kategori yang masih dipakai
6. User tidak boleh delete transaksi user lain

---

## Budgeting (Core Feature)

### User Story

Saya sebagai user ingin menetapkan budget setiap bulan.

### Importance

High

### Acceptance Criteria

1. User dapat set budget per bulan
2. Sistem menampilkan:

- sisa budget
- persentase penggunaan

3. Jika budget hampir habis tampil warning visual
4. AI agent memberi alert otomatis

---

## Split Bills - Group Management (Core Feature)

### User Story

Saya sebagai user ingin hanya dengan upload foto bill saja sistem bisa otomatis hitung setiap bagian nya beserta ppn.

### Importance

Very High

### Acceptance Criteria

1. User upload foto bill
2. AI OCR membaca bill
3. Sistem extract:

- item
- subtotal
- tax
- total

4. User dapat memilih metode split:

- equal split
- by order split

5. User dapat edit hasil OCR manual
6. Group split bill dinamis tanpa limit member
7. User bisa input participant guest
8. User bisa assign item ke participant

---

## Split Bills - Expense

### User Story

Sebagai user, saya ingin menambahkan pengeluaran dalam group agar bisa dibagi ke anggota lain.

### Importance

High

### Acceptance Criteria

1. Input total expense
2. Pilih siapa yang bayar
3. Pilih participant split
4. Metode split:

- equal
- custom
- by item

5. Sistem otomatis menghitung:

- siapa hutang siapa
- total hutang
- settlement

6. Hasil split langsung muncul di summary

---

# AI AGENT SYSTEM

## AI Agent Name

FinBot

---

## AI Agent Role

FinBot bertugas sebagai:

- financial assistant
- budget monitoring
- debt analyzer
- split bill assistant
- analytics helper
- reminder system

---

## AI Agent Personality

- Proaktif
- Ringkas
- Jujur
- Bahasa Indonesia default

---

## AI Agent Context

Setiap request AI wajib membawa context:

```txt
Tanggal hari ini
User aktif
Summary pemasukan
Summary pengeluaran
Sisa budget
Top kategori
5 transaksi terakhir
Debt aktif
```

---

## AI Capabilities

### Budget Alert

- warning 70%
- warning 90%
- overbudget

### Analytics

Contoh:

- kategori paling boros
- pengeluaran tertinggi
- trend pengeluaran

### Debt Analysis

Contoh:

- siapa hutang siapa
- total hutang
- settlement summary

### Financial Recommendation

Contoh:

- prediksi overbudget
- rekomendasi penghematan

---

## AI Limitations

AI tidak boleh:

- delete data langsung
- update transaksi tanpa konfirmasi
- melakukan settlement otomatis tanpa approval

---

# SYSTEM ARCHITECTURE

```txt
Frontend (Next.js + React)
        ↓
Backend API (Next.js Route Handler)
        ↓
Prisma ORM
        ↓
Supabase PostgreSQL
        ↓
AI Layer (OpenRouter)
        ↓
n8n Automation
```

---

# TECH STACK

## Frontend

- React
- Next.js
- TailwindCSS
- Shadcn/UI

## Backend

- Next.js API Routes
- Server Actions

## Database

- PostgreSQL
- Supabase

## ORM

- Prisma

## Authentication

- Google OAuth
- Clerk Auth

## AI

- OpenRouter
- Claude / GPT

## Automation

- n8n

## OCR

- Claude Vision / OCR AI

## Deployment

- Vercel

---

# DATABASE DESIGN

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  role      UserRole @default(USER)
  imageUrl  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  transactions Transaction[]
  budgets Budget[]
  conversations AgentConversation[]
}

enum UserRole {
  ADMIN
  USER
}

model Category {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())

  transactions Transaction[]
}

model Transaction {
  id          String   @id @default(uuid())
  userId      String
  categoryId  String
  amount      Decimal
  type        TransactionType
  note        String?
  date        DateTime
  createdAt   DateTime @default(now())

  user     User     @relation(fields: [userId], references: [id])
  category Category @relation(fields: [categoryId], references: [id])

  @@index([userId])
}

enum TransactionType {
  INCOME
  EXPENSE
}

model Budget {
  id        String   @id @default(uuid())
  userId    String
  month     DateTime
  amount    Decimal
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}

model Group {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())

  expenses Expense[]
}

model Expense {
  id          String   @id @default(uuid())
  groupId     String
  paidBy      String
  totalAmount Decimal
  description String?
  date        DateTime
  createdAt   DateTime @default(now())

  group   Group  @relation(fields: [groupId], references: [id])
  payer   User   @relation(fields: [paidBy], references: [id])
  splits  ExpenseSplit[]

  @@index([groupId])
}

model ExpenseSplit {
  id         String   @id @default(uuid())
  expenseId  String
  userId     String
  amount     Decimal

  expense Expense @relation(fields: [expenseId], references: [id])
  user    User    @relation(fields: [userId], references: [id])

  @@unique([expenseId, userId])
  @@index([expenseId])
}

model Payment {
  id          String   @id @default(uuid())
  fromUserId  String
  toUserId    String
  amount      Decimal
  createdAt   DateTime @default(now())

  payer    User  @relation("payer", fields: [fromUserId], references: [id])
  receiver User  @relation("receiver", fields: [toUserId], references: [id])
}

model AgentConversation {
  id        String   @id @default(uuid())
  userId    String
  role      String
  content   String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}
```

---

# NOTES DATABASE DESIGN

## Kenapa ExpenseSplit Disimpan?

Karena jika hanya menyimpan total dan participant maka query akan menghitung ulang terus.

Dengan pre-calculated split:

- query lebih cepat
- analytics lebih ringan
- debt lebih mudah dihitung

---

## Kenapa Payment Tidak Update Expense Langsung?

Karena:

- audit trail penting
- support partial payment
- support rollback

---

## Debt Calculation

Debt tidak dibuat sebagai table.

Debt dihitung dari:

```txt
ExpenseSplit - Payment
```

---

# API ROUTES

```txt
POST   /api/auth/login
POST   /api/auth/logout

GET    /api/dashboard

GET    /api/transactions
POST   /api/transactions
PUT    /api/transactions/:id
DELETE /api/transactions/:id

GET    /api/categories
POST   /api/categories

GET    /api/budgets
POST   /api/budgets

POST   /api/split/upload
POST   /api/split/process
POST   /api/split/settlement

POST   /api/agent/chat
GET    /api/agent/history
```

---

# NON-FUNCTIONAL REQUIREMENT

- Response API < 2 detik
- Responsive semua device
- Data consistency
- ACID compliance
- JWT authentication
- Audit trail transaction
- OCR retry mechanism
- AI response fallback handling

---

# SECURITY RULES

- Semua route protected authentication
- Email allowlist wajib
- API key disimpan di env
- OCR image private bucket
- User tidak boleh akses env
- Semua financial calculation dilakukan server-side

---

# SPLIT BILL FLOW

```txt
Upload Bill
    ↓
Storage
    ↓
OCR AI
    ↓
Extract Item
    ↓
User Confirm
    ↓
Split Calculation
    ↓
Save Expense
    ↓
Generate Debt
```

---

# DEVELOPMENT PRINCIPLES

- Build step by step
- Jangan over-engineering
- Pisahkan AI layer dan business logic
- Semua calculation server-side
- OCR harus editable
- Simpan raw OCR text
- Simpan audit trail
- Jangan percaya AI 100%

---

# MVP PHASES

## Phase 1

- Auth
- Dashboard
- Transaction CRUD

## Phase 2

- Budgeting
- Analytics
- Category Management

## Phase 3

- Split Bill Manual
- Debt System

## Phase 4

- OCR Split Bill
- AI Integration

## Phase 5

- Notification
- Automation
- AI Recommendation

---

# OPEN DISCUSSION

1. OCR provider terbaik
2. AI model termurah
3. Export PDF/Excel
4. Push notification system
5. Debt simplification algorithm

---

# FINAL NOTES

Aplikasi ini fokus pada:

- simplicity
- speed
- interactivity
- AI integration
- financial transparency
- production-ready architecture
