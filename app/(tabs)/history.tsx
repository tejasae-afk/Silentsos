import { useEmergency } from '../../context/EmergencyContext';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#DC2626',
  high: '#F59E0B',
  medium: '#3B82F6',
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: '🔴 CRITICAL',
  high: '🟡 HIGH',
  medium: '🔵 MEDIUM',
};

type AlertLog = {
  id: string;
  summary: string;
  emergency_type: string;
  severity: string;
  timestamp: string;
  contacts_notified: string[];
  gps_lat: number;
  gps_lng: number;
};

export default function HistoryScreen() {
  const { alertStatus } = useEmergency();

  // In a real app, fetch from Supabase. For the hackathon demo, show recent context state.
  const logs: AlertLog[] = alertStatus
    ? [
        {
          id: '1',
          summary: 'Most recent alert',
          emergency_type: 'unknown',
          severity: 'high',
          timestamp: alertStatus.timestamp,
          contacts_notified: alertStatus.contactsNotified,
          gps_lat: 0,
          gps_lng: 0,
        },
      ]
    : [];

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <Text style={styles.subtitle}>Your past emergency alerts</Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No alerts yet</Text>
            <Text style={styles.emptySubtext}>Past emergencies will appear here</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.logCard}>
            <View style={styles.logHeader}>
              <View
                style={[
                  styles.severityBadge,
                  { borderColor: SEVERITY_COLORS[item.severity] ?? '#6B7280' },
                ]}
              >
                <Text style={[styles.severityText, { color: SEVERITY_COLORS[item.severity] ?? '#6B7280' }]}>
                  {SEVERITY_LABELS[item.severity] ?? item.severity.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.logType}>{item.emergency_type.toUpperCase()}</Text>
            </View>

            <Text style={styles.logSummary}>{item.summary}</Text>

            <View style={styles.logFooter}>
              <Text style={styles.logMeta}>
                {new Date(item.timestamp).toLocaleString()}
              </Text>
              <Text style={styles.logMeta}>
                {item.contacts_notified.length} notified
              </Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  list: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 16,
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 64,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 22,
    fontWeight: '700',
  },
  emptySubtext: {
    color: '#4B5563',
    fontSize: 16,
    textAlign: 'center',
  },
  logCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  severityBadge: {
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  severityText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  logType: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },
  logSummary: {
    color: '#F3F4F6',
    fontSize: 16,
    lineHeight: 24,
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logMeta: {
    color: '#4B5563',
    fontSize: 13,
  },
});
