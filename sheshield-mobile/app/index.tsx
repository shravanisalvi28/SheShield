import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
// ...inside your component:
const router = useRouter();

// change your button to also support long-press:
<TouchableOpacity
  style={styles.sosButton}
  onPress={triggerSOS}
  onLongPress={() => router.push('/fake-call')}
  disabled={sending}>
  </TouchableOpacity>
  
const API_URL = 'http://10.183.148.19:5000';

export default function Index() {
  const [sending, setSending] = useState(false);

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
      Alert.alert('Error', err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.sosButton} onPress={triggerSOS} disabled={sending}>
        <Text style={styles.sosText}>{sending ? 'Sending...' : 'SOS'}</Text>
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
});