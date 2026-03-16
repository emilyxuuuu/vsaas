import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mockEvents, SecurityEvent } from '../data/mockEvents';
import { EventCard } from '../components/EventCard';

const { width, height } = Dimensions.get('window');
const SEED_CARD_WIDTH = (width - 48) / 2;

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

// Simulated similarity scoring based on event attributes
const calculateSimilarity = (source: SecurityEvent, target: SecurityEvent): number => {
  let score = 0;

  // Same event type is highly similar
  if (source.eventType === target.eventType) score += 40;

  // Same camera location
  if (source.cameraLocation === target.cameraLocation) score += 15;

  // Similar detection counts
  const personDiff = Math.abs(source.detections.persons - target.detections.persons);
  const vehicleDiff = Math.abs(source.detections.vehicles - target.detections.vehicles);
  if (personDiff <= 1) score += 10;
  if (vehicleDiff <= 1) score += 10;

  // Color similarity (if both have colors)
  if (source.colors && target.colors) {
    const commonColors = source.colors.filter(c => target.colors?.includes(c));
    score += commonColors.length * 5;
  }

  // Similar time of day
  const sourceHour = source.timestamp.getHours();
  const targetHour = target.timestamp.getHours();
  if (Math.abs(sourceHour - targetHour) <= 2) score += 10;

  // Confidence level similarity
  if (Math.abs(source.confidence - target.confidence) <= 0.1) score += 5;

  return Math.min(score, 100);
};

