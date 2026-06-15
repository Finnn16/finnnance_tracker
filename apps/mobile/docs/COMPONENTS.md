# PRD — Reusable UI Components React Native

## 1. Tujuan

Membuat kumpulan **UI Component reusable** untuk aplikasi React Native agar tampilan lebih konsisten, rapi, mudah dirawat, dan tidak perlu menulis ulang style yang sama di banyak screen.

Component ini akan dipakai untuk halaman seperti:

- Login
- Sign Up
- Dashboard
- Profile
- Form input data
- List aktivitas
- Empty data

Fokus utama: **minimalis, kompak, jelas, dan mudah dipahami oleh developer pemula maupun orang awam yang membaca dokumentasi ini.**

---

## 2. Prinsip Desain

Desain component harus mengikuti prinsip berikut:

- Clean
- Minimal
- Kompak
- Konsisten
- Mudah dibaca
- Tidak terlalu banyak warna
- Jelas secara UI/UX
- Mudah digunakan ulang di banyak screen

Warna utama yang disarankan:

| Elemen              | Warna     |
| ------------------- | --------- |
| Background utama    | `#F9FAFB` |
| Card/Input          | `#FFFFFF` |
| Text utama          | `#111827` |
| Text secondary      | `#6B7280` |
| Border              | `#E5E7EB` |
| Error               | `#EF4444` |
| Primary Button      | `#111827` |
| Primary Button Text | `#FFFFFF` |

Catatan penting:

- Jangan terlalu banyak memakai warna.
- Gunakan border halus untuk membedakan area.
- Gunakan spacing yang rapi agar UI tidak terasa penuh.
- Gunakan font size yang nyaman dibaca.
- Hindari informasi teknis yang tidak perlu tampil ke user.

---

## 3. Struktur Folder

Struktur folder component yang disarankan:

```txt
components/
  ui/
    AppButton.tsx
    AppInput.tsx
    CardInfo.tsx
    SectionHeader.tsx
    EmptyState.tsx
    ScreenContainer.tsx
    IconButton.tsx
    LoadingOverlay.tsx

  auth/
    SocialLoginButton.tsx
    AuthHeader.tsx

  dashboard/
    DashboardHeader.tsx
    QuickActionCard.tsx
    RecentActivityItem.tsx
```

Untuk tahap awal, component yang diprioritaskan adalah:

1. `AppInput`
2. `AppButton`
3. `ScreenContainer`
4. `CardInfo`
5. `SectionHeader`
6. `EmptyState`
7. `SocialLoginButton`
8. `DashboardHeader`
9. `RecentActivityItem`

---

## 4. Daftar Component

---

## 4.1 ScreenContainer

### Fungsi

`ScreenContainer` digunakan sebagai pembungkus utama screen agar semua halaman memiliki padding, background, dan spacing yang konsisten.

### Digunakan di

- Login screen
- Sign Up screen
- Dashboard screen
- Form screen
- Profile screen

### Props

```ts
type ScreenContainerProps = {
  children: React.ReactNode;
  scrollable?: boolean;
};
```

### Requirement UI

- Background menggunakan `#F9FAFB`
- Padding horizontal konsisten
- Konten tidak menempel ke pinggir layar
- Support scroll jika konten panjang
- Aman digunakan untuk halaman yang memiliki input form

### Contoh Penggunaan

```tsx
<ScreenContainer>{/* isi screen */}</ScreenContainer>
```

### Acceptance Criteria

- Semua screen memiliki jarak tepi yang konsisten.
- Developer tidak perlu mengulang style padding di setiap halaman.
- Konten tetap nyaman dilihat di layar kecil maupun besar.

---

## 4.2 AppInput

### Fungsi

`AppInput` digunakan sebagai component input reusable untuk form.

### Digunakan di

- Email input
- Password input
- Username input
- Search input
- Form transaksi
- Form profile

### Props

```ts
type AppInputProps = TextInputProps & {
  label: string;
  error?: string;
};
```

### Requirement UI

- Memiliki label di atas input.
- Tinggi input sekitar 48px.
- Border halus.
- Placeholder harus terlihat jelas.
- Text input harus mudah dibaca.
- Jika ada error, border berubah merah.
- Error message tampil di bawah input.

### State UI

- Normal
- Error
- Disabled
- Password mode

### Contoh Penggunaan

