import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mockEvents, cameras, SecurityEvent } from '../data/mockEvents';
import { EventCard } from '../components/EventCard';

const { width } = Dimensions.get('window');

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

// Color options for forensic filtering
const COLOR_OPTIONS = [
  { id: 'red', label: 'Red', color: '#EF4444' },
  { id: 'blue', label: 'Blue', color: '#3B82F6' },
  { id: 'green', label: 'Green', color: '#10B981' },
  { id: 'yellow', label: 'Yellow', color: '#F59E0B' },
  { id: 'black', label: 'Black', color: '#1F2937' },
  { id: 'white', label: 'White', color: '#F9FAFB' },
  { id: 'gray', label: 'Gray', color: '#6B7280' },
  { id: 'brown', label: 'Brown', color: '#92400E' },
];

export const ForensicSearchScreen: React.FC = () => {
  // Filter states (Arcules-style)
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [personEnabled, setPersonEnabled] = useState(false);
  const [vehicleEnabled, setVehicleEnabled] = useState(false);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('all');
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);
  const [showMotionOverlay, setShowMotionOverlay] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('detection');

  // Date range (simplified for prototype)
  const [dateRange, setDateRange] = useState<'2h' | '6h' | '12h' | '24h' | 'custom'>('2h');

  const filteredEvents = useMemo(() => {
    let events = [...mockEvents];

    // Filter by date range
    const now = new Date();
    let hoursBack = 2;
    switch (dateRange) {
      case '6h': hoursBack = 6; break;
      case '12h': hoursBack = 12; break;
      case '24h': hoursBack = 24; break;
      case 'custom': hoursBack = 168; break; // 1 week for demo
    }
    const cutoff = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);
    events = events.filter(e => e.timestamp >= cutoff);

    // Filter by camera
    if (selectedCamera !== 'all') {
      events = events.filter(e => e.cameraId === selectedCamera);
    }

    // Filter by detection type
    if (personEnabled && !vehicleEnabled) {
      events = events.filter(e => e.detections.persons > 0);
    } else if (vehicleEnabled && !personEnabled) {
      events = events.filter(e => e.detections.vehicles > 0);
    } else if (personEnabled && vehicleEnabled) {
      events = events.filter(e => e.detections.persons > 0 || e.detections.vehicles > 0);
    } else if (!motionEnabled) {
      // If motion is disabled and no object detection, show nothing
      events = [];
    }

    // Filter by confidence
    events = events.filter(e => e.confidence >= confidenceThreshold);

    // Filter by colors
    if (selectedColors.length > 0) {
      events = events.filter(e =>
        e.colors?.some(c =>
          selectedColors.some(sc => c.toLowerCase().includes(sc))
        )
      );
    }

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [motionEnabled, personEnabled, vehicleEnabled, selectedColors, selectedCamera, confidenceThreshold, dateRange]);

  const toggleColor = (colorId: string) => {
    setSelectedColors(prev =>
      prev.includes(colorId)
        ? prev.filter(c => c !== colorId)
        : [...prev, colorId]
    );
  };

  const renderSection = (id: string, title: string, icon: string, content: React.ReactNode) => {
    const isExpanded = expandedSection === id;
    return (
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setExpandedSection(isExpanded ? null : id)}
        >
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name={icon as any} size={20} color={COLORS.textSecondary} />
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.sectionContent}>
            {content}
          </View>
        )}
      </View>
    );
  };

  const renderEvent = ({ item }: { item: SecurityEvent }) => (
    <EventCard
      event={item}
      showBoundingBoxes={showMotionOverlay}
      onPress={() => console.log('Event pressed:', item.id)}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.splitView}>
        {/* Filters Panel (collapsible drawer style) */}
        <ScrollView style={styles.filtersPanel} showsVerticalScrollIndicator={false}>
          {/* Time Range */}
          <View style={styles.timeRangeContainer}>
            <Text style={styles.filterLabel}>Time Range</Text>
            <View style={styles.timeRangeButtons}>
              {(['2h', '6h', '12h', '24h'] as const).map(range => (
                <TouchableOpacity
                  key={range}
                  style={[
                    styles.timeRangeButton,
                    dateRange === range && styles.timeRangeButtonSelected
                  ]}
                  onPress={() => setDateRange(range)}
                >
                  <Text style={[
                    styles.timeRangeText,
                    dateRange === range && styles.timeRangeTextSelected
                  ]}>
                    {range}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Detection Section */}
          {renderSection('detection', 'Object Detection', 'scan', (
            <View style={styles.detectionOptions}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleLabel}>
                  <Ionicons name="pulse" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.toggleText}>Motion</Text>
                </View>
                <Switch
                  value={motionEnabled}
                  onValueChange={setMotionEnabled}
                  trackColor={{ false: COLORS.border, true: COLORS.accent }}
                  thumbColor="#fff"
                />
              </View>
              <View style={styles.toggleRow}>
                <View style={styles.toggleLabel}>
                  <Ionicons name="person" size={18} color={COLORS.accent} />
                  <Text style={styles.toggleText}>People</Text>
                </View>
                <Switch
                  value={personEnabled}
                  onValueChange={setPersonEnabled}
                  trackColor={{ false: COLORS.border, true: COLORS.accent }}
                  thumbColor="#fff"
                />
              </View>
              <View style={styles.toggleRow}>
                <View style={styles.toggleLabel}>
                  <Ionicons name="car" size={18} color="#8B5CF6" />
                  <Text style={styles.toggleText}>Vehicles</Text>
                </View>
                <Switch
                  value={vehicleEnabled}
                  onValueChange={setVehicleEnabled}
                  trackColor={{ false: COLORS.border, true: COLORS.accent }}
                  thumbColor="#fff"
                />
              </View>

              {/* Motion overlay toggle */}
              <View style={[styles.toggleRow, styles.toggleRowIndented]}>
                <Text style={styles.toggleTextSmall}>Show detection boxes</Text>
                <Switch
                  value={showMotionOverlay}
                  onValueChange={setShowMotionOverlay}
                  trackColor={{ false: COLORS.border, true: COLORS.accent }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          ))}

          {/* Color Section */}
          {renderSection('color', 'Color Filter', 'color-palette', (
            <View style={styles.colorGrid}>
              {COLOR_OPTIONS.map(color => (
                <TouchableOpacity
                  key={color.id}
                  style={[
                    styles.colorButton,
                    selectedColors.includes(color.id) && styles.colorButtonSelected
                  ]}
                  onPress={() => toggleColor(color.id)}
                >
                  <View style={[styles.colorSwatch, { backgroundColor: color.color }]}>
                    {selectedColors.includes(color.id) && (
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color={color.id === 'white' || color.id === 'yellow' ? '#000' : '#fff'}
                      />
                    )}
                  </View>
                  <Text style={styles.colorLabel}>{color.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {/* Camera Section */}
          {renderSection('camera', 'Camera', 'videocam', (
            <View style={styles.cameraList}>
              <TouchableOpacity
                style={[
                  styles.cameraOption,
                  selectedCamera === 'all' && styles.cameraOptionSelected
                ]}
                onPress={() => setSelectedCamera('all')}
              >
                <Text style={[
                  styles.cameraOptionText,
                  selectedCamera === 'all' && styles.cameraOptionTextSelected
                ]}>
                  All Cameras
                </Text>
              </TouchableOpacity>
              {cameras.map(camera => (
                <TouchableOpacity
                  key={camera.id}
                  style={[
                    styles.cameraOption,
                    selectedCamera === camera.id && styles.cameraOptionSelected
                  ]}
                  onPress={() => setSelectedCamera(camera.id)}
                >
                  <Text style={[
                    styles.cameraOptionText,
                    selectedCamera === camera.id && styles.cameraOptionTextSelected
                  ]}>
                    {camera.name}
                  </Text>
                  <Text style={styles.cameraLocation}>{camera.location}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {/* Confidence Section */}
          {renderSection('confidence', 'Confidence', 'analytics', (
            <View style={styles.confidenceContainer}>
              <Text style={styles.confidenceValue}>{confidenceThreshold}% minimum</Text>
              <View style={styles.confidenceButtons}>
                {[50, 70, 85, 95].map(value => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.confidenceButton,
                      confidenceThreshold === value && styles.confidenceButtonSelected
                    ]}
                    onPress={() => setConfidenceThreshold(value)}
                  >
                    <Text style={[
                      styles.confidenceButtonText,
                      confidenceThreshold === value && styles.confidenceButtonTextSelected
                    ]}>
                      {value}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Active Filters Summary */}
          <View style={styles.activeFilters}>
            <Text style={styles.activeFiltersTitle}>Active Filters</Text>
            <View style={styles.activeFilterTags}>
              {personEnabled && (
                <View style={styles.filterTag}>
                  <Text style={styles.filterTagText}>People</Text>
                </View>
              )}
              {vehicleEnabled && (
                <View style={styles.filterTag}>
                  <Text style={styles.filterTagText}>Vehicles</Text>
                </View>
              )}
              {selectedColors.map(color => (
                <View key={color} style={styles.filterTag}>
                  <Text style={styles.filterTagText}>{color}</Text>
                </View>
              ))}
              {selectedCamera !== 'all' && (
                <View style={styles.filterTag}>
                  <Text style={styles.filterTagText}>
                    {cameras.find(c => c.id === selectedCamera)?.name}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Results */}
        <View style={styles.resultsContainer}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              {filteredEvents.length} result{filteredEvents.length !== 1 ? 's' : ''}
            </Text>
            <TouchableOpacity style={styles.thumbnailSizeButton}>
              <Ionicons name="grid" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={filteredEvents}
            renderItem={renderEvent}
            keyExtractor={item => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="search" size={48} color={COLORS.border} />
                <Text style={styles.emptyText}>No matches found</Text>
                <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
              </View>
            }
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  splitView: {
    flex: 1,
  },
  filtersPanel: {
    backgroundColor: COLORS.backgroundSecondary,
    maxHeight: 350,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  timeRangeContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  timeRangeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeRangeButtonSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  timeRangeText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  timeRangeTextSelected: {
    color: '#fff',
  },
  section: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  sectionContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  detectionOptions: {
    gap: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleRowIndented: {
    marginLeft: 28,
    marginTop: 4,
  },
  toggleLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleText: {
    color: COLORS.text,
    fontSize: 14,
  },
  toggleTextSmall: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorButton: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorButtonSelected: {
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  colorLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 4,
  },
  cameraList: {
    gap: 6,
  },
  cameraOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cameraOptionSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  cameraOptionText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '500',
  },
  cameraOptionTextSelected: {
    color: '#fff',
  },
  cameraLocation: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  confidenceContainer: {
    gap: 10,
  },
  confidenceValue: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  confidenceButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  confidenceButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  confidenceButtonSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  confidenceButtonText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  confidenceButtonTextSelected: {
    color: '#fff',
  },
  activeFilters: {
    padding: 14,
  },
  activeFiltersTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginBottom: 8,
  },
  activeFilterTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterTag: {
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  filterTagText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '500',
  },
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultsCount: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  thumbnailSizeButton: {
    padding: 6,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  row: {
    gap: 12,
    marginBottom: 12,
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
