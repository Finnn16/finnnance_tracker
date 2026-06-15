import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius } from "./theme";

type CardInfoProps = {
  title: string;
  value: string;
  description?: string;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  color?: string;
};

export default function CardInfo({
  title,
  value,
  description,
  icon,
  style,
  color,
}: CardInfoProps) {
  return (
    <View
      style={[styles.card, style, color ? { backgroundColor: color } : null]}
    >
      <View style={styles.header}>
        <View style={styles.textGroup}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>

        {icon ? <View style={styles.icon}>{icon}</View> : null}
      </View>

      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  textGroup: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 6,
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  description: {
    marginTop: 10,
    fontSize: 12,
    color: colors.muted,
  },
});
