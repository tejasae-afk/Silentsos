import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useEmergency } from '../context/EmergencyContext';

export default function OnboardingScreen() {
  const { setUserProfile, setEmergencyContacts } = useEmergency();

  const [name, setName] = useState('');
  const [conditions, setConditions] = useState('');
  const [medications, setMedications] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRelation, setContactRelation] = useState('');

  function handleFinish() {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your name so your contacts know who needs help.');
      return;
    }

    setUserProfile({
      id: `user_${Date.now()}`,
      name: name.trim(),
      conditions: conditions
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      medications: medications
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });

    if (contactName.trim() && contactPhone.trim()) {
      setEmergencyContacts([
        {
          id: `contact_${Date.now()}`,
          name: contactName.trim(),
          phone: contactPhone.trim(),
          relationship: contactRelation.trim() || 'Emergency Contact',
        },
      ]);
    }

    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>🆘</Text>
            <Text style={styles.title}>Set Up SilentSOS</Text>
            <Text style={styles.subtitle}>
              This information is sent with every alert so responders know how to help you.
            </Text>
          </View>

          {/* Section: Your Profile */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>YOUR PROFILE</Text>

            <Text style={styles.label}>Your name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Alex Johnson"
              placeholderTextColor="#4B5563"
              value={name}
              onChangeText={setName}
              autoFocus
            />

            <Text style={styles.label}>Medical conditions</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. autism, epilepsy, diabetes (comma separated)"
              placeholderTextColor="#4B5563"
              value={conditions}
              onChangeText={setConditions}
            />

            <Text style={styles.label}>Current medications</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. metformin, levetiracetam (comma separated)"
              placeholderTextColor="#4B5563"
              value={medications}
              onChangeText={setMedications}
            />
          </View>

          {/* Section: Emergency Contact */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EMERGENCY CONTACT</Text>
            <Text style={styles.sectionNote}>
              This person gets an SMS with your location when you press SOS
            </Text>

            <Text style={styles.label}>Contact name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Sarah Johnson"
              placeholderTextColor="#4B5563"
              value={contactName}
              onChangeText={setContactName}
            />

            <Text style={styles.label}>Phone number (with country code)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. +12025551234"
              placeholderTextColor="#4B5563"
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Relationship</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Mom, Doctor, Caregiver"
              placeholderTextColor="#4B5563"
              value={contactRelation}
              onChangeText={setContactRelation}
            />
          </View>

          {/* CTA */}
          <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
            <Text style={styles.finishBtnText}>I'm Ready — Open SilentSOS</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>
            You can update this information anytime in the Contacts tab.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  flex: { flex: 1 },
  scroll: {
    padding: 24,
    gap: 24,
    paddingBottom: 48,
  },
  header: { alignItems: 'center', gap: 12, paddingVertical: 16 },
  logo: { fontSize: 72 },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 26,
  },
  section: { gap: 12 },
  sectionTitle: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 4,
  },
  sectionNote: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 4,
  },
  label: {
    color: '#9CA3AF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: -4,
  },
  input: {
    backgroundColor: '#111827',
    color: '#FFFFFF',
    fontSize: 18,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  finishBtn: {
    backgroundColor: '#DC2626',
    padding: 22,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  finishBtnText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  footer: {
    color: '#4B5563',
    fontSize: 14,
    textAlign: 'center',
  },
});
