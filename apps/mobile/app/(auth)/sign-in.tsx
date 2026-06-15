import AppButton from "@/components/ui/AppButton";
import ScreenContainer from "@/components/ui/ScreenContainer";
import { colors } from "@/components/ui/theme";
import { Ionicons } from "@expo/vector-icons";
import { useSSO } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { startSSOFlow } = useSSO();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleGoogleSignIn() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/(tabs)/dashboard");
      }
    } catch {
      setErrorMessage("Login Google belum berhasil. Coba lagi sebentar.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ScreenContainer contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Ionicons name="wallet-outline" size={28} color={colors.text} />
        </View>
        <Text style={styles.appName}>Finnnance Tracker</Text>
        <Text style={styles.title}>Masuk dengan Clerk</Text>
        <Text style={styles.subtitle}>
          Gunakan akun Google yang sama seperti di web tracker.
        </Text>
      </View>

      <View style={styles.panel}>
        <AppButton
          title="Lanjut dengan Google"
          onPress={handleGoogleSignIn}
          loading={isLoading}
          icon={<Ionicons name="logo-google" size={18} color="#FFFFFF" />}
        />

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Text style={styles.note}>
          Akses dibatasi untuk email yang terdaftar di Finnnance Tracker.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
    gap: 24,
  },
  header: {
    alignItems: "flex-start",
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },
  appName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.muted,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 8,
    fontSize: 30,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
  },
  panel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 14,
  },
  errorBox: {
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
  note: {
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
  },
});
