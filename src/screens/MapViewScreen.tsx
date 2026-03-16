import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mockEvents, cameras, SecurityEvent, Camera } from '../data/mockEvents';
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

const { width } = Dimensions.get('window');
const MAP_HEIGHT = 280;

// Camera positions on the floor plan (simulated layout)
const cameraPositions: { [key: string]: { x: number; y: number; zone: string } } = {
  'cam-1': { x: 0.5, y: 0.15, zone: 'entrance' },
  'cam-2': { x: 0.85, y: 0.35, zone: 'driveway' },
  'cam-3': { x: 0.5, y: 0.85, zone: 'backyard' },
  'cam-4': { x: 0.15, y: 0.5, zone: 'garage' },
  'cam-5': { x: 0.35, y: 0.3, zone: 'lobby' },
  'cam-6': { x: 0.65, y: 0.5, zone: 'parking' },
  'cam-7': { x: 0.85, y: 0.7, zone: 'parking' },
  'cam-8': { x: 0.15, y: 0.75, zone: 'perimeter' },
};

// Zone definitions for floor plan
const zones = [
  { id: 'entrance', label: 'Entrance', color: 'rgba(13, 148, 136, 0.1)', x: 0.35, y: 0.05, w: 0.3, h: 0.2 },
  { id: 'lobby', label: 'Lobby', color: 'rgba(139, 92, 246, 0.1)', x: 0.2, y: 0.2, w: 0.3, h: 0.25 },
  { id: 'garage', label: 'Garage', color: 'rgba(245, 158, 11, 0.1)', x: 0.0, y: 0.35, w: 0.25, h: 0.3 },
  { id: 'driveway', label: 'Driveway', color: 'rgba(16, 185, 129, 0.1)', x: 0.7, y: 0.2, w: 0.3, h: 0.3 },
  { id: 'parking', label: 'Parking', color: 'rgba(239, 68, 68, 0.1)', x: 0.5, y: 0.4, w: 0.5, h: 0.4 },
  { id: 'backyard', label: 'Backyard', color: 'rgba(6, 182, 212, 0.1)', x: 0.25, y: 0.7, w: 0.5, h: 0.3 },
  { id: 'perimeter', label: 'Perimeter', color: 'rgba(107, 114, 128, 0.1)', x: 0.0, y: 0.65, w: 0.25, h: 0.25 },
];

type TimeFilter = 'live' | '1h' | '6h' | '24h';

