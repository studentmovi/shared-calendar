import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, reload, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import Toast from 'react-native-toast-message';
import * as Localization from 'expo-localization';

// Détection de la langue du téléphone
const isFrench = Localization.getLocales()[0].languageTag.includes('fr');

const translateFirebaseError = (error: any) => {
  if (!isFrench) return error.message; // Laisse en anglais si le téléphone n'est pas FR
  
  switch (error.code) {
    case 'auth/email-already-in-use': return 'Cette adresse e-mail est déjà utilisée.';
    case 'auth/invalid-email': return 'L\'adresse e-mail est invalide.';
    case 'auth/weak-password': return 'Le mot de passe est trop faible (6 min).';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'E-mail ou mot de passe incorrect.';
    default: return 'Une erreur est survenue. Veuillez réessayer.';
  }
};

export default function AuthScreen({ onLoginSuccess }: { onLoginSuccess: (familyId: string) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [familyCode, setFamilyCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isWaitingForVerification, setIsWaitingForVerification] = useState(false);
  const [pendingFamilyCode, setPendingFamilyCode] = useState('');

  useEffect(() => {
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      setEmail(auth.currentUser.email || '');
      setIsWaitingForVerification(true);
    }
  }, []);

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && !familyCode)) {
      return Toast.show({ type: 'error', text1: 'Attention', text2: 'Veuillez remplir tous les champs.' });
    }
    setIsLoading(true);

    try {
      if (isLogin) {
        const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
        if (!userCred.user.emailVerified) {
          await sendEmailVerification(userCred.user);
          setIsWaitingForVerification(true);
          setIsLoading(false);
          return;
        }
        const userDoc = await getDoc(doc(db, 'users', userCred.user.uid));
        if (userDoc.exists()) onLoginSuccess(userDoc.data().familyId);
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const upperFamilyCode = familyCode.trim().toUpperCase();
        
        await setDoc(doc(db, 'users', userCred.user.uid), { email: userCred.user.email, familyId: upperFamilyCode });
        await sendEmailVerification(userCred.user);
        setPendingFamilyCode(upperFamilyCode);
        setIsWaitingForVerification(true);
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Erreur', text2: translateFirebaseError(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const checkEmailVerification = async () => {
    if (!auth.currentUser) return;
    setIsLoading(true);
    await reload(auth.currentUser); 
    
    if (auth.currentUser.emailVerified) {
      if (pendingFamilyCode) onLoginSuccess(pendingFamilyCode);
      else {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) onLoginSuccess(userDoc.data().familyId);
      }
    } else {
      Toast.show({ type: 'info', text1: 'Patience', text2: 'L\'e-mail n\'est pas encore validé.' });
    }
    setIsLoading(false);
  };

  const handleCancelVerification = async () => {
    await signOut(auth);
    setIsWaitingForVerification(false);
  };
  
  if (isWaitingForVerification) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Vérifiez vos e-mails</Text>
        <View style={styles.card}>
          <Text style={styles.subtitle}>Un lien magique a été envoyé à :</Text>
          <Text style={{fontWeight: 'bold', marginBottom: 20, textAlign: 'center'}}>{email}</Text>
          <Text style={{textAlign: 'center', marginBottom: 20, color: '#64748B'}}>
            Cliquez sur le lien dans l'e-mail pour activer votre compte, puis appuyez sur le bouton ci-dessous.
          </Text>
          
          <TouchableOpacity style={styles.btn} onPress={checkEmailVerification} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color={"#FFFFFF" as string} /> : <Text style={styles.btnText}>J'ai cliqué sur le lien !</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelVerification}>
            <Text style={styles.cancelBtnText}>Annuler et se déconnecter</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenue sur Syncro</Text>
      <View style={styles.card}>
        <Text style={styles.subtitle}>{isLogin ? 'Connexion' : 'Créer un compte'}</Text>
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry />
        {!isLogin && (
          <TextInput style={styles.input} placeholder="Code de Famille (ex: DURAND24)" value={familyCode} onChangeText={setFamilyCode} autoCapitalize="characters" />
        )}
        <TouchableOpacity style={styles.btn} onPress={handleAuth} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color={"#FFFFFF" as string} /> : <Text style={styles.btnText}>{isLogin ? 'Se connecter' : 'S\'inscrire'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.switchText}>{isLogin ? "Pas de compte ? Créer et rejoindre une famille" : "Déjà un compte ? Se connecter"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#0F172A', textAlign: 'center', marginBottom: 30 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, elevation: 3 },
  subtitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#333', textAlign: 'center' },
  input: { backgroundColor: '#F1F5F9', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  btn: { backgroundColor: '#FF4D4D', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 15 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  cancelBtn: { backgroundColor: '#F1F5F9', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  cancelBtnText: { color: '#64748B', fontWeight: 'bold', fontSize: 14 },
  switchText: { color: '#64748B', textAlign: 'center', marginTop: 10, textDecorationLine: 'underline' }
});