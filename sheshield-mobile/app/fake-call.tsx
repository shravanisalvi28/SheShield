import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../constants/theme';

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
    return m + ':' + sec;
  }

  return (
    <View style={styles.container}>
      <View style={styles.callerArea}>
        <View style={styles.avatarCircle}>
          <Ionicons name='person' size={52} color='rgba(255,255,255,0.7)' />
        </View>
        <Text style={styles.callerName}>Mom</Text>
        <Text style={styles.callStatus}>{answered ? formatTime(seconds) : 'Incoming call...'}</Text>
        <Text style={styles.callSubtext}>Mobile</Text>
      </View>

      <View style={styles.controls}>
        {!answered ? (
          <View style={styles.buttonRow}>
            <View style={styles.actionGroup}>
              <TouchableOpacity style={[styles.callBtn, styles.declineBtn]} onPress={() => router.back()} accessibilityLabel='Decline call'>
                <Ionicons name='call' size={28} color='#fff' style={{ transform: [{ rotate: '135deg' }] }} />
              </TouchableOpacity>
              <Text style={styles.btnLabel}>Decline</Text>
            </View>
            <View style={styles.actionGroup}>
              <TouchableOpacity style={[styles.callBtn, styles.acceptBtn]} onPress={() => setAnswered(true)} accessibilityLabel='Answer call'>
                <Ionicons name='call' size={28} color='#fff' />
              </TouchableOpacity>
              <Text style={styles.btnLabel}>Answer</Text>
            </View>
          </View>
        ) : (
          <View style={styles.activeCallRow}>
            <View style={styles.actionGroup}>
              <TouchableOpacity style={[styles.callBtn, styles.muteBtn]} accessibilityLabel='Mute'>
                <Ionicons name='mic-off' size={24} color='#fff' />
              </TouchableOpacity>
              <Text style={styles.btnLabel}>Mute</Text>
            </View>
            <View style={styles.actionGroup}>
              <TouchableOpacity style={[styles.callBtn, styles.declineBtn, styles.endBtn]} onPress={() => router.back()} accessibilityLabel='End call'>
                <Ionicons name='call' size={28} color='#fff' style={{ transform: [{ rotate: '135deg' }] }} />
              </TouchableOpacity>
              <Text style={styles.btnLabel}>End</Text>
            </View>
            <View style={styles.actionGroup}>
              <TouchableOpacity style={[styles.callBtn, styles.speakerBtn]} accessibilityLabel='Speaker'>
                <Ionicons name='volume-high' size={24} color='#fff' />
              </TouchableOpacity>
              <Text style={styles.btnLabel}>Speaker</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'space-between', paddingVertical: Spacing.xxxl },
  callerArea: { alignItems: 'center', marginTop: Spacing.xxxl, gap: Spacing.sm },
  avatarCircle: { width: 110, height: 110, borderRadius: 55, backgroundColor: Colors.berryDark, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: Colors.berry, ...Shadows.berry },
  callerName: { color: '#fff', fontSize: 36, fontWeight: Typography.bold, marginTop: Spacing.base },
  callStatus: { color: Colors.textSecondary, fontSize: Typography.lg },
  callSubtext: { color: Colors.textMuted, fontSize: Typography.sm },
  controls: { paddingBottom: Spacing.xxl },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: Spacing.xl },
  activeCallRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: Spacing.xl },
  actionGroup: { alignItems: 'center', gap: Spacing.sm },
  callBtn: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', ...Shadows.md },
  declineBtn: { backgroundColor: Colors.emergency },
  acceptBtn: { backgroundColor: Colors.guardian },
  muteBtn: { backgroundColor: Colors.surface },
  endBtn: { width: 80, height: 80, borderRadius: 40 },
  speakerBtn: { backgroundColor: Colors.surface },
  btnLabel: { color: Colors.textSecondary, fontSize: Typography.sm, fontWeight: Typography.medium },
});
