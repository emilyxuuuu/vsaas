import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Share,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { SecurityEvent } from '../data/mockEvents';

const COLORS = {
  background: '#FFFFFF',
  backgroundSecondary: '#F3F4F6',
  text: '#111827',
  textSecondary: '#6B7280',
  accent: '#0D9488',
  border: '#E5E7EB',
};

const { width } = Dimensions.get('window');
const VIDEO_HEIGHT = Math.round(width * (9 / 16));

// Timeline constants
const SLOT_SECONDS = 10;       // each row = 10 seconds
const SLOT_HEIGHT  = 22;       // px per row
const LABEL_EVERY  = 3;        // major label every 3 slots (30s)
const BEFORE_SLOTS = 18;       // 3 min before event
const AFTER_SLOTS  = 30;       // 5 min after event
const TOTAL_SLOTS  = BEFORE_SLOTS + AFTER_SLOTS;

// Event bar colors matching screenshot
const BAR_COLORS: Record<string, string> = {
  person:  '#F87171',  // red/coral
  vehicle: '#60A5FA',  // blue
  package: '#FBBF24',  // yellow
  motion:  '#A78BFA',  // purple
  animal:  '#34D399',  // green
};

const BAR_WIDTH = 13;
const BAR_GAP   = 3;
const LABEL_WIDTH = 90;

interface PlaybackScreenProps {
  event: SecurityEvent;
  onBack: () => void;
  onFindSimilar?: (event: SecurityEvent) => void;
  onArchive?: (event: SecurityEvent) => void;
}

const formatTimeFull = (date: Date): string =>
  date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });

const formatDateShort = (date: Date): string => {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const prefix = d.getTime() === now.getTime() ? 'Today' : 'Yesterday';
  return `${prefix}, ${formatTimeFull(date)}`;
};

// Generate mock event bars relative to the event time
// Returns array of { type, startSlot, endSlot, column }
const generateBars = (event: SecurityEvent) => {
  const bars = [
    { type: event.eventType,  startOffset: -5, duration: 10, column: 0 },
    { type: 'vehicle',        startOffset: -3, duration:  7, column: 1 },
    { type: 'package',        startOffset: -2, duration:  5, column: 2 },
  ].filter(b => b.type in BAR_COLORS);

  return bars.map(b => ({
    ...b,
    startSlot: BEFORE_SLOTS + b.startOffset,
    endSlot:   BEFORE_SLOTS + b.startOffset + b.duration,
  }));
};

