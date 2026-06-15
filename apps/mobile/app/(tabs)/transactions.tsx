import AppButton from "@/components/ui/AppButton";
import AppInput from "@/components/ui/AppInput";
import EmptyState from "@/components/ui/EmptyState";
import ScreenContainer from "@/components/ui/ScreenContainer";
import { colors, radius } from "@/components/ui/theme";
import {
  currentMonthKey,
  formatRupiah,
  shiftMonthKey,
} from "@/lib/dashboard-data";
import {
  createTransaction,
  fetchTransactionsData,
  type MobileTransactionView,
  type TransactionsData,
  type TransactionTab,
  type TransactionType,
  type TransactionUserOption,
} from "@/lib/transactions-data";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type FormState = {
  type: TransactionType;
  amount: string;
  walletId: string;
  transferToWalletId: string;
  categoryGroup: string;
  categoryId: string;
  budgetCategoryId: string;
  description: string;
  transactionDate: string;
  budgetMonth: string;
};

type IoniconName = ComponentProps<typeof Ionicons>["name"];
type AmountCalculatorOperator = "+" | "-" | "x" | "/";

type AmountCalculatorTerm = {
  operator: AmountCalculatorOperator;
  amount: number;
};

type DropdownOption = {
  id: string;
  name: string;
  group?: string;
};

const tabs: { label: string; value: TransactionTab }[] = [
  { label: "All", value: "all" },
  { label: "Income", value: "income" },
  { label: "Expense", value: "expense" },
  { label: "Transfer", value: "transfer" },
];

