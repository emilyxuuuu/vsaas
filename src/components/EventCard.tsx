import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SecurityEvent } from '../data/mockEvents';

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

interface EventCardProps {
  event: SecurityEvent;
  onPress?: () => void;
  onLongPress?: () => void;
  showBoundingBoxes?: boolean;
  variant?: 'full' | 'grid';
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onPress,
  onLongPress,
  showBoundingBoxes = false,
  variant = 'full'
}) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Full-width Arcules-style card
  if (variant === 'full') {
    return (
      <TouchableOpacity
        style={styles.fullCard}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
      >
        <View style={styles.fullThumbnailContainer}>
          <Image
            source={{ uri: event.thumbnail }}
            style={styles.fullThumbnail}
            resizeMode="cover"
          />

          {/* Play button overlay */}
          <View style={styles.playButton}>
            <Ionicons name="play" size={28} color="#fff" />
          </View>

          {/* Bounding boxes overlay */}
          {showBoundingBoxes && event.boundingBoxes?.map((box, index) => (
            <View
              key={index}
              style={[
                styles.boundingBox,
                {
                  left: `${box.x * 100}%`,
                  top: `${box.y * 100}%`,
                  width: `${box.width * 100}%`,
                  height: `${box.height * 100}%`,
                }
              ]}
            />
          ))}
        </View>

        <View style={styles.fullInfo}>
          <View style={styles.fullInfoLeft}>
            <Text style={styles.fullCameraName}>{event.cameraName}</Text>
            <Text style={styles.onlineStatus}>ONLINE</Text>
          </View>
          <TouchableOpacity style={styles.cloudButton}>
            <Ionicons name="cloud-outline" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  // Grid variant (2 columns)
  const CARD_WIDTH = (width - 48) / 2;

  return (
    <TouchableOpacity
      style={[styles.gridCard, { width: CARD_WIDTH }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.gridThumbnailContainer}>
        <Image
          source={{ uri: event.thumbnail }}
          style={styles.gridThumbnail}
          resizeMode="cover"
        />

        {/* Play button overlay */}
        <View style={styles.playButtonSmall}>
          <Ionicons name="play" size={20} color="#fff" />
        </View>

        {/* Duration badge */}
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{event.duration}s</Text>
        </View>

        {/* Bounding boxes overlay */}
        {showBoundingBoxes && event.boundingBoxes?.map((box, index) => (
          <View
            key={index}
            style={[
              styles.boundingBox,
              {
                left: `${box.x * 100}%`,
                top: `${box.y * 100}%`,
                width: `${box.width * 100}%`,
                height: `${box.height * 100}%`,
              }
            ]}
          />
        ))}
      </View>

      <View style={styles.gridInfo}>
        <Text style={styles.gridCameraName} numberOfLines={1}>
          {event.cameraName}
        </Text>
        <Text style={styles.gridOnlineStatus}>ONLINE</Text>
        <View style={styles.gridTimeRow}>
          <Text style={styles.gridTime}>{formatTime(event.timestamp)}</Text>
          <Text style={styles.gridDate}> · {formatDate(event.timestamp)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Full-width card styles (Arcules style)
  fullCard: {
    backgroundColor: COLORS.background,
    marginBottom: 16,
  },
  fullThumbnailContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  fullThumbnail: {
    width: '100%',
    height: '100%',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -28 }, { translateY: -28 }],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  fullInfoLeft: {
    flex: 1,
  },
  fullCameraName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },
  onlineStatus: {
    color: COLORS.online,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  cloudButton: {
    padding: 8,
  },

  // Grid card styles
  gridCard: {
    backgroundColor: COLORS.background,
    marginBottom: 16,
  },
  gridThumbnailContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridThumbnail: {
    width: '100%',
    height: '100%',
  },
  playButtonSmall: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  boundingBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderRadius: 4,
  },
  gridInfo: {
    paddingVertical: 8,
  },
  gridCameraName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  gridOnlineStatus: {
    color: COLORS.online,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  gridTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  gridTime: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  gridDate: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
});
