import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Alert,
  SafeAreaView, StatusBar, ActivityIndicator, Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Accelerometer } from 'expo-sensors';
import * as SMS from 'expo-sms';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Colors, Spacing, Radius, Typography, Shadows } from '../constants/theme';

const API_URL = 'http://10.183.148.19:5000';

// Brand palette (matches task spec)
const BRAND = {
  berry: '#6D2E46',
  rose: '#A26769',
  gold: '#C9A24B',
  danger: '#C00000',
  success: '#2E7D32',
  amber: '#D97706',
};

/** Derive countdown color: green → amber → red */
function countdownColor(s: number | null): string {
  if (s === null) return BRAND.success;
  if (s < 60) return BRAND.danger;
  if (s < 300) return BRAND.amber;
  return BRAND.success;
}

export default function Index() {
  const [sending, setSending] = useState(false);
  const [locating, setLocating] = useState(false);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [guardianSessionId, setGuardianSessionId] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  const currentUser = auth.currentUser;
  const userId = currentUser?.uid ?? 'anonymous';
  const userEmail = currentUser?.email ?? '';
  const displayName = userEmail ? userEmail.split('@')[0] : 'User';

  // ─── Reanimated: SOS button ──────────────────────────────────────────
  // Outer ring: expand + fade
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.45);
  // Second staggered ring
  const pulse2Scale = useSharedValue(1);
  const pulse2Opacity = useSharedValue(0.3);
  // Button breathing (idle)
  const breatheScale = useSharedValue(1);
  // Press feedback
  const pressScale = useSharedValue(1);

  useEffect(() => {
    // Outer ring
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.28, { duration: 1100, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 }),
      ), -1, false,
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1100, easing: Easing.in(Easing.ease) }),
        withTiming(0.45, { duration: 0 }),
      ), -1, false,
    );
    // Second ring, 400 ms stagger
    pulse2Scale.value = withDelay(400, withRepeat(
      withSequence(
        withTiming(1.28, { duration: 1100, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 }),
      ), -1, false,
    ));
    pulse2Opacity.value = withDelay(400, withRepeat(
      withSequence(
        withTiming(0, { duration: 1100, easing: Easing.in(Easing.ease) }),
        withTiming(0.3, { duration: 0 }),
      ), -1, false,
    ));
    // Button breathing
    breatheScale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.00, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ), -1, false,
    );
  }, []);

  const pulseRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));
  const pulseRing2Style = useAnimatedStyle(() => ({
    transform: [{ scale: pulse2Scale.value }],
    opacity: pulse2Opacity.value,
  }));
  const sosButtonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breatheScale.value * pressScale.value }],
  }));

  function handleSOSPressIn() {
    if (sending) return;
    // Fire haptics immediately — in parallel with whatever else happens
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    pressScale.value = withTiming(0.93, { duration: 90 });
  }
  function handleSOSPressOut() {
    pressScale.value = withSpring(1, { damping: 14, stiffness: 280 });
  }

  // ─── Reanimated: Guardian card entrance ──────────────────────────────
  const guardianTransY = useSharedValue(0);
  const guardianOpacity = useSharedValue(1);
  const prevGuardianRef = useRef<string | null>(null);

  useEffect(() => {
    if (guardianSessionId && !prevGuardianRef.current) {
      // Session just started — slide + fade entrance
      guardianTransY.value = 18;
      guardianOpacity.value = 0;
      guardianTransY.value = withSpring(0, { damping: 18, stiffness: 180 });
      guardianOpacity.value = withTiming(1, { duration: 350 });
    }
    prevGuardianRef.current = guardianSessionId;
  }, [guardianSessionId]);

  const guardianCardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: guardianTransY.value }],
    opacity: guardianOpacity.value,
  }));

  // ─── Shake-to-SOS ────────────────────────────────────────────────────
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

  // ─── Guardian location ping ───────────────────────────────────────────
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
        .catch(() => { });
    }, 10000);
    return () => clearInterval(interval);
  }, [guardianSessionId]);

  // ─── Live SOS location tracking ──────────────────────────────────────
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
      } catch { }
    }, 10000);
    return () => clearInterval(interval);
  }, [activeAlertId]);

  // ─── Business logic (unchanged) ──────────────────────────────────────
  async function triggerSOS() {
    setSending(true);
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location access is required to send an alert.');
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({});
      setLocating(false);
      const res = await fetch(API_URL + '/api/alerts/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, trigger_type: 'button', latitude: coords.latitude, longitude: coords.longitude }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveAlertId(data.alertId);
        Alert.alert('🚨 SOS Sent', 'Emergency alert triggered. Your location is being shared with responders.');
      } else {
        Alert.alert('Error', 'Failed to send alert. Check your backend is running.');
      }
    } catch (err: any) {
      setLocating(false);
      try {
        const { coords } = await Location.getCurrentPositionAsync({});
        const isAvailable = await SMS.isAvailableAsync();
        if (isAvailable) {
          await SMS.sendSMSAsync(['9999999999'], 'SheShield SOS: I need help. https://maps.google.com/?q=' + coords.latitude + ',' + coords.longitude);
          Alert.alert('Sent via SMS', 'No internet — alert sent via SMS.');
        } else {
          Alert.alert('Error', err.message);
        }
      } catch {
        Alert.alert('Error', 'Failed to send alert via network or SMS.');
      }
    } finally {
      setSending(false);
      setLocating(false);
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
      Alert.alert('🛡️ Guardian Mode Active', 'Sharing your location with ' + data.guardianName);
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
    } catch { }
    setGuardianSessionId(null);
    Alert.alert('Guardian Mode Ended', 'Location sharing has stopped.');
  }

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive', onPress: async () => {
          setLoggingOut(true);
          try {
            if (guardianSessionId) await endGuardianMode();
            await signOut(auth);
          } catch { setLoggingOut(false); }
        }
      },
    ]);
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return m + ':' + sec;
  }

  const cdColor = countdownColor(remainingSeconds);

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle='dark-content' backgroundColor={Colors.surface} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name='shield-checkmark' size={22} color={BRAND.berry} />
          <Text style={styles.headerTitle}>SheShield</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => router.push('/fake-call')}
            activeOpacity={0.7}
            accessibilityLabel='Fake call'
          >
            <Ionicons name='call-outline' size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={handleLogout}
            disabled={loggingOut}
            activeOpacity={0.7}
            accessibilityLabel='Sign out'
          >
            {loggingOut
              ? <ActivityIndicator size='small' color={Colors.textSecondary} />
              : <Ionicons name='log-out-outline' size={18} color={Colors.textSecondary} />
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* Greeting strip */}
      {userEmail ? (
        <View style={styles.greetingStrip}>
          <View style={[styles.avatarDot, { backgroundColor: BRAND.berry }]}>
            <Text style={styles.avatarLetter}>{displayName[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.greetingText} numberOfLines={1}>Hi, {displayName}</Text>
          <View style={styles.onlinePill}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Protected</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.container}>

        {/* Active banners */}
        {activeAlertId && (
          <View style={styles.sosBanner}>
            <View style={[styles.pulseDot, { backgroundColor: BRAND.danger }]} />
            <Ionicons name='warning' size={14} color={BRAND.danger} />
            <Text style={styles.sosBannerText}>SOS Active — Sharing Location</Text>
          </View>
        )}
        {guardianSessionId && remainingSeconds !== null && (
          <View style={[styles.guardianBanner, { borderColor: cdColor + '44' }]}>
            <View style={[styles.pulseDot, { backgroundColor: cdColor }]} />
            <Ionicons name='shield-checkmark' size={14} color={cdColor} />
            <Text style={[styles.guardianBannerText, { color: cdColor }]}>
              Guardian Active · {formatTime(remainingSeconds)}
            </Text>
          </View>
        )}

        {/* SOS Button — reanimated breathing + press */}
        <View style={styles.sosWrapper}>
          {/* Two staggered pulse rings */}
          <Animated.View style={[styles.pulseRing, pulseRingStyle]} />
          <Animated.View style={[styles.pulseRing, styles.pulseRing2, pulseRing2Style]} />

          {/* Button with breathing + press scale */}
          <Animated.View style={sosButtonAnimStyle}>
            <Pressable
              onPress={triggerSOS}
              onPressIn={handleSOSPressIn}
              onPressOut={handleSOSPressOut}
              onLongPress={() => router.push('/fake-call')}
              disabled={sending}
              style={styles.sosButton}
              accessibilityRole='button'
              accessibilityLabel={sending ? 'Sending SOS' : 'Tap to send SOS alert'}
            >
              {sending ? (
                <View style={styles.sosLoadingInner}>
                  <ActivityIndicator color='#fff' size='large' />
                  {locating && (
                    <Text style={styles.sosLoadingLabel}>Locating…</Text>
                  )}
                </View>
              ) : (
                <>
                  <Ionicons name='warning' size={40} color='#fff' style={{ marginBottom: 4 }} />
                  <Text style={styles.sosText}>SOS</Text>
                </>
              )}
            </Pressable>
          </Animated.View>
        </View>

        <Text style={styles.hint}>Tap to send emergency SOS</Text>
        <Text style={styles.hintSub}>Long-press for fake call · Shake to trigger</Text>

        {/* Guardian Mode card — slide/fade entrance when session starts */}
        <Animated.View style={[
          styles.guardianCard,
          guardianSessionId && styles.guardianCardActive,
          guardianCardAnimStyle,
        ]}>
          <View style={styles.guardianCardLeft}>
            <View style={[styles.guardianIconWrap, guardianSessionId && styles.guardianIconWrapActive]}>
              <Ionicons
                name={guardianSessionId ? 'shield-checkmark' : 'people-circle-outline'}
                size={24}
                color={guardianSessionId ? cdColor : Colors.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.guardianCardTitle}>Guardian Mode</Text>
              <Text style={[
                styles.guardianCardSub,
                guardianSessionId && { color: cdColor, fontWeight: Typography.bold },
              ]}>
                {guardianSessionId
                  ? `Active · ${remainingSeconds !== null ? formatTime(remainingSeconds) + ' left' : '...'}`
                  : 'Share location with a trusted contact'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.guardianToggleBtn, guardianSessionId ? styles.guardianToggleStop : styles.guardianToggleStart]}
            onPress={guardianSessionId ? endGuardianMode : startGuardianMode}
            activeOpacity={0.75}
            accessibilityRole='button'
          >
            <Text style={styles.guardianToggleText}>{guardianSessionId ? 'Stop' : 'Start'}</Text>
          </TouchableOpacity>
        </Animated.View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: 13,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadows.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: {
    color: BRAND.berry,
    fontSize: Typography.lg,
    fontWeight: Typography.extrabold,
    letterSpacing: -0.3,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerIconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  // Greeting
  greetingStrip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.base, paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  avatarDot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontSize: Typography.xs, fontWeight: Typography.bold },
  greetingText: { flex: 1, fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.semibold },
  onlinePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.guardianBg, borderWidth: 1, borderColor: Colors.guardianBorder,
    borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3,
  },
  onlineDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: BRAND.success },
  onlineText: { fontSize: 10, color: BRAND.success, fontWeight: Typography.bold },

  // Container
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl,
    gap: Spacing.base,
  },

  // Banners
  sosBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.emergencyBg, paddingVertical: 10, paddingHorizontal: Spacing.base,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.emergencyBorder,
    alignSelf: 'stretch',
  },
  guardianBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.guardianBg, paddingVertical: 10, paddingHorizontal: Spacing.base,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.guardianBorder,
    alignSelf: 'stretch',
  },
  sosBannerText: { color: BRAND.danger, fontWeight: Typography.bold, fontSize: Typography.sm, flex: 1 },
  guardianBannerText: { fontWeight: Typography.bold, fontSize: Typography.sm, flex: 1 },
  pulseDot: { width: 7, height: 7, borderRadius: 4 },

  // SOS
  sosWrapper: {
    alignItems: 'center', justifyContent: 'center',
    marginVertical: Spacing.xl,
    width: 230, height: 230,
  },
  pulseRing: {
    position: 'absolute',
    width: 210, height: 210, borderRadius: 105,
    backgroundColor: BRAND.danger,
  },
  pulseRing2: {
    width: 215, height: 215, borderRadius: 108,
  },
  sosButton: {
    width: 190, height: 190, borderRadius: 95,
    backgroundColor: BRAND.danger,
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.emergency,
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.32)',
  },
  sosLoadingInner: { alignItems: 'center', gap: 8 },
  sosLoadingLabel: { color: 'rgba(255,255,255,0.75)', fontSize: Typography.xs, fontWeight: Typography.semibold },
  sosText: {
    color: '#fff', fontSize: Typography.xxxl,
    fontWeight: Typography.black, letterSpacing: 3,
  },

  // Hints
  hint: { color: Colors.textSecondary, fontSize: Typography.sm, fontWeight: Typography.semibold, textAlign: 'center', marginTop: -Spacing.sm },
  hintSub: { color: Colors.textMuted, fontSize: Typography.xs, textAlign: 'center', marginTop: -Spacing.sm },

  // Guardian card
  guardianCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.base, alignSelf: 'stretch',
    marginTop: Spacing.sm, ...Shadows.md,
  },
  guardianCardActive: { borderColor: Colors.guardianBorder, backgroundColor: Colors.guardianBg },
  guardianCardLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  guardianIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  guardianIconWrapActive: { backgroundColor: Colors.guardianBg, borderColor: Colors.guardianBorder },
  guardianCardTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  guardianCardSub: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2, fontWeight: Typography.medium },
  guardianToggleBtn: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: Radius.full },
  guardianToggleStart: { backgroundColor: BRAND.success },
  guardianToggleStop: { backgroundColor: BRAND.danger },
  guardianToggleText: { color: '#fff', fontSize: Typography.sm, fontWeight: Typography.bold },
});