import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Accelerometer } from 'expo-sensors';
import * as SMS from 'expo-sms';

const API_URL = 'http://10.183.148.19:5000';

export default function Index() {
  const [sending, setSending] = useState(false);
  const [guardianSessionId, setGuardianSessionId] = useState<string | null>(null);
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

  // Send location every 10s while Guardian Mode is active
  useEffect(() => {
    if (!guardianSessionId) return;
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
    }, 10000);
    return () => clearInterval(interval);
  }, [guardianSessionId]);

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
        Alert.alert('SOS Sent', 'Your location has been shared.');
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
  } catch (smsErr: any) {
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
        guardianId: 'lHbTxTwDJ4UOzTj3haXm', // Mom's real contact ID
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
    setGuardianSessionId(null);
    Alert.alert('Guardian Mode Ended');
  } catch (err) {
    Alert.alert('Error', 'Could not reach backend, but stopping locally.');
    setGuardianSessionId(null);
  }
}

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.sosButton}
        onPress={triggerSOS}
        onLongPress={() => router.push('/fake-call')}
        disabled={sending}
      >
        <Text style={styles.sosText}>{sending ? 'Sending...' : 'SOS'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
  style={styles.guardianButton}
  onPress={guardianSessionId ? endGuardianMode : startGuardianMode}
>
  <Text style={styles.guardianText}>
    {guardianSessionId ? 'End Guardian Mode' : 'Start Guardian Mode'}
  </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  sosButton: {
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: '#C00000', alignItems: 'center', justifyContent: 'center',
    elevation: 6,
  },
  sosText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  guardianButton: {
    marginTop: 30,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: '#2e7d32',
  },
  guardianText: { color: '#fff', fontWeight: '600' },
});