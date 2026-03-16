import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
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

// Suggested queries for quick access
const SUGGESTED_QUERIES = [
  { query: 'Show me people at the front door today', icon: 'person' },
  { query: 'Vehicles in the driveway this week', icon: 'car' },
  { query: 'Package deliveries', icon: 'cube' },
  { query: 'Motion in backyard at night', icon: 'moon' },
  { query: 'Animals in the yard', icon: 'paw' },
  { query: 'Multiple people in lobby', icon: 'people' },
];

// Simple NLP parser (simulates AI parsing)
const parseQuery = (query: string): { events: SecurityEvent[]; interpretation: string } => {
  const lowerQuery = query.toLowerCase();
  let events = [...mockEvents];
  let interpretations: string[] = [];

  // Parse event types
  if (lowerQuery.includes('person') || lowerQuery.includes('people') || lowerQuery.includes('someone')) {
    events = events.filter(e => e.detections.persons > 0);
    interpretations.push('people detected');
  }
  if (lowerQuery.includes('vehicle') || lowerQuery.includes('car') || lowerQuery.includes('truck')) {
    events = events.filter(e => e.detections.vehicles > 0);
    interpretations.push('vehicles detected');
  }
  if (lowerQuery.includes('package') || lowerQuery.includes('delivery') || lowerQuery.includes('deliveries')) {
    events = events.filter(e => e.detections.packages > 0);
    interpretations.push('packages detected');
  }
  if (lowerQuery.includes('animal') || lowerQuery.includes('pet') || lowerQuery.includes('dog') || lowerQuery.includes('cat')) {
    events = events.filter(e => e.detections.animals > 0);
    interpretations.push('animals detected');
  }
  if (lowerQuery.includes('motion')) {
    events = events.filter(e => e.eventType === 'motion');
    interpretations.push('motion events');
  }

  // Parse cameras/locations
  if (lowerQuery.includes('front door') || lowerQuery.includes('entrance')) {
    events = events.filter(e => e.cameraName.toLowerCase().includes('front door'));
    interpretations.push('Front Door camera');
  }
  if (lowerQuery.includes('driveway')) {
    events = events.filter(e => e.cameraName.toLowerCase().includes('driveway'));
    interpretations.push('Driveway camera');
  }
  if (lowerQuery.includes('backyard') || lowerQuery.includes('back yard')) {
    events = events.filter(e => e.cameraName.toLowerCase().includes('backyard'));
    interpretations.push('Backyard camera');
  }
  if (lowerQuery.includes('garage')) {
    events = events.filter(e => e.cameraName.toLowerCase().includes('garage'));
    interpretations.push('Garage camera');
  }
  if (lowerQuery.includes('lobby')) {
    events = events.filter(e => e.cameraName.toLowerCase().includes('lobby'));
    interpretations.push('Lobby camera');
  }
  if (lowerQuery.includes('parking')) {
    events = events.filter(e => e.cameraName.toLowerCase().includes('parking'));
    interpretations.push('Parking lot cameras');
  }

  // Parse time
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  if (lowerQuery.includes('today')) {
    events = events.filter(e => e.timestamp >= today);
    interpretations.push('today');
  } else if (lowerQuery.includes('yesterday')) {
    events = events.filter(e => e.timestamp >= yesterday && e.timestamp < today);
    interpretations.push('yesterday');
  } else if (lowerQuery.includes('this week') || lowerQuery.includes('week')) {
    events = events.filter(e => e.timestamp >= weekAgo);
    interpretations.push('this week');
  }

  // Parse time of day
  if (lowerQuery.includes('night') || lowerQuery.includes('evening')) {
    events = events.filter(e => {
      const hour = e.timestamp.getHours();
      return hour >= 18 || hour < 6;
    });
    interpretations.push('nighttime');
  }
  if (lowerQuery.includes('morning')) {
    events = events.filter(e => {
      const hour = e.timestamp.getHours();
      return hour >= 6 && hour < 12;
    });
    interpretations.push('morning');
  }

  // Parse quantity
  if (lowerQuery.includes('multiple') || lowerQuery.includes('many') || lowerQuery.includes('several')) {
    events = events.filter(e =>
      e.detections.persons > 1 ||
      e.detections.vehicles > 1 ||
      e.detections.animals > 1
    );
    interpretations.push('multiple detections');
  }

  // Sort by timestamp
  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const interpretation = interpretations.length > 0
    ? `Showing: ${interpretations.join(', ')}`
    : 'Showing all events';

  return { events, interpretation };
};

export const NLPSearchScreen: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SecurityEvent[]>([]);
  const [interpretation, setInterpretation] = useState('');

  const handleSearch = () => {
    if (!query.trim()) return;

    setIsSearching(true);

    // Simulate AI processing delay
    setTimeout(() => {
      const { events, interpretation } = parseQuery(query);
      setSearchResults(events);
      setInterpretation(interpretation);
      setIsSearching(false);
    }, 500);
  };

  const handleSuggestion = (suggestedQuery: string) => {
    setQuery(suggestedQuery);
    const { events, interpretation } = parseQuery(suggestedQuery);
    setSearchResults(events);
    setInterpretation(interpretation);
  };

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Search interpretation */}
      {interpretation && (
        <View style={styles.interpretationContainer}>
          <Ionicons name="sparkles" size={16} color={COLORS.accent} />
          <Text style={styles.interpretationText}>{interpretation}</Text>
        </View>
      )}

      {/* Results count */}
      {searchResults.length > 0 && (
        <Text style={styles.resultsCount}>
          {searchResults.length} event{searchResults.length !== 1 ? 's' : ''} found
        </Text>
      )}
    </View>
  );

  const renderSuggestions = () => (
    <View style={styles.suggestionsContainer}>
      <Text style={styles.suggestionsTitle}>Try asking:</Text>
      {SUGGESTED_QUERIES.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.suggestionItem}
          onPress={() => handleSuggestion(item.query)}
        >
          <View style={styles.suggestionIcon}>
            <Ionicons name={item.icon as any} size={18} color={COLORS.accent} />
          </View>
          <Text style={styles.suggestionText}>{item.query}</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.border} />
        </TouchableOpacity>
      ))}

      <View style={styles.aiNote}>
        <Ionicons name="information-circle" size={16} color={COLORS.textSecondary} />
        <Text style={styles.aiNoteText}>
          Ask in natural language. AI will interpret your query and find matching events.
        </Text>
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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Ask anything... e.g., 'Show me vehicles today'"
              placeholderTextColor={COLORS.textSecondary}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => {
                setQuery('');
                setSearchResults([]);
                setInterpretation('');
              }}>
                <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.searchButton, isSearching && styles.searchButtonDisabled]}
            onPress={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? (
              <Ionicons name="hourglass" size={20} color="#fff" />
            ) : (
              <Ionicons name="sparkles" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        {/* Results or Suggestions */}
        {searchResults.length > 0 ? (
          <FlatList
            data={searchResults}
            renderItem={renderEvent}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={renderHeader}
          />
        ) : (
          renderSuggestions()
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    paddingVertical: 12,
  },
  searchButton: {
    backgroundColor: COLORS.accent,
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  interpretationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  interpretationText: {
    color: COLORS.accent,
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
  },
  resultsCount: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  suggestionsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  suggestionsTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  suggestionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  suggestionText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  aiNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 4,
  },
  aiNoteText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});
