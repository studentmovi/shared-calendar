import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, reload, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { ensureUserInSyncSpace, getOrMigrateUserProfile, resolveSyncSpaceIdByCode } from '../services/syncSpaceService';
import Toast from 'react-native-toast-message';
import * as Localization from 'expo-localization';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';

// Detect device language
const isFrench = Localization.getLocales()[0]?.languageTag?.includes('fr') ?? true;

const translateFirebaseError = (error: any) => {
  if (!isFrench) return error.message;

  switch (error.code) {
    case 'auth/email-already-in-use': return 'Cette adresse e-mail est déjà utilisée.';
    case 'auth/invalid-email': return 'L\'adresse e-mail est invalide.';
    case 'auth/weak-password': return 'Le mot de passe est trop faible (6 caractères min).';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'E-mail ou mot de passe incorrect.';
    default: return 'Une erreur est survenue. Veuillez réessayer.';
  }
};

interface AuthScreenProps {
  onLoginSuccess: (activeGroupId: string | null) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [spaceCode, setSpaceCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isWaitingForVerification, setIsWaitingForVerification] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const appVersion = `V${Constants.expoConfig?.version || '1.3.0'}`;

  useEffect(() => {
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      setEmail(auth.currentUser.email || '');
      setIsWaitingForVerification(true);
    }
  }, []);

  /**
   * Allow users to manually trigger an OTA update directly from the authentication screen.
   */
  const handleCheckUpdate = async () => {
    try {
      setIsCheckingUpdate(true);
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        Toast.show({
          type: 'info',
          text1: 'Mise à jour',
          text2: isFrench ? 'Mise à jour trouvée ! Téléchargement...' : 'Update found! Downloading...'
        });
        await Updates.fetchUpdateAsync();
        Toast.show({
          type: 'success',
          text1: 'Succès',
          text2: isFrench ? 'Mise à jour prête ! Redémarrage...' : 'Update ready! Restarting...'
        });
        setTimeout(() => {
          Updates.reloadAsync();
        }, 1500);
      } else {
        Toast.show({
          type: 'success',
          text1: 'Info',
          text2: isFrench ? 'L\'application est déjà à jour.' : 'App is already up to date.'
        });
      }
    } catch (error) {
      Toast.show({
        type: 'success',
        text1: 'Info',
        text2: isFrench ? 'L\'application est déjà à jour.' : 'App is already up to date.'
      });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleAuth = async () => {
    if (!email.trim() || !password) {
      return Toast.show({ type: 'error', text1: 'Attention', text2: 'Veuillez remplir l\'e-mail et le mot de passe.' });
    }
    if (!isLogin && !username.trim()) {
      return Toast.show({ type: 'error', text1: 'Attention', text2: 'Veuillez choisir un nom d\'utilisateur.' });
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
        const profile = await getOrMigrateUserProfile(userCred.user.uid, userCred.user.email || '');
        if (profile && profile.activeGroupId) {
          await ensureUserInSyncSpace(profile.activeGroupId, userCred.user.uid, profile.username);
        }
        onLoginSuccess(profile?.activeGroupId || null);
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const cleanUsername = username.trim();
        const rawCode = spaceCode.trim().toUpperCase();

        let resolvedGroupId: string | null = null;
        if (rawCode) {
          const resolved = await resolveSyncSpaceIdByCode(rawCode);
          resolvedGroupId = resolved.groupId;
        }

        const groupIds = resolvedGroupId ? [resolvedGroupId] : [];

        await setDoc(doc(db, 'users', userCred.user.uid), {
          email: userCred.user.email,
          username: cleanUsername,
          groupIds,
          activeGroupId: resolvedGroupId,
          familyId: resolvedGroupId,
        });

        if (resolvedGroupId) {
          await ensureUserInSyncSpace(resolvedGroupId, userCred.user.uid, cleanUsername);
        }

        await sendEmailVerification(userCred.user);
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
      const profile = await getOrMigrateUserProfile(auth.currentUser.uid, auth.currentUser.email || '');
      if (profile && profile.activeGroupId) {
        await ensureUserInSyncSpace(profile.activeGroupId, auth.currentUser.uid, profile.username);
      }
      onLoginSuccess(profile?.activeGroupId || null);
    } else {
      Toast.show({ type: 'info', text1: 'Patience', text2: 'L\'e-mail n\'est pas encore validé.' });
    }
    setIsLoading(false);
  };

  const handleCancelVerification = async () => {
    await signOut(auth);
    setIsWaitingForVerification(false);
  };

  const renderUpdateFooter = () => (
    <View style={styles.versionContainer}>
      <Text style={styles.versionText}>{appVersion}</Text>
      <TouchableOpacity
        style={styles.updateBtn}
        onPress={handleCheckUpdate}
        disabled={isCheckingUpdate}
      >
        {isCheckingUpdate ? (
          <ActivityIndicator color="#0F172A" size="small" />
        ) : (
          <>
            <Ionicons name="cloud-download-outline" size={18} color="#0F172A" style={{ marginRight: 6 }} />
            <Text style={styles.updateBtnText}>
              {isFrench ? 'Vérifier les mises à jour' : 'Check for updates'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  if (isWaitingForVerification) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Vérifiez vos e-mails</Text>
        <View style={styles.card}>
          <Text style={styles.subtitle}>Un lien d'activation a été envoyé à :</Text>
          <Text style={{ fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#0F172A' }}>{email}</Text>
          <Text style={{ textAlign: 'center', marginBottom: 20, color: '#64748B' }}>
            Cliquez sur le lien dans l'e-mail pour activer votre compte, puis appuyez sur le bouton ci-dessous.
          </Text>

          <TouchableOpacity style={styles.btn} onPress={checkEmailVerification} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnText}>J'ai cliqué sur le lien !</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelVerification}>
            <Text style={styles.cancelBtnText}>Annuler et se déconnecter</Text>
          </TouchableOpacity>
        </View>

        {renderUpdateFooter()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenue sur Syncro</Text>
      <View style={styles.card}>
        <Text style={styles.subtitle}>{isLogin ? 'Connexion' : 'Créer un compte'}</Text>

        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="Nom d'utilisateur (ex: Erwan)"
            placeholderTextColor="#64748B"
            value={username}
            onChangeText={setUsername}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#64748B"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor="#64748B"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="Code SyncSpace (Optionnel - ex: COLOC482)"
            placeholderTextColor="#64748B"
            value={spaceCode}
            onChangeText={setSpaceCode}
            autoCapitalize="characters"
          />
        )}

        <TouchableOpacity style={styles.btn} onPress={handleAuth} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.btnText}>{isLogin ? 'Se connecter' : 'S\'inscrire'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.switchText}>
            {isLogin ? 'Pas de compte ? Créer un compte Syncro' : 'Déjà un compte ? Se connecter'}
          </Text>
        </TouchableOpacity>
      </View>

      {renderUpdateFooter()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#0F172A', textAlign: 'center', marginBottom: 30 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, elevation: 3 },
  subtitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#0F172A', textAlign: 'center' },
  input: { backgroundColor: '#F1F5F9', color: '#0F172A', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 15 },
  btn: { backgroundColor: '#FF4D4D', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 15 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  cancelBtn: { backgroundColor: '#F1F5F9', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  cancelBtnText: { color: '#64748B', fontWeight: 'bold', fontSize: 14 },
  switchText: { color: '#64748B', textAlign: 'center', marginTop: 10, textDecorationLine: 'underline' },
  versionContainer: { alignItems: 'center', marginTop: 25 },
  versionText: { fontSize: 13, fontWeight: 'bold', color: '#94A3B8', letterSpacing: 1 },
  updateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E2E8F0', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginTop: 10 },
  updateBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 13 }
});