```tsx
<AppInput
  label="Email"
  value={email}
  onChangeText={setEmail}
  placeholder="Masukkan email"
  keyboardType="email-address"
  autoCapitalize="none"
/>
```

### Acceptance Criteria

- Placeholder muncul jelas.
- Error message tampil di bawah input.
- Input tetap rapi di halaman login dan sign up.
- Component bisa dipakai untuk password dengan `secureTextEntry`.
- Component bisa menerima props bawaan `TextInput`.

---

## 4.3 AppButton

### Fungsi

`AppButton` digunakan sebagai button utama reusable untuk aksi penting.

### Digunakan di

- Login
- Register
- Submit form
- Save data
- Continue
- Update profile

### Props

```ts
type AppButtonProps = {
  title: string;
  onPress: () => void;
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
};
```

### Requirement UI

- Tinggi button sekitar 48px.
- Border radius 12px.
- Background gelap.
- Text putih.
- Support icon di kiri text.
- Support loading state.
- Support disabled state.

### State UI

- Default
- Loading
- Disabled
- Pressed

### Contoh Penggunaan

```tsx
<AppButton title="Masuk" onPress={handleLogin} loading={isLoading} />
```

### Acceptance Criteria

- Saat loading, text diganti spinner.
- Saat disabled, button tidak bisa ditekan.
- Style button konsisten di semua screen.
- Button tetap rapi dengan atau tanpa icon.

---

## 4.4 CardInfo

### Fungsi

`CardInfo` digunakan untuk menampilkan informasi ringkas dalam bentuk card.

### Digunakan di

- Total saldo
- Total income
- Total expense
- Jumlah transaksi
- Progress budget
- Informasi akun singkat

### Props

```ts
type CardInfoProps = {
  title: string;
  value: string;
  description?: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
};
```

### Requirement UI

- Background putih.
- Border halus.
- Border radius 16px.
- Title kecil dan tidak terlalu dominan.
- Value lebih besar dan tebal.
- Icon optional di kanan.
- Description optional di bawah.

### Contoh Penggunaan

```tsx
<CardInfo
  title="Total Saldo"
  value="Rp 2.500.000"
  description="Saldo aktif saat ini"
  icon={<Ionicons name="wallet-outline" size={22} color="#111827" />}
/>
```

### Acceptance Criteria

- Card bisa dipakai dalam layout 1 kolom atau 2 kolom.
- Jika icon tidak dikirim, layout tetap rapi.
- Jika description kosong, tidak ada ruang kosong berlebihan.
- Informasi utama mudah terlihat oleh user.

---

## 4.5 SectionHeader

### Fungsi

`SectionHeader` digunakan sebagai judul kecil untuk membagi bagian dalam halaman.

### Digunakan di

- Ringkasan
- Aktivitas Terbaru
- Quick Action
- Informasi Akun
- Riwayat Transaksi

### Props

```ts
type SectionHeaderProps = {
  title: string;
  subtitle?: string;
};
```

### Requirement UI

- Title tebal.
- Subtitle optional.
- Ukuran tidak terlalu besar.
- Jarak bawah rapi.
- Tidak membuat halaman terasa penuh.

### Contoh Penggunaan

```tsx
<SectionHeader
  title="Aktivitas Terbaru"
  subtitle="Data terbaru akan muncul di sini"
/>
```

### Acceptance Criteria

- Section terlihat jelas.
- Component tetap rapi tanpa subtitle.
- Membantu user memahami pembagian konten di halaman.

---

## 4.6 EmptyState

### Fungsi

`EmptyState` digunakan untuk menampilkan kondisi ketika data kosong.

### Digunakan di

- Belum ada transaksi
- Belum ada aktivitas
- Belum ada data dashboard
- Belum ada notifikasi
- Belum ada hasil pencarian

### Props

```ts
type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
};
```

### Requirement UI

- Background putih.
- Border halus.
- Text berada di tengah.
- Icon optional.
- Tinggi minimum sekitar 120px.
- Tidak terlihat seperti error.

### Contoh Penggunaan

```tsx
<EmptyState
  title="Belum ada transaksi"
  description="Aktivitas kamu akan muncul di sini"
/>
```

### Acceptance Criteria

- User paham bahwa data memang kosong.
- Tampilan tetap rapi meskipun tanpa icon.
- Pesan mudah dipahami oleh user awam.

---

## 4.7 SocialLoginButton

### Fungsi

