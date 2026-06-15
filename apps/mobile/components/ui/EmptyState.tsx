import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius } from "./theme";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function EmptyState({
  title,
  description,
  icon,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 120,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  icon: {
    marginBottom: 12,
  },
  title: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  description: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
});
