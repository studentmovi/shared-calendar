import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CalendarProvider } from '../context/CalendarContext';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LoadingScreen from '../components/LoadingScreen';
import AuthScreen from '../components/AuthScreen';

function MainTabs() {
  // Récupère dynamiquement les marges de sécurité du téléphone (encoche en haut, barre de navigation en bas)
  const insets = useSafeAreaInsets();

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { 
        backgroundColor: '#FFFFFF', 
        borderTopWidth: 1, 
        borderTopColor: '#E2E8F0', 
        // La hauteur s'adapte EXACTEMENT à la taille de la barre système de n'importe quel Android/iPhone
        height: 60 + insets.bottom,
        paddingBottom: 8 + insets.bottom,
        paddingTop: 8,
      },
      tabBarActiveTintColor: '#FF4D4D',
      tabBarInactiveTintColor: '#94A3B8',
    }}>
      <Tabs.Screen name="index" options={{ title: 'Agenda', tabBarIcon: ({ color }) => <Ionicons name="calendar" size={24} color={color as string} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Réglages', tabBarIcon: ({ color }) => <Ionicons name="settings" size={24} color={color as string} /> }} />
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
    <>
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
    </>
  );
}