export const SimilaritySearchScreen: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SecurityEvent[]>([]);

  // Get recent events as seed options
  const recentEvents = useMemo(() => {
    return [...mockEvents]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 8);
  }, []);

  // Find similar events based on selected event
  const similarEvents = useMemo(() => {
    if (!selectedEvent) return [];

    return mockEvents
      .filter(e => e.id !== selectedEvent.id)
      .map(e => ({
        event: e,
        similarity: calculateSimilarity(selectedEvent, e),
      }))
      .filter(e => e.similarity > 30)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 20);
  }, [selectedEvent]);

  const handleEventSelect = (event: SecurityEvent) => {
    setSelectedEvent(event);
    if (!searchHistory.find(e => e.id === event.id)) {
      setSearchHistory(prev => [event, ...prev].slice(0, 5));
    }
  };

  const getSimilarityLabel = (score: number): string => {
    if (score >= 80) return 'Very Similar';
    if (score >= 60) return 'Similar';
    if (score >= 40) return 'Somewhat Similar';
    return 'Related';
  };

  const getSimilarityColor = (score: number): string => {
    if (score >= 80) return COLORS.online;
    if (score >= 60) return COLORS.accent;
    if (score >= 40) return '#F59E0B';
    return COLORS.textSecondary;
  };

  const renderSeedEvent = (event: SecurityEvent) => (
    <TouchableOpacity
      key={event.id}
      style={styles.seedCard}
      onPress={() => handleEventSelect(event)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: event.thumbnail }}
        style={styles.seedImage}
        resizeMode="cover"
      />
      <View style={styles.seedOverlay}>
        <Ionicons name="search" size={20} color="#fff" />
        <Text style={styles.seedText}>Find Similar</Text>
      </View>
      {selectedEvent?.id === event.id && (
        <View style={styles.selectedIndicator}>
          <Ionicons name="checkmark-circle" size={24} color={COLORS.accent} />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSimilarEvent = ({ event, similarity }: { event: SecurityEvent; similarity: number }) => (
    <TouchableOpacity
      key={event.id}
      style={styles.similarCard}
      onPress={() => handleEventSelect(event)}
      onLongPress={() => {
        setSelectedEvent(event);
        setShowModal(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.similarImageContainer}>
        <Image
          source={{ uri: event.thumbnail }}
          style={styles.similarImage}
          resizeMode="cover"
        />
        <View style={[styles.similarityBadge, { backgroundColor: getSimilarityColor(similarity) }]}>
          <Text style={styles.similarityScore}>{similarity}%</Text>
        </View>
      </View>
      <View style={styles.similarInfo}>
        <Text style={styles.similarCamera} numberOfLines={1}>{event.cameraName}</Text>
        <Text style={[styles.similarityLabel, { color: getSimilarityColor(similarity) }]}>
          {getSimilarityLabel(similarity)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="images" size={24} color={COLORS.accent} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Find Similar Events</Text>
            <Text style={styles.subtitle}>
              Tap any event to find visually similar moments
            </Text>
          </View>
        </View>

        {/* Search History */}
        {searchHistory.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Searches</Text>
              <TouchableOpacity onPress={() => setSearchHistory([])}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.historyRow}
            >
              {searchHistory.map(event => (
                <TouchableOpacity
                  key={event.id}
                  style={[
                    styles.historyItem,
                    selectedEvent?.id === event.id && styles.historyItemSelected
                  ]}
                  onPress={() => handleEventSelect(event)}
                >
                  <Image
                    source={{ uri: event.thumbnail }}
                    style={styles.historyImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Selected Event */}
        {selectedEvent && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Searching For</Text>
            <View style={styles.selectedCard}>
              <Image
                source={{ uri: selectedEvent.thumbnail }}
                style={styles.selectedImage}
                resizeMode="cover"
              />
              <View style={styles.selectedInfo}>
                <Text style={styles.selectedCamera}>{selectedEvent.cameraName}</Text>
                <Text style={styles.selectedTime}>
                  {selectedEvent.timestamp.toLocaleString()}
                </Text>
                <View style={styles.selectedTags}>
                  <View style={styles.tag}>
                    <Ionicons name="locate" size={12} color={COLORS.textSecondary} />
                    <Text style={styles.tagText}>{selectedEvent.cameraLocation}</Text>
                  </View>
                  <View style={styles.tag}>
                    <Ionicons name="analytics" size={12} color={COLORS.textSecondary} />
                    <Text style={styles.tagText}>{selectedEvent.eventType}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={styles.clearSelection}
                onPress={() => setSelectedEvent(null)}
              >
                <Ionicons name="close-circle" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Similar Results */}
        {selectedEvent && similarEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {similarEvents.length} Similar Events Found
            </Text>
            <View style={styles.similarGrid}>
              {similarEvents.map(renderSimilarEvent)}
            </View>
          </View>
        )}

        {/* Seed Events (when no selection) */}
        {!selectedEvent && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose an Event</Text>
            <Text style={styles.sectionSubtitle}>
              Select an event to find similar moments across all cameras
            </Text>
            <View style={styles.seedGrid}>
              {recentEvents.map(renderSeedEvent)}
            </View>
          </View>
        )}

        {/* No Results */}
        {selectedEvent && similarEvents.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color={COLORS.border} />
            <Text style={styles.emptyText}>No similar events found</Text>
            <Text style={styles.emptySubtext}>Try selecting a different event</Text>
          </View>
        )}

        {/* How It Works */}
        <View style={styles.howItWorks}>
          <Text style={styles.howItWorksTitle}>How Similarity Search Works</Text>
          <View style={styles.howItWorksItem}>
            <View style={styles.howItWorksIcon}>
              <Ionicons name="finger-print" size={18} color={COLORS.accent} />
            </View>
            <Text style={styles.howItWorksText}>
              Analyzes event type, location, time, and visual characteristics
            </Text>
          </View>
          <View style={styles.howItWorksItem}>
            <View style={styles.howItWorksIcon}>
              <Ionicons name="git-compare" size={18} color={COLORS.accent} />
            </View>
            <Text style={styles.howItWorksText}>
              Compares against all recorded events to find matches
            </Text>
          </View>
          <View style={styles.howItWorksItem}>
            <View style={styles.howItWorksIcon}>
              <Ionicons name="trending-up" size={18} color={COLORS.accent} />
            </View>
            <Text style={styles.howItWorksText}>
              Ranks results by similarity score for easy review
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Event Detail Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedEvent && (
              <>
                <Image
                  source={{ uri: selectedEvent.thumbnail }}
                  style={styles.modalImage}
                  resizeMode="cover"
                />
                <View style={styles.modalInfo}>
                  <Text style={styles.modalCamera}>{selectedEvent.cameraName}</Text>
                  <Text style={styles.modalTime}>
                    {selectedEvent.timestamp.toLocaleString()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setShowModal(false)}
                >
                  <Text style={styles.modalCloseText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
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
  sectionSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: -8,
    marginBottom: 12,
  },
  clearText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '500',
  },
  historyRow: {
    gap: 8,
  },
  historyItem: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  historyItemSelected: {
    borderColor: COLORS.accent,
  },
  historyImage: {
    width: '100%',
    height: '100%',
  },
  selectedCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  selectedImage: {
    width: 100,
    height: 80,
  },
  selectedInfo: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  selectedCamera: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  selectedTime: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  selectedTags: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    textTransform: 'capitalize',
  },
  clearSelection: {
    padding: 10,
    justifyContent: 'center',
  },
  seedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  seedCard: {
    width: SEED_CARD_WIDTH,
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  seedImage: {
    width: '100%',
    height: '100%',
  },
  seedOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 8,
  },
  seedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  similarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  similarCard: {
    width: SEED_CARD_WIDTH,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    overflow: 'hidden',
  },
  similarImageContainer: {
    position: 'relative',
  },
  similarImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  similarityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  similarityScore: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  similarInfo: {
    padding: 10,
  },
  similarCamera: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '500',
  },
  similarityLabel: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
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
  howItWorks: {
    marginHorizontal: 16,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  howItWorksTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  howItWorksItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  howItWorksIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  howItWorksText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 40,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  modalInfo: {
    padding: 16,
  },
  modalCamera: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  modalTime: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  modalClose: {
    backgroundColor: COLORS.accent,
    padding: 14,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
