import { Tabs } from 'expo-router';
import React from 'react';
import { CalendarProvider } from '../context/CalendarContext';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <CalendarProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E2E8F0',
            // Marges dynamiques pour ne pas chevaucher la barre Android
            paddingBottom: Platform.OS === 'android' ? 10 : 25,
            paddingTop: 5,
            minHeight: Platform.OS === 'android' ? 65 : 85,
          },
          tabBarActiveTintColor: '#0F172A',
          tabBarInactiveTintColor: '#94A3B8',
        }}>
        <Tabs.Screen 
          name="index" 
          options={{ 
            title: 'Agenda',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar" size={size} color={color} />
            )
          }} 
        />
        <Tabs.Screen 
          name="settings" 
          options={{ 
            title: 'Paramètres',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings" size={size} color={color} />
            )
          }} 
        />
      </Tabs>
    </CalendarProvider>
  );
}