export const PlaybackScreen: React.FC<PlaybackScreenProps> = ({ event, onBack, onFindSimilar, onArchive }) => {
  const [isPlaying, setIsPlaying]     = useState(false);
  const [currentSlot, setCurrentSlot] = useState(BEFORE_SLOTS);
  const [showKebab, setShowKebab]     = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const timelineStart = new Date(event.timestamp.getTime() - BEFORE_SLOTS * SLOT_SECONDS * 1000);
  const bars = generateBars(event);

  const slotTime = (slotIndex: number): Date =>
    new Date(timelineStart.getTime() + slotIndex * SLOT_SECONDS * 1000);

  const currentTime = slotTime(currentSlot);

  // Scroll to center current slot on mount
  useEffect(() => {
    const visibleRows = 8;
    const offset = Math.max(0, (currentSlot - Math.floor(visibleRows / 2)) * SLOT_HEIGHT);
    setTimeout(() => scrollRef.current?.scrollTo({ y: offset, animated: false }), 100);
  }, []);

  const seek = (deltaSlots: number) => {
    setCurrentSlot(prev => Math.max(0, Math.min(TOTAL_SLOTS - 1, prev + deltaSlots)));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={18} color={COLORS.accent} />
          <Text style={styles.backText}>Views</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{event.cameraName}</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity><Ionicons name="camera-outline" size={22} color={COLORS.text} /></TouchableOpacity>
          <TouchableOpacity><Ionicons name="cloud-outline"  size={22} color={COLORS.text} /></TouchableOpacity>
        </View>
      </View>

      {/* ── Video ── */}
      <View style={styles.videoContainer}>
        <Image source={{ uri: event.thumbnail }} style={styles.video} resizeMode="cover" />
      </View>

      {/* ── Control strip ── */}
      <View style={styles.controlStrip}>
        {/* Date/time pill */}
        <View style={styles.timePill}>
          <Ionicons name="calendar-outline" size={13} color={COLORS.textSecondary} />
          <Text style={styles.timePillText}>{formatDateShort(currentTime)}</Text>
        </View>

        {/* Speed */}
        <TouchableOpacity style={styles.speedBtn}>
          <Text style={styles.speedText}>1x</Text>
        </TouchableOpacity>

        {/* Detection type toggles */}
        <View style={styles.detectionRow}>
          <View style={[styles.detectionIcon, { backgroundColor: '#60A5FA' }]}>
            <Ionicons name="walk-outline" size={13} color="#fff" />
          </View>
          <View style={[styles.detectionIcon, { backgroundColor: '#34D399' }]}>
            <Ionicons name="car-outline" size={13} color="#fff" />
          </View>
          <View style={[styles.detectionIcon, { backgroundColor: '#60A5FA' }]}>
            <Ionicons name="bicycle-outline" size={13} color="#fff" />
          </View>
        </View>

      </View>

      {/* ── Vertical timeline ── */}
      <ScrollView
        ref={scrollRef}
        style={styles.timeline}
        showsVerticalScrollIndicator={false}
      >
        {Array.from({ length: TOTAL_SLOTS }, (_, i) => {
          const isMajor    = i % LABEL_EVERY === 0;
          const isScrubber = i === currentSlot;
          const time       = slotTime(i);

          return (
            <TouchableOpacity
              key={i}
              activeOpacity={0.6}
              onPress={() => setCurrentSlot(i)}
              style={[styles.slotRow, isScrubber && styles.slotRowScrubber]}
            >
              {/* Time label */}
              <View style={styles.labelCol}>
                {isMajor ? (
                  <Text style={styles.slotLabel}>{formatTimeFull(time)}</Text>
                ) : (
                  <Text style={styles.slotDash}>—</Text>
                )}
              </View>

              {/* Horizontal tick line */}
              <View style={[styles.tickLine, isMajor && styles.tickLineMajor]} />

              {/* Event bars */}
              <View style={styles.barsCol}>
                {bars.map((bar, idx) => {
                  const active = i >= bar.startSlot && i < bar.endSlot;
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.barSegment,
                        {
                          marginLeft: idx === 0 ? 6 : BAR_GAP,
                          backgroundColor: active
                            ? BAR_COLORS[bar.type] ?? COLORS.accent
                            : 'transparent',
                        },
                      ]}
                    />
                  );
                })}
              </View>

              {/* Scrubber overlay line */}
              {isScrubber && <View style={styles.scrubberLine} pointerEvents="none" />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Transport controls — liquid glass ── */}
      <View style={styles.transport}>

        {/* Left side — invisible spacer same width as kebab */}
        <View style={styles.transportSide} />

        {/* Playback controls pill — truly centered */}
        <BlurView intensity={90} tint="systemThinMaterial" style={styles.glassPill}>
          <TouchableOpacity style={[styles.glassBtn, styles.seekBtn]} onPress={() => seek(-1)}>
            <Ionicons name="refresh-outline" size={26} color={COLORS.accent} style={{ transform: [{ scaleX: -1 }] }} />
            <Text style={styles.seekLabel}>10</Text>
          </TouchableOpacity>

          <View style={styles.pillDivider} />

          <TouchableOpacity style={styles.glassBtn} onPress={() => setCurrentSlot(0)}>
            <Ionicons name="play-skip-back" size={26} color={COLORS.accent} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.glassBtn, styles.playBtn]} onPress={() => setIsPlaying(p => !p)}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={34} color={COLORS.accent} style={isPlaying ? undefined : { marginLeft: 3 }} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.glassBtn} onPress={() => setCurrentSlot(TOTAL_SLOTS - 1)}>
            <Ionicons name="play-skip-forward" size={26} color={COLORS.accent} />
          </TouchableOpacity>

          <View style={styles.pillDivider} />

          <TouchableOpacity style={[styles.glassBtn, styles.seekBtn]} onPress={() => seek(1)}>
            <Ionicons name="refresh-outline" size={26} color={COLORS.accent} />
            <Text style={styles.seekLabel}>10</Text>
          </TouchableOpacity>
        </BlurView>

        {/* Right side — kebab pill */}
        <View style={styles.transportSide}>
          <BlurView intensity={90} tint="systemThinMaterial" style={styles.kebabPill}>
            <TouchableOpacity style={styles.kebabBtn} onPress={() => setShowKebab(true)}>
              <Ionicons name="ellipsis-vertical" size={22} color={COLORS.accent} />
            </TouchableOpacity>
          </BlurView>
        </View>
      </View>

      {/* Kebab action sheet */}
      <Modal visible={showKebab} transparent animationType="fade" onRequestClose={() => setShowKebab(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setShowKebab(false)}>
          <Pressable style={styles.sheetContainer} onPress={e => e.stopPropagation()}>
            <BlurView intensity={80} tint="systemMaterial" style={styles.sheetBlur}>
              <TouchableOpacity
                style={styles.sheetRow}
                onPress={() => {
                  setShowKebab(false);
                  Share.share({ message: `Security event: ${event.cameraName} — ${formatDateShort(event.timestamp)}\nhttps://arcules.app/events/${event.id}` });
                }}
              >
                <Ionicons name="arrow-redo-outline" size={20} color={COLORS.accent} />
                <Text style={styles.sheetRowText}>Share</Text>
              </TouchableOpacity>
              <View style={styles.sheetDivider} />
              <TouchableOpacity
                style={styles.sheetRow}
                onPress={() => { setShowKebab(false); onArchive?.(event); }}
              >
                <Ionicons name="folder-outline" size={20} color={COLORS.accent} />
                <Text style={styles.sheetRowText}>Archive to Case</Text>
              </TouchableOpacity>
            </BlurView>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 64 },
  backText: { color: COLORS.accent, fontSize: 15 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', color: COLORS.text },
  headerIcons: { flexDirection: 'row', gap: 12, minWidth: 64, justifyContent: 'flex-end' },

  // Video
  videoContainer: { width, height: VIDEO_HEIGHT, backgroundColor: '#000' },
  video: { width, height: VIDEO_HEIGHT },

  // Control strip
  controlStrip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 8 },
  timePill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  timePillText: { fontSize: 12, color: COLORS.text },
  speedBtn: { paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6 },
  speedText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  detectionRow: { flexDirection: 'row', gap: 4 },
  detectionIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },

  // Timeline
  timeline: { flex: 1 },
  slotRow: { flexDirection: 'row', alignItems: 'center', height: SLOT_HEIGHT, paddingHorizontal: 12 },
  slotRowScrubber: { backgroundColor: 'transparent' },
  labelCol: { width: LABEL_WIDTH },
  slotLabel: { fontSize: 11, color: COLORS.text },
  slotDash: { fontSize: 11, color: COLORS.textSecondary, marginLeft: 4 },
  tickLine: { flex: 1, height: 1, backgroundColor: 'transparent' },
  tickLineMajor: { backgroundColor: COLORS.border },
  barsCol: { flexDirection: 'row', alignItems: 'stretch' },
  barSegment: { width: BAR_WIDTH, height: SLOT_HEIGHT },
  scrubberLine: {
    position: 'absolute',
    left: 0, right: 0,
    top: Math.floor(SLOT_HEIGHT / 2),
    height: 2,
    backgroundColor: '#9CA3AF',
  },

  // Transport — liquid glass
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  transportSide: {
    flex: 1,
    alignItems: 'flex-end',
  },
  glassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
    backgroundColor: 'rgba(255,255,255,0.55)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  kebabPill: {
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
    backgroundColor: 'rgba(255,255,255,0.55)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  kebabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 60,
  },
  glassBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 60,
  },
  seekBtn: {
    gap: 2,
  },
  playBtn: {
    width: 64,
  },
  pillDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  seekLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 0.3,
  },
  // Kebab sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  sheetContainer: { borderRadius: 16, overflow: 'hidden' },
  sheetBlur: { paddingVertical: 4 },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sheetRowText: { fontSize: 16, color: COLORS.text },
  sheetDivider: { height: 0.5, backgroundColor: COLORS.border, marginHorizontal: 16 },
});