export const MapViewScreen: React.FC = () => {
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24h');
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Get event counts per camera
  const eventCountsByCamera = useMemo(() => {
    const now = new Date();
    const cutoffMap: { [key: string]: number } = {
      'live': 5 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
    };
    const cutoff = now.getTime() - cutoffMap[timeFilter];

    const counts: { [key: string]: number } = {};
    cameras.forEach(cam => {
      counts[cam.id] = mockEvents.filter(
        e => e.cameraId === cam.id && e.timestamp.getTime() > cutoff
      ).length;
    });
    return counts;
  }, [timeFilter]);

  // Get events for selected camera/zone
  const filteredEvents = useMemo(() => {
    const now = new Date();
    const cutoffMap: { [key: string]: number } = {
      'live': 5 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
    };
    const cutoff = now.getTime() - cutoffMap[timeFilter];

    let events = mockEvents.filter(e => e.timestamp.getTime() > cutoff);

    if (selectedCamera) {
      events = events.filter(e => e.cameraId === selectedCamera);
    } else if (selectedZone) {
      const zoneCameras = cameras.filter(
        cam => cameraPositions[cam.id]?.zone === selectedZone
      );
      events = events.filter(e => zoneCameras.some(cam => cam.id === e.cameraId));
    }

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [selectedCamera, selectedZone, timeFilter]);

  const getCameraStatus = (cameraId: string) => {
    const count = eventCountsByCamera[cameraId] || 0;
    if (count === 0) return 'inactive';
    if (count > 5) return 'high';
    return 'normal';
  };

  const getCameraStatusColor = (status: string) => {
    switch (status) {
      case 'high': return '#EF4444';
      case 'normal': return COLORS.online;
      default: return COLORS.textSecondary;
    }
  };

  const renderCamera = (camera: Camera) => {
    const position = cameraPositions[camera.id];
    if (!position) return null;

    const status = getCameraStatus(camera.id);
    const isSelected = selectedCamera === camera.id;
    const count = eventCountsByCamera[camera.id] || 0;

    return (
      <TouchableOpacity
        key={camera.id}
        style={[
          styles.cameraMarker,
          {
            left: `${position.x * 100}%`,
            top: `${position.y * 100}%`,
          },
          isSelected && styles.cameraMarkerSelected,
        ]}
        onPress={() => {
          setSelectedCamera(isSelected ? null : camera.id);
          setSelectedZone(null);
        }}
      >
        <View style={[
          styles.cameraIcon,
          { backgroundColor: getCameraStatusColor(status) },
          isSelected && styles.cameraIconSelected,
        ]}>
          <Ionicons name="videocam" size={14} color="#fff" />
        </View>
        {count > 0 && (
          <View style={styles.eventBadge}>
            <Text style={styles.eventBadgeText}>{count}</Text>
          </View>
        )}
        {isSelected && (
          <View style={styles.cameraLabel}>
            <Text style={styles.cameraLabelText}>{camera.name}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderZone = (zone: typeof zones[0]) => {
    const isSelected = selectedZone === zone.id;
    return (
      <TouchableOpacity
        key={zone.id}
        style={[
          styles.zoneArea,
          {
            left: `${zone.x * 100}%`,
            top: `${zone.y * 100}%`,
            width: `${zone.w * 100}%`,
            height: `${zone.h * 100}%`,
            backgroundColor: zone.color,
          },
          isSelected && styles.zoneAreaSelected,
        ]}
        onPress={() => {
          setSelectedZone(isSelected ? null : zone.id);
          setSelectedCamera(null);
        }}
        activeOpacity={0.7}
      >
        <Text style={[styles.zoneLabel, isSelected && styles.zoneLabelSelected]}>
          {zone.label}
        </Text>
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
      {/* Time Filter */}
      <View style={styles.timeFilter}>
        {(['live', '1h', '6h', '24h'] as TimeFilter[]).map(time => (
          <TouchableOpacity
            key={time}
            style={[styles.timeChip, timeFilter === time && styles.timeChipSelected]}
            onPress={() => setTimeFilter(time)}
          >
            {time === 'live' && (
              <View style={[
                styles.liveDot,
                timeFilter === 'live' && styles.liveDotActive
              ]} />
            )}
            <Text style={[
              styles.timeChipText,
              timeFilter === time && styles.timeChipTextSelected
            ]}>
              {time === 'live' ? 'Live' : time.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.heatmapToggle, showHeatmap && styles.heatmapToggleActive]}
          onPress={() => setShowHeatmap(!showHeatmap)}
        >
          <Ionicons
            name="flame"
            size={18}
            color={showHeatmap ? '#fff' : COLORS.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Floor Plan / Map */}
      <View style={styles.mapContainer}>
        <View style={styles.map}>
          {/* Zones */}
          {zones.map(renderZone)}

          {/* Grid lines for reference */}
          <View style={styles.gridOverlay}>
            {[...Array(5)].map((_, i) => (
              <View
                key={`h-${i}`}
                style={[styles.gridLine, { top: `${(i + 1) * 20}%` }]}
              />
            ))}
            {[...Array(5)].map((_, i) => (
              <View
                key={`v-${i}`}
                style={[styles.gridLine, styles.gridLineVertical, { left: `${(i + 1) * 20}%` }]}
              />
            ))}
          </View>

          {/* Heatmap overlay */}
          {showHeatmap && (
            <View style={styles.heatmapOverlay}>
              {cameras.map(cam => {
                const pos = cameraPositions[cam.id];
                const count = eventCountsByCamera[cam.id] || 0;
                if (!pos || count === 0) return null;
                const intensity = Math.min(count / 10, 1);
                return (
                  <View
                    key={cam.id}
                    style={[
                      styles.heatmapCircle,
                      {
                        left: `${pos.x * 100 - 10}%`,
                        top: `${pos.y * 100 - 10}%`,
                        opacity: intensity * 0.6,
                        transform: [{ scale: 0.5 + intensity }],
                      },
                    ]}
                  />
                );
              })}
            </View>
          )}

          {/* Camera markers */}
          {cameras.map(renderCamera)}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.online }]} />
            <Text style={styles.legendText}>Active</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>High Activity</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.textSecondary }]} />
            <Text style={styles.legendText}>No Events</Text>
          </View>
        </View>
      </View>

      {/* Selection Info */}
      <View style={styles.selectionInfo}>
        <Text style={styles.selectionTitle}>
          {selectedCamera
            ? cameras.find(c => c.id === selectedCamera)?.name || 'Camera'
            : selectedZone
              ? zones.find(z => z.id === selectedZone)?.label || 'Zone'
              : 'All Cameras'}
        </Text>
        <Text style={styles.selectionCount}>
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
          {' '}in {timeFilter === 'live' ? 'last 5 min' : `last ${timeFilter}`}
        </Text>
        {(selectedCamera || selectedZone) && (
          <TouchableOpacity
            style={styles.clearSelection}
            onPress={() => {
              setSelectedCamera(null);
              setSelectedZone(null);
            }}
          >
            <Text style={styles.clearSelectionText}>Show All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Events List */}
      <FlatList
        data={filteredEvents}
        renderItem={renderEvent}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="videocam-off" size={48} color={COLORS.border} />
            <Text style={styles.emptyText}>No events found</Text>
            <Text style={styles.emptySubtext}>
              Try selecting a different camera or time range
            </Text>
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
  timeFilter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'center',
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundSecondary,
  },
  timeChipSelected: {
    backgroundColor: COLORS.accent,
  },
  timeChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  timeChipTextSelected: {
    color: '#fff',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.textSecondary,
  },
  liveDotActive: {
    backgroundColor: '#EF4444',
  },
  heatmapToggle: {
    marginLeft: 'auto',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heatmapToggleActive: {
    backgroundColor: '#EF4444',
  },
  mapContainer: {
    paddingHorizontal: 16,
  },
  map: {
    height: MAP_HEIGHT,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: COLORS.border,
  },
  gridLineVertical: {
    top: 0,
    bottom: 0,
    width: 1,
    height: '100%',
  },
  zoneArea: {
    position: 'absolute',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  zoneAreaSelected: {
    borderColor: COLORS.accent,
  },
  zoneLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '500',
  },
  zoneLabelSelected: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  heatmapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heatmapCircle: {
    position: 'absolute',
    width: '20%',
    height: '20%',
    borderRadius: 100,
    backgroundColor: '#EF4444',
  },
  cameraMarker: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -16 }, { translateY: -16 }],
    zIndex: 10,
  },
  cameraMarkerSelected: {
    zIndex: 20,
  },
  cameraIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cameraIconSelected: {
    transform: [{ scale: 1.1 }],
  },
  eventBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  eventBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  cameraLabel: {
    position: 'absolute',
    top: 36,
    backgroundColor: COLORS.text,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cameraLabelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  selectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  selectionCount: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  clearSelection: {
    marginLeft: 'auto',
  },
  clearSelectionText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
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
    textAlign: 'center',
  },
});
