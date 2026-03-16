import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Image,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
  Animated,
  PanResponder,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mockEvents, SecurityEvent } from '../data/mockEvents';
import { MOCK_SITES, MOCK_CAMERAS, getFloorsForSite, getCamerasForFloor } from '../data/mockLocations';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const COLORS = {
  background: '#FFFFFF',
  backgroundSecondary: '#F3F4F6',
  text: '#111827',
  textSecondary: '#6B7280',
  accent: '#0D9488',
  border: '#E5E7EB',
};

const { width } = Dimensions.get('window');
const GRID_PADDING = 12;
const GRID_GAP = 6;
const CARD_WIDTH = (width - GRID_PADDING * 2 - GRID_GAP) / 2;
const CARD_IMAGE_HEIGHT = 120;
const DAY_LABEL_WIDTH = 44;
const DAY_BAR_MAX_H   = 64;
const DAY_BAR_W       = 28;

// Category colors: blue=motion, yellow=person, green=vehicle
const CAT = {
  motion:  '#60A5FA',
  person:  '#FBBF24',
  vehicle: '#34D399',
  empty:   '#F3F4F6',
};

type HeatCell = { total: number; motion: number; person: number; vehicle: number };

// Cell background for 7D/3D: dominant type color with heat-based opacity
const getCellBg = (cell: HeatCell): string => {
  const { total, motion, person, vehicle } = cell;
  if (total === 0) return CAT.empty;
  const intensity = Math.min(1, total / 8);
  const alpha = 0.18 + intensity * 0.72;
  if (vehicle > 0 && vehicle >= person && vehicle >= motion)
    return `rgba(52,211,153,${alpha.toFixed(2)})`;
  if (person > 0 && person >= motion)
    return `rgba(251,191,36,${alpha.toFixed(2)})`;
  return `rgba(96,165,250,${alpha.toFixed(2)})`;
};

// Build LinearGradient props for a 1D bar (bottom=motion, middle=person, top=vehicle)
// Uses blend zones at transitions for a smooth Apple Wallet-style gradient
const buildBarGradient = (cell: HeatCell): { colors: string[]; locations: number[] } | null => {
  const { total, motion, person, vehicle } = cell;
  if (total === 0) return null;

  const segs = [
    { color: CAT.motion,  count: motion  },
    { color: CAT.person,  count: person  },
    { color: CAT.vehicle, count: vehicle },
  ].filter(s => s.count > 0);

  if (segs.length === 1) {
    return { colors: [`${segs[0].color}66`, segs[0].color], locations: [0, 1] };
  }

  const BLEND = 0.20; // half-width of each blend zone (40% total)
  const stops: { color: string; loc: number }[] = [{ color: segs[0].color, loc: 0 }];
  let pos = 0;

  segs.forEach((seg, i) => {
    pos += seg.count / total;
    if (i < segs.length - 1) {
      const b = Math.min(BLEND, (seg.count / total) * 0.5, (segs[i + 1].count / total) * 0.5);
      stops.push({ color: seg.color,          loc: Math.max(0, pos - b) });
      stops.push({ color: segs[i + 1].color,  loc: Math.min(1, pos + b) });
    }
  });
  stops.push({ color: segs[segs.length - 1].color, loc: 1 });

  return { colors: stops.map(s => s.color), locations: stops.map(s => s.loc) };
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type ZoomLevel      = '7day' | '3day' | '1day';
type EventTypeFilter = 'all' | 'person' | 'vehicle' | 'motion';

const ZOOM_CONFIG: Record<ZoomLevel, { days: number; slotMinutes: number; label: string; rangeLabel: string; rowHeight: number; labelInterval: number }> = {
  '1day': { days: 1, slotMinutes: 60, label: '1D', rangeLabel: 'Today',       rowHeight: 100, labelInterval: 2 },
  '3day': { days: 3, slotMinutes: 60, label: '3D', rangeLabel: 'Last 3 days', rowHeight: 46,  labelInterval: 4 },
  '7day': { days: 7, slotMinutes: 60, label: '7D', rangeLabel: 'All week',    rowHeight: 30,  labelInterval: 4 },
};

const EVENT_TYPE_CHIPS: { id: EventTypeFilter; label: string }[] = [
  { id: 'all',     label: 'Recent' },
  { id: 'person',  label: 'Person' },
  { id: 'vehicle', label: 'Vehicle' },
];

const COLOR_OPTIONS: { label: string; hex: string; border?: boolean; none?: boolean }[] = [
  { label: 'None',   hex: '#F3F4F6', border: true, none: true },
  { label: 'Red',    hex: '#EF4444' },
  { label: 'Orange', hex: '#F97316' },
  { label: 'Yellow', hex: '#EAB308' },
  { label: 'Green',  hex: '#22C55E' },
  { label: 'Blue',   hex: '#3B82F6' },
  { label: 'Purple', hex: '#A855F7' },
  { label: 'Brown',  hex: '#92400E' },
  { label: 'Black',  hex: '#111827' },
  { label: 'Gray',   hex: '#9CA3AF' },
  { label: 'White',  hex: '#F9FAFB', border: true },
];

type TimePreset = 'today' | 'yesterday' | 'last3days' | 'thisWeek' | null;

const TIME_PRESETS: { id: NonNullable<TimePreset>; label: string }[] = [
  { id: 'today',     label: 'Today'      },
  { id: 'yesterday', label: 'Yesterday'  },
  { id: 'last3days', label: 'Last 3 days' },
  { id: 'thisWeek',  label: 'This week'  },
];

const getTimePresetRange = (preset: TimePreset): { start: Date; end: Date } | null => {
  if (!preset) return null;
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  switch (preset) {
    case 'today':     return { start: todayStart, end: now };
    case 'yesterday': return { start: new Date(todayStart.getTime() - 86400000), end: todayStart };
    case 'last3days': return { start: new Date(todayStart.getTime() - 2 * 86400000), end: now };
    case 'thisWeek':  return { start: new Date(todayStart.getTime() - 6 * 86400000), end: now };
  }
};

const formatSlotLabel = (slot: number, slotMins: number): string => {
  const hour = Math.floor((slot * slotMins) / 60);
  if (hour === 0)  return '12a';
  if (hour === 12) return '12p';
  return hour < 12 ? `${hour}a` : `${hour - 12}p`;
};

const sameCalDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth()    === b.getMonth()    &&
  a.getDate()     === b.getDate();

const formatTimestamp = (date: Date): string => {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const eventDay = new Date(date); eventDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((now.getTime() - eventDay.getTime()) / 86400000);
  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 0) return timeStr;
  if (diffDays === 1) return `Yesterday ${timeStr}`;
  return `${DAY_LABELS[date.getDay()]} ${timeStr}`;
};

const formatHourFull = (totalMins: number): string => {
  const hour = Math.floor(totalMins / 60);
  const min  = totalMins % 60;
  const suffix = hour < 12 ? 'AM' : 'PM';
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return min > 0 ? `${h12}:${String(min).padStart(2, '0')} ${suffix}` : `${h12} ${suffix}`;
};

// ── Date Range Picker ─────────────────────────────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEK_DAYS   = ['S','M','T','W','T','F','S'];

