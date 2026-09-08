import { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Alert,
  SafeAreaView, StatusBar, ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Accelerometer } from 'expo-sensors';
import * as SMS from 'expo-sms';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Colors, Spacing, Radius, Typography, Shadows } from '../constants/theme';

const API_URL = 'http://10.183.148.19:5000';

export default function Index() {
  const [sending, setSending] = useState(false);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [guardianSessionId, setGuardianSessionId] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  const currentUser = auth.currentUser;
  const userId = currentUser?.uid ?? 'anonymous';
  const userEmail = currentUser?.email ?? '';

  // Shake-to-SOS
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const SHAKE_THRESHOLD = 2.5;
    let lastShake = 0;
    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      if (magnitude > SHAKE_THRESHOLD && now - lastShake > 3000) {
        lastShake = now;
        triggerSOS();
      }
    });
    Accelerometer.setUpdateInterval(200);
    return () => subscription.remove();
  }, []);

  // Guardian location ping
  useEffect(() => {
    if (!guardianSessionId) { setRemainingSeconds(null); return; }
    const interval = setInterval(async () => {
      const { coords } = await Location.getCurrentPositionAsync({});
      fetch(API_URL + '/api/guardian/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: guardianSessionId, latitude: coords.latitude, longitude: coords.longitude }),
      });
      fetch(API_URL + '/api/guardian/' + guardianSessionId)
        .then((r) => r.json())
        .then((data) => { if (data.success) setRemainingSeconds(data.session.remainingSeconds); })
        .catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [guardianSessionId]);

  // Live SOS location tracking
  useEffect(() => {
    if (!activeAlertId) return;
    const interval = setInterval(async () => {
      try {
        const { coords } = await Location.getCurrentPositionAsync({});
        await fetch(API_URL + '/api/alerts/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alertId: activeAlertId, latitude: coords.latitude, longitude: coords.longitude }),
        });
      } catch {}
    }, 10000);
    return () => clearInterval(interval);
  }, [activeAlertId]);

  async function triggerSOS() {
    setSending(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location access is required to send an alert.');
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({});
      const res = await fetch(API_URL + '/api/alerts/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, trigger_type: 'button', latitude: coords.latitude, longitude: coords.longitude }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveAlertId(data.alertId);
        Alert.alert('SOS Sent', 'Emergency alert triggered. Your location is being shared.');
      } else {
        Alert.alert('Error', 'Failed to send alert. Check your backend is running.');
      }
    } catch (err: any) {
      try {
        const { coords } = await Location.getCurrentPositionAsync({});
        const isAvailable = await SMS.isAvailableAsync();
        if (isAvailable) {
          await SMS.sendSMSAsync(['9999999999'], 'SheShield SOS: I need help. https://maps.google.com/?q=' + coords.latitude + ',' + coords.longitude);
          Alert.alert('Sent via SMS', 'No internet - alert sent via SMS.');
        } else {
          Alert.alert('Error', err.message);
        }
      } catch {
        Alert.alert('Error', 'Failed to send alert via network or SMS.');
      }
    } finally {
      setSending(false);
    }
  }

  async function startGuardianMode() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Location access is required for Guardian Mode.');
      return;
    }
    const { coords } = await Location.getCurrentPositionAsync({});
    const res = await fetch(API_URL + '/api/guardian/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, guardianId: 'lHbTxTwDJ4UOzTj3haXm', durationMinutes: 45, latitude: coords.latitude, longitude: coords.longitude }),
    });
    const data = await res.json();
    if (data.success) {
      setGuardianSessionId(data.sessionId);
      Alert.alert('Guardian Mode Active', 'Sharing location with ' + data.guardianName);
    } else {
      Alert.alert('Error', data.error || 'Failed to start Guardian Mode');
    }
  }

  async function endGuardianMode() {
    if (!guardianSessionId) return;
    try {
      await fetch(API_URL + '/api/guardian/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: guardianSessionId }),
      });
    } catch {}
    setGuardianSessionId(null);
    Alert.alert('Guardian Mode Ended', 'Location sharing has stopped.');
  }

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        setLoggingOut(true);
        try {
          if (guardianSessionId) await endGuardianMode();
          await signOut(auth);
        } catch { setLoggingOut(false); }
      }},
    ]);
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return m + ':' + sec;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle='light-content' backgroundColor={Colors.berry} />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name='shield-checkmark' size={24} color={Colors.gold} />
          <Text style={styles.headerTitle}>SheShield</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={handleLogout} disabled={loggingOut} accessibilityLabel='Sign out'>
          {loggingOut ? <ActivityIndicator size='small' color={Colors.gold} /> : <Ionicons name='log-out-outline' size={20} color={Colors.gold} />}
        </TouchableOpacity>
      </View>
      {userEmail ? (
        <View style={styles.userStrip}>
          <Ionicons name='person-circle-outline' size={14} color={Colors.textSecondary} />
          <Text style={styles.userEmail} numberOfLines={1}>{userEmail}</Text>
        </View>
      ) : null}
      <View style={styles.container}>
        {guardianSessionId && remainingSeconds !== null && (
          <View style={styles.guardianBanner}>
            <View style={styles.pulseDot} />
            <MaterialIcons name='my-location' size={16} color={Colors.guardianLight} />
            <Text style={styles.guardianBannerText}>Guardian Active · {formatTime(remainingSeconds)} remaining</Text>
          </View>
        )}
        {activeAlertId && (
          <View style={styles.sosBanner}>
            <View style={[styles.pulseDot, { backgroundColor: Colors.emergencyLight }]} />
            <Text style={styles.sosBannerText}>SOS ACTIVE — Location Sharing Live</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.sosButton, sending && styles.sosButtonSending]}
          onPress={triggerSOS}
          onLongPress={() => router.push('/fake-call')}
          disabled={sending}
          accessibilityRole='button'
          accessibilityLabel={sending ? 'Sending SOS' : 'Tap to send SOS alert'}
        >
          {sending ? <ActivityIndicator color='#fff' size='large' /> : (
            <>
              <Ionicons name='warning' size={44} color='#fff' style={{ marginBottom: 6 }} />
              <Text style={styles.sosText}>SOS</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.hint}>Tap for SOS · Long-press for fake call</Text>
        <TouchableOpacity
          style={[styles.guardianBtn, guardianSessionId ? styles.guardianBtnStop : styles.guardianBtnStart]}
          onPress={guardianSessionId ? endGuardianMode : startGuardianMode}
          accessibilityRole='button'
        >
          <Ionicons name={guardianSessionId ? 'stop-circle-outline' : 'people-circle-outline'} size={20} color='#fff' />
          <Text style={styles.guardianBtnText}>{guardianSessionId ? 'End Guardian Mode' : 'Start Guardian Mode'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: 14, backgroundColor: Colors.berry, ...Shadows.berry },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: '#fff', fontSize: Typography.lg, fontWeight: Typography.bold, letterSpacing: 0.3 },
  profileBtn: { padding: 6, borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.1)' },
  userStrip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.base, paddingVertical: 8, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  userEmail: { fontSize: Typography.xs, color: Colors.textSecondary, flex: 1 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.base },
  guardianBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.guardianBg, paddingVertical: 10, paddingHorizontal: Spacing.base, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.guardianBorder, position: 'absolute', top: 24 },
  sosBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.emergencyBg, paddingVertical: 10, paddingHorizontal: Spacing.base, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.emergencyBorder, position: 'absolute', top: 70 },
  guardianBannerText: { color: Colors.guardianLight, fontWeight: Typography.semibold, fontSize: Typography.sm },
  sosBannerText: { color: Colors.emergencyLight, fontWeight: Typography.bold, fontSize: Typography.sm, letterSpacing: 0.3 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.guardianLight },
  sosButton: { width: 200, height: 200, borderRadius: 100, backgroundColor: Colors.emergency, alignItems: 'center', justifyContent: 'center', ...Shadows.emergency, borderWidth: 4, borderColor: 'rgba(255,255,255,0.15)' },
  sosButtonSending: { opacity: 0.75 },
  sosText: { color: '#fff', fontSize: Typography.xxxl, fontWeight: Typography.extrabold, letterSpacing: 2 },
  hint: { color: Colors.textMuted, fontSize: Typography.xs, textAlign: 'center' },
  guardianBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: Spacing.xl, borderRadius: Radius.xxl, marginTop: Spacing.sm, ...Shadows.md },
  guardianBtnStart: { backgroundColor: Colors.guardian },
  guardianBtnStop: { backgroundColor: Colors.emergencyDark },
  guardianBtnText: { color: '#fff', fontWeight: Typography.semibold, fontSize: Typography.base },
});