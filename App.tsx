import React, { useState, useMemo } from 'react';
import { SecurityEvent } from './src/data/mockEvents';
import { MOCK_SITES, MOCK_CAMERAS } from './src/data/mockLocations';
import { PlaybackScreen } from './src/screens/PlaybackScreen';
import { FindSimilarScreen } from './src/screens/FindSimilarScreen';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// Import all screen approaches
import { ChipsFilterScreen } from './src/screens/ChipsFilterScreen';
import { NLPSearchScreen } from './src/screens/NLPSearchScreen';
import { TimelineScreen } from './src/screens/TimelineScreen';
import { MapViewScreen } from './src/screens/MapViewScreen';
import { PresetsScreen } from './src/screens/PresetsScreen';
import { ForensicSearchScreen } from './src/screens/ForensicSearchScreen';
import { SimilaritySearchScreen } from './src/screens/SimilaritySearchScreen';

type ApproachId = 'chips' | 'nlp' | 'timeline' | 'map' | 'presets' | 'forensic' | 'similarity';

interface Approach {
  id: ApproachId;
  name: string;
  shortName: string;
  icon: string;
  description: string;
}

const APPROACHES: Approach[] = [
  {
    id: 'chips',
    name: 'Quick Filter Chips',
    shortName: 'Chips',
    icon: 'options',
    description: 'Filter by event type, time, and camera with tappable chips',
  },
  {
    id: 'nlp',
    name: 'Natural Language Search',
    shortName: 'NLP Search',
    icon: 'chatbubble-ellipses',
    description: 'Search using natural language like "people at front door today"',
  },
  {
    id: 'timeline',
    name: 'Visual Timeline',
    shortName: 'Timeline',
    icon: 'time',
    description: 'Browse events on a scrollable 24-hour timeline',
  },
  {
    id: 'map',
    name: 'Map / Floor Plan',
    shortName: 'Map View',
    icon: 'map',
    description: 'View cameras on a visual floor plan with activity indicators',
  },
  {
    id: 'presets',
    name: 'Smart Presets',
    shortName: 'Presets',
    icon: 'bookmark',
    description: 'Quick access to common searches and saved filters',
  },
  {
    id: 'forensic',
    name: 'Forensic Search',
    shortName: 'Forensic',
    icon: 'search',
    description: 'Advanced Arcules-style search with motion, object, and color filters',
  },
  {
    id: 'similarity',
    name: 'Similarity Search',
    shortName: 'Similar',
    icon: 'images',
    description: 'Find visually similar events (Pinterest/TikTok style)',
  },
];

// Arcules-style colors
const COLORS = {
  background: '#FFFFFF',
  backgroundSecondary: '#F3F4F6',
  text: '#111827',
  textSecondary: '#6B7280',
  accent: '#0D9488', // Teal
  border: '#E5E7EB',
  online: '#10B981',
};

