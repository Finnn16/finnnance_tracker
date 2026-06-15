import ScreenContainer from "@/components/ui/ScreenContainer";
import { colors } from "@/components/ui/theme";
import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

const moreItems = [
  {
    title: "Wallets",
    description: "Akun, cash, bank, dan e-wallet.",
    icon: "wallet-outline",
    href: "/(tabs)/wallets",
  },
  {
    title: "Savings",
    description: "Dana yang dipisahkan dari saldo operasional.",
    icon: "shield-checkmark-outline",
    href: "/(tabs)/savings",
  },
  {
    title: "Hutang Piutang",
    description: "Posisi hutang, piutang, dan settlement.",
    icon: "receipt-outline",
    href: "/(tabs)/debts",
  },
  {
    title: "Settings",
    description: "Konfigurasi aplikasi dan preferensi.",
    icon: "settings-outline",
    href: "/(tabs)/settings",
  },
] as const;

export default function MoreScreen() {
  return (
    <ScreenContainer contentContainerStyle={styles.content}>
      <Text style={styles.title}>More</Text>
      <Text style={styles.subtitle}>Menu lain dari Finnnance Tracker.</Text>

      <View style={styles.list}>
        {moreItems.map((item) => (
          <Pressable
            accessibilityRole="button"
            key={item.title}
            style={styles.item}
            onPress={() => router.push(item.href as Href)}
          >
            <View style={styles.iconBox}>
              <Ionicons name={item.icon} size={22} color={colors.text} />
            </View>
            <View style={styles.itemText}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDescription}>{item.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 28,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: colors.muted,
  },
  list: {
    marginTop: 22,
    gap: 12,
  },
  item: {
    minHeight: 78,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },
  itemDescription: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
  },
});
