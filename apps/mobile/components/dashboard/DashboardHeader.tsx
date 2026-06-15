import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors } from "../ui/theme";

type DashboardHeaderProps = {
  name: string;
  statusLabel?: string;
  isLoading?: boolean;
  isFallback?: boolean;
  isMenuOpen?: boolean;
  onProfilePress?: () => void;
  onSignOut?: () => void;
};

export default function DashboardHeader({
  name,
  statusLabel,
  isLoading = false,
  isFallback = false,
  isMenuOpen = false,
  onProfilePress,
  onSignOut,
}: DashboardHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.textGroup}>
        <Text style={styles.greeting}>Halo, {name}</Text>
        <Text style={styles.subtitle}>Selamat datang kembali</Text>
      </View>

      <View style={styles.profileGroup}>
        {statusLabel ? (
          <View
            style={[
              styles.sourcePill,
              isFallback ? styles.demoPill : styles.livePill,
            ]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.muted} />
            ) : null}
            <Text
              style={[
                styles.sourceText,
                isFallback ? styles.demoText : styles.liveText,
              ]}
            >
              {statusLabel}
            </Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          style={styles.avatar}
          onPress={onProfilePress}
        >
          <Ionicons name="person-outline" size={22} color={colors.text} />
        </Pressable>

        {isMenuOpen ? (
          <View style={styles.profileMenu}>
            <Pressable
              accessibilityRole="button"
              style={styles.menuItem}
              onPress={onSignOut}
            >
              <Ionicons name="log-out-outline" size={18} color="#B91C1C" />
              <Text style={styles.menuItemText}>Keluar</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  textGroup: {
    flex: 1,
    paddingRight: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: colors.muted,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileGroup: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  profileMenu: {
    position: "absolute",
    right: 0,
    top: 52,
    zIndex: 20,
    minWidth: 132,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  menuItem: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#B91C1C",
  },
});
