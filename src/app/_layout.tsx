import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CalendarProvider } from '../context/CalendarContext';
import { useSharedCalendar } from '../hooks/useSharedCalendar';
import { LanguageProvider, useTranslation } from '../context/LanguageContext';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { getOrMigrateUserProfile, ensureUserInSyncSpace } from '../services/syncSpaceService';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import * as Updates from 'expo-updates';

import LoadingScreen from '../components/LoadingScreen';
import AuthScreen from '../components/AuthScreen';

/**
 * Main bottom tab navigator adapting dynamically to the selected theme.
 */
function MainTabs() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { theme } = useSharedCalendar();
  const systemTheme = useColorScheme();
  const isDark = (theme === 'system' ? systemTheme : theme) === 'dark';

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: isDark ? '#1E293B' : '#E2E8F0',
        height: 60 + insets.bottom,
        paddingBottom: 8 + insets.bottom,
        paddingTop: 8,
      },
      tabBarActiveTintColor: '#FF4D4D',
      tabBarInactiveTintColor: isDark ? '#64748B' : '#94A3B8',
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('agenda'),
          tabBarIcon: ({ color }) => <Ionicons name="calendar" size={24} color={color as string} />
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings'),
          tabBarIcon: ({ color }) => <Ionicons name="settings" size={24} color={color as string} />
        }}
      />
    </Tabs>
  );
}

/**
 * Root application layout managing silent OTA updates, authentication state, and active SyncSpace context.
 */
export default function RootLayout() {
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [familyId, setFamilyId] = useState<string | null>(null);

  // Automatically check and apply OTA updates on app startup
  useEffect(() => {
    const checkStartupUpdate = async () => {
      if (__DEV__) return; // Skip in Expo Go / local development
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (error) {
        // Ignore update errors silently on startup
      }
    };
    checkStartupUpdate();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.emailVerified) {
        const profile = await getOrMigrateUserProfile(user.uid, user.email || '');
        if (profile) {
          if (profile.activeGroupId) {
            await ensureUserInSyncSpace(profile.activeGroupId, user.uid, profile.username);
          }
          setFamilyId(profile.activeGroupId);
          setIsAuthenticated(true);
        }
      } else {
        setIsAuthenticated(false);
        setFamilyId(null);
      }
      setTimeout(() => setIsAppLoading(false), 2000);
    });
    return () => unsubscribe();
  }, []);

  return (
    <LanguageProvider>
      {isAppLoading ? (
        <LoadingScreen />
      ) : !isAuthenticated ? (
        <AuthScreen onLoginSuccess={(activeSpaceId) => {
          setFamilyId(activeSpaceId);
          setIsAuthenticated(true);
        }} />
      ) : (
        <CalendarProvider familyId={familyId} setActiveFamilyId={setFamilyId}>
          <MainTabs />
        </CalendarProvider>
      )}
      <Toast />
    </LanguageProvider>
  );
}