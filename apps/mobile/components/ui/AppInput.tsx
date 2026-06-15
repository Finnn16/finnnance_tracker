import type { TextInputProps } from "react-native";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { colors, radius } from "./theme";

type AppInputProps = TextInputProps & {
  label: string;
  error?: string;
};

export default function AppInput({
  label,
  error,
  editable = true,
  secureTextEntry,
  style,
  ...props
}: AppInputProps) {
  const hasError = Boolean(error);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        editable={editable}
        secureTextEntry={secureTextEntry}
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          hasError ? styles.inputError : null,
          !editable ? styles.inputDisabled : null,
          style,
        ]}
      />
      {hasError ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputDisabled: {
    backgroundColor: colors.background,
    color: colors.muted,
  },
  error: {
    marginTop: 6,
    fontSize: 12,
    color: colors.error,
  },
});
