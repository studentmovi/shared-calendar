import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // On cache l'en-tête natif, on fera le nôtre
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          height: 60,
          paddingBottom: 10, // Ajustement pour iOS
        },
        tabBarActiveTintColor: '#0F172A', // Couleur de l'onglet actif
        tabBarInactiveTintColor: '#94A3B8', // Couleur de l'onglet inactif
      }}>
      
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          // Note : Idéalement, utilisez des icônes (ex: Ionicons) ici plus tard
          tabBarIcon: () => null, 
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Paramètres',
          tabBarIcon: () => null,
        }}
      />
    </Tabs>
  );
}