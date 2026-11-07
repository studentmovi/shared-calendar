import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

const FUNNY_MESSAGES = [
  "Dépoussiérage du calendrier...",
  "Réveil des serveurs ...",
  "Chasse aux événements en double...",
  "Mise en place des paramètres...",
  "Coloriage des petites pilules...",
  "On demande la permission au chat...",
  "Presque prêt, on peaufine les détails !"
];

export default function LoadingScreen() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    // Fait défiler les phrases toutes les 1.8 secondes
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1 < FUNNY_MESSAGES.length ? prev + 1 : prev));
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      {/* Vous pourrez remettre l'image de votre logo ici plus tard */}
      <Text style={styles.title}>Syncro</Text>
      <ActivityIndicator size="large" color="#FF4D4D" style={styles.loader} />
      <Text style={styles.message}>{FUNNY_MESSAGES[messageIndex]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 40, fontWeight: 'bold', color: '#0F172A', marginBottom: 40, letterSpacing: 2 },
  loader: { marginBottom: 20 },
  message: { fontSize: 16, color: '#64748B', fontStyle: 'italic', textAlign: 'center' }
});