interface DateRangePickerProps {
  visible: boolean;
  initialStart: Date | null;
  initialEnd:   Date | null;
  onClose:  () => void;
  onApply:  (start: Date, end: Date) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ visible, initialStart, initialEnd, onClose, onApply }) => {
  const _today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [viewYear,    setViewYear]    = useState(_today.getFullYear());
  const [viewMonth,   setViewMonth]   = useState(_today.getMonth());
  const [draftStart,  setDraftStart]  = useState<Date | null>(null);
  const [draftEnd,    setDraftEnd]    = useState<Date | null>(null);

  useEffect(() => {
    if (visible) {
      setDraftStart(initialStart);
      setDraftEnd(initialEnd);
      const ref = initialStart ?? _today;
      setViewYear(ref.getFullYear());
      setViewMonth(ref.getMonth());
    }
  }, [visible]); // eslint-disable-line

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); };

  const tapDay = (date: Date) => {
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(date); setDraftEnd(null);
    } else {
      if (date < draftStart) { setDraftStart(date); setDraftEnd(null); }
      else setDraftEnd(date);
    }
  };

  type DayType = 'start' | 'end' | 'range' | 'normal';
  const getDayType = (date: Date): DayType => {
    if (!draftStart) return 'normal';
    if (date.getTime() === draftStart.getTime()) return 'start';
    if (draftEnd && date.getTime() === draftEnd.getTime()) return 'end';
    if (draftEnd && date > draftStart && date < draftEnd) return 'range';
    return 'normal';
  };

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells        = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i*7, i*7+7));

  const summaryText = draftStart
    ? draftEnd && draftEnd.getTime() !== draftStart.getTime()
      ? `${draftStart.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${draftEnd.toLocaleDateString([], { month: 'short', day: 'numeric' })}`
      : draftStart.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
    : 'Tap a start date';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={pickerStyles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={pickerStyles.sheet}>
        <View style={pickerStyles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={pickerStyles.cancelBtn}>Cancel</Text>
          </TouchableOpacity>
          <Text style={pickerStyles.title}>Select Range</Text>
          <TouchableOpacity onPress={() => draftStart && onApply(draftStart, draftEnd ?? draftStart)} disabled={!draftStart}>
            <Text style={[pickerStyles.applyBtn, !draftStart && pickerStyles.applyBtnOff]}>Apply</Text>
          </TouchableOpacity>
        </View>

        <View style={pickerStyles.monthNav}>
          <TouchableOpacity onPress={prevMonth} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
            <Ionicons name="chevron-back" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={pickerStyles.monthName}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
          <TouchableOpacity onPress={nextMonth} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
            <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={pickerStyles.weekRow}>
          {WEEK_DAYS.map((d, i) => <Text key={i} style={pickerStyles.weekDayLabel}>{d}</Text>)}
        </View>

        {weeks.map((week, wi) => (
          <View key={wi} style={pickerStyles.weekRow}>
            {week.map((day, di) => {
              if (!day) return <View key={di} style={pickerStyles.dayCell} />;
              const date = new Date(viewYear, viewMonth, day); date.setHours(0,0,0,0);
              const type    = getDayType(date);
              const isFuture = date > _today;
              const isEndpoint = type === 'start' || type === 'end';
              const hasRightStrip = (type === 'start' && !!draftEnd) || type === 'range';
              const hasLeftStrip  = type === 'end' || type === 'range';
              return (
                <TouchableOpacity
                  key={di}
                  style={pickerStyles.dayCell}
                  onPress={() => !isFuture && tapDay(date)}
                  activeOpacity={0.7}
                  disabled={isFuture}
                >
                  {hasLeftStrip  && <View style={[pickerStyles.strip, pickerStyles.stripLeft]}  />}
                  {hasRightStrip && <View style={[pickerStyles.strip, pickerStyles.stripRight]} />}
                  {isEndpoint    && <View style={pickerStyles.circle} />}
                  <Text style={[pickerStyles.dayNum,
                    isFuture   && pickerStyles.dayNumFuture,
                    type === 'range' && pickerStyles.dayNumRange,
                    isEndpoint && pickerStyles.dayNumEndpoint,
                  ]}>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        <View style={pickerStyles.summaryRow}>
          <Text style={pickerStyles.summaryText}>{summaryText}</Text>
        </View>
      </View>
    </Modal>
  );
};

const pickerStyles = StyleSheet.create({
  overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet:           { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 32 },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:           { fontSize: 16, fontWeight: '600', color: COLORS.text },
  cancelBtn:       { fontSize: 15, color: COLORS.textSecondary, minWidth: 60 },
  applyBtn:        { fontSize: 15, fontWeight: '600', color: COLORS.accent, minWidth: 60, textAlign: 'right' },
  applyBtnOff:     { opacity: 0.3 },
  monthNav:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  monthName:       { fontSize: 15, fontWeight: '600', color: COLORS.text },
  weekRow:         { flexDirection: 'row', paddingHorizontal: 4 },
  weekDayLabel:    { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, paddingBottom: 6 },
  dayCell:         { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center' },
  strip:           { position: 'absolute', top: 4, bottom: 4, width: '50%', backgroundColor: `${COLORS.accent}22` },
  stripLeft:       { left: 0 },
  stripRight:      { right: 0 },
  circle:          { position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.accent },
  dayNum:          { fontSize: 14, color: COLORS.text },
  dayNumFuture:    { color: COLORS.border },
  dayNumRange:     { color: COLORS.accent, fontWeight: '500' },
  dayNumEndpoint:  { color: '#fff', fontWeight: '600' },
  summaryRow:      { alignItems: 'center', paddingVertical: 10, marginHorizontal: 16, borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 4 },
  summaryText:     { fontSize: 13, color: COLORS.textSecondary },
});

// ── Filter Sheet ─────────────────────────────────────────────────────────────
interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  onApply: (cameraIds: Set<string>, timePreset: TimePreset) => void;
  initialCameraIds: Set<string>;
  initialTimePreset: TimePreset;
  baseFilterEvent: (event: SecurityEvent) => boolean;
}

const FilterSheet: React.FC<FilterSheetProps> = ({
  visible, onClose, onApply, initialCameraIds, initialTimePreset, baseFilterEvent,
}) => {
  const [draftCameraIds, setDraftCameraIds]   = useState<Set<string>>(new Set(initialCameraIds));
  const [draftTimePreset, setDraftTimePreset] = useState<TimePreset>(initialTimePreset);
  const [expandedSiteIds, setExpandedSiteIds] = useState<Set<string>>(new Set(['site-a']));

  useEffect(() => {
    if (visible) {
      setDraftCameraIds(new Set(initialCameraIds));
      setDraftTimePreset(initialTimePreset);
    }
  }, [visible]); // eslint-disable-line

  const toggleSiteExpand = (siteId: string) =>
    setExpandedSiteIds(prev => { const n = new Set(prev); n.has(siteId) ? n.delete(siteId) : n.add(siteId); return n; });

  const toggleCamera = (camId: string) =>
    setDraftCameraIds(prev => { const n = new Set(prev); n.has(camId) ? n.delete(camId) : n.add(camId); return n; });

  const toggleSiteAll = (siteId: string) => {
    const siteCamIds = MOCK_CAMERAS.filter(c => c.siteId === siteId).map(c => c.id);
    const allSelected = siteCamIds.every(id => draftCameraIds.has(id));
    setDraftCameraIds(prev => {
      const n = new Set(prev);
      allSelected ? siteCamIds.forEach(id => n.delete(id)) : siteCamIds.forEach(id => n.add(id));
      return n;
    });
  };

  const previewCount = useMemo(() => {
    const timeRange = getTimePresetRange(draftTimePreset);
    return mockEvents.filter(event => {
      if (!baseFilterEvent(event)) return false;
      if (draftCameraIds.size > 0 && !draftCameraIds.has(event.cameraId)) return false;
      if (timeRange && (event.timestamp < timeRange.start || event.timestamp >= timeRange.end)) return false;
      return true;
    }).length;
  }, [draftCameraIds, draftTimePreset, baseFilterEvent]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={sheetStyles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={sheetStyles.sheet}>
        {/* Header */}
        <View style={sheetStyles.header}>
          <TouchableOpacity onPress={() => { setDraftCameraIds(new Set()); setDraftTimePreset(null); }}>
            <Text style={sheetStyles.resetBtn}>Reset</Text>
          </TouchableOpacity>
          <Text style={sheetStyles.title}>Filters</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={sheetStyles.body} showsVerticalScrollIndicator={false}>
          {/* Time Range */}
          <Text style={sheetStyles.sectionLabel}>Time Range</Text>
          <View style={sheetStyles.presetRow}>
            {TIME_PRESETS.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[sheetStyles.presetChip, draftTimePreset === p.id && sheetStyles.presetChipActive]}
                onPress={() => setDraftTimePreset(draftTimePreset === p.id ? null : p.id)}
              >
                <Text style={[sheetStyles.presetChipText, draftTimePreset === p.id && sheetStyles.presetChipTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Location */}
          <Text style={[sheetStyles.sectionLabel, { marginTop: 24 }]}>Location</Text>
          {MOCK_SITES.map(site => {
            const siteCams = MOCK_CAMERAS.filter(c => c.siteId === site.id);
            const selCount   = siteCams.filter(c => draftCameraIds.has(c.id)).length;
            const allSel     = selCount === siteCams.length && siteCams.length > 0;
            const someSel    = selCount > 0 && !allSel;
            const isExpanded = expandedSiteIds.has(site.id);

            return (
              <View key={site.id} style={sheetStyles.siteBlock}>
                <View style={sheetStyles.siteRow}>
                  <TouchableOpacity style={sheetStyles.checkboxWrap} onPress={() => toggleSiteAll(site.id)}>
                    <View style={[sheetStyles.checkbox, (allSel || someSel) && sheetStyles.checkboxActive]}>
                      {allSel  && <Ionicons name="checkmark" size={12} color="#fff" />}
                      {someSel && <View style={sheetStyles.partialCheck} />}
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity style={sheetStyles.siteInfo} onPress={() => toggleSiteExpand(site.id)}>
                    <View style={{ flex: 1 }}>
                      <Text style={sheetStyles.siteName}>{site.name}</Text>
                      <Text style={sheetStyles.siteAddress}>{site.address}</Text>
                    </View>
                    <View style={sheetStyles.siteRight}>
                      {selCount > 0 && (
                        <View style={sheetStyles.selBadge}>
                          <Text style={sheetStyles.selBadgeText}>{selCount}</Text>
                        </View>
                      )}
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textSecondary} />
                    </View>
                  </TouchableOpacity>
                </View>

                {isExpanded && siteCams.map(cam => (
                  <TouchableOpacity key={cam.id} style={sheetStyles.camRow} onPress={() => toggleCamera(cam.id)}>
                    <View style={sheetStyles.camIndent} />
                    <View style={[sheetStyles.checkbox, draftCameraIds.has(cam.id) && sheetStyles.checkboxActive]}>
                      {draftCameraIds.has(cam.id) && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                    <Ionicons name="videocam-outline" size={14} color={COLORS.textSecondary} style={{ marginLeft: 8 }} />
                    <Text style={sheetStyles.camName}>{cam.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            );
          })}
          <View style={{ height: 16 }} />
        </ScrollView>

        <View style={sheetStyles.footer}>
          <TouchableOpacity style={sheetStyles.applyBtn} onPress={() => onApply(draftCameraIds, draftTimePreset)}>
            <Text style={sheetStyles.applyBtnText}>Show {previewCount} events</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const sheetStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.background, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '82%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 10,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  resetBtn:  { fontSize: 14, color: COLORS.accent, fontWeight: '500' },
  title:     { fontSize: 16, fontWeight: '600', color: COLORS.text },
  body:      { paddingHorizontal: 20, paddingTop: 20 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },
  presetRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip:        { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  presetChipActive:  { borderColor: COLORS.accent, backgroundColor: 'rgba(13,148,136,0.08)' },
  presetChipText:    { fontSize: 14, color: COLORS.textSecondary },
  presetChipTextActive: { color: COLORS.accent, fontWeight: '600' },
  siteBlock:    { },
  siteRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  checkboxWrap: { paddingRight: 14 },
  siteInfo:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  siteName:     { fontSize: 15, fontWeight: '600', color: COLORS.text },
  siteAddress:  { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  siteRight:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selBadge:     { backgroundColor: COLORS.accent, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  selBadgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  camRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  camIndent:    { width: 38 },
  camName:      { fontSize: 14, color: COLORS.text, marginLeft: 8, flex: 1 },
  checkbox:      { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  checkboxActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accent },
  partialCheck:  { width: 10, height: 2, backgroundColor: '#fff', borderRadius: 1 },
  footer:       { padding: 16, paddingBottom: 32, borderTopWidth: 1, borderTopColor: COLORS.border },
  applyBtn:     { backgroundColor: COLORS.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

// ── Long press action config ─────────────────────────────────────────────────
const ACTIONS = [
  { key: 'share',       icon: 'arrow-redo'    },
  { key: 'archive',     icon: 'folder-outline'},
  { key: 'findSimilar', icon: 'search-outline'},
] as const;
type ActionKey = typeof ACTIONS[number]['key'];

const BTN_SIZE      = 52;
const BTN_RADIUS    = BTN_SIZE / 2 + 14; // hit radius
const SCALE_UP      = 1.1;
const RADIAL_RADIUS = 80;

interface CardPosition { x: number; y: number; width: number; height: number }

// Rotate the fan based on horizontal position so buttons always spread into open space:
//   left third  → fan upper-right  [255°, 300°, 345°]
//   center       → fan straight up  [225°, 270°, 315°]
//   right third → fan upper-left  [195°, 240°, 285°]
const getActionButtonCenters = (touchX: number, touchY: number) => {
  const angles =
    touchX < width * 0.35 ? [255, 300, 345] :
    touchX > width * 0.65 ? [195, 240, 285] :
                             [225, 270, 315];
  return angles.map(deg => {
    const rad = (deg * Math.PI) / 180;
    return {
      x: touchX + RADIAL_RADIUS * Math.cos(rad),
      y: touchY + RADIAL_RADIUS * Math.sin(rad),
    };
  });
};

const getHoveredActionIdx = (pageX: number, pageY: number, touchX: number, touchY: number): number | null => {
  const centers = getActionButtonCenters(touchX, touchY);
  for (let i = 0; i < centers.length; i++) {
    const dx = pageX - centers[i].x;
    const dy = pageY - centers[i].y;
    if (Math.sqrt(dx * dx + dy * dy) < BTN_RADIUS) return i;
  }
  return null;
};

// ── Thumbnail card ──────────────────────────────────────────────────────────
interface ThumbnailCardProps {
  event: SecurityEvent;
  isArchived: boolean;
  onShortPress: () => void;
  onActivateLongPress: (event: SecurityEvent, pos: CardPosition, touchX: number, touchY: number) => void;
  onMoveWhileHeld: (pageX: number, pageY: number) => void;
  onReleaseWhileHeld: (pageX: number, pageY: number) => void;
}

const ThumbnailCard: React.FC<ThumbnailCardProps> = ({
  event, isArchived,
  onShortPress, onActivateLongPress, onMoveWhileHeld, onReleaseWhileHeld,
}) => {
  const containerRef   = useRef<View>(null);
  const timerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActiveRef    = useRef(false);
  const touchStartRef  = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const callbacksRef   = useRef({ onShortPress, onActivateLongPress, onMoveWhileHeld, onReleaseWhileHeld, event });

  useEffect(() => {
    callbacksRef.current = { onShortPress, onActivateLongPress, onMoveWhileHeld, onReleaseWhileHeld, event };
  });

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder:    () => true,
    onMoveShouldSetPanResponder:     () => isActiveRef.current,
    onShouldBlockNativeResponder:    () => isActiveRef.current,
    onPanResponderTerminationRequest: () => !isActiveRef.current,

    onPanResponderGrant: (evt) => {
      touchStartRef.current = { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY };
      timerRef.current = setTimeout(() => {
        isActiveRef.current = true;
        containerRef.current?.measure((_fx, _fy, w, h, px, py) => {
          callbacksRef.current.onActivateLongPress(
            callbacksRef.current.event,
            { x: px, y: py, width: w, height: h },
            touchStartRef.current.x,
            touchStartRef.current.y,
          );
        });
      }, 400);
    },

    onPanResponderMove: (e) => {
      if (isActiveRef.current) {
        callbacksRef.current.onMoveWhileHeld(e.nativeEvent.pageX, e.nativeEvent.pageY);
      }
    },

    onPanResponderRelease: (e) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (isActiveRef.current) {
        isActiveRef.current = false;
        callbacksRef.current.onReleaseWhileHeld(e.nativeEvent.pageX, e.nativeEvent.pageY);
      } else {
        callbacksRef.current.onShortPress();
      }
    },

    onPanResponderTerminate: () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (isActiveRef.current) {
        isActiveRef.current = false;
        callbacksRef.current.onReleaseWhileHeld(-1, -1);
      }
    },
  })).current;

  return (
    <View ref={containerRef} style={cardStyles.card} {...panResponder.panHandlers}>
      <Image source={{ uri: event.thumbnail }} style={cardStyles.image} resizeMode="cover" />
      {isArchived && (
        <View style={cardStyles.archiveBadge}>
          <Ionicons name="checkmark" size={10} color="#fff" />
        </View>
      )}
      <Text style={cardStyles.timestamp} numberOfLines={1}>
        {formatTimestamp(event.timestamp)}
      </Text>
    </View>
  );
};

const cardStyles = StyleSheet.create({
  card: { width: CARD_WIDTH, backgroundColor: COLORS.backgroundSecondary, borderRadius: 10, overflow: 'hidden' },
  image: { width: CARD_WIDTH, height: CARD_IMAGE_HEIGHT, backgroundColor: '#D1D5DB' },
  timestamp: { fontSize: 11, color: COLORS.textSecondary, paddingHorizontal: 8, paddingVertical: 6 },
  archiveBadge: {
    position: 'absolute', top: 6, right: 6,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
  },
});

// ── Main screen ─────────────────────────────────────────────────────────────
interface TimelineScreenProps {
  onSelectEvent?: (event: SecurityEvent) => void;
  onFindSimilar?: (event: SecurityEvent) => void;
  selectedCameraIds: Set<string>;
  setSelectedCameraIds: (ids: Set<string>) => void;
}

export const TimelineScreen: React.FC<TimelineScreenProps> = ({ onSelectEvent, onFindSimilar, selectedCameraIds, setSelectedCameraIds }) => {
  const [zoom, setZoom]                   = useState<ZoomLevel>('1day');
  const [viewingDay, setViewingDay]       = useState<Date>(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [eventType, setEventType]         = useState<EventTypeFilter>('all');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [searchText, setSearchText]       = useState('');
  const [selectedCell, setSelectedCell]         = useState<{ dayIndex: number; slotIndex: number } | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<{ startSlot: number; endSlot: number } | null>(null);
  const [heatmapCollapsed, setHeatmapCollapsed] = useState(false);
  const [manualExpand, setManualExpand]         = useState(false);

  // Admin filter state
  const [timePreset, setTimePreset]           = useState<TimePreset>(null);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  // Custom date range (heatmap navigator)
  const [customRange, setCustomRange]         = useState<{ start: Date; end: Date } | null>(null);
  const [showDatePicker, setShowDatePicker]   = useState(false);

  // Heatmap drag-select refs
  const heatmapGridRef   = useRef<View>(null);
  const gridPageXRef     = useRef(0);
  const dragStartSlotRef = useRef<number | null>(null);
  const cellWidthRef     = useRef(1);
  const slotsCountRef    = useRef(24);
  const labelColWidthRef = useRef(DAY_LABEL_WIDTH);
  useEffect(() => {
    slotsCountRef.current   = (24 * 60) / ZOOM_CONFIG[zoom].slotMinutes;
    labelColWidthRef.current = zoom === '1day' ? 0 : DAY_LABEL_WIDTH;
    cellWidthRef.current    = Math.floor((width - labelColWidthRef.current - GRID_PADDING * 2) / slotsCountRef.current);
  }, [zoom]);

  // Long press overlay state
  const [longPressState, setLongPressState] = useState<{ event: SecurityEvent; position: CardPosition; touchX: number; touchY: number } | null>(null);
  const [hoveredActionIdx, setHoveredActionIdx] = useState<number | null>(null);
  const [archivedIds, setArchivedIds]       = useState<string[]>([]);
  const [toast, setToast]                   = useState<string | null>(null);
  const longPressStateRef                   = useRef(longPressState);
  const pendingActionRef                    = useRef<{ action: ActionKey; event: SecurityEvent } | null>(null);
  const scaleAnim                           = useRef(new Animated.Value(1)).current;
  const overlayAnim                         = useRef(new Animated.Value(0)).current;

  useEffect(() => { longPressStateRef.current = longPressState; }, [longPressState]);

  // After modal fully unmounts (longPressState → null), fire any pending action
  useEffect(() => {
    if (longPressState !== null || !pendingActionRef.current) return;
    const pending = pendingActionRef.current;
    pendingActionRef.current = null;
    const timer = setTimeout(() => triggerAction(pending.action, pending.event), 80);
    return () => clearTimeout(timer);
  }, [longPressState]); // eslint-disable-line

  // Heatmap drag-select PanResponder — horizontal drag to pick a time-of-day range
  const heatmapPanResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 6,
    onPanResponderGrant: (evt) => {
      heatmapGridRef.current?.measure((_fx, _fy, _w, _h, px, _py) => {
        gridPageXRef.current = px + labelColWidthRef.current;
        const slot = Math.max(0, Math.min(
          slotsCountRef.current - 1,
          Math.floor((evt.nativeEvent.pageX - gridPageXRef.current) / cellWidthRef.current)
        ));
        dragStartSlotRef.current = slot;
        setSelectedTimeRange({ startSlot: slot, endSlot: slot });
        setSelectedCell(null);
      });
    },
    onPanResponderMove: (evt) => {
      if (dragStartSlotRef.current === null) return;
      const slot = Math.max(0, Math.min(
        slotsCountRef.current - 1,
        Math.floor((evt.nativeEvent.pageX - gridPageXRef.current) / cellWidthRef.current)
      ));
      setSelectedTimeRange({
        startSlot: Math.min(dragStartSlotRef.current, slot),
        endSlot:   Math.max(dragStartSlotRef.current, slot),
      });
    },
    onPanResponderRelease: () => { dragStartSlotRef.current = null; },
    onPanResponderTerminate: () => { dragStartSlotRef.current = null; },
  })).current;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setLongPressState(null);
      setHoveredActionIdx(null);
    });
  }, [scaleAnim, overlayAnim]);

  const handleActivateLongPress = useCallback((event: SecurityEvent, position: CardPosition, touchX: number, touchY: number) => {
    setLongPressState({ event, position, touchX, touchY });
    setHoveredActionIdx(null);
    scaleAnim.setValue(0.95);
    overlayAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: SCALE_UP, useNativeDriver: true, tension: 120, friction: 8 }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim, overlayAnim]);

  const handleMoveWhileHeld = useCallback((pageX: number, pageY: number) => {
    const state = longPressStateRef.current;
    if (!state) return;
    const idx = getHoveredActionIdx(pageX, pageY, state.touchX, state.touchY);
    setHoveredActionIdx(idx);
  }, []);

  const handleReleaseWhileHeld = useCallback((pageX: number, pageY: number) => {
    const state = longPressStateRef.current;
    if (!state) { dismiss(); return; }
    const idx = getHoveredActionIdx(pageX, pageY, state.touchX, state.touchY);
    if (idx !== null) {
      pendingActionRef.current = { action: ACTIONS[idx].key as ActionKey, event: state.event };
      dismiss();
    } else {
      dismiss();
    }
  }, [dismiss]); // eslint-disable-line

  const triggerAction = (action: ActionKey, event: SecurityEvent) => {
    if (action === 'share') {
      Share.share({
        message: `Security event: ${event.cameraName} — ${formatTimestamp(event.timestamp)}\n\nhttps://arcules.app/events/${event.id}`,
        title: 'Share Security Event',
      });
    } else if (action === 'archive') {
      setArchivedIds(prev => [...prev, event.id]);
      showToast('Archived to cases');
    } else if (action === 'findSimilar') {
      onFindSimilar?.(event);
    }
  };

  const config             = ZOOM_CONFIG[zoom];
  const slotsCount         = (24 * 60) / config.slotMinutes;
  const labelColWidth      = zoom === '1day' ? 0 : DAY_LABEL_WIDTH;
  const cellWidth          = Math.floor((width - labelColWidth - GRID_PADDING * 2) / slotsCount);
  const rowHeight          = config.rowHeight;

  const today = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  const days = useMemo(() => {
    if (zoom === '1day') return [viewingDay];
    if (customRange) {
      const result: Date[] = [];
      const cur = new Date(customRange.start);
      while (cur <= customRange.end && result.length < 31) {
        result.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
      return result;
    }
    return Array.from({ length: config.days }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (config.days - 1 - i));
      return d;
    });
  }, [today, config.days, zoom, viewingDay, customRange]);

  const baseFilterEvent = useCallback((event: SecurityEvent): boolean => {
    if (eventType !== 'all' && event.eventType !== eventType) return false;
    if (selectedColor && !event.colors?.some(c => c.toLowerCase() === selectedColor.toLowerCase())) return false;
    if (searchText.trim()) {
      const q = searchText.toLowerCase().trim();
      const blob = [event.cameraName, event.cameraLocation, event.eventType, event.zone ?? '', ...(event.colors ?? [])].join(' ').toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  }, [eventType, selectedColor, searchText]);

  const filterEvent = useCallback((event: SecurityEvent): boolean => {
    if (!baseFilterEvent(event)) return false;
    if (selectedCameraIds.size > 0 && !selectedCameraIds.has(event.cameraId)) return false;
    if (timePreset) {
      const range = getTimePresetRange(timePreset);
      if (range && (event.timestamp < range.start || event.timestamp >= range.end)) return false;
    }
    return true;
  }, [baseFilterEvent, selectedCameraIds, timePreset]);

  const heatmap = useMemo(() => {
    const grid: HeatCell[][] = Array.from({ length: days.length }, () =>
      new Array(slotsCount).fill(null).map(() => ({ total: 0, motion: 0, person: 0, vehicle: 0 }))
    );
    mockEvents.forEach(event => {
      if (!filterEvent(event)) return;
      const eventDay = new Date(event.timestamp); eventDay.setHours(0, 0, 0, 0);
      for (let d = 0; d < days.length; d++) {
        if (sameCalDay(days[d], eventDay)) {
          const mins = event.timestamp.getHours() * 60 + event.timestamp.getMinutes();
          const slot = Math.floor(mins / config.slotMinutes);
          if (slot < slotsCount) {
            const c = grid[d][slot];
            c.total++;
            if (event.eventType === 'person')       c.person++;
            else if (event.eventType === 'vehicle') c.vehicle++;
            else                                    c.motion++;
          }
          break;
        }
      }
    });
    return grid;
  }, [days, config, filterEvent, slotsCount]);

  const maxHeatCount = useMemo(() =>
    Math.max(1, ...heatmap.flatMap(d => d.map(c => c.total))),
  [heatmap]);

  const dayTotals = useMemo(() =>
    heatmap.map(slots => slots.reduce(
      (acc, c) => ({ total: acc.total + c.total, motion: acc.motion + c.motion, person: acc.person + c.person, vehicle: acc.vehicle + c.vehicle }),
      { total: 0, motion: 0, person: 0, vehicle: 0 }
    )),
  [heatmap]);

  const maxDayTotal = useMemo(() => Math.max(1, ...dayTotals.map(d => d.total)), [dayTotals]);

  const displayedEvents = useMemo(() => {
    let events = mockEvents.filter(filterEvent);
    if (selectedCell) {
      const targetDay = days[selectedCell.dayIndex];
      const slotStart = selectedCell.slotIndex * config.slotMinutes;
      const slotEnd   = slotStart + config.slotMinutes;
      events = events.filter(event => {
        const eventDay = new Date(event.timestamp); eventDay.setHours(0, 0, 0, 0);
        if (!sameCalDay(eventDay, targetDay)) return false;
        const mins = event.timestamp.getHours() * 60 + event.timestamp.getMinutes();
        return mins >= slotStart && mins < slotEnd;
      });
    } else if (selectedTimeRange) {
      const startMins = selectedTimeRange.startSlot * config.slotMinutes;
      const endMins   = (selectedTimeRange.endSlot + 1) * config.slotMinutes;
      events = events.filter(event => {
        const mins = event.timestamp.getHours() * 60 + event.timestamp.getMinutes();
        return mins >= startMins && mins < endMins;
      });
    }
    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [selectedCell, selectedTimeRange, days, config, filterEvent]);

  // Pair events for 2-column grid
  const eventRows = useMemo(() => {
    const rows: SecurityEvent[][] = [];
    for (let i = 0; i < displayedEvents.length; i += 2) {
      rows.push(displayedEvents.slice(i, i + 2));
    }
    return rows;
  }, [displayedEvents]);

  const getDayLabel = (date: Date): string => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    if (sameCalDay(date, now)) return 'Today';
    return DAY_LABELS[date.getDay()];
  };

  const selectedLabel = useMemo(() => {
    if (!selectedCell) return null;
    const day = days[selectedCell.dayIndex];
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const dayStr = sameCalDay(day, now) ? 'Today'
      : sameCalDay(day, yesterday) ? 'Yesterday'
      : DAY_LABELS[day.getDay()];
    return `${dayStr}, ${formatHourFull(selectedCell.slotIndex * config.slotMinutes)}`;
  }, [selectedCell, days, config]);

  const timeRangeLabel = useMemo(() => {
    if (!selectedTimeRange) return null;
    const start = formatHourFull(selectedTimeRange.startSlot * config.slotMinutes);
    const end   = formatHourFull((selectedTimeRange.endSlot + 1) * config.slotMinutes);
    return `${start} – ${end}`;
  }, [selectedTimeRange, config]);

  // Active filter summary for collapsed bar
  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (eventType !== 'all') parts.push(eventType.charAt(0).toUpperCase() + eventType.slice(1));
    if (selectedColor) parts.push(selectedColor);
    if (searchText.trim()) parts.push(`"${searchText.trim()}"`);
    if (selectedCell) parts.push(selectedLabel ?? '');
    if (timeRangeLabel) parts.push(timeRangeLabel);
    return parts.length > 0 ? parts.join(' · ') : config.rangeLabel;
  }, [eventType, selectedColor, searchText, selectedCell, selectedLabel, timeRangeLabel, config.rangeLabel]);

  const activeFilterCount = useMemo(() => timePreset ? 1 : 0, [timePreset]);

  const timePillLabel = useMemo(() =>
    timePreset ? TIME_PRESETS.find(p => p.id === timePreset)?.label ?? null : null,
  [timePreset]);

  const handleScroll = useCallback((e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const shouldCollapse = y > 40;
    if (shouldCollapse && !heatmapCollapsed && !manualExpand) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setHeatmapCollapsed(true);
    } else if (!shouldCollapse && heatmapCollapsed) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setHeatmapCollapsed(false);
      setManualExpand(false);
    }
  }, [heatmapCollapsed, manualExpand]);

  const handleEventTypeChange = (type: EventTypeFilter) => {
    setEventType(type); setSelectedColor(null); setSelectedCell(null);
  };

  const handleZoomChange = (z: ZoomLevel) => {
    setCustomRange(null); setZoom(z); setSelectedCell(null); setSelectedTimeRange(null);
  };

  const drillToDay = (day: Date) => {
    setViewingDay(day);
    setCustomRange(null);
    setSelectedCell(null);
    setSelectedTimeRange(null);
    setZoom('1day');
  };

  const handleApplyDateRange = (start: Date, end: Date) => {
    setShowDatePicker(false);
    setSelectedCell(null);
    setSelectedTimeRange(null);
    if (start.getTime() === end.getTime()) {
      setCustomRange(null);
      setViewingDay(start);
      setZoom('1day');
    } else {
      setCustomRange({ start, end });
      if (zoom === '1day') setZoom('3day');
    }
  };

  const isHeatmapVisible = !heatmapCollapsed || manualExpand;
  const showColorFilter   = eventType === 'person' || eventType === 'vehicle';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>

      {/* ── Sticky top: filters ── */}
      <View style={styles.filterSection}>

        {/* 1. Event type chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {EVENT_TYPE_CHIPS.map(chip => (
            <TouchableOpacity
              key={chip.id}
              style={[styles.chip, eventType === chip.id && styles.chipActive]}
              onPress={() => handleEventTypeChange(chip.id)}
            >
              <Text style={[styles.chipText, eventType === chip.id && styles.chipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 3. Color swatches */}
        {showColorFilter && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorRow}>
            {COLOR_OPTIONS.map(c => {
              const isSelected = c.none ? selectedColor === null : selectedColor === c.label;
              return (
                <TouchableOpacity
                  key={c.label}
                  onPress={() => { setSelectedColor(c.none ? null : (isSelected ? null : c.label)); setSelectedCell(null); }}
                  style={[styles.colorSwatch, isSelected && styles.colorSwatchSelected]}
                >
                  <View style={[styles.colorDot, { backgroundColor: c.hex }, c.border && styles.colorDotBorder]}>
                    {c.none && <View style={styles.colorNoneLine} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* 4. Text search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={15} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Describe people, vehicles, or objects"
            placeholderTextColor={COLORS.textSecondary}
            value={searchText}
            onChangeText={t => { setSearchText(t); setSelectedCell(null); }}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={15} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* 5. Time active pill */}
        {timePillLabel && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
            <View style={styles.activePill}>
              <Ionicons name="time-outline" size={12} color={COLORS.accent} />
              <Text style={styles.activePillText}>{timePillLabel}</Text>
              <TouchableOpacity onPress={() => setTimePreset(null)}>
                <Ionicons name="close" size={13} color={COLORS.accent} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>

      {/* ── Collapsible heatmap ── */}
      {isHeatmapVisible ? (
        <View style={styles.heatmapSection}>
          <View style={styles.heatmapHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                activeOpacity={0.7}
              >
                <Text style={[styles.sectionTitle, customRange && { color: COLORS.accent }]}>{
                  customRange
                    ? (() => {
                        const s = customRange.start.toLocaleDateString([], { month: 'short', day: 'numeric' });
                        const e = customRange.end.toLocaleDateString([], { month: 'short', day: 'numeric' });
                        return s === e ? customRange.start.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }) : `${s} – ${e}`;
                      })()
                    : zoom === '1day'
                      ? viewingDay.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
                      : zoom === '3day'
                        ? `${new Date(today.getTime() - 2*86400000).toLocaleDateString([], { month:'short', day:'numeric' })} – ${today.toLocaleDateString([], { month:'short', day:'numeric' })}`
                        : `${new Date(today.getTime() - 6*86400000).toLocaleDateString([], { month:'short', day:'numeric' })} – ${today.toLocaleDateString([], { month:'short', day:'numeric' })}`
                }</Text>
                <Ionicons name="calendar-outline" size={13} color={customRange ? COLORS.accent : COLORS.textSecondary} />
              </TouchableOpacity>
              {customRange && (
                <TouchableOpacity onPress={() => setCustomRange(null)} hitSlop={{ top:6, bottom:6, left:6, right:6 }}>
                  <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.heatmapHeaderRight}>
              <View style={styles.zoomControl}>
                {(Object.keys(ZOOM_CONFIG) as ZoomLevel[]).map(z => (
                  <TouchableOpacity
                    key={z}
                    style={[styles.zoomBtn, zoom === z && styles.zoomBtnActive]}
                    onPress={() => handleZoomChange(z)}
                  >
                    <Text style={[styles.zoomBtnText, zoom === z && styles.zoomBtnTextActive]}>
                      {ZOOM_CONFIG[z].label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {heatmapCollapsed && (
                <TouchableOpacity onPress={() => setManualExpand(false)} style={styles.collapseBtn}>
                  <Ionicons name="chevron-up" size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {zoom === '1day' ? (
            /* ── 1D: fixed hourly bar chart ── */
            <View
              ref={heatmapGridRef}
              style={{ paddingHorizontal: GRID_PADDING }}
              {...heatmapPanResponder.panHandlers}
            >
              {/* Hour labels */}
              <View style={styles.hourHeaderRow}>
                {Array.from({ length: 24 }, (_, slot) => {
                  const showLabel = slot % config.labelInterval === 0;
                  return (
                    <View key={slot} style={{ width: cellWidth, alignItems: 'flex-start' }}>
                      {showLabel && (
                        <>
                          <Text style={styles.hourLabel} numberOfLines={1}>
                            {formatSlotLabel(slot, 60)}
                          </Text>
                          <View style={styles.hourTick} />
                        </>
                      )}
                    </View>
                  );
                })}
              </View>
              {/* Bars */}
              <View style={{ flexDirection: 'row', height: rowHeight }}>
                {Array.from({ length: 24 }, (_, slotIndex) => {
                  const cell = heatmap[0][slotIndex];
                  const isSelected = selectedCell?.slotIndex === slotIndex;
                  const grad = buildBarGradient(cell);
                  const barH = cell.total > 0 ? Math.max(4, (cell.total / maxHeatCount) * (rowHeight - 10)) : 0;
                  const barW = cellWidth - 4;
                  const showLabel = slotIndex % config.labelInterval === 0;
                  return (
                    <TouchableOpacity
                      key={slotIndex}
                      activeOpacity={0.75}
                      style={[styles.barCell, { width: cellWidth, height: rowHeight },
                        showLabel && styles.barCellGridLine,
                        isSelected && styles.barCellSelected,
                      ]}
                      onPress={() => { setSelectedCell(isSelected ? null : { dayIndex: 0, slotIndex }); setSelectedTimeRange(null); }}
                    >
                      {grad && (
                        <View style={{ width: barW, height: barH, borderRadius: 3, overflow: 'hidden' }}>
                          <LinearGradient
                            colors={grad.colors as [string, string, ...string[]]}
                            locations={grad.locations as [number, number, ...number[]]}
                            start={{ x: 0, y: 1 }}
                            end={{ x: 0, y: 0 }}
                            style={{ flex: 1 }}
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            /* ── 7D / 3D / custom: one gradient bar per day, scrollable when > 7 days ── */
            (() => {
              const DAY_COL_W = Math.floor((width - GRID_PADDING * 2) / 7);
              const scrollable = days.length > 7;
              const bars = days.map((day, dayIndex) => {
                const data    = dayTotals[dayIndex];
                const barH    = data.total > 0 ? Math.max(6, (data.total / maxDayTotal) * DAY_BAR_MAX_H) : 0;
                const grad    = buildBarGradient(data);
                const isToday = sameCalDay(day, today);
                return (
                  <TouchableOpacity
                    key={dayIndex}
                    style={[styles.dayBarItem, { width: DAY_COL_W }]}
                    activeOpacity={0.7}
                    onPress={() => drillToDay(day)}
                  >
                    <View style={styles.dayBarTrack}>
                      <View style={styles.dayBarRail} />
                      {grad ? (
                        <View style={{ width: DAY_BAR_W, height: barH, borderRadius: 5, overflow: 'hidden' }}>
                          <LinearGradient
                            colors={grad.colors as [string, string, ...string[]]}
                            locations={grad.locations as [number, number, ...number[]]}
                            start={{ x: 0, y: 1 }}
                            end={{ x: 0, y: 0 }}
                            style={{ flex: 1 }}
                          />
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.dayBarLabel, isToday && styles.dayBarLabelToday]}>
                      {getDayLabel(day)}
                    </Text>
                    <Text style={styles.dayBarDate}>{day.getDate()}</Text>
                  </TouchableOpacity>
                );
              });
              return scrollable ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={DAY_COL_W}
                  decelerationRate="fast"
                  contentContainerStyle={{ paddingHorizontal: GRID_PADDING, flexDirection: 'row', alignItems: 'flex-end', paddingTop: 8, paddingBottom: 4 }}
                >
                  {bars}
                </ScrollView>
              ) : (
                <View style={styles.dayBarsContainer}>{bars}</View>
              );
            })()
          )}

          <View style={styles.legend}>
            {[
              { color: CAT.motion,  label: 'Motion'  },
              { color: CAT.person,  label: 'Person'  },
              { color: CAT.vehicle, label: 'Vehicle' },
            ].map(item => (
              <View key={item.label} style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        /* ── Collapsed bar ── */
        <TouchableOpacity
          style={styles.collapsedBar}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setManualExpand(true);
          }}
        >
          <Ionicons name="grid" size={14} color={COLORS.accent} />
          <Text style={styles.collapsedLabel} numberOfLines={1}>
            {filterSummary}
          </Text>
          <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
        </TouchableOpacity>
      )}

      {/* ── Results header ── */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {displayedEvents.length} detection{displayedEvents.length !== 1 ? 's' : ''}
          {' · '}{timeRangeLabel ?? selectedLabel ?? config.rangeLabel}
        </Text>
        <View style={styles.resultsHeaderRight}>
          {(selectedCell || selectedTimeRange) && (
            <TouchableOpacity onPress={() => { setSelectedCell(null); setSelectedTimeRange(null); }}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Scrollable thumbnail grid ── */}
      <ScrollView
        style={styles.gridScroll}
        contentContainerStyle={styles.gridContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!longPressState}
      >
        {eventRows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map(evt => (
              <ThumbnailCard
                key={evt.id}
                event={evt}
                isArchived={archivedIds.includes(evt.id)}
                onShortPress={() => onSelectEvent?.(evt)}
                onActivateLongPress={handleActivateLongPress}
                onMoveWhileHeld={handleMoveWhileHeld}
                onReleaseWhileHeld={handleReleaseWhileHeld}
              />
            ))}
            {/* Fill empty slot in last odd row */}
            {row.length === 1 && <View style={{ width: CARD_WIDTH }} />}
          </View>
        ))}

        {displayedEvents.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="videocam-off" size={48} color={COLORS.border} />
            <Text style={styles.emptyText}>No events found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Long press overlay ── */}
      <Modal visible={!!longPressState} transparent animationType="none">
        <Animated.View style={[styles.overlayBg, { opacity: overlayAnim }]} />

        {longPressState && (() => {
          const { event: ev, position: pos } = longPressState;
          const cardH = CARD_IMAGE_HEIGHT + 28;
          const { touchX, touchY } = longPressState;
          const btnCenters = getActionButtonCenters(touchX, touchY);
          return (
            <>
              {/* Scaled floating card */}
              <Animated.View
                style={[
                  styles.floatingCard,
                  {
                    left: pos.x,
                    top: pos.y,
                    width: pos.width,
                    height: cardH,
                    transform: [{ scale: scaleAnim }],
                  },
                ]}
              >
                <Image source={{ uri: ev.thumbnail }} style={{ width: pos.width, height: CARD_IMAGE_HEIGHT }} resizeMode="cover" />
                <Text style={cardStyles.timestamp} numberOfLines={1}>{formatTimestamp(ev.timestamp)}</Text>
              </Animated.View>

              {/* Action buttons */}
              {ACTIONS.map((action, i) => {
                const isHovered = hoveredActionIdx === i;
                const center = btnCenters[i];
                return (
                  <Animated.View
                    key={action.key}
                    style={[
                      styles.actionBtn,
                      {
                        left: center.x - BTN_SIZE / 2,
                        top:  center.y - BTN_SIZE / 2,
                        opacity: overlayAnim,
                        transform: [{
                          scale: isHovered ? 1.2 : 1,
                        }],
                        backgroundColor: isHovered ? COLORS.accent : 'rgba(30,30,30,0.88)',
                      },
                    ]}
                  >
                    <Ionicons name={action.icon as any} size={24} color="#fff" />
                  </Animated.View>
                );
              })}
            </>
          );
        })()}
      </Modal>

      {/* ── Date Range Picker ── */}
      <DateRangePicker
        visible={showDatePicker}
        initialStart={customRange?.start ?? null}
        initialEnd={customRange?.end ?? null}
        onClose={() => setShowDatePicker(false)}
        onApply={handleApplyDateRange}
      />

      {/* ── Admin Filter Sheet ── */}
      <FilterSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        onApply={(camIds, preset) => { setSelectedCameraIds(camIds); setTimePreset(preset); setShowFilterSheet(false); }}
        initialCameraIds={selectedCameraIds}
        initialTimePreset={timePreset}
        baseFilterEvent={baseFilterEvent}
      />

      {/* ── Toast ── */}
      {toast && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Filters
  filterSection: { paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  chipsRow: { paddingHorizontal: GRID_PADDING, gap: 8, marginBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.backgroundSecondary },
  chipActive: { backgroundColor: COLORS.accent },
  chipText: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  chipTextActive: { color: '#fff' },
  colorRow: { paddingHorizontal: GRID_PADDING, gap: 10, marginBottom: 8 },
  colorSwatch: { padding: 3, borderRadius: 20, borderWidth: 2, borderColor: 'transparent' },
  colorSwatchSelected: { borderColor: COLORS.accent },
  colorDot: { width: 22, height: 22, borderRadius: 11, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  colorDotBorder: { borderWidth: 1, borderColor: COLORS.border },
  colorNoneLine: { width: 26, height: 1.5, backgroundColor: '#9CA3AF', transform: [{ rotate: '45deg' }] },
  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: GRID_PADDING, backgroundColor: COLORS.backgroundSecondary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },

  // Heatmap
  heatmapSection: { paddingHorizontal: GRID_PADDING, paddingTop: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  heatmapHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  heatmapHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  zoomControl: { flexDirection: 'row', backgroundColor: COLORS.backgroundSecondary, borderRadius: 8, padding: 2 },
  zoomBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  zoomBtnActive: { backgroundColor: COLORS.accent },
  zoomBtnText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  zoomBtnTextActive: { color: '#fff' },
  collapseBtn: { padding: 4 },
  // Transposed heatmap: days as rows, hours as columns
  hourHeaderRow: { flexDirection: 'row', marginBottom: 2, alignItems: 'flex-end' },
  hourLabel: { fontSize: 10, fontWeight: '500', color: '#9CA3AF' },
  hourTick: { width: 1, height: 4, backgroundColor: '#D1D5DB', marginTop: 2 },
  dayRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  dayLabelCell: { alignItems: 'flex-end', paddingRight: 6 },
  dayLabel: { fontSize: 9, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase' },
  dayDate: { fontSize: 9, color: COLORS.textSecondary, marginTop: 1 },
  cell: { borderWidth: 0.5, borderColor: COLORS.background, borderRadius: 2 },
  cellInRange: { borderColor: 'rgba(13,148,136,0.4)' },
  cellSelected: { borderWidth: 1.5, borderColor: COLORS.accent, zIndex: 1 },
  // 7D/3D day bars
  dayBarsContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', paddingTop: 8, paddingBottom: 4 },
  dayBarItem: { alignItems: 'center', flex: 1 },
  dayBarTrack: { height: DAY_BAR_MAX_H, justifyContent: 'flex-end', alignItems: 'center' },
  dayBarRail: { position: 'absolute', bottom: 0, width: DAY_BAR_W, height: DAY_BAR_MAX_H, borderRadius: 5, backgroundColor: '#F3F4F6' },
  dayBarLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', marginTop: 6 },
  dayBarLabelToday: { color: COLORS.accent },
  dayBarDate: { fontSize: 10, color: COLORS.textSecondary, marginTop: 1 },
  // 1D bar chart cells
  barCell: { justifyContent: 'flex-end', alignItems: 'center', backgroundColor: COLORS.backgroundSecondary, borderWidth: 0.5, borderColor: COLORS.background, borderRadius: 2, paddingBottom: 2 },
  barCellGridLine: { borderLeftWidth: 1, borderLeftColor: '#E5E7EB' },
  barCellHighlight: { backgroundColor: 'rgba(96,165,250,0.08)' },
  barCellSelected: { backgroundColor: '#0D948826', borderWidth: 2, borderColor: '#0D9488' },
  barSelectedRing: { position: 'absolute', bottom: 0, left: 0, right: 0, top: 0, borderRadius: 3, borderWidth: 2, borderColor: '#0D948899', backgroundColor: '#0D948822' },
  // Legend
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { fontSize: 10, color: COLORS.textSecondary },
  legendSwatch: { width: 8, height: 8, borderRadius: 2 },

  // Collapsed bar
  collapsedBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 8, backgroundColor: COLORS.backgroundSecondary },
  collapsedLabel: { flex: 1, fontSize: 13, color: COLORS.textSecondary },

  // Active filter pills
  pillsRow:       { paddingHorizontal: GRID_PADDING, paddingTop: 8, gap: 8 },
  activePill:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(13,148,136,0.1)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  activePillText: { fontSize: 12, color: COLORS.accent, fontWeight: '500', maxWidth: 130 },

  // Results
  resultsHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  resultsCount:       { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary, flex: 1 },
  resultsHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  clearText:          { fontSize: 13, fontWeight: '500', color: COLORS.accent },
  filtersBtn:         { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.backgroundSecondary },
  filtersBtnActive:   { backgroundColor: 'rgba(13,148,136,0.1)' },
  filtersBtnText:     { fontSize: 12, fontWeight: '500', color: COLORS.textSecondary },
  filtersBtnTextActive: { color: COLORS.accent },

  // Thumbnail grid
  gridScroll: { flex: 1 },
  gridContent: { padding: GRID_PADDING, gap: GRID_GAP },
  row: { flexDirection: 'row', gap: GRID_GAP },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginTop: 12 },
  emptySubtext: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },

  // Long press overlay
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  floatingCard: {
    position: 'absolute',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: COLORS.backgroundSecondary,
  },
  actionBtn: {
    position: 'absolute',
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    position: 'absolute',
    bottom: -18,
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    width: 70,
  },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    backgroundColor: 'rgba(17,24,39,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  toastText: { color: '#fff', fontSize: 13, fontWeight: '500' },
});
