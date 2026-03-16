import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { mockEvents, SecurityEvent } from '../data/mockEvents';

const COLORS = {
  background: '#FFFFFF',
  backgroundSecondary: '#F3F4F6',
  text: '#111827',
  textSecondary: '#6B7280',
  accent: '#0D9488',
  border: '#E5E7EB',
};

const { width } = Dimensions.get('window');
const HERO_HEIGHT = Math.round(width * (9 / 16));
const GRID_PADDING = 12;
const GRID_GAP = 6;
const CARD_WIDTH = (width - GRID_PADDING * 2 - GRID_GAP) / 2;
const CARD_IMAGE_HEIGHT = 110;

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatTimestamp = (date: Date): string => {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const diff = Math.round((now.getTime() - d.getTime()) / 86400000);
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (diff === 0) return `Today, ${time}`;
  if (diff === 1) return `Yesterday, ${time}`;
  return `${DAY_LABELS[date.getDay()]}, ${time}`;
};

interface FindSimilarScreenProps {
  event: SecurityEvent;
  onBack: () => void;
  onSelectEvent: (event: SecurityEvent) => void;
}

export const FindSimilarScreen: React.FC<FindSimilarScreenProps> = ({
  event,
  onBack,
  onSelectEvent,
}) => {
  // Similar = same event type, different camera, excluding original
  const similarEvents = mockEvents
    .filter(e => e.id !== event.id && e.eventType === event.eventType)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 20);

  // Pair into rows for 2-col grid
  const rows: SecurityEvent[][] = [];
  for (let i = 0; i < similarEvents.length; i += 2) {
    rows.push(similarEvents.slice(i, i + 2));
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="chevron-back" size={18} color={COLORS.accent} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Find Similar</Text>
          <View style={{ width: 64 }} />
        </View>

        {/* Hero event */}
        <View style={styles.hero}>
          <Image source={{ uri: event.thumbnail }} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroInfo}>
            <Text style={styles.heroCameraName}>{event.cameraName}</Text>
            <Text style={styles.heroTimestamp}>{formatTimestamp(event.timestamp)}</Text>
          </View>
        </View>

        {/* Similar events section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Find Similar</Text>
          <Text style={styles.sectionCount}>{similarEvents.length} found</Text>
        </View>

        {/* Grid */}
        <View style={styles.grid}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map(e => (
                <TouchableOpacity
                  key={e.id}
                  style={styles.card}
                  onPress={() => onSelectEvent(e)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: e.thumbnail }} style={styles.cardImage} resizeMode="cover" />
                  <Text style={styles.cardTimestamp} numberOfLines={1}>
                    {formatTimestamp(e.timestamp)}
                  </Text>
                </TouchableOpacity>
              ))}
              {row.length === 1 && <View style={{ width: CARD_WIDTH }} />}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 64 },
  backText: { color: COLORS.accent, fontSize: 15 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', color: COLORS.text },

  hero: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  heroImage: { width, height: HERO_HEIGHT, backgroundColor: '#D1D5DB' },
  heroInfo: { padding: 14 },
  heroCameraName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  heroTimestamp: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GRID_PADDING,
    paddingTop: 16,
    paddingBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  sectionCount: { fontSize: 13, color: COLORS.textSecondary },

  grid: { paddingHorizontal: GRID_PADDING, paddingBottom: 24 },
  row: { flexDirection: 'row', gap: GRID_GAP, marginBottom: GRID_GAP },
  card: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cardImage: { width: CARD_WIDTH, height: CARD_IMAGE_HEIGHT, backgroundColor: '#D1D5DB' },
  cardTimestamp: { fontSize: 11, color: COLORS.textSecondary, paddingHorizontal: 8, paddingVertical: 6 },
});
