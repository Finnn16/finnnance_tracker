import { useAuth, useClerk, useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs, type Href } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const allowedEmails = (process.env.EXPO_PUBLIC_ALLOWED_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const primaryEmail = user?.primaryEmailAddress?.emailAddress.toLowerCase();
  const isAllowed =
    !primaryEmail ||
    allowedEmails.length === 0 ||
    allowedEmails.includes(primaryEmail);

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return <Redirect href={"/(auth)/sign-in" as Href} />;
  }

  if (!isAllowed) {
    return (
      <View style={styles.blockedScreen}>
        <Text style={styles.blockedTitle}>Akun tidak terdaftar</Text>
        <Text style={styles.blockedDescription}>
          Aplikasi ini hanya untuk email yang terdaftar di Finnnance Tracker.
        </Text>
        <Pressable style={styles.signOutButton} onPress={() => signOut()}>
          <Text style={styles.signOutText}>Keluar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="bar-chart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transaksi',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="swap-horizontal" color={color} />,
        }}
      />
      <Tabs.Screen
        name="wallets"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="savings"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="budgets"
        options={{
          title: 'Budget',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="pie-chart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="debts"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="menu" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  blockedScreen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F9FAFB',
  },
  blockedTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  blockedDescription: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: '#6B7280',
  },
  signOutButton: {
    marginTop: 20,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
