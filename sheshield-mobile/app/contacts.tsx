/**
 * SheShield — Emergency Contacts Screen
 *
 * Writes go through the backend API (admin SDK → bypasses Firestore security rules).
 * Reads use onSnapshot for live updates (Firestore client SDK reads are allowed).
 */
import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  FlatList, Alert, SafeAreaView, StatusBar, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Colors, Spacing, Radius, Typography, Shadows } from '../constants/theme';
import { API_URL } from '../constants/config';

const BRAND = {
  berry: '#6D2E46',
  danger: '#C00000',
  success: '#2E7D32',
};


type Contact = {
  id: string;
  name: string;
  phone: string;
  relationship?: string;
  user_id: string;
};

export default function ContactsScreen() {
  const router = useRouter();
  const userId = auth.currentUser?.uid ?? '';

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Live Firestore reads (allowed by security rules) ──────────
  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, 'contacts'), where('user_id', '==', userId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setContacts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Contact)));
        setLoading(false);
      },
      (err) => {
        console.error('Contacts snapshot error:', err);
        // Fallback: fetch from backend if real-time subscription fails
        fetchContactsFromAPI();
      },
    );
    return () => unsub();
  }, [userId]);

  async function fetchContactsFromAPI() {
    try {
      const res = await fetch(`${API_URL}/api/contacts/${userId}`);
      const data = await res.json();
      if (Array.isArray(data)) setContacts(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  // ── Add contact via backend API ───────────────────────────────
  const handleAdd = useCallback(async () => {
    const trimName = name.trim();
    const trimPhone = phone.trim();

    if (!trimName || !trimPhone) {
      Alert.alert('Missing fields', 'Name and phone number are required.');
      return;
    }
    if (contacts.length >= 5) {
      Alert.alert('Limit reached', 'You can add up to 5 emergency contacts.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          name: trimName,
          phone: trimPhone,
          relationship: relationship.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setName('');
        setPhone('');
        setRelationship('');
        // onSnapshot will auto-update the list
      } else {
        Alert.alert('Save Failed', data.error || 'Could not save contact. Is the backend running?');
      }
    } catch (err: any) {
      Alert.alert(
        'Network Error',
        'Could not reach the server.\n\nMake sure the backend is running and API_URL is correct.\n\n' + err.message,
      );
    } finally {
      setSaving(false);
    }
  }, [name, phone, relationship, userId, contacts.length]);

  // ── Delete contact via backend API ───────────────────────────
  const handleDelete = useCallback((contact: Contact) => {
    Alert.alert(
      'Remove Contact',
      `Remove ${contact.name} from your emergency contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/api/contacts/${contact.id}`, {
                method: 'DELETE',
              });
              const data = await res.json();
              if (!res.ok) {
                Alert.alert('Error', data.error || 'Could not remove contact.');
              }
              // onSnapshot auto-removes it from list
            } catch (err: any) {
              Alert.alert('Network Error', 'Could not reach server: ' + err.message);
            }
          },
        },
      ],
    );
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={BRAND.berry} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="people" size={18} color={BRAND.berry} />
          <Text style={styles.headerTitle}>Emergency Contacts</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Add contact form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Add Emergency Contact</Text>
          <Text style={styles.formSub}>
            These contacts are notified during SOS and used for Guardian Mode
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Full name *"
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="next"
          />
          <TextInput
            style={styles.input}
            placeholder="Phone number *"
            placeholderTextColor={Colors.textMuted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            returnKeyType="next"
          />
          <TextInput
            style={styles.input}
            placeholder="Relationship (optional) — e.g. Mom, Friend"
            placeholderTextColor={Colors.textMuted}
            value={relationship}
            onChangeText={setRelationship}
            autoCapitalize="sentences"
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />

          <TouchableOpacity
            style={[styles.addBtn, saving && { opacity: 0.6 }]}
            onPress={handleAdd}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="add-circle" size={18} color="#fff" />
                <Text style={styles.addBtnText}>Save Contact</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Contact list */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Saved Contacts</Text>
          <Text style={styles.listCount}>{contacts.length} / 5</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={BRAND.berry} size="large" style={{ marginTop: 40 }} />
        ) : contacts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No contacts yet</Text>
            <Text style={styles.emptySub}>
              Add at least one contact above to enable Guardian Mode and SOS notifications.
            </Text>
          </View>
        ) : (
          <FlatList
            data={contacts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.contactCard}>
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactAvatarText}>
                    {item.name[0]?.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{item.name}</Text>
                  <Text style={styles.contactPhone}>{item.phone}</Text>
                  {item.relationship ? (
                    <Text style={styles.contactRelationship}>{item.relationship}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={18} color={BRAND.danger} />
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: 13,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    ...Shadows.sm,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: {
    color: BRAND.berry, fontSize: Typography.base,
    fontWeight: Typography.extrabold, letterSpacing: -0.2,
  },

  formCard: {
    margin: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.base,
    ...Shadows.md,
  },
  formTitle: {
    fontSize: Typography.base, fontWeight: Typography.bold,
    color: Colors.textPrimary, marginBottom: 2,
  },
  formSub: {
    fontSize: Typography.xs, color: Colors.textMuted,
    marginBottom: Spacing.base, lineHeight: 16,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.base, paddingVertical: 11,
    fontSize: Typography.sm, color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6,
    backgroundColor: BRAND.berry,
    borderRadius: Radius.full,
    paddingVertical: 12, marginTop: 4,
    ...Shadows.berry,
  },
  addBtnText: { color: '#fff', fontSize: Typography.sm, fontWeight: Typography.bold },

  listHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingBottom: 8,
  },
  listTitle: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.textSecondary },
  listCount: { fontSize: Typography.xs, color: Colors.textMuted, fontWeight: Typography.semibold },

  listContent: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.xl },

  contactCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.base, marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  contactAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: BRAND.berry + '22',
    borderWidth: 1, borderColor: BRAND.berry + '44',
    alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.md,
  },
  contactAvatarText: { color: BRAND.berry, fontSize: Typography.base, fontWeight: Typography.bold },
  contactInfo: { flex: 1 },
  contactName: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.textPrimary },
  contactPhone: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  contactRelationship: {
    fontSize: Typography.xs, color: Colors.textMuted,
    marginTop: 1, fontStyle: 'italic',
  },
  deleteBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(192,0,0,0.08)',
    borderWidth: 1, borderColor: 'rgba(192,0,0,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },

  emptyState: {
    alignItems: 'center', paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxl, gap: Spacing.sm,
  },
  emptyTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textSecondary },
  emptySub: {
    fontSize: Typography.xs, color: Colors.textMuted,
    textAlign: 'center', lineHeight: 18,
  },
});