const transactionTypes: { label: string; value: TransactionType }[] = [
  { label: "Expense", value: "EXPENSE" },
  { label: "Income", value: "INCOME" },
  { label: "Transfer", value: "TRANSFER" },
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dateKeyToDate(value: string) {
  const [yearValue, monthValue, dayValue] = value.split("-").map(Number);

  if (!yearValue || !monthValue || !dayValue) {
    return new Date();
  }

  return new Date(yearValue, monthValue - 1, dayValue);
}

function dateToDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function emptyForm(walletId = ""): FormState {
  return {
    type: "EXPENSE",
    amount: "",
    walletId,
    transferToWalletId: "",
    categoryGroup: "",
    categoryId: "",
    budgetCategoryId: "",
    description: "",
    transactionDate: todayKey(),
    budgetMonth: currentMonthKey(),
  };
}

function parseAmount(value: string) {
  const parsed = evaluateAmountExpression(value);

  return parsed && parsed > 0 ? parsed : 0;
}

function evaluateAmountExpression(value: string) {
  const sanitized = value
    .replace(/rp/gi, "")
    .replace(/[.,_\s]/g, "")
    .replace(/\*/g, "x")
    .replace(/\//g, "/");

  if (!sanitized) {
    return 0;
  }

  if (!/^[\dx+\-/]+$/i.test(sanitized)) {
    return 0;
  }

  const tokens = sanitized.match(/\d+|[+\-x/]/gi);

  if (!tokens || tokens.length === 0) {
    return 0;
  }

  let total = 0;
  let operator: AmountCalculatorOperator = "+";

  for (const token of tokens) {
    if (
      token === "+" ||
      token === "-" ||
      token === "/" ||
      token.toLowerCase() === "x"
    ) {
      operator =
        token.toLowerCase() === "x"
          ? "x"
          : (token as "+" | "-" | "/");
      continue;
    }

    const amount = Number.parseInt(token, 10);

    if (!Number.isFinite(amount)) {
      return 0;
    }

    if (operator === "+") {
      total += amount;
    } else if (operator === "-") {
      total -= amount;
    } else if (operator === "x") {
      total *= amount;
    } else if (amount !== 0) {
      total /= amount;
    }
  }

  return Math.max(Math.round(total), 0);
}

function formatAmountInput(value: number | string) {
  const digits = String(value).replace(/\D/g, "");

  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function calculateTermsTotal(terms: AmountCalculatorTerm[]) {
  return terms.reduce((total, term, index) => {
    if (index === 0) {
      return term.operator === "-" ? -term.amount : term.amount;
    }

    if (term.operator === "+") {
      return total + term.amount;
    }

    if (term.operator === "-") {
      return total - term.amount;
    }

    if (term.operator === "x") {
      return total * term.amount;
    }

    if (term.amount === 0) {
      return total;
    }

    return total / term.amount;
  }, 0);
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatReadableDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(dateKeyToDate(value));
}

function getTransactionIcon(type: TransactionType): IoniconName {
  if (type === "INCOME") {
    return "arrow-down-circle-outline";
  }

  if (type === "TRANSFER") {
    return "swap-horizontal-outline";
  }

  return "arrow-up-circle-outline";
}

function getTransactionColor(type: TransactionType) {
  if (type === "INCOME") {
    return "#047857";
  }

  if (type === "TRANSFER") {
    return "#2563EB";
  }

  return "#B91C1C";
}

function amountLabel(transaction: MobileTransactionView, isHidden: boolean) {
  if (isHidden) {
    return "Rp ****";
  }

  const value = formatRupiah(transaction.amount);

  if (transaction.type === "EXPENSE") {
    return `-${value}`;
  }

  if (transaction.type === "INCOME") {
    return `+${value}`;
  }

  return value;
}

function ownerName(ownerEmail: string, users: TransactionUserOption[]) {
  if (ownerEmail === "all") {
    return "Semua User";
  }

  return (
    users.find((user) => user.email === ownerEmail)?.name ||
    ownerEmail ||
    "User"
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green" | "red" | "blue";
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text
        style={[
          styles.statValue,
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

function Chip({
  label,
  active,
  onPress,
  disabled = false,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active ? styles.chipActive : null,
        disabled ? styles.chipDisabled : null,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

function TransactionCard({
  transaction,
  isAmountHidden,
}: {
  transaction: MobileTransactionView;
  isAmountHidden: boolean;
}) {
  const color = getTransactionColor(transaction.type);
  const category =
    transaction.budgetCategoryName ||
    transaction.categoryName ||
    (transaction.transferToWalletName
      ? `${transaction.walletName} to ${transaction.transferToWalletName}`
      : transaction.walletName);

  return (
    <View style={styles.transactionCard}>
      <View style={[styles.transactionIcon, { backgroundColor: `${color}12` }]}>
        <Ionicons name={getTransactionIcon(transaction.type)} size={20} color={color} />
      </View>
      <View style={styles.transactionBody}>
        <Text style={styles.transactionTitle} numberOfLines={1}>
          {transaction.description || transaction.type}
        </Text>
        <Text style={styles.transactionSubtitle} numberOfLines={1}>
          {formatShortDate(transaction.transactionDate)} - {category}
        </Text>
        <Text style={styles.transactionOwner} numberOfLines={1}>
          {transaction.userName} - {transaction.walletName}
        </Text>
      </View>
      <Text style={[styles.transactionAmount, { color }]}>
        {amountLabel(transaction, isAmountHidden)}
      </Text>
    </View>
  );
}

function DropdownField<T extends DropdownOption>({
  title,
  options,
  selectedId,
  onSelect,
  emptyText,
  subtitle,
}: {
  title: string;
  options: T[];
  selectedId: string;
  onSelect: (id: string) => void;
  emptyText: string;
  subtitle?: (option: T) => string | undefined;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.id === selectedId);

  return (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>{title}</Text>
      {options.length > 0 ? (
        <>
          <Pressable
            accessibilityRole="button"
            style={styles.dropdownButton}
            onPress={() => setIsOpen(true)}
          >
            <View style={styles.dropdownTextGroup}>
              <Text
                style={[
                  styles.dropdownValue,
                  !selectedOption ? styles.dropdownPlaceholder : null,
                ]}
                numberOfLines={1}
              >
                {selectedOption?.name || `Pilih ${title.toLowerCase()}`}
              </Text>
              {selectedOption && subtitle?.(selectedOption) ? (
                <Text style={styles.dropdownSubtitle} numberOfLines={1}>
                  {subtitle(selectedOption)}
                </Text>
              ) : null}
            </View>
            <Ionicons name="chevron-down-outline" size={18} color={colors.muted} />
          </Pressable>

          <Modal
            animationType="fade"
            transparent
            visible={isOpen}
            onRequestClose={() => setIsOpen(false)}
          >
            <Pressable style={styles.modalOverlay} onPress={() => setIsOpen(false)}>
              <Pressable style={styles.dropdownSheet}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{title}</Text>
                  <Pressable
                    accessibilityRole="button"
                    style={styles.modalCloseButton}
                    onPress={() => setIsOpen(false)}
                  >
                    <Ionicons name="close-outline" size={22} color={colors.text} />
                  </Pressable>
                </View>
                <ScrollView
                  style={styles.dropdownList}
                  contentContainerStyle={styles.dropdownListContent}
                  showsVerticalScrollIndicator={false}
                >
                  {options.map((option) => {
                    const isSelected = option.id === selectedId;

                    return (
                      <Pressable
                        key={option.id}
                        accessibilityRole="button"
                        style={[
                          styles.dropdownItem,
                          isSelected ? styles.dropdownItemActive : null,
                        ]}
                        onPress={() => {
                          onSelect(option.id);
                          setIsOpen(false);
                        }}
                      >
                        <View style={styles.dropdownItemTextGroup}>
                          <Text
                            style={[
                              styles.dropdownItemTitle,
                              isSelected ? styles.dropdownItemTitleActive : null,
                            ]}
                          >
                            {option.name}
                          </Text>
                          {subtitle?.(option) ? (
                            <Text style={styles.dropdownItemSubtitle}>
                              {subtitle(option)}
                            </Text>
                          ) : null}
                        </View>
                        {isSelected ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color="#047857"
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </Pressable>
            </Pressable>
          </Modal>
        </>
      ) : (
        <Text style={styles.helperText}>{emptyText}</Text>
      )}
    </View>
  );
}

function DatePickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = dateKeyToDate(value);

  const handleChange = (event: DateTimePickerEvent, nextDate?: Date) => {
    if (event.type === "dismissed") {
      setIsOpen(false);
      return;
    }

    if (nextDate) {
      onChange(dateToDateKey(nextDate));
    }

    if (Platform.OS !== "ios") {
      setIsOpen(false);
    }
  };

  return (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        style={styles.dateButton}
        onPress={() => setIsOpen((current) => !current)}
      >
        <View style={styles.dateTextGroup}>
          <Text style={styles.dateValue}>{formatReadableDate(value)}</Text>
          <Text style={styles.dateRawValue}>{value}</Text>
        </View>
        <Ionicons name="calendar-outline" size={21} color={colors.text} />
      </Pressable>

      {isOpen ? (
        <View style={styles.datePickerPanel}>
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleChange}
            themeVariant="light"
          />
          {Platform.OS === "ios" ? (
            <AppButton
              title="Selesai"
              onPress={() => setIsOpen(false)}
              style={styles.dateDoneButton}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function AmountCalculatorPanel({
  visible,
  initialAmount,
  onApply,
  onClose,
}: {
  visible: boolean;
  initialAmount: number;
  onApply: (amount: number) => void;
  onClose: () => void;
}) {
  const [terms, setTerms] = useState<AmountCalculatorTerm[]>([]);
  const [operator, setOperator] = useState<AmountCalculatorOperator>("+");
  const [entry, setEntry] = useState(initialAmount > 0 ? String(initialAmount) : "");
  const currentTerms =
    entry === "" ? terms : [...terms, { operator, amount: Number(entry) }];
  const total = calculateTermsTotal(currentTerms);
  const expression = currentTerms
    .map((term, index) => {
      const operatorLabel = term.operator;
      const prefix = index === 0 && term.operator === "+" ? "" : `${operatorLabel} `;

      return `${prefix}${formatAmountInput(term.amount)}`;
    })
    .join(" ");

  useEffect(() => {
    if (!visible) {
      return;
    }

    setTerms([]);
    setOperator("+");
    setEntry(initialAmount > 0 ? String(initialAmount) : "");
  }, [initialAmount, visible]);

  const appendDigits = (digits: string) => {
    setEntry((current) => `${current}${digits}`.replace(/^0+(?=\d)/, "").slice(0, 15));
  };

  const selectOperator = (nextOperator: AmountCalculatorOperator) => {
    if (entry !== "") {
      setTerms(currentTerms);
      setEntry("");
    }

    setOperator(nextOperator);
  };

  const clear = () => {
    setTerms([]);
    setOperator("+");
    setEntry("");
  };

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.calculatorPanel}>
      <View style={styles.inlinePanelHeader}>
        <View>
          <Text style={styles.inlinePanelTitle}>Kalkulator Nominal</Text>
          <Text style={styles.inlinePanelSubtitle}>Pakai numpad custom.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          style={styles.inlinePanelCloseButton}
          onPress={onClose}
        >
          <Ionicons name="close-outline" size={20} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.calculatorDisplay}>
        <Text style={styles.calculatorExpression} numberOfLines={1}>
          {expression || "Masukkan harga barang"}
        </Text>
        <Text style={styles.calculatorTotal}>{formatRupiah(Math.max(total, 0))}</Text>
      </View>

      <View style={styles.calculatorGrid}>
        {["7", "8", "9"].map((digit) => (
          <CalculatorButton key={digit} label={digit} onPress={() => appendDigits(digit)} />
        ))}
        <CalculatorButton label="/" accent onPress={() => selectOperator("/")} />
        {["4", "5", "6"].map((digit) => (
          <CalculatorButton key={digit} label={digit} onPress={() => appendDigits(digit)} />
        ))}
        <CalculatorButton label="x" accent onPress={() => selectOperator("x")} />
        {["1", "2", "3"].map((digit) => (
          <CalculatorButton key={digit} label={digit} onPress={() => appendDigits(digit)} />
        ))}
        <CalculatorButton label="-" accent onPress={() => selectOperator("-")} />
        <CalculatorButton label="000" onPress={() => appendDigits("000")} />
        <CalculatorButton label="0" onPress={() => appendDigits("0")} />
        <CalculatorButton label="Hapus" onPress={() => setEntry((current) => current.slice(0, -1))} />
        <CalculatorButton label="+" accent onPress={() => selectOperator("+")} />
        <CalculatorButton label="C" wide onPress={clear} />
      </View>

      <AppButton
        title={`Gunakan ${total > 0 ? formatRupiah(total) : "Total"}`}
        onPress={() => {
          if (total > 0) {
            onApply(total);
          }
        }}
        disabled={total <= 0}
      />
    </View>
  );
}

function CalculatorButton({
  label,
  onPress,
  accent = false,
  wide = false,
}: {
  label: string;
  onPress: () => void;
  accent?: boolean;
  wide?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.calculatorButton,
        accent ? styles.calculatorButtonAccent : null,
        wide ? styles.calculatorButtonWide : null,
        pressed ? styles.pressed : null,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.calculatorButtonText,
          accent ? styles.calculatorButtonTextAccent : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function TransactionsScreen() {
  const { user } = useUser();
  const primaryEmail =
    user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() || "";
  const [data, setData] = useState<TransactionsData | null>(null);
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [ownerFilter, setOwnerFilter] = useState("");
  const [tab, setTab] = useState<TransactionTab>("all");
  const [searchDraft, setSearchDraft] = useState("");
  const [query, setQuery] = useState("");
  const [isAmountHidden, setIsAmountHidden] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (primaryEmail && ownerFilter === "") {
      setOwnerFilter(primaryEmail);
    }
  }, [ownerFilter, primaryEmail]);

  const selectedOwnerEmail = ownerFilter || primaryEmail || "all";

  const loadData = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!selectedOwnerEmail) {
        return;
      }

      if (mode === "refresh") {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError(null);

      try {
        const nextData = await fetchTransactionsData({
          monthKey,
          ownerEmail: selectedOwnerEmail,
          tab,
          query,
          limit: 80,
        });

        setData(nextData);
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Gagal mengambil data transaksi.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [monthKey, query, selectedOwnerEmail, tab],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedUser = useMemo(
    () =>
      data?.users.find((item) => item.email === selectedOwnerEmail) ||
      data?.users.find((item) => item.email === primaryEmail) ||
      data?.users[0],
    [data?.users, primaryEmail, selectedOwnerEmail],
  );

  const formOwnerEmail =
    selectedOwnerEmail === "all"
      ? selectedUser?.email || primaryEmail
      : selectedOwnerEmail;

  const formWallets = useMemo(
    () =>
      (data?.wallets || []).filter((wallet) =>
        selectedUser ? wallet.userId === selectedUser.id : true,
      ),
    [data?.wallets, selectedUser],
  );

  const visibleBudgetCategories = useMemo(
    () =>
      (data?.budgetCategories || []).filter((category) =>
        selectedUser ? category.userId === selectedUser.id : true,
      ),
    [data?.budgetCategories, selectedUser],
  );

  const visibleCategories = useMemo(
    () =>
      (data?.categories || []).filter(
        (category) => category.type === form.type && form.type !== "TRANSFER",
      ),
    [data?.categories, form.type],
  );
  const categoryGroups = useMemo(
    () =>
      Array.from(new Set(visibleCategories.map((category) => category.group)))
        .filter(Boolean)
        .map((group) => ({ id: group, name: group })),
    [visibleCategories],
  );
  const filteredCategories = useMemo(
    () =>
      visibleCategories.filter(
        (category) => !form.categoryGroup || category.group === form.categoryGroup,
      ),
    [form.categoryGroup, visibleCategories],
  );

  useEffect(() => {
    const fallbackWalletId =
      formWallets.find((wallet) => wallet.isDefault)?.id || formWallets[0]?.id;

    if (!fallbackWalletId || formWallets.some((wallet) => wallet.id === form.walletId)) {
      return;
    }

    setForm((current) => ({
      ...current,
      walletId: fallbackWalletId,
      transferToWalletId:
        current.transferToWalletId === fallbackWalletId
          ? ""
          : current.transferToWalletId,
    }));
  }, [form.walletId, formWallets]);

  useEffect(() => {
    if (form.type === "TRANSFER") {
      return;
    }

    if (categoryGroups.length === 0) {
      return;
    }

    if (categoryGroups.some((group) => group.id === form.categoryGroup)) {
      return;
    }

    setForm((current) => ({
      ...current,
      categoryGroup: categoryGroups[0].id,
      categoryId: "",
    }));
  }, [categoryGroups, form.categoryGroup, form.type]);

  useEffect(() => {
    if (form.type === "TRANSFER" || !form.categoryId) {
      return;
    }

    if (filteredCategories.some((category) => category.id === form.categoryId)) {
      return;
    }

    setForm((current) => ({
      ...current,
      categoryId: "",
    }));
  }, [filteredCategories, form.categoryId, form.type]);

  const submitTransaction = async () => {
    const amount = parseAmount(form.amount);

    setFormError(null);

    if (amount <= 0) {
      setFormError("Nominal transaksi harus lebih dari Rp0.");
      return;
    }

    if (!form.description.trim()) {
      setFormError("Deskripsi transaksi wajib diisi.");
      return;
    }

    if (!formOwnerEmail) {
      setFormError("User transaksi belum dipilih.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createTransaction({
        ownerEmail: formOwnerEmail,
        type: form.type,
        walletId: form.walletId,
        transferToWalletId: form.transferToWalletId || null,
        categoryId: form.categoryId || null,
        budgetCategoryId: form.budgetCategoryId || null,
        amount,
        description: form.description,
        transactionDate: form.transactionDate,
        budgetMonth: form.budgetMonth,
      });

      setForm(emptyForm(formWallets.find((wallet) => wallet.isDefault)?.id || formWallets[0]?.id));
      setIsCreateOpen(false);
      await loadData("refresh");
      setError(result.warning || null);
    } catch (submitError) {
      setFormError(
        submitError instanceof Error
          ? submitError.message
          : "Gagal menyimpan transaksi.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const amountText = (value: number) => (isAmountHidden ? "Rp ****" : formatRupiah(value));
  const amountPreview = parseAmount(form.amount);
  const periodLabel = data?.periodLabel || "Periode";
  const transactions = data?.transactions || [];
  const summary = data?.summary;

  return (
    <ScreenContainer contentContainerStyle={styles.screenContent}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Transaksi</Text>
          <Text style={styles.subtitle}>
            {ownerName(selectedOwnerEmail, data?.users || [])} - {periodLabel}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          style={styles.iconButton}
          onPress={() => loadData("refresh")}
        >
          {isRefreshing ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Ionicons name="refresh-outline" size={22} color={colors.text} />
          )}
        </Pressable>
      </View>

      <View style={styles.filterCard}>
        <View style={styles.monthRow}>
          <Pressable
            accessibilityRole="button"
            style={styles.monthButton}
            onPress={() => setMonthKey((current) => shiftMonthKey(current, -1))}
          >
            <Ionicons name="chevron-back-outline" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.monthCenter}>
            <Text style={styles.smallLabel}>Bulan</Text>
            <Text style={styles.monthLabel}>{periodLabel}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            style={styles.monthButton}
            onPress={() => setMonthKey((current) => shiftMonthKey(current, 1))}
          >
            <Ionicons name="chevron-forward-outline" size={22} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.centerWrap}>
          <Chip
            label="All"
            active={selectedOwnerEmail === "all"}
            onPress={() => setOwnerFilter("all")}
          />
          {(data?.users || []).map((item) => (
            <Chip
              key={item.id}
              label={item.name}
              active={selectedOwnerEmail === item.email}
              onPress={() => setOwnerFilter(item.email)}
            />
          ))}
        </View>

        <View style={styles.centerWrap}>
          {tabs.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              active={tab === item.value}
              onPress={() => setTab(item.value)}
            />
          ))}
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchInput}>
            <AppInput
              label="Search"
              value={searchDraft}
              onChangeText={setSearchDraft}
              onSubmitEditing={() => setQuery(searchDraft)}
              placeholder="Cari deskripsi, wallet, kategori"
              returnKeyType="search"
            />
          </View>
          <Pressable
            accessibilityRole="button"
            style={styles.searchButton}
            onPress={() => setQuery(searchDraft)}
          >
            <Ionicons name="search-outline" size={20} color={colors.primaryText} />
          </Pressable>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.summaryGrid}>
        <StatCard
          label="Income"
          value={amountText(summary?.income || 0)}
          tone="green"
        />
        <StatCard
          label="Expense"
          value={amountText(summary?.expense || 0)}
          tone="red"
        />
        <StatCard
          label="Net"
          value={amountText(summary?.netCashflow || 0)}
          tone="blue"
        />
        <StatCard
          label="Total"
          value={`${summary?.transactionCount || 0} transaksi`}
        />
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>History</Text>
          <Text style={styles.sectionSubtitle}>
            {isLoading ? "Memuat data live" : `${transactions.length} item tampil`}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.text} />
          <Text style={styles.loadingText}>Mengambil transaksi live...</Text>
        </View>
      ) : transactions.length > 0 ? (
        <View style={styles.list}>
          {transactions.map((transaction) => (
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              isAmountHidden={isAmountHidden}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          title="Belum ada transaksi"
          description="Coba ubah filter bulan, user, atau jenis transaksi."
          icon={<Ionicons name="receipt-outline" size={28} color={colors.muted} />}
        />
      )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={isCreateOpen}
        onRequestClose={() => {
          setIsCalculatorOpen(false);
          setIsCreateOpen(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalKeyboard}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => {
              setIsCalculatorOpen(false);
              setIsCreateOpen(false);
            }}
          >
            <Pressable style={styles.createSheet}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Tambah Transaksi</Text>
                  {selectedOwnerEmail === "all" ? (
                    <Text style={styles.modalSubtitle}>
                      Tersimpan untuk {selectedUser?.name || "user pertama"}.
                    </Text>
                  ) : (
                    <Text style={styles.modalSubtitle}>{ownerName(formOwnerEmail, data?.users || [])}</Text>
                  )}
                </View>
                <Pressable
                  accessibilityRole="button"
                  style={styles.modalCloseButton}
                  onPress={() => {
                    setIsCalculatorOpen(false);
                    setIsCreateOpen(false);
                  }}
                >
                  <Ionicons name="close-outline" size={22} color={colors.text} />
                </Pressable>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.formContent}
              >
                <View style={styles.wrapRow}>
                  {transactionTypes.map((item) => (
                    <Chip
                      key={item.value}
                      label={item.label}
                      active={form.type === item.value}
                      onPress={() =>
                        setForm((current) => ({
                          ...current,
                          type: item.value,
                          categoryGroup: "",
                          categoryId: "",
                          budgetCategoryId: "",
                          transferToWalletId: "",
                        }))
                      }
                    />
                  ))}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Nominal</Text>
                  <Pressable
                    accessibilityRole="button"
                    style={styles.amountDisplay}
                    onPress={() => setIsCalculatorOpen(true)}
                  >
                    <View style={styles.amountDisplayTextGroup}>
                      <Text
                        style={[
                          styles.amountDisplayValue,
                          amountPreview <= 0 ? styles.amountDisplayPlaceholder : null,
                        ]}
                      >
                        {amountPreview > 0 ? formatRupiah(amountPreview) : "Rp0"}
                      </Text>
                      <Text style={styles.amountExpression} numberOfLines={1}>
                        {form.amount || "Tap untuk hitung dengan numpad"}
                      </Text>
                    </View>
                    <View style={styles.amountCalculatorIcon}>
                      <Ionicons
                        name="calculator-outline"
                        size={22}
                        color={colors.primaryText}
                      />
                    </View>
                  </Pressable>
                  <AmountCalculatorPanel
                    visible={isCalculatorOpen}
                    initialAmount={amountPreview}
                    onClose={() => setIsCalculatorOpen(false)}
                    onApply={(amount) => {
                      setForm((current) => ({
                        ...current,
                        amount: formatAmountInput(amount),
                      }));
                      setIsCalculatorOpen(false);
                    }}
                  />
                </View>

                <DatePickerField
                  label="Tanggal"
                  value={form.transactionDate}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      transactionDate: value,
                      budgetMonth: value.slice(0, 7),
                    }))
                  }
                />

                <AppInput
                  label="Deskripsi"
                  value={form.description}
                  onChangeText={(value) =>
                    setForm((current) => ({ ...current, description: value }))
                  }
                  placeholder="Makan siang, gaji, transfer tabungan"
                />

                <DropdownField
                  title="Wallet"
                  options={formWallets}
                  selectedId={form.walletId}
                  onSelect={(id) =>
                    setForm((current) => ({ ...current, walletId: id }))
                  }
                  emptyText="Wallet belum tersedia untuk user ini."
                />

                {form.type === "TRANSFER" ? (
                  <DropdownField
                    title="Wallet Tujuan"
                    options={formWallets.filter((wallet) => wallet.id !== form.walletId)}
                    selectedId={form.transferToWalletId}
                    onSelect={(id) =>
                      setForm((current) => ({ ...current, transferToWalletId: id }))
                    }
                    emptyText="Butuh minimal dua wallet untuk transfer."
                  />
                ) : (
                  <>
                    <DropdownField
                      title="Group Kategori"
                      options={categoryGroups}
                      selectedId={form.categoryGroup}
                      onSelect={(id) =>
                        setForm((current) => ({
                          ...current,
                          categoryGroup: id,
                          categoryId: "",
                        }))
                      }
                      emptyText="Group kategori belum tersedia."
                    />
                    <DropdownField
                      title="Sub Kategori"
                      options={filteredCategories}
                      selectedId={form.categoryId}
                      onSelect={(id) =>
                        setForm((current) => ({ ...current, categoryId: id }))
                      }
                      emptyText="Pilih group kategori terlebih dahulu."
                    />
                  </>
                )}

                {form.type === "EXPENSE" ? (
                  <DropdownField
                    title="Budget Category"
                    options={visibleBudgetCategories}
                    selectedId={form.budgetCategoryId}
                    onSelect={(id) =>
                      setForm((current) => ({ ...current, budgetCategoryId: id }))
                    }
                    emptyText="Budget category belum tersedia."
                  />
                ) : null}

                {form.type !== "TRANSFER" ? (
                  <AppInput
                    label="Budget Month"
                    value={form.budgetMonth}
                    onChangeText={(value) =>
                      setForm((current) => ({ ...current, budgetMonth: value }))
                    }
                    placeholder="YYYY-MM"
                  />
                ) : null}

                {formError ? (
                  <View style={styles.formError}>
                    <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                    <Text style={styles.errorText}>{formError}</Text>
                  </View>
                ) : null}

                <AppButton
                  title="Simpan Transaksi"
                  onPress={submitTransaction}
                  loading={isSubmitting}
                  disabled={formWallets.length === 0}
                  icon={
                    <Ionicons name="save-outline" size={18} color={colors.primaryText} />
                  }
                />
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Pressable
        accessibilityRole="button"
        style={styles.addFloatingButton}
        onPress={() => setIsCreateOpen(true)}
      >
        <Ionicons name="add-outline" size={26} color={colors.primaryText} />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        style={styles.privacyButton}
        onPress={() => setIsAmountHidden((current) => !current)}
      >
        <Ionicons
          name={isAmountHidden ? "eye-off-outline" : "eye-outline"}
          size={22}
          color={colors.primaryText}
        />
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 120,
    gap: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerText: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: colors.muted,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  filterCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 14,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  monthCenter: {
    alignItems: "center",
  },
  smallLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
  },
  monthLabel: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  centerWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  wrapRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    minHeight: 38,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipDisabled: {
    opacity: 0.45,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.muted,
  },
  chipTextActive: {
    color: colors.primaryText,
  },
  pressed: {
    opacity: 0.78,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  searchInput: {
    flex: 1,
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: radius.control,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
    padding: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.error,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: "48%",
    minHeight: 92,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    justifyContent: "space-between",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.muted,
    textTransform: "uppercase",
  },
  statValue: {
    marginTop: 12,
    fontSize: 18,
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
    color: "#2563EB",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  sectionSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: colors.muted,
  },
  addButton: {
    minHeight: 42,
    paddingHorizontal: 14,
  },
  addFloatingButton: {
    position: "absolute",
    right: 20,
    bottom: 92,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  formCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 14,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  inputGrid: {
    gap: 12,
  },
  formGroup: {
    gap: 8,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
  modalKeyboard: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "#00000066",
    padding: 12,
  },
  createSheet: {
    width: "100%",
    maxHeight: "90%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
  },
  dropdownSheet: {
    width: "100%",
    maxHeight: "72%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
  },
  calculatorSheet: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 14,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  modalSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: colors.muted,
  },
  modalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  formContent: {
    gap: 14,
    paddingBottom: 8,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  amountInput: {
    flex: 1,
  },
  calculatorOpenButton: {
    width: 48,
    height: 48,
    borderRadius: radius.control,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  amountPreview: {
    marginTop: -6,
    fontSize: 13,
    fontWeight: "700",
    color: "#047857",
  },
  amountDisplay: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  amountDisplayTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  amountDisplayValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  amountDisplayPlaceholder: {
    color: colors.muted,
  },
  amountExpression: {
    marginTop: 3,
    fontSize: 12,
    color: colors.muted,
  },
  amountCalculatorIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownButton: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dropdownTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  dropdownValue: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  dropdownPlaceholder: {
    color: colors.muted,
  },
  dropdownSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
  },
  dropdownList: {
    maxHeight: 420,
  },
  dropdownListContent: {
    gap: 8,
    paddingBottom: 4,
  },
  dropdownItem: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownItemActive: {
    borderColor: "#A7F3D0",
    backgroundColor: "#ECFDF5",
  },
  dropdownItemTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  dropdownItemTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  dropdownItemTitleActive: {
    color: "#047857",
  },
  dropdownItemSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
  },
  dateButton: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dateTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  dateValue: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },
  dateRawValue: {
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
  },
  datePickerPanel: {
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    overflow: "hidden",
    paddingBottom: 10,
  },
  dateDoneButton: {
    marginHorizontal: 12,
    minHeight: 42,
  },
  calculatorPanel: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: 12,
    gap: 12,
  },
  inlinePanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  inlinePanelTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },
  inlinePanelSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
  },
  inlinePanelCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  calculatorDisplay: {
    borderRadius: radius.control,
    backgroundColor: colors.primary,
    padding: 14,
  },
  calculatorExpression: {
    minHeight: 18,
    textAlign: "right",
    fontSize: 12,
    color: "#D1D5DB",
  },
  calculatorTotal: {
    marginTop: 6,
    textAlign: "right",
    fontSize: 24,
    fontWeight: "800",
    color: colors.primaryText,
  },
  calculatorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  calculatorButton: {
    width: "23%",
    minHeight: 50,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  calculatorButtonWide: {
    width: "100%",
  },
  calculatorButtonAccent: {
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
  },
  calculatorButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },
  calculatorButtonTextAccent: {
    color: "#2563EB",
  },
  formError: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  loadingBox: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: colors.muted,
  },
  list: {
    gap: 10,
  },
  transactionCard: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 12,
  },
  transactionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  transactionBody: {
    flex: 1,
    minWidth: 0,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },
  transactionSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: colors.muted,
  },
  transactionOwner: {
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
  },
  transactionAmount: {
    maxWidth: 118,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "800",
  },
  privacyButton: {
    position: "absolute",
    right: 20,
    bottom: 28,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
});
