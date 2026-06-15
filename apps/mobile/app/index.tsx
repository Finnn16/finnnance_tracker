import { useAuth } from "@clerk/expo";
import { Redirect, type Href } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function IndexScreen() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#111827" />
      </View>
    );
  }

  return isSignedIn ? (
    <Redirect href="/(tabs)/dashboard" />
  ) : (
    <Redirect href={"/(auth)/sign-in" as Href} />
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
});
