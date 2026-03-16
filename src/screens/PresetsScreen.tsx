import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mockEvents, SecurityEvent } from '../data/mockEvents';
import { EventCard } from '../components/EventCard';

// Arcules-style colors
const COLORS = {
  background: '#FFFFFF',
  backgroundSecondary: '#F3F4F6',
  text: '#111827',
  textSecondary: '#6B7280',
  accent: '#0D9488',
  border: '#E5E7EB',
  online: '#10B981',
};

interface Preset {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  filters: {
    eventTypes?: string[];
    cameraIds?: string[];
    timeRange?: 'today' | 'yesterday' | 'week' | 'month';
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
    minConfidence?: number;
  };
  isSystem: boolean;
}

// Pre-built system presets
const systemPresets: Preset[] = [
  {
    id: 'people-today',
    name: 'People Today',
    icon: 'person',
    color: COLORS.accent,
    description: 'All person detections from today',
    filters: { eventTypes: ['person'], timeRange: 'today' },
    isSystem: true,
  },
  {
    id: 'vehicles-week',
    name: 'Vehicles This Week',
    icon: 'car',
    color: '#8B5CF6',
    description: 'Vehicle activity over the past week',
    filters: { eventTypes: ['vehicle'], timeRange: 'week' },
    isSystem: true,
  },
  {
    id: 'packages',
    name: 'Package Deliveries',
    icon: 'cube',
    color: '#F59E0B',
    description: 'All package detection events',
    filters: { eventTypes: ['package'] },
    isSystem: true,
  },
  {
    id: 'night-activity',
    name: 'Night Activity',
    icon: 'moon',
    color: '#6366F1',
    description: 'Motion detected between 10 PM - 6 AM',
    filters: { timeOfDay: 'night' },
    isSystem: true,
  },
  {
    id: 'front-door',
    name: 'Front Door Activity',
    icon: 'home',
    color: '#10B981',
    description: 'All events from front door camera',
    filters: { cameraIds: ['cam-1'] },
    isSystem: true,
  },
  {
    id: 'high-confidence',
    name: 'High Confidence Only',
    icon: 'checkmark-circle',
    color: '#14B8A6',
    description: 'Events with 90%+ detection confidence',
    filters: { minConfidence: 0.9 },
    isSystem: true,
  },
];

// User's custom presets (simulated)
const initialUserPresets: Preset[] = [
  {
    id: 'my-driveway',
    name: 'My Driveway Watch',
    icon: 'eye',
    color: '#EC4899',
    description: 'Driveway camera, people & vehicles',
    filters: { cameraIds: ['cam-2'], eventTypes: ['person', 'vehicle'] },
    isSystem: false,
  },
];

