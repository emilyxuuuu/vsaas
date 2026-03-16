import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mockEvents, cameras, SecurityEvent } from '../data/mockEvents';
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

type FilterType = 'all' | 'person' | 'vehicle' | 'package' | 'animal' | 'motion';
type TimeFilter = 'all' | 'today' | 'yesterday' | 'week';

interface FilterChip {
  id: string;
  label: string;
  icon: string;
}

const EVENT_CHIPS: FilterChip[] = [
  { id: 'all', label: 'All', icon: 'grid' },
  { id: 'person', label: 'People', icon: 'person' },
  { id: 'vehicle', label: 'Vehicles', icon: 'car' },
  { id: 'package', label: 'Packages', icon: 'cube' },
  { id: 'animal', label: 'Animals', icon: 'paw' },
  { id: 'motion', label: 'Motion', icon: 'pulse' },
];

const TIME_CHIPS: FilterChip[] = [
  { id: 'all', label: 'All Time', icon: 'time' },
  { id: 'today', label: 'Today', icon: 'today' },
  { id: 'yesterday', label: 'Yesterday', icon: 'calendar' },
  { id: 'week', label: 'This Week', icon: 'calendar-outline' },
];

export const ChipsFilterScreen: React.FC = () => {
  const [selectedEventType, setSelectedEventType] = useState<FilterType>('all');
  const [selectedTime, setSelectedTime] = useState<TimeFilter>('all');
  const [selectedCameras, setSelectedCameras] = useState<string[]>([]);
  const [showCameraFilter, setShowCameraFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = useMemo(() => {
    let events = [...mockEvents];

    // Filter by event type
    if (selectedEventType !== 'all') {
      events = events.filter(e => e.eventType === selectedEventType);
    }

    // Filter by time
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    if (selectedTime === 'today') {
      events = events.filter(e => e.timestamp >= today);
    } else if (selectedTime === 'yesterday') {
      events = events.filter(e => e.timestamp >= yesterday && e.timestamp < today);
    } else if (selectedTime === 'week') {
      events = events.filter(e => e.timestamp >= weekAgo);
    }

    // Filter by cameras
    if (selectedCameras.length > 0) {
      events = events.filter(e => selectedCameras.includes(e.cameraId));
    }

    // Sort by timestamp (newest first)
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return events;
  }, [selectedEventType, selectedTime, selectedCameras]);

  const toggleCamera = (cameraId: string) => {
    setSelectedCameras(prev =>
      prev.includes(cameraId)
        ? prev.filter(id => id !== cameraId)
        : [...prev, cameraId]
    );
  };

  const renderEventChip = (chip: FilterChip) => {
    const isSelected = selectedEventType === chip.id;
    return (
      <TouchableOpacity
        key={chip.id}
        style={[styles.chip, isSelected && styles.chipSelected]}
        onPress={() => setSelectedEventType(chip.id as FilterType)}
      >
        <Ionicons
          name={chip.icon as any}
          size={16}
          color={isSelected ? '#fff' : COLORS.textSecondary}
        />
        <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
          {chip.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderTimeChip = (chip: FilterChip) => {
    const isSelected = selectedTime === chip.id;
    return (
      <TouchableOpacity
        key={chip.id}
        style={[styles.chip, styles.smallChip, isSelected && styles.chipSelected]}
        onPress={() => setSelectedTime(chip.id as TimeFilter)}
      >
        <Text style={[styles.chipLabel, styles.smallChipLabel, isSelected && styles.chipLabelSelected]}>
          {chip.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.filtersContainer}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search Locations"
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Event Type Chips */}
      <Text style={styles.filterSectionLabel}>Event Type</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {EVENT_CHIPS.map(renderEventChip)}
      </ScrollView>

      {/* Time Filter Chips */}
      <Text style={styles.filterSectionLabel}>Time Range</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {TIME_CHIPS.map(renderTimeChip)}
      </ScrollView>

      {/* Camera Filter Toggle */}
      <TouchableOpacity
        style={styles.cameraFilterToggle}
        onPress={() => setShowCameraFilter(!showCameraFilter)}
      >
        <View style={styles.cameraFilterLeft}>
          <Ionicons name="videocam" size={18} color={COLORS.textSecondary} />
          <Text style={styles.cameraFilterLabel}>
            {selectedCameras.length === 0
              ? 'All Cameras'
              : `${selectedCameras.length} Camera${selectedCameras.length > 1 ? 's' : ''}`}
          </Text>
        </View>
        <Ionicons
          name={showCameraFilter ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={COLORS.textSecondary}
        />
      </TouchableOpacity>

      {/* Camera Selection */}
      {showCameraFilter && (
        <View style={styles.cameraGrid}>
          {cameras.map(camera => (
            <TouchableOpacity
              key={camera.id}
              style={[
                styles.cameraChip,
                selectedCameras.includes(camera.id) && styles.cameraChipSelected
              ]}
              onPress={() => toggleCamera(camera.id)}
            >
              <Text style={[
                styles.cameraChipText,
                selectedCameras.includes(camera.id) && styles.cameraChipTextSelected
              ]}>
                {camera.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Results count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
        </Text>
        {(selectedEventType !== 'all' || selectedTime !== 'all' || selectedCameras.length > 0) && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setSelectedEventType('all');
              setSelectedTime('all');
              setSelectedCameras([]);
            }}
          >
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderEvent = ({ item }: { item: SecurityEvent }) => (
    <EventCard
      event={item}
      variant="full"
      onPress={() => console.log('Event pressed:', item.id)}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={filteredEvents}
        renderItem={renderEvent}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color={COLORS.border} />
            <Text style={styles.emptyText}>No events found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  filterSectionLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  chipSelected: {
    backgroundColor: COLORS.accent,
  },
  smallChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  smallChipLabel: {
    fontSize: 13,
  },
  chipLabelSelected: {
    color: '#fff',
  },
  cameraFilterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  cameraFilterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cameraFilterLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  cameraGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  cameraChip: {
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cameraChipSelected: {
    backgroundColor: COLORS.accent,
  },
  cameraChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  cameraChipTextSelected: {
    color: '#fff',
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 12,
  },
  resultsCount: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearButtonText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
});
