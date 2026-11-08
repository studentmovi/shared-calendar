import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

// PROTECTION MULTI-PLATEFORME : 
// Firebase utilise getAuth classique sur le Web, et la persistance locale (AsyncStorage) sur Mobile.
let authAction;
if (Platform.OS === 'web') {
  authAction = getAuth(app);
} else {
  authAction = initializeAuth(app, {
    persistence: getReactNativePersistence ? getReactNativePersistence(AsyncStorage) : undefined
  });
}

export const auth = authAction;
auth.languageCode = 'fr'; 

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});