export const PresetsScreen: React.FC = () => {
  const [userPresets, setUserPresets] = useState<Preset[]>(initialUserPresets);
  const [activePreset, setActivePreset] = useState<Preset | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // Apply preset filters to get events
  const filteredEvents = useMemo(() => {
    if (!activePreset) return [];

    let events = [...mockEvents];
    const filters = activePreset.filters;

    // Filter by event types
    if (filters.eventTypes && filters.eventTypes.length > 0) {
      events = events.filter(e => filters.eventTypes!.includes(e.eventType));
    }

    // Filter by cameras
    if (filters.cameraIds && filters.cameraIds.length > 0) {
      events = events.filter(e => filters.cameraIds!.includes(e.cameraId));
    }

    // Filter by time range
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (filters.timeRange === 'today') {
      events = events.filter(e => e.timestamp >= today);
    } else if (filters.timeRange === 'yesterday') {
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      events = events.filter(e => e.timestamp >= yesterday && e.timestamp < today);
    } else if (filters.timeRange === 'week') {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      events = events.filter(e => e.timestamp >= weekAgo);
    }

    // Filter by time of day
    if (filters.timeOfDay) {
      events = events.filter(e => {
        const hour = e.timestamp.getHours();
        switch (filters.timeOfDay) {
          case 'morning': return hour >= 6 && hour < 12;
          case 'afternoon': return hour >= 12 && hour < 18;
          case 'evening': return hour >= 18 && hour < 22;
          case 'night': return hour >= 22 || hour < 6;
          default: return true;
        }
      });
    }

    // Filter by confidence
    if (filters.minConfidence) {
      events = events.filter(e => e.confidence >= filters.minConfidence!);
    }

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [activePreset]);

  // Calculate event counts for each preset
  const getPresetEventCount = (preset: Preset): number => {
    let events = [...mockEvents];
    const filters = preset.filters;

    if (filters.eventTypes?.length) {
      events = events.filter(e => filters.eventTypes!.includes(e.eventType));
    }
    if (filters.cameraIds?.length) {
      events = events.filter(e => filters.cameraIds!.includes(e.cameraId));
    }
    if (filters.minConfidence) {
      events = events.filter(e => e.confidence >= filters.minConfidence!);
    }

    return events.length;
  };

  const handleDeletePreset = (presetId: string) => {
    setUserPresets(prev => prev.filter(p => p.id !== presetId));
    if (activePreset?.id === presetId) {
      setActivePreset(null);
    }
  };

  const handleCreatePreset = () => {
    if (!newPresetName.trim()) return;

    const newPreset: Preset = {
      id: `custom-${Date.now()}`,
      name: newPresetName,
      icon: 'bookmark',
      color: COLORS.accent,
      description: 'Custom filter preset',
      filters: {},
      isSystem: false,
    };

    setUserPresets(prev => [...prev, newPreset]);
    setNewPresetName('');
    setShowCreateModal(false);
  };

  const renderPresetCard = (preset: Preset, isUserPreset: boolean = false) => {
    const eventCount = getPresetEventCount(preset);
    const isActive = activePreset?.id === preset.id;

    return (
      <TouchableOpacity
        key={preset.id}
        style={[styles.presetCard, isActive && styles.presetCardActive]}
        onPress={() => setActivePreset(isActive ? null : preset)}
        activeOpacity={0.7}
      >
        <View style={[styles.presetIcon, { backgroundColor: preset.color }]}>
          <Ionicons name={preset.icon as any} size={20} color="#fff" />
        </View>
        <View style={styles.presetInfo}>
          <Text style={styles.presetName}>{preset.name}</Text>
          <Text style={styles.presetDescription} numberOfLines={1}>
            {preset.description}
          </Text>
        </View>
        <View style={styles.presetMeta}>
          <Text style={styles.presetCount}>{eventCount}</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.border} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEvent = ({ item }: { item: SecurityEvent }) => (
    <EventCard
      event={item}
      variant="full"
      onPress={() => console.log('Event pressed:', item.id)}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {!activePreset ? (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Smart Filters</Text>
            <Text style={styles.subtitle}>
              Quick access to common searches and your saved filters
            </Text>
          </View>

          {/* System Presets */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Filters</Text>
            {systemPresets.map(preset => renderPresetCard(preset))}
          </View>

          {/* User Presets */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Saved Filters</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowCreateModal(true)}
              >
                <Ionicons name="add" size={20} color={COLORS.accent} />
                <Text style={styles.addButtonText}>New</Text>
              </TouchableOpacity>
            </View>
            {userPresets.length > 0 ? (
              userPresets.map(preset => renderPresetCard(preset, true))
            ) : (
              <View style={styles.emptyUserPresets}>
                <Ionicons name="bookmark-outline" size={32} color={COLORS.border} />
                <Text style={styles.emptyText}>No saved filters yet</Text>
                <Text style={styles.emptySubtext}>
                  Create custom filters for quick access
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <>
          {/* Active Preset Header */}
          <View style={styles.activePresetHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setActivePreset(null)}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <View style={[styles.activePresetIcon, { backgroundColor: activePreset.color }]}>
              <Ionicons name={activePreset.icon as any} size={18} color="#fff" />
            </View>
            <View style={styles.activePresetInfo}>
              <Text style={styles.activePresetName}>{activePreset.name}</Text>
              <Text style={styles.activePresetCount}>
                {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* Results */}
          <FlatList
            data={filteredEvents}
            renderItem={renderEvent}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="search" size={48} color={COLORS.border} />
                <Text style={styles.emptyStateText}>No events match this filter</Text>
              </View>
            }
          />
        </>
      )}

      {/* Create Preset Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Filter</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Filter name..."
              placeholderTextColor={COLORS.textSecondary}
              value={newPresetName}
              onChangeText={setNewPresetName}
              autoFocus
            />
            <Text style={styles.modalHint}>
              Tip: Use the forensic search to set up filters, then save them here.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewPresetName('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreate, !newPresetName.trim() && styles.modalCreateDisabled]}
                onPress={handleCreatePreset}
                disabled={!newPresetName.trim()}
              >
                <Text style={styles.modalCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 20,
  },
  header: {
    padding: 16,
  },
  title: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  addButtonText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '500',
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  presetCardActive: {
    borderWidth: 2,
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(13, 148, 136, 0.05)',
  },
  presetIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetInfo: {
    flex: 1,
    marginLeft: 12,
  },
  presetName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  presetDescription: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  presetMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  presetCount: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyUserPresets: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  emptySubtext: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  activePresetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: 12,
  },
  activePresetIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePresetInfo: {
    marginLeft: 10,
  },
  activePresetName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  activePresetCount: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  listContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    color: COLORS.text,
    fontSize: 16,
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 10,
    padding: 14,
    color: COLORS.text,
    fontSize: 15,
  },
  modalHint: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 10,
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  modalCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalCancelText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  modalCreate: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalCreateDisabled: {
    opacity: 0.5,
  },
  modalCreateText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
