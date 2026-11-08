import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CalendarProvider } from '../context/CalendarContext';
import { useSharedCalendar } from '../hooks/useSharedCalendar';
import { LanguageProvider, useTranslation } from '../context/LanguageContext';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';

import LoadingScreen from '../components/LoadingScreen';
import AuthScreen from '../components/AuthScreen';

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  
  // On récupère le thème choisi dans les réglages
  const { theme } = useSharedCalendar();
  const systemTheme = useColorScheme();
  
  // On détermine si le mode sombre est actif
  const isDark = (theme === 'system' ? systemTheme : theme) === 'dark';

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { 
        // La barre s'adapte au mode sombre !
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
          tabBarIcon: ({ color }) => <Ionicons name="calendar" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="settings" 
        options={{ 
          title: t('settings'), 
          tabBarIcon: ({ color }) => <Ionicons name="settings" size={24} color={color} /> 
        }} 
      />
    </Tabs>
  );
}

export default function RootLayout() {
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [familyId, setFamilyId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.emailVerified) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) { 
          setFamilyId(userDoc.data().familyId); 
          setIsAuthenticated(true); 
        }
      } else {
        setIsAuthenticated(false); 
        setFamilyId(null);
      }
      setTimeout(() => setIsAppLoading(false), 4500);
    });
    return () => unsubscribe();
  }, []);

  return (
    <LanguageProvider>
      {isAppLoading ? (
        <LoadingScreen />
      ) : !isAuthenticated || !familyId ? (
        <AuthScreen onLoginSuccess={(famId) => { 
          setFamilyId(famId); 
          setIsAuthenticated(true); 
        }} />
      ) : (
        <CalendarProvider familyId={familyId}>
          <MainTabs />
        </CalendarProvider>
      )}
      <Toast />
    </LanguageProvider>
  );
}