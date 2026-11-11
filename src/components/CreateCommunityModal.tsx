import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { mobileApi } from '../api/client';

interface CreateCommunityModalProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
  onCreated?: (community: any) => void;
}

const CATEGORIES = ['SPORT', 'TECH', 'RUNNING', 'DESIGN', 'MONEY', 'GENERAL'];

export default function CreateCommunityModal({
  visible,
  onClose,
  navigation,
  onCreated,
}: CreateCommunityModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('SPORT');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a community name',
      });
      return;
    }

    setCreating(true);
    try {
      const created = await mobileApi.createCommunity({
        name: name.trim(),
        category: category || 'GENERAL',
        location: location.trim() || 'Local & Online',
        description: description.trim() || 'A vibrant community space.',
      });
      setName('');
      setLocation('');
      setDescription('');
      onClose();
      Toast.show({
        type: 'success',
        text1: 'Community Created!',
        text2: `Welcome to ${created.name}`,
      });
      if (onCreated) onCreated(created);
      navigation.navigate('CommunityChat', { communityId: created.id });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Creation Failed',
        text2: err?.message || 'Failed to create community',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Community</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.inputLabel}>COMMUNITY NAME *</Text>
            <TextInput
              style={styles.inputField}
              value={name}
              onChangeText={setName}
              placeholder="Enter community name..."
              placeholderTextColor="#64748B"
            />

            <Text style={styles.inputLabel}>CATEGORY</Text>
            <View style={styles.categoryPillsRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryPill,
                    category === cat && styles.categoryPillActive,
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      category === cat && styles.categoryPillTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>LOCATION / REGION</Text>
            <TextInput
              style={styles.inputField}
              value={location}
              onChangeText={setLocation}
              placeholder="City or Online"
              placeholderTextColor="#64748B"
            />

            <Text style={styles.inputLabel}>DESCRIPTION</Text>
            <TextInput
              style={[
                styles.inputField,
                { height: 75, textAlignVertical: 'top' },
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="What is this community about?"
              placeholderTextColor="#64748B"
              multiline
            />

            <TouchableOpacity
              style={[styles.createSubmitButton, creating && { opacity: 0.7 }]}
              onPress={handleCreate}
              disabled={creating}
              activeOpacity={0.85}
            >
              {creating ? (
                <ActivityIndicator color="#0F172A" size="small" />
              ) : (
                <Text style={styles.createSubmitButtonText}>
                  Create Community
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '700',
  },
  modalScroll: {
    paddingBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.6,
    marginTop: 12,
    marginBottom: 6,
  },
  inputField: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111827',
  },
  categoryPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  categoryPillActive: {
    backgroundColor: '#111827',
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  categoryPillTextActive: {
    color: '#CEF26D',
  },
  createSubmitButton: {
    marginTop: 20,
    backgroundColor: '#CEF26D',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createSubmitButtonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
});