`SocialLoginButton` digunakan sebagai button icon untuk login menggunakan provider sosial.

### Digunakan di

- Google login
- Facebook login
- Github login
- Apple login

### Props

```ts
type SocialLoginButtonProps = {
  icon: React.ReactNode;
  onPress: () => void;
};
```

### Requirement UI

- Ukuran 48x48.
- Bentuk rounded.
- Border halus.
- Icon berada di tengah.
- Background putih.

### Contoh Penggunaan

```tsx
<SocialLoginButton
  icon={<Ionicons name="logo-google" size={20} color="#111827" />}
  onPress={handleGoogleLogin}
/>
```

### Acceptance Criteria

- Button sejajar horizontal jika dibungkus dengan parent `View` yang menggunakan `flexDirection: "row"`.
- Icon selalu berada di tengah.
- Style konsisten untuk semua provider.

---

## 4.8 DashboardHeader

### Fungsi

`DashboardHeader` digunakan sebagai header utama untuk halaman dashboard.

### Digunakan di

- Dashboard screen
- Home screen

### Props

```ts
type DashboardHeaderProps = {
  name: string;
};
```

### Requirement UI

- Menampilkan greeting.
- Menampilkan subtitle singkat.
- Ada avatar atau icon di kanan.
- Layout horizontal.
- Tidak terlalu tinggi.

### Contoh Penggunaan

```tsx
<DashboardHeader name="Finnn" />
```

### Acceptance Criteria

- Nama user tampil jelas.
- Header tidak memakan terlalu banyak ruang.
- Avatar/icon tidak mengganggu layout.
- Dashboard terasa personal tetapi tetap minimalis.

---

## 4.9 RecentActivityItem

### Fungsi

`RecentActivityItem` digunakan untuk menampilkan item aktivitas atau transaksi terbaru.

### Digunakan di

- Recent transaction
- Recent login activity
- Recent update
- Notification list

### Props

```ts
type RecentActivityItemProps = {
  title: string;
  subtitle: string;
  amount?: string;
};
```

### Requirement UI

- Title di kiri.
- Subtitle berada di bawah title.
- Amount optional di kanan.
- Padding vertikal sekitar 12px.
- Text tidak terlalu besar.

### Contoh Penggunaan

```tsx
<RecentActivityItem
  title="Makan Siang"
  subtitle="Hari ini • Cash"
  amount="-Rp 25.000"
/>
```

### Acceptance Criteria

- Item tetap rapi dengan atau tanpa amount.
- Cocok untuk list di dashboard.
- Informasi mudah dibaca secara cepat.

---

## 5. Component Tambahan Tahap Berikutnya

Component berikut tidak wajib dibuat di awal, tetapi bisa ditambahkan setelah component utama selesai.

---

## 5.1 IconButton

### Fungsi

Button kecil berbasis icon untuk aksi singkat.

### Contoh Penggunaan

- Tombol settings
- Tombol back custom
- Tombol edit
- Tombol delete

### Catatan

Component ini dibuat jika mulai banyak button kecil yang hanya berisi icon.

---

## 5.2 LoadingOverlay

### Fungsi

Menampilkan loading di atas halaman saat proses penting sedang berjalan.

### Contoh Penggunaan

- Login sedang diproses
- Register sedang diproses
- Submit form sedang diproses

### Catatan

Jangan terlalu sering menampilkan overlay agar user tidak merasa aplikasi berat.

---

## 5.3 AuthHeader

### Fungsi

Header khusus halaman auth seperti Login dan Sign Up.

### Contoh Penggunaan

- Judul halaman login
- Subtitle halaman register
- Brand name aplikasi

### Catatan

Buat component ini jika tampilan login dan sign up mulai punya struktur header yang sama.

---

## 5.4 QuickActionCard

### Fungsi

Card kecil untuk shortcut aksi cepat di dashboard.

### Contoh Penggunaan

- Tambah transaksi
- Lihat budget
- Buka profile
- Lihat riwayat

### Catatan

Component ini dibuat setelah dashboard mulai memiliki beberapa menu aksi.

---

## 6. Standar UI/UX

Setiap component harus mengikuti standar berikut:

### 6.1 Konsistensi Spacing

Gunakan spacing yang konsisten:

```txt
4px  = sangat kecil
8px  = kecil
12px = normal
16px = standar card/input
20px = padding screen
24px = jarak section besar
```

### 6.2 Konsistensi Radius

Gunakan radius yang tidak terlalu ekstrem:

```txt
Input/Button : 12px
Card         : 16px
Icon Button  : 24px atau full rounded
```

### 6.3 Konsistensi Text

Gunakan pembagian text sederhana:

```txt
Title utama       : 22-24px, bold
Section title     : 16-18px, bold
Input label       : 13-14px, semi-bold
Body text         : 14px
Helper text       : 12-13px
```

### 6.4 Error Handling Visual

Untuk component yang memiliki error:

- Border menjadi merah.
- Error message tampil di bawah component.
- Error message harus singkat dan jelas.

Contoh error yang baik:

```txt
Email wajib diisi
Password minimal 6 karakter
Password salah
```

Hindari error yang terlalu teknis:

```txt
Invalid credential exception from server
Payload validation failed
```

---

## 7. Aturan Penggunaan Component

Gunakan reusable component jika:

- Dipakai minimal di 2 sampai 3 tempat.
- Style dan pola penggunaannya mirip.
- Akan membantu menjaga konsistensi UI.

Jangan langsung membuat component jika:

- Baru dipakai satu kali.
- Logic masih sering berubah.
- Component terlalu spesifik untuk satu halaman.

Prinsip utama:

```txt
Reusable boleh, tapi jangan berlebihan.
```

---

## 8. Prioritas Implementasi

Urutan implementasi yang disarankan:

### Tahap 1 — Foundation UI

1. `ScreenContainer`
2. `AppInput`
3. `AppButton`

Tujuan tahap ini adalah membuat halaman Login dan Sign Up lebih rapi dan konsisten.

---

### Tahap 2 — Dashboard Basic

1. `CardInfo`
2. `SectionHeader`
3. `EmptyState`
4. `DashboardHeader`
5. `RecentActivityItem`

Tujuan tahap ini adalah membuat halaman dashboard terlihat rapi dan mudah dibaca.

---

### Tahap 3 — Auth Enhancement

1. `SocialLoginButton`
2. `AuthHeader`

Tujuan tahap ini adalah merapikan tampilan halaman auth.

---

### Tahap 4 — Optional Enhancement

1. `IconButton`
2. `LoadingOverlay`
3. `QuickActionCard`

Tujuan tahap ini adalah menambahkan component pendukung jika aplikasi mulai berkembang.

---

## 9. Acceptance Criteria Global

Reusable UI Components dianggap selesai jika memenuhi kriteria berikut:

- Component bisa digunakan ulang di beberapa screen.
- Style antar halaman terlihat konsisten.
- Tidak ada duplikasi style input dan button yang berlebihan.
- Component tetap mudah dibaca oleh developer pemula.
- UI terlihat minimalis dan tidak terlalu banyak warna.
- Component mendukung state penting seperti loading, disabled, dan error.
- Component tidak menyimpan logic bisnis yang berat.
- Component hanya fokus pada tampilan dan interaksi sederhana.

---

## 10. Batasan Scope

PRD ini hanya membahas reusable UI Component untuk React Native.

Yang tidak termasuk dalam scope:

- Integrasi API
- Database
- Authentication logic
- Business logic dashboard
- Validasi backend
- State management kompleks
- Animasi kompleks
- Theme switching dark mode

Jika nantinya aplikasi sudah lebih stabil, theme system bisa dibuat terpisah.

---

## 11. Catatan Developer

Saat implementasi, jangan langsung membuat semua component sekaligus jika screen belum membutuhkan.

Prioritaskan component yang paling sering dipakai:

```txt
AppInput
AppButton
ScreenContainer
CardInfo
```

Setelah itu baru lanjut ke component dashboard dan auth.

Component yang baik adalah component yang:

- Mudah dipakai
- Mudah dibaca
- Tidak terlalu banyak props
- Tidak menyimpan logic yang bukan tanggung jawabnya
- Tidak membuat screen jadi sulit dipahami

---

## 12. Kesimpulan

Reusable UI Components ini dibuat untuk membantu aplikasi React Native memiliki tampilan yang konsisten, minimalis, dan mudah dikembangkan.

Untuk tahap awal, jangan terlalu banyak membuat component. Fokus ke component yang benar-benar sering dipakai.

Prioritas utama:

1. `AppInput`
2. `AppButton`
3. `ScreenContainer`
4. `CardInfo`

Setelah foundation rapi, baru lanjutkan ke component dashboard dan auth.