export default function App() {
  const [currentApproach, setCurrentApproach] = useState<ApproachId>('chips');
  const [showPicker, setShowPicker] = useState(false);
  const [selectedEvent, setSelectedEvent]       = useState<SecurityEvent | null>(null);
  const [findSimilarEvent, setFindSimilarEvent] = useState<SecurityEvent | null>(null);

  // Location filter state (lives here so it renders in the shared header)
  const [selectedCameraIds, setSelectedCameraIds]         = useState<Set<string>>(new Set());
  const [showLocationDropdown, setShowLocationDropdown]   = useState(false);
  const [expandedSiteId, setExpandedSiteId]               = useState<string | null>(null);

  const activeSiteId = useMemo(() => {
    if (selectedCameraIds.size === 0) return 'all';
    for (const site of MOCK_SITES) {
      const ids = MOCK_CAMERAS.filter(c => c.siteId === site.id).map(c => c.id);
      if (ids.length === selectedCameraIds.size && ids.every(id => selectedCameraIds.has(id))) return site.id;
    }
    return 'custom';
  }, [selectedCameraIds]);

  const locationLabel = useMemo(() => {
    if (activeSiteId === 'all')    return 'All Locations';
    if (activeSiteId === 'custom') return `${selectedCameraIds.size} cameras`;
    return MOCK_SITES.find(s => s.id === activeSiteId)?.name ?? 'Location';
  }, [activeSiteId, selectedCameraIds]);

  const activeApproach = APPROACHES.find(a => a.id === currentApproach)!;

  const renderScreen = () => {
    switch (currentApproach) {
      case 'chips':
        return <ChipsFilterScreen />;
      case 'nlp':
        return <NLPSearchScreen />;
      case 'timeline':
        return <TimelineScreen
          onSelectEvent={setSelectedEvent}
          onFindSimilar={setFindSimilarEvent}
          selectedCameraIds={selectedCameraIds}
          setSelectedCameraIds={setSelectedCameraIds}
        />;
      case 'map':
        return <MapViewScreen />;
      case 'presets':
        return <PresetsScreen />;
      case 'forensic':
        return <ForensicSearchScreen />;
      case 'similarity':
        return <SimilaritySearchScreen />;
      default:
        return <ChipsFilterScreen />;
    }
  };

  if (selectedEvent) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <PlaybackScreen
          event={selectedEvent}
          onBack={() => setSelectedEvent(null)}
          onFindSimilar={(e) => { setSelectedEvent(null); setFindSimilarEvent(e); }}
          onArchive={() => setSelectedEvent(null)}
        />
      </SafeAreaProvider>
    );
  }

  if (findSimilarEvent) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <FindSimilarScreen
          event={findSimilarEvent}
          onBack={() => setFindSimilarEvent(null)}
          onSelectEvent={(e) => { setFindSimilarEvent(null); setSelectedEvent(e); }}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          {/* Left spacer — mirrors approach selector width to keep pill truly centered */}
          <View style={styles.headerSpacer} />

          {/* Center: location picker (timeline only) */}
          <View style={styles.headerCenter}>
            {currentApproach === 'timeline' && (
              <TouchableOpacity
                style={styles.locationPill}
                onPress={() => setShowLocationDropdown(p => !p)}
                activeOpacity={0.75}
              >
                <Ionicons name="location" size={14} color={COLORS.text} />
                <Text style={styles.locationPillText}>{locationLabel}</Text>
                <Ionicons name={showLocationDropdown ? 'chevron-up' : 'chevron-down'} size={13} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Right: approach selector (icon only) */}
          <TouchableOpacity
            style={styles.approachSelector}
            onPress={() => setShowPicker(true)}
          >
            <Ionicons name={activeApproach.icon as any} size={18} color={COLORS.accent} />
            <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Current Screen */}
        <View style={styles.screenContainer}>
          {renderScreen()}
        </View>

        {/* Bottom Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tabItem}>
            <View style={styles.tabIconInactive}>
              <Ionicons name="videocam-off" size={22} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem}>
            <View style={styles.tabIconActive}>
              <MaterialCommunityIcons name="image-search-outline" size={22} color={COLORS.accent} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem}>
            <View style={styles.tabIconInactive}>
              <Ionicons name="warning" size={22} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem}>
            <View style={styles.tabIconInactive}>
              <Ionicons name="person" size={22} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Approach Picker Modal */}
        <Modal
          visible={showPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowPicker(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choose Search Approach</Text>
                <Text style={styles.modalSubtitle}>
                  Compare different filtering UX patterns
                </Text>
              </View>

              <ScrollView style={styles.approachList}>
                {APPROACHES.map((approach, index) => (
                  <TouchableOpacity
                    key={approach.id}
                    style={[
                      styles.approachItem,
                      currentApproach === approach.id && styles.approachItemActive,
                    ]}
                    onPress={() => {
                      setCurrentApproach(approach.id);
                      setShowPicker(false);
                    }}
                  >
                    <View style={[
                      styles.approachItemIcon,
                      currentApproach === approach.id && styles.approachItemIconActive
                    ]}>
                      <Ionicons
                        name={approach.icon as any}
                        size={20}
                        color={currentApproach === approach.id ? '#fff' : COLORS.accent}
                      />
                    </View>
                    <View style={styles.approachItemInfo}>
                      <View style={styles.approachItemHeader}>
                        <Text style={styles.approachItemName}>{approach.name}</Text>
                        <Text style={styles.approachItemLetter}>
                          {String.fromCharCode(65 + index)}
                        </Text>
                      </View>
                      <Text style={styles.approachItemDescription}>
                        {approach.description}
                      </Text>
                    </View>
                    {currentApproach === approach.id && (
                      <Ionicons name="checkmark-circle" size={22} color={COLORS.accent} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Location Dropdown */}
        <Modal visible={showLocationDropdown} transparent animationType="fade" onRequestClose={() => setShowLocationDropdown(false)}>
          <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => { setShowLocationDropdown(false); setExpandedSiteId(null); }} />
          <View style={styles.dropdownCard}>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              {/* All Locations */}
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => { setSelectedCameraIds(new Set()); setShowLocationDropdown(false); setExpandedSiteId(null); }}
              >
                <Text style={[styles.dropdownItemText, activeSiteId === 'all' && styles.dropdownItemTextActive]}>All Locations</Text>
                {activeSiteId === 'all' && <Ionicons name="checkmark" size={16} color={COLORS.accent} />}
              </TouchableOpacity>

              {/* Site rows with accordion */}
              {MOCK_SITES.map((site, idx) => {
                const siteCams   = MOCK_CAMERAS.filter(c => c.siteId === site.id);
                const isExpanded = expandedSiteId === site.id;
                const selCount   = siteCams.filter(c => selectedCameraIds.has(c.id)).length;
                const allSel     = selCount === siteCams.length;
                const isSiteActive = activeSiteId === site.id;

                const toggleCamera = (camId: string) => {
                  setSelectedCameraIds(prev => {
                    const next = new Set(prev);
                    next.has(camId) ? next.delete(camId) : next.add(camId);
                    return next;
                  });
                };

                return (
                  <View key={site.id}>
                    <View style={[styles.dropdownItem, idx === 0 && { borderTopWidth: 1, borderTopColor: COLORS.border }]}>
                      {/* Left: tap to select all cameras for this site */}
                      <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => { setSelectedCameraIds(new Set(siteCams.map(c => c.id))); setShowLocationDropdown(false); setExpandedSiteId(null); }}
                      >
                        <Text style={[styles.dropdownItemText, isSiteActive && styles.dropdownItemTextActive]}>{site.name}</Text>
                        <Text style={styles.dropdownItemSub}>{site.address}</Text>
                      </TouchableOpacity>
                      {/* Right: selection indicator + expand chevron */}
                      <View style={styles.dropdownItemRight}>
                        {selCount > 0 && !isExpanded && (
                          <View style={styles.selBadge}>
                            <Text style={styles.selBadgeText}>{selCount}</Text>
                          </View>
                        )}
                        {isSiteActive && !isExpanded && <Ionicons name="checkmark" size={16} color={COLORS.accent} style={{ marginRight: 6 }} />}
                        <TouchableOpacity onPress={() => setExpandedSiteId(isExpanded ? null : site.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Expanded camera list */}
                    {isExpanded && siteCams.map(cam => {
                      const checked = selectedCameraIds.has(cam.id);
                      return (
                        <TouchableOpacity
                          key={cam.id}
                          style={styles.camRow}
                          onPress={() => toggleCamera(cam.id)}
                        >
                          <View style={styles.camIndent} />
                          <View style={[styles.checkbox, checked && styles.checkboxActive]}>
                            {checked && <Ionicons name="checkmark" size={11} color="#fff" />}
                          </View>
                          <Ionicons name="videocam-outline" size={13} color={COLORS.textSecondary} style={{ marginLeft: 8 }} />
                          <Text style={styles.camName}>{cam.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}

              {/* Select cameras (opens full filter sheet) */}
              <TouchableOpacity
                style={[styles.dropdownItem, styles.dropdownSelectCams]}
                onPress={() => { setShowLocationDropdown(false); setExpandedSiteId(null); }}
              >
                <Text style={[styles.dropdownItemText, { color: COLORS.accent }]}>Select cameras...</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.accent} />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>

      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerSpacer: { width: 64 },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  locationPillText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  dropdownOverlay: { flex: 1 },
  dropdownCard: {
    position: 'absolute', top: 64, left: 16, right: 16,
    backgroundColor: COLORS.background,
    borderRadius: 14, maxHeight: 420, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 12, elevation: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  dropdownItem:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dropdownItemRight:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dropdownItemText:       { fontSize: 15, color: COLORS.text },
  dropdownItemTextActive: { color: COLORS.accent, fontWeight: '600' },
  dropdownItemSub:        { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  dropdownSelectCams:     { borderBottomWidth: 0 },
  selBadge:               { backgroundColor: COLORS.accent, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, marginRight: 4 },
  selBadgeText:           { fontSize: 11, color: '#fff', fontWeight: '700' },
  camRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingRight: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.backgroundSecondary },
  camIndent: { width: 36 },
  camName:   { fontSize: 14, color: COLORS.text, flex: 1, marginLeft: 6 },
  checkbox:       { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  checkboxActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accent },
  headerTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '600',
  },
  approachSelector: {
    width: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  approachName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 8,
    paddingBottom: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabIconActive: {
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabIconInactive: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
  },
  modalSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  approachList: {
    maxHeight: 400,
  },
  approachItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  approachItemActive: {
    backgroundColor: 'rgba(13, 148, 136, 0.05)',
  },
  approachItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approachItemIconActive: {
    backgroundColor: COLORS.accent,
  },
  approachItemInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 10,
  },
  approachItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  approachItemName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  approachItemLetter: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  approachItemDescription: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
});
