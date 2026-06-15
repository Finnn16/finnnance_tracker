import { StyleSheet, Text, View } from "react-native";

import { colors } from "../ui/theme";

type RecentActivityItemProps = {
  title: string;
  subtitle: string;
  amount?: string;
};

export default function RecentActivityItem({
  title,
  subtitle,
  amount,
}: RecentActivityItemProps) {
  return (
    <View style={styles.container}>
      <View style={styles.textGroup}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      {amount ? <Text style={styles.amount}>{amount}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  textGroup: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: colors.muted,
  },
  amount: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
});
