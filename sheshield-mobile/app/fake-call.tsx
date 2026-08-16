import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';

export default function FakeCall() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(0);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    if (!answered) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [answered]);

  function formatTime(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.callerName}>Mom</Text>
        <Text style={styles.status}>
          {answered ? formatTime(seconds) : 'Incoming call...'}
        </Text>
      </View>

      {!answered ? (
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.circleBtn, styles.decline]} onPress={() => router.back()}>
            <Text style={styles.btnLabel}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.circleBtn, styles.accept]} onPress={() => setAnswered(true)}>
            <Text style={styles.btnLabel}>Answer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={[styles.circleBtn, styles.decline, styles.endCall]} onPress={() => router.back()}>
          <Text style={styles.btnLabel}>End</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'space-between', paddingVertical: 80 },
  top: { alignItems: 'center', marginTop: 60 },
  callerName: { color: '#fff', fontSize: 34, fontWeight: '600', marginBottom: 10 },
  status: { color: '#aaa', fontSize: 16 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 30 },
  circleBtn: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  decline: { backgroundColor: '#E53935' },
  accept: { backgroundColor: '#43A047' },
  endCall: { alignSelf: 'center' },
  btnLabel: { color: '#fff', fontWeight: '600' },
});