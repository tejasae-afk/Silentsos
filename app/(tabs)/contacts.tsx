import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useEmergency } from '../../context/EmergencyContext';

type Contact = {
  id: string;
  name: string;
  phone: string;
  relationship: string;
};

export default function ContactsScreen() {
  const { emergencyContacts, setEmergencyContacts } = useEmergency();
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');

  function openModal() {
    setName('');
    setPhone('');
    setRelationship('');
    setModalVisible(true);
  }

  function addContact() {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Required', 'Name and phone number are required.');
      return;
    }
    const newContact: Contact = {
      id: Date.now().toString(),
      name: name.trim(),
      phone: phone.trim(),
      relationship: relationship.trim() || 'Contact',
    };
    setEmergencyContacts([...emergencyContacts, newContact]);
    setModalVisible(false);
  }

  function deleteContact(id: string) {
    Alert.alert('Remove Contact', 'Remove this emergency contact?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setEmergencyContacts(emergencyContacts.filter((c) => c.id !== id)),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={emergencyContacts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.subtitle}>
              These people will receive an SMS when you trigger SilentSOS
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>No emergency contacts yet</Text>
            <Text style={styles.emptySubtext}>Add at least one person who should be notified</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.contactCard}>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{item.name}</Text>
              <Text style={styles.contactPhone}>{item.phone}</Text>
              <Text style={styles.contactRelation}>{item.relationship}</Text>
            </View>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => deleteContact(item.id)}
              accessibilityLabel={`Remove ${item.name}`}
            >
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={styles.list}
      />

      <TouchableOpacity style={styles.addBtn} onPress={openModal}>
        <Text style={styles.addBtnText}>+ Add Emergency Contact</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Emergency Contact</Text>

            <TextInput
              style={styles.input}
              placeholder="Full Name *"
              placeholderTextColor="#4B5563"
              value={name}
              onChangeText={setName}
              autoFocus
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number * (e.g. +1234567890)"
              placeholderTextColor="#4B5563"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Relationship (e.g. Mom, Doctor)"
              placeholderTextColor="#4B5563"
              value={relationship}
              onChangeText={setRelationship}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSaveBtn]}
                onPress={addContact}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  header: {
    marginBottom: 16,
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 16,
    lineHeight: 24,
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
  contactCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  contactInfo: {
    flex: 1,
    gap: 4,
  },
  contactName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  contactPhone: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
  contactRelation: {
    color: '#6B7280',
    fontSize: 14,
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    color: '#6B7280',
    fontSize: 18,
    fontWeight: '700',
  },
  addBtn: {
    margin: 16,
    padding: 20,
    backgroundColor: '#DC2626',
    borderRadius: 16,
    alignItems: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#1F2937',
    color: '#FFFFFF',
    fontSize: 18,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelBtn: {
    backgroundColor: '#1F2937',
  },
  modalSaveBtn: {
    backgroundColor: '#DC2626',
  },
  modalCancelText: {
    color: '#9CA3AF',
    fontSize: 18,
    fontWeight: '700',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
