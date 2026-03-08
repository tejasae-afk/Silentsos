import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type Props = {
  summary: string;
  contactsNotified: string[];
  emergencyType: string;
  severity: string;
  timestamp?: string;
};

export default function AlertSummary({
  summary,
  contactsNotified,
  emergencyType,
  severity,
  timestamp,
}: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.checkCircle}>
        <Text style={styles.checkIcon}>✓</Text>
      </View>

      <Text style={styles.headline}>Help is on the way</Text>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {emergencyType.toUpperCase()} · {severity.toUpperCase()}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Summary sent to responders:</Text>
        <Text style={styles.cardText}>{summary}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Notified ({contactsNotified.length}):</Text>
        {contactsNotified.length === 0 ? (
          <Text style={styles.noContacts}>No contacts configured — add them in Settings</Text>
        ) : (
          contactsNotified.map((c, i) => (
            <View key={i} style={styles.contactRow}>
              <Text style={styles.contactDot}>●</Text>
              <Text style={styles.contactName}>{c}</Text>
            </View>
          ))
        )}
      </View>

      {timestamp && (
        <Text style={styles.timestamp}>
          Sent at {new Date(timestamp).toLocaleTimeString()}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 24,
  },
  checkCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  checkIcon: {
    fontSize: 64,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  headline: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
  },
  badge: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#374151',
  },
  badgeText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  card: {
    width: '100%',
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  cardLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardText: {
    color: '#F3F4F6',
    fontSize: 18,
    lineHeight: 28,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactDot: {
    color: '#16A34A',
    fontSize: 10,
  },
  contactName: {
    color: '#F3F4F6',
    fontSize: 18,
  },
  noContacts: {
    color: '#6B7280',
    fontSize: 16,
    fontStyle: 'italic',
  },
  timestamp: {
    color: '#4B5563',
    fontSize: 14,
  },
});
