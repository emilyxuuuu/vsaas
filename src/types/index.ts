// Type definitions for the VSaaS search prototype

export type FilterApproach =
  | 'chips'      // A: Quick filter chips + results grid
  | 'nlp'        // B: Natural language search
  | 'timeline'   // C: Visual timeline with scrubbing
  | 'map'        // D: Map-based camera view
  | 'presets'    // E: Saved presets
  | 'forensic'   // F: Forensic search (Arcules-style)
  | 'similarity'; // G: Similarity search (Pinterest-style)

export interface ApproachInfo {
  id: FilterApproach;
  name: string;
  description: string;
}

export const APPROACHES: ApproachInfo[] = [
  { id: 'chips', name: 'Filter Chips', description: 'Quick filter chips + results grid' },
  { id: 'nlp', name: 'Natural Language', description: 'AI-powered search with natural language' },
  { id: 'timeline', name: 'Timeline', description: 'Visual timeline with event markers' },
  { id: 'map', name: 'Camera Map', description: 'Map-based camera/zone filtering' },
  { id: 'presets', name: 'Smart Presets', description: 'Saved filter presets and folders' },
  { id: 'forensic', name: 'Forensic Search', description: 'Advanced forensic video search' },
  { id: 'similarity', name: 'Visual Search', description: 'Find similar events by image' },
];

export interface FilterState {
  eventTypes: string[];
  cameras: string[];
  dateRange: { start: Date | null; end: Date | null };
  hasPersons: boolean;
  hasVehicles: boolean;
  hasPackages: boolean;
  hasAnimals: boolean;
  colors: string[];
  confidence: number; // minimum confidence threshold
  searchQuery: string;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  eventTypes: [],
  cameras: [],
  dateRange: { start: null, end: null },
  hasPersons: false,
  hasVehicles: false,
  hasPackages: false,
  hasAnimals: false,
  colors: [],
  confidence: 0,
  searchQuery: '',
};
