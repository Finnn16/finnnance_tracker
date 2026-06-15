import ScreenContainer from "@/components/ui/ScreenContainer";
import { colors } from "@/components/ui/theme";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

type PlaceholderTabScreenProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
};

export default function PlaceholderTabScreen({
  icon,
  title,
  description,
}: PlaceholderTabScreenProps) {
  return (
    <ScreenContainer contentContainerStyle={styles.content}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={28} color={colors.text} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
  },
  iconBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
  },
  description: {
    marginTop: 10,
    maxWidth: 320,
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
  },
});
