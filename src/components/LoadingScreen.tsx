import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';

const BASE_MESSAGES = [
  "Dépoussiérage du calendrier...",
  "Réveil des serveurs ...",
  "Chasse aux événements en double...",
  "Mise en place des paramètres...",
  "Coloriage des petites pilules...",
  "On demande la permission au chat...",
  "Presque prêt, on peaufine les détails !"
];

const getSeasonalTheme = () => {
  const month = new Date().getMonth(); // 0 = Janvier, 11 = Décembre
  const date = new Date().getDate();

  if (month === 9) { // Octobre (Halloween)
    return {
      color: '#EA580C', bgColor: '#FFF7ED', icon: '🎃', 
      garland: ['🕸️', '🕷️', '🦇', '🕸️', '🕷️', '🦇', '🕸️'],
      messages: ["Tissage des toiles d'araignées...", "Réveil des fantômes...", "Préparation des potions magiques...", ...BASE_MESSAGES]
    };
  }
  if (month === 11) { // Décembre (Noël)
    return {
      color: '#16A34A', bgColor: '#F0FDF4', icon: '🎅', 
      garland: ['🎄', '🌟', '🎁', '🌟', '🎄', '🌟', '🎁'],
      messages: ["Emballage des cadeaux...", "Attelage des rennes...", "Dépoussiérage du traîneau...", ...BASE_MESSAGES]
    };
  }
  if (month === 0) { // Janvier (Nouvel An)
    return {
      color: '#D97706', bgColor: '#FEF3C7', icon: '🎆', 
      garland: ['🥂', '✨', '🎊', '✨', '🥂', '✨', '🎊'],
      messages: ["Lancement des feux d'artifice...", "Bonne année ! Préparation de l'agenda...", ...BASE_MESSAGES]
    };
  }
  if (month === 1) { // Février (Saint-Valentin)
    return {
      color: '#E11D48', bgColor: '#FFF1F2', icon: '💘', 
      garland: ['💕', '🌹', '💗', '🌹', '💕', '🌹', '💗'],
      messages: ["Cupidon bande son arc...", "Ajout de petits cœurs...", ...BASE_MESSAGES]
    };
  }
  if (month >= 5 && month <= 7) { // Juin, Juillet, Août (Été)
    return {
      color: '#0284C7', bgColor: '#F0F9FF', icon: '🏖️', 
      garland: ['🌴', '🥥', '☀️', '🌊', '🌴', '🥥', '☀️'],
      messages: ["Préparation de la crème solaire...", "Gonflage des bouées...", "Réservation des transats...", ...BASE_MESSAGES]
    };
  }
  if (month >= 2 && month <= 4) { // Printemps
    return {
      color: '#10B981', bgColor: '#ECFDF5', icon: '🌸', 
      garland: ['🌷', '🌼', '🌻', '🌼', '🌷', '🌼', '🌻'],
      messages: ["Bourgeonnement des événements...", "Retour des hirondelles...", ...BASE_MESSAGES]
    };
  }
  
  // Défaut : Automne (Septembre, Novembre)
  return {
    color: '#B45309', bgColor: '#FFFBEB', icon: '🍂', 
    garland: ['🍁', '🍄', '🍂', '🍄', '🍁', '🍄', '🍂'],
    messages: ["Ramassage des feuilles mortes...", "Préparation d'un chocolat chaud...", ...BASE_MESSAGES]
  };
};

export default function LoadingScreen() {
  const [messageIndex, setMessageIndex] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const theme = getSeasonalTheme();

  useEffect(() => {
    // Animation de respiration sur l'icône centrale
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.25, duration: 900, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 900, useNativeDriver: true })
      ])
    ).start();

    // Défilement des textes : on commence par les phrases saisonnières, puis les phrases de base
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1 < theme.messages.length ? prev + 1 : prev));
    }, 1500);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.bgColor }]}>
      
      {/* La "Guirlande" dynamique tout en haut de l'écran */}
      <View style={styles.garlandContainer}>
        {theme.garland.map((emoji, index) => (
          <Text key={index} style={styles.garlandEmoji}>{emoji}</Text>
        ))}
      </View>

      <Animated.Text style={[styles.mainIcon, { transform: [{ scale: scaleAnim }] }]}>
        {theme.icon}
      </Animated.Text>
      
      <Text style={[styles.title, { color: theme.color }]}>Syncro</Text>
      
      <ActivityIndicator size="large" color={theme.color} style={styles.loader} />
      
      <Text style={styles.message}>{theme.messages[messageIndex]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  garlandContainer: { 
    position: 'absolute', 
    top: 50, 
    flexDirection: 'row', 
    width: '100%', 
    justifyContent: 'space-evenly',
    paddingHorizontal: 10
  },
  garlandEmoji: { fontSize: 24, opacity: 0.8 },
  mainIcon: { fontSize: 80, marginBottom: 10 },
  title: { fontSize: 44, fontWeight: '900', marginBottom: 40, letterSpacing: 2 },
  loader: { marginBottom: 20 },
  message: { fontSize: 16, color: '#475569', fontStyle: 'italic', textAlign: 'center', paddingHorizontal: 20, height: 40 }
});