import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Accelerometer } from 'expo-sensors';
import * as SMS from 'expo-sms';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const API_URL = 'http://10.183.148.19:5000';
const BERRY = '#6D2E46';
const GOLD = '#C9A24B';
const GREEN = '#2e7d32';

export default function Index() {
  const [sending, setSending] = useState(false);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [guardianSessionId, setGuardianSessionId] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const SHAKE_THRESHOLD = 3.0;
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

  // Send location every 10s + refresh countdown while Guardian Mode is active
  useEffect(() => {
    if (!guardianSessionId) {
      setRemainingSeconds(null);
      return;
    }
    const interval = setInterval(async () => {
      const { coords } = await Location.getCurrentPositionAsync({});
      fetch(`${API_URL}/api/guardian/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: guardianSessionId,
          latitude: coords.latitude,
          longitude: coords.longitude,
        }),
      });

      fetch(`${API_URL}/api/guardian/${guardianSessionId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setRemainingSeconds(data.session.remainingSeconds);
        })
        .catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [guardianSessionId]);

  // ============================================================
// LIVE SOS LOCATION TRACKING
// ============================================================

useEffect(() => {

  if (!activeAlertId) {
    return;
  }
  console.log(
    '🚨 Starting SOS location tracking:',
    activeAlertId
  );
  const interval = setInterval(async () => {
    try {
      const { coords } =
        await Location.getCurrentPositionAsync({});
      await fetch(
        `${API_URL}/api/alerts/location`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            alertId: activeAlertId,
            latitude: coords.latitude,
            longitude: coords.longitude
          })

        }
      );
      console.log(
        '📍 SOS location updated:',
        coords.latitude,
        coords.longitude
      );
    } catch (error) {
      console.log(
        '❌ SOS location update failed:',
        error
      );
    }
  }, 10000);
  return () => {
    clearInterval(interval);
  };
}, [activeAlertId]);

  async function triggerSOS() {
    setSending(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location access is required to send an alert.');
        setSending(false);
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({});
      const res = await fetch(`${API_URL}/api/alerts/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'test-user',
          trigger_type: 'button',
          latitude: coords.latitude,
          longitude: coords.longitude,
        }),
      });
      if (res.ok) {
  const data = await res.json();
  console.log('🚨 SOS Alert:', data);
  // Store the active alert ID
  setActiveAlertId(data.alertId);
  Alert.alert(
    'SOS Sent',
    'Your location has been shared.'
  );
} else {
        Alert.alert('Error', 'Failed to send alert. Check your backend is running.');
      }
    } catch (err: any) {
      try {
        const { coords } = await Location.getCurrentPositionAsync({});
        const isAvailable = await SMS.isAvailableAsync();
        if (isAvailable) {
          await SMS.sendSMSAsync(
            ['9999999999'],
            `SheShield SOS: I need help. My location: https://maps.google.com/?q=${coords.latitude},${coords.longitude}`
          );
          Alert.alert('Sent via SMS', 'No internet connection — alert sent via SMS instead.');
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
    const res = await fetch(`${API_URL}/api/guardian/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'test-user',
        guardianId: 'lHbTxTwDJ4UOzTj3haXm',
        durationMinutes: 45,
        latitude: coords.latitude,
        longitude: coords.longitude,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setGuardianSessionId(data.sessionId);
      Alert.alert('Guardian Mode Started', `Sharing location with ${data.guardianName}`);
    } else {
      Alert.alert('Error', data.error || 'Failed to start Guardian Mode');
    }
  }

  async function endGuardianMode() {
    if (!guardianSessionId) return;
    try {
      await fetch(`${API_URL}/api/guardian/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: guardianSessionId }),
      });
    } catch {}
    setGuardianSessionId(null);
    Alert.alert('Guardian Mode Ended');
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={28} color={GOLD} />
        <Text style={styles.headerText}>SheShield</Text>
      </View>

      <View style={styles.container}>
        {guardianSessionId && remainingSeconds !== null && (
          <View style={styles.statusBanner}>
            <MaterialIcons name="my-location" size={18} color={GREEN} />
            <Text style={styles.statusText}>
              Guardian Active · {formatTime(remainingSeconds)} remaining
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.sosButton}
          onPress={triggerSOS}
          onLongPress={() => router.push('/fake-call')}
          disabled={sending}
        >
          <Ionicons name="warning" size={40} color="#fff" style={{ marginBottom: 6 }} />
          <Text style={styles.sosText}>{sending ? 'Sending...' : 'SOS'}</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>Tap for SOS · Long-press for fake call</Text>

        <TouchableOpacity
          style={[styles.guardianButton, guardianSessionId && styles.guardianButtonActive]}
          onPress={guardianSessionId ? endGuardianMode : startGuardianMode}
        >
          <Ionicons
            name={guardianSessionId ? 'stop-circle-outline' : 'people-circle-outline'}
            size={20}
            color="#fff"
          />
          <Text style={styles.guardianText}>
            {guardianSessionId ? 'End Guardian Mode' : 'Start Guardian Mode'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: BERRY,
  },
  headerText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#e8f5e9', paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 20, position: 'absolute', top: 30,
  },
  statusText: { color: GREEN, fontWeight: '600', fontSize: 13 },
  sosButton: {
    width: 190, height: 190, borderRadius: 95,
    backgroundColor: '#C00000', alignItems: 'center', justifyContent: 'center',
    elevation: 8, shadowColor: '#C00000', shadowOpacity: 0.4, shadowRadius: 12,
  },
  sosText: { color: '#fff', fontSize: 30, fontWeight: 'bold' },
  hint: { color: '#999', fontSize: 12 },
  guardianButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 20, paddingVertical: 14, paddingHorizontal: 28,
    borderRadius: 24, backgroundColor: GREEN,
  },
  guardianButtonActive: { backgroundColor: '#c62828' },
  guardianText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});