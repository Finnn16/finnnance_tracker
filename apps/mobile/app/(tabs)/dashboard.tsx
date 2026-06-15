import DashboardHeader from "@/components/dashboard/DashboardHeader";
import RecentActivityItem from "@/components/dashboard/RecentActivityItem";
import CardInfo from "@/components/ui/CardInfo";
import ScreenContainer from "@/components/ui/ScreenContainer";
import SectionHeader from "@/components/ui/SectionHeader";
import { colors } from "@/components/ui/theme";
import {
  currentMonthKey,
  type DashboardUserOption,
  fallbackDashboardData,
  fetchDashboardData,
  fetchDashboardUsers,
  formatRupiah,
  shiftMonthKey,
} from "@/lib/dashboard-data";
import { useClerk, useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";
import type { DimensionValue } from "react-native";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

type DashboardSectionId =
  | "snapshot"
  | "cards"
  | "cashflow"
  | "budget"
  | "wallets"
  | "categories"
  | "recent";

const sectionStorageKey = "dashboard_visible_sections_v1";
const dashboardSections: { id: DashboardSectionId; label: string }[] = [
  { id: "snapshot", label: "Budget Period" },
  { id: "cards", label: "Simple Cards" },
  { id: "cashflow", label: "Cashflow" },
  { id: "budget", label: "Budget Progress" },
  { id: "wallets", label: "Wallets" },
  { id: "categories", label: "Top Categories" },
  { id: "recent", label: "Recent" },
];
const defaultVisibleSections = dashboardSections.map((section) => section.id);

function StatusPill({ isSafe }: { isSafe: boolean }) {
  return (
    <View style={[styles.statusPill, isSafe ? styles.safePill : styles.gapPill]}>
      <Ionicons
        name={isSafe ? "checkmark-circle-outline" : "alert-circle-outline"}
        size={15}
        color={isSafe ? "#047857" : "#B91C1C"}
      />
      <Text style={[styles.statusText, isSafe ? styles.safeText : styles.gapText]}>
        {isSafe ? "Aman" : "Ada Gap"}
      </Text>
    </View>
  );
}

function MiniMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "green" | "red" | "blue";
}) {
  return (
    <View style={styles.miniMetric}>
      <Text style={styles.miniMetricLabel}>{label}</Text>
      <Text
        style={[
          styles.miniMetricValue,
          tone === "green" ? styles.greenText : null,
          tone === "red" ? styles.redText : null,
          tone === "blue" ? styles.blueText : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function ProgressBar({ value }: { value: number }) {
  const width: DimensionValue = `${Math.min(Math.max(value, 0), 100)}%`;
  const barStyle =
    value >= 90
      ? styles.progressDanger
      : value >= 70
        ? styles.progressWarning
        : styles.progressSafe;

  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, barStyle, { width }]} />
    </View>
  );
}

function BudgetRow({
  name,
  spent,
  amount,
  progress,
  isAmountHidden,
}: {
  name: string;
  spent: number;
  amount: number;
  progress: number;
  isAmountHidden: boolean;
}) {
  const spentText = isAmountHidden ? "Rp ****" : formatRupiah(spent);
  const amountText = isAmountHidden ? "Rp ****" : formatRupiah(amount);

  return (
    <View style={styles.budgetRow}>
      <View style={styles.rowHeader}>
        <View>
          <Text style={styles.rowTitle}>{name}</Text>
          <Text style={styles.rowSubtitle}>
            {spentText} dari {amountText}
          </Text>
        </View>
        <Text style={styles.rowPercent}>{progress}%</Text>
      </View>
      <ProgressBar value={progress} />
    </View>
  );
}

function WalletRow({
  name,
  type,
  balance,
  isAmountHidden,
}: {
  name: string;
  type: string;
  balance: number;
  isAmountHidden: boolean;
}) {
  return (
    <View style={styles.listRow}>
      <View style={styles.walletIcon}>
        <Ionicons name="wallet-outline" size={18} color={colors.text} />
      </View>
      <View style={styles.listText}>
        <Text style={styles.rowTitle}>{name}</Text>
        <Text style={styles.rowSubtitle}>{type}</Text>
      </View>
      <Text style={styles.rowAmount}>
        {isAmountHidden ? "Rp ****" : formatRupiah(balance)}
      </Text>
    </View>
  );
}

function CategoryRow({
  name,
  amount,
  percentage,
  isAmountHidden,
}: {
  name: string;
  amount: number;
  percentage: number;
  isAmountHidden: boolean;
}) {
  return (
    <View style={styles.categoryRow}>
      <View style={styles.rowHeader}>
        <View>
          <Text style={styles.rowTitle}>{name}</Text>
          <Text style={styles.rowSubtitle}>
            {isAmountHidden ? "Rp ****" : formatRupiah(amount)}
          </Text>
        </View>
        <Text style={styles.rowPercent}>{percentage}%</Text>
      </View>
      <ProgressBar value={percentage} />
    </View>
  );
}

export default function DashboardScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const primaryEmail = user?.primaryEmailAddress?.emailAddress;
  const [dashboardData, setDashboardData] = useState(fallbackDashboardData);
  const [userOptions, setUserOptions] = useState<DashboardUserOption[]>([]);
  const [selectedMonthKey, setSelectedMonthKey] = useState(currentMonthKey());
  const [selectedOwnerEmail, setSelectedOwnerEmail] = useState("");
  const [visibleSections, setVisibleSections] = useState<DashboardSectionId[]>(
    defaultVisibleSections,
  );
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isAmountHidden, setIsAmountHidden] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const ownerForQuery = selectedOwnerEmail || primaryEmail;
  const sourceLabel = isLoading
    ? "Memuat data"
    : dashboardData.isFallback
      ? "Data demo"
      : "Data live";
  const amountText = useCallback(
    (value: number) => (isAmountHidden ? "Rp ****" : formatRupiah(value)),
    [isAmountHidden],
  );

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      setDashboardData(
        await fetchDashboardData({
          monthKey: selectedMonthKey,
          ownerEmail: ownerForQuery,
        }),
      );
    } catch {
      setDashboardData(fallbackDashboardData);
      setErrorMessage("Data live belum bisa dimuat. Menampilkan data demo.");
    } finally {
      setIsLoading(false);
    }
  }, [ownerForQuery, selectedMonthKey]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    async function loadUsers() {
      try {
        const users = await fetchDashboardUsers();
        setUserOptions(users);
      } catch {
        setUserOptions([]);
      }
    }

    loadUsers();
  }, []);

  useEffect(() => {
    async function loadVisibleSections() {
      const savedValue = await SecureStore.getItemAsync(sectionStorageKey);

      if (!savedValue) {
        return;
      }

      try {
        const parsed = JSON.parse(savedValue) as DashboardSectionId[];
        const validIds = new Set(dashboardSections.map((section) => section.id));
        const nextSections = parsed.filter((id) => validIds.has(id));

        if (nextSections.length > 0) {
          setVisibleSections(nextSections);
        }
      } catch {
        await SecureStore.deleteItemAsync(sectionStorageKey);
      }
    }

    loadVisibleSections();
  }, []);

  async function toggleSection(sectionId: DashboardSectionId) {
    const isVisible = visibleSections.includes(sectionId);
    const nextSections = isVisible
      ? visibleSections.filter((id) => id !== sectionId)
      : [...visibleSections, sectionId];

    if (nextSections.length === 0) {
      return;
    }

    setVisibleSections(nextSections);
    await SecureStore.setItemAsync(sectionStorageKey, JSON.stringify(nextSections));
  }

  function isSectionVisible(sectionId: DashboardSectionId) {
    return visibleSections.includes(sectionId);
  }

  const isBudgetPlanSafe = dashboardData.budget.budgetPlanStatus === "SAFE";
  const isCoverageSafe = dashboardData.coverage.cashCoverageStatus === "COVERED";
  const isMonthSafe = isBudgetPlanSafe && isCoverageSafe;

  return (
    <View style={styles.screenRoot}>
      <ScreenContainer scrollable contentContainerStyle={styles.content}>
        <DashboardHeader
          name={dashboardData.userName}
          statusLabel={sourceLabel}
          isLoading={isLoading}
          isFallback={dashboardData.isFallback}
          isMenuOpen={isProfileMenuOpen}
          onProfilePress={() => setIsProfileMenuOpen((value) => !value)}
          onSignOut={() => signOut()}
        />

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <View style={styles.filterPanel}>
        <View style={styles.monthControl}>
          <Pressable
            accessibilityRole="button"
            style={styles.iconButton}
            onPress={() => setSelectedMonthKey((value) => shiftMonthKey(value, -1))}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </Pressable>
          <View style={styles.monthTextGroup}>
            <Text style={styles.filterLabel}>Bulan</Text>
            <Text style={styles.monthValue}>{dashboardData.periodLabel}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            style={styles.iconButton}
            onPress={() => setSelectedMonthKey((value) => shiftMonthKey(value, 1))}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.chipRow}>
          <Pressable
            accessibilityRole="button"
            style={[
              styles.filterChip,
              ownerForQuery === "all" ? styles.filterChipActive : null,
            ]}
            onPress={() => setSelectedOwnerEmail("all")}
          >
            <Text
              style={[
                styles.filterChipText,
                ownerForQuery === "all" ? styles.filterChipTextActive : null,
              ]}
            >
              All
            </Text>
          </Pressable>
          {userOptions.map((option) => {
            const isActive = ownerForQuery === option.email;

            return (
              <Pressable
                accessibilityRole="button"
                key={option.id}
                style={[styles.filterChip, isActive ? styles.filterChipActive : null]}
                onPress={() => setSelectedOwnerEmail(option.email)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive ? styles.filterChipTextActive : null,
                  ]}
                  numberOfLines={1}
                >
                  {option.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          style={styles.customizeButton}
          onPress={() => setIsCustomizeOpen((value) => !value)}
        >
          <Ionicons name="options-outline" size={18} color={colors.text} />
          <Text style={styles.customizeText}>Customize UI</Text>
        </Pressable>

        {isCustomizeOpen ? (
          <View style={styles.customizeGrid}>
            {dashboardSections.map((section) => {
              const isVisible = visibleSections.includes(section.id);

              return (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isVisible }}
                  key={section.id}
                  style={[
                    styles.sectionToggle,
                    isVisible ? styles.sectionToggleActive : null,
                  ]}
                  onPress={() => toggleSection(section.id)}
                >
                  <Ionicons
                    name={isVisible ? "checkmark-circle" : "ellipse-outline"}
                    size={16}
                    color={isVisible ? "#047857" : colors.muted}
                  />
                  <Text
                    style={[
                      styles.sectionToggleText,
                      isVisible ? styles.sectionToggleTextActive : null,
                    ]}
                  >
                    {section.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      {isSectionVisible("snapshot") ? (
      <View style={styles.snapshot}>
        <View style={styles.snapshotHeader}>
          <View style={styles.snapshotTitleGroup}>
            <Text style={styles.eyebrow}>Periode Budget</Text>
            <Text style={styles.snapshotTitle}>{dashboardData.periodLabel}</Text>
          </View>
          <StatusPill isSafe={isMonthSafe} />
        </View>

        <Text style={styles.snapshotDescription}>
          Budget plan sesuai dana, savings terpisah, dan sisa budget masih
          tertutup saldo operasional.
        </Text>

        <View style={styles.metricsGrid}>
          <MiniMetric
            label="Dana Budget"
            value={amountText(dashboardData.budget.readyToBudget)}
            tone="green"
          />
          <MiniMetric
            label="Budget Dibuat"
            value={amountText(dashboardData.budget.budgetSet)}
            tone="blue"
          />
          <MiniMetric
            label="Budget Terpakai"
            value={amountText(dashboardData.budget.spent)}
            tone="red"
          />
          <MiniMetric
            label="Uang Bebas"
            value={amountText(dashboardData.coverage.displayFreeCash)}
            tone="green"
          />
        </View>
      </View>
      ) : null}

      {isSectionVisible("cards") ? (
      <View style={styles.cardGrid}>
        <CardInfo
          title="Saldo Operasional"
          value={amountText(dashboardData.coverage.totalWalletBalance)}
          description="Savings sudah dipisahkan"
          icon={<Ionicons name="cash-outline" size={20} color={colors.text} />}
          style={styles.cardItem}
        />
        <CardInfo
          title="Sisa Budget Aktif"
          value={amountText(dashboardData.budget.remainingActiveBudget)}
          description="Budget yang perlu dilindungi"
          icon={<Ionicons name="shield-checkmark-outline" size={20} color={colors.text} />}
          style={styles.cardItem}
        />
      </View>
      ) : null}

      {isSectionVisible("cashflow") ? (
      <View style={styles.section}>
        <SectionHeader
          title="Cashflow Kalender"
          subtitle="Tanggal transaksi sebagai pembanding periode budget"
        />
        <View style={styles.cashflowAmountRow}>
          <Text style={styles.cashflowLabel}>Net cashflow</Text>
          <Text style={styles.cashflowValue}>
            {amountText(dashboardData.summary.netCashflow)}
          </Text>
        </View>
        <View style={styles.cashflowGrid}>
          <MiniMetric
            label="Income"
            value={amountText(dashboardData.summary.income)}
            tone="green"
          />
          <MiniMetric
            label="Expense"
            value={amountText(dashboardData.summary.expense)}
            tone="red"
          />
          <MiniMetric
            label="Transaksi"
            value={`${dashboardData.summary.transactionCount}`}
          />
          <MiniMetric
            label="Wallet Aktif"
            value={`${dashboardData.wallets.length}`}
          />
        </View>
      </View>
      ) : null}

      {isSectionVisible("budget") ? (
      <View style={styles.section}>
        <SectionHeader title="Budget Progress" subtitle="Pemakaian bulan ini" />
        <View style={styles.progressSummary}>
          <View>
            <Text style={styles.rowTitle}>Rencana aman</Text>
            <Text style={styles.rowSubtitle}>
              {amountText(dashboardData.budget.spent)} used from{" "}
              {amountText(dashboardData.budget.budgetSet)} budget
            </Text>
          </View>
          <Text style={styles.progressBadge}>
            {dashboardData.budget.usedPercentage}%
          </Text>
        </View>
        <ProgressBar value={dashboardData.budget.usedPercentage} />

        <View style={styles.budgetList}>
          {dashboardData.budgetItems.map((item) => (
            <BudgetRow
              key={item.id}
              name={item.name}
              spent={item.spent}
              amount={item.amount}
              progress={item.progress}
              isAmountHidden={isAmountHidden}
            />
          ))}
        </View>
      </View>
      ) : null}

      {isSectionVisible("wallets") ? (
      <View style={styles.section}>
        <SectionHeader title="Wallet Balances" subtitle="All active wallets" />
        {dashboardData.wallets.map((wallet) => (
          <WalletRow
            key={wallet.id}
            name={wallet.name}
            type={wallet.type}
            balance={wallet.balance}
            isAmountHidden={isAmountHidden}
          />
        ))}
      </View>
      ) : null}

      {isSectionVisible("categories") ? (
      <View style={styles.section}>
        <SectionHeader title="Top Categories" subtitle="Expense breakdown" />
        <View style={styles.categoryList}>
          {dashboardData.topCategories.map((category) => (
            <CategoryRow
              key={category.id}
              name={category.name}
              amount={category.amount}
              percentage={category.percentage}
              isAmountHidden={isAmountHidden}
            />
          ))}
        </View>
      </View>
      ) : null}

      {isSectionVisible("recent") ? (
      <View style={styles.section}>
        <SectionHeader
          title="Recent Transactions"
          subtitle="Latest activity"
        />
        {dashboardData.recentTransactions.map((transaction) => (
          <RecentActivityItem
            key={transaction.id}
            title={transaction.title}
            subtitle={transaction.subtitle}
            amount={isAmountHidden ? "Rp ****" : transaction.amount}
          />
        ))}
      </View>
      ) : null}
      </ScreenContainer>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Refresh dashboard"
        style={[styles.floatingButton, styles.refreshFab]}
        onPress={loadDashboard}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="refresh-outline" size={24} color="#FFFFFF" />
        )}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isAmountHidden ? "Tampilkan nominal" : "Sembunyikan nominal"}
        style={[styles.floatingButton, styles.privacyFab]}
        onPress={() => setIsAmountHidden((value) => !value)}
      >
        <Ionicons
          name={isAmountHidden ? "eye-off-outline" : "eye-outline"}
          size={24}
          color="#FFFFFF"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  content: {
    gap: 20,
    paddingBottom: 104,
  },
  syncRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sourcePill: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  livePill: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  demoPill: {
    backgroundColor: "#F9FAFB",
    borderColor: colors.border,
  },
  sourceText: {
    fontSize: 12,
    fontWeight: "700",
  },
  liveText: {
    color: "#047857",
  },
  demoText: {
    color: colors.muted,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  signOutText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B91C1C",
  },
  errorBanner: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#B91C1C",
  },
  filterPanel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 14,
  },
  monthControl: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthTextGroup: {
    flex: 1,
    alignItems: "center",
  },
  filterLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  monthValue: {
    marginTop: 3,
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  filterChip: {
    minHeight: 34,
    maxWidth: "48%",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: {
    borderColor: "#111827",
    backgroundColor: "#111827",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  customizeButton: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.surface,
  },
  customizeText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  customizeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sectionToggle: {
    minHeight: 36,
    maxWidth: "48%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  sectionToggleActive: {
    borderColor: "#A7F3D0",
    backgroundColor: "#ECFDF5",
  },
  sectionToggleText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
  },
  sectionToggleTextActive: {
    color: "#047857",
  },
  snapshot: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  snapshotHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  snapshotTitleGroup: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
  },
  snapshotTitle: {
    marginTop: 4,
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
  },
  snapshotDescription: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
  },
  statusPill: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  safePill: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  gapPill: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
  },
  safeText: {
    color: "#047857",
  },
  gapText: {
    color: "#B91C1C",
  },
  metricsGrid: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  miniMetric: {
    width: "48%",
    minHeight: 70,
    borderRadius: 14,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 11,
    justifyContent: "center",
  },
  miniMetricLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  miniMetricValue: {
    marginTop: 5,
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },
  greenText: {
    color: "#047857",
  },
  redText: {
    color: "#B91C1C",
  },
  blueText: {
    color: "#1D4ED8",
  },
  cardGrid: {
    gap: 12,
  },
  cardItem: {
    width: "100%",
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  cashflowAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cashflowLabel: {
    fontSize: 13,
    color: colors.muted,
  },
  cashflowValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#047857",
  },
  cashflowGrid: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  progressSummary: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  progressBadge: {
    minWidth: 48,
    borderRadius: 999,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "800",
    color: "#047857",
  },
  progressTrack: {
    height: 8,
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  progressSafe: {
    backgroundColor: "#10B981",
  },
  progressWarning: {
    backgroundColor: "#F59E0B",
  },
  progressDanger: {
    backgroundColor: "#EF4444",
  },
  budgetList: {
    marginTop: 16,
    gap: 14,
  },
  budgetRow: {
    gap: 10,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  rowSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: colors.muted,
  },
  rowPercent: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  walletIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  listText: {
    flex: 1,
    paddingRight: 10,
  },
  rowAmount: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
  },
  categoryList: {
    gap: 14,
  },
  categoryRow: {
    gap: 10,
  },
  floatingButton: {
    position: "absolute",
    right: 22,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  refreshFab: {
    bottom: 94,
  },
  privacyFab: {
    bottom: 28,
  },
});
