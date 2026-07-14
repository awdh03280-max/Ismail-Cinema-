/**
 * DownloadsScreen — Netflix/Cinema-Box style download manager.
 *
 * Sections: storage usage, search + status filter chips, then a single
 * unified list of Netflix-style cards (backdrop art, circular progress ring,
 * status pill, speed/ETA readout, and contextual actions). "History" is the
 * completed + failed + canceled subset, reachable via the filter chips.
 * See `src/types/downloads.ts` for the offline-info-package architecture note.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { useDownloads } from '../context/DownloadContext';
import { formatBytes, formatEta, formatSpeed } from '../downloads/downloadManager';
import { DownloadRecord, DownloadStatus } from '../types/downloads';
import EmptyState from '../components/EmptyState';
import CircularProgress from '../components/CircularProgress';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DEVICE_QUOTA_BYTES = 5 * 1024 * 1024 * 1024; // 5GB reference cap just for the usage bar

type FilterKey = 'all' | 'downloading' | 'completed' | 'failed' | 'history';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'downloading', label: 'Downloading' },
  { key: 'completed', label: 'Completed' },
  { key: 'failed', label: 'Failed' },
  { key: 'history', label: 'History' },
];

const matchesFilter = (status: DownloadStatus, filter: FilterKey): boolean => {
  switch (filter) {
    case 'all':
      return true;
    case 'downloading':
      return status === 'downloading' || status === 'queued' || status === 'paused';
    case 'completed':
      return status === 'completed';
    case 'failed':
      return status === 'failed';
    case 'history':
      return status === 'completed' || status === 'failed' || status === 'canceled';
    default:
      return true;
  }
};

const DownloadsScreen = ({ navigation }: any) => {
  const {
    downloads,
    storageBytes,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    deleteDownload,
    retryDownload,
  } = useDownloads();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: Platform.OS !== 'web' }).start();
  }, []);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [downloads.length, filter, query]);

  const completedCount = downloads.filter(d => d.status === 'completed').length;
  const usagePct = Math.min(1, storageBytes / DEVICE_QUOTA_BYTES);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return downloads.filter(d => {
      if (!matchesFilter(d.status, filter)) return false;
      if (q && !d.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [downloads, filter, query]);

  const confirmDelete = (record: DownloadRecord) => {
    Alert.alert(
      'Delete download?',
      `Remove "${record.title}" from your downloads. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteDownload(record.id) },
      ]
    );
  };

  const confirmCancel = (record: DownloadRecord) => {
    Alert.alert('Cancel download?', `Stop downloading "${record.title}"?`, [
      { text: 'Keep downloading', style: 'cancel' },
      { text: 'Cancel download', style: 'destructive', onPress: () => cancelDownload(record.id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#0d0d0d']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.headerTitle}>Downloads</Text>

        {/* ── Storage usage ─────────────────────────────────────────────── */}
        <View style={styles.storageCard}>
          <View style={styles.storageTop}>
            <View style={styles.storageIconWrap}>
              <Ionicons name="cloud-download" size={20} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.storageUsed}>{formatBytes(storageBytes)} used</Text>
              <Text style={styles.storageSub}>
                {completedCount} title{completedCount === 1 ? '' : 's'} saved offline
              </Text>
            </View>
          </View>
          <View style={styles.storageBarTrack}>
            <View style={[styles.storageBarFill, { width: `${Math.max(2, usagePct * 100)}%` }]} />
          </View>
        </View>

        {/* ── Search ────────────────────────────────────────────────────── */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search downloads"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Filter chips ──────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {FILTERS.map(f => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {downloads.length === 0 ? (
          <EmptyState
            icon="download-outline"
            title="No downloads yet"
            message="Tap Download on any title's page to save it for offline browsing."
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="No matches"
            message="Try a different search term or filter."
          />
        ) : (
          <Animated.View style={{ opacity: fadeAnim, gap: 12 }}>
            {visible.map(item => (
              <DownloadCard
                key={item.id}
                record={item}
                onPause={() => pauseDownload(item.id)}
                onResume={() => resumeDownload(item.id)}
                onCancel={() => confirmCancel(item)}
                onDelete={() => confirmDelete(item)}
                onRetry={() => retryDownload(item.id)}
                onOpen={() =>
                  navigation.navigate('MovieDetails', { movieId: item.id, contentType: item.contentType })
                }
              />
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
};

// ── Netflix/Cinema-Box style card ───────────────────────────────────────────

const STATUS_META: Record<DownloadStatus, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  queued: { label: 'Queued', color: colors.textMuted, icon: 'time-outline' },
  downloading: { label: 'Downloading', color: colors.gold, icon: 'arrow-down-circle' },
  paused: { label: 'Paused', color: colors.textSecondary, icon: 'pause-circle' },
  completed: { label: 'Completed', color: '#2db52d', icon: 'checkmark-circle' },
  failed: { label: 'Failed', color: colors.red, icon: 'alert-circle' },
  canceled: { label: 'Canceled', color: colors.textMuted, icon: 'close-circle' },
};

const DownloadCard: React.FC<{
  record: DownloadRecord;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onRetry: () => void;
  onOpen: () => void;
}> = ({ record, onPause, onResume, onCancel, onDelete, onRetry, onOpen }) => {
  const meta = STATUS_META[record.status];
  const pct = Math.round(record.progress * 100);
  const isActive = record.status === 'downloading' || record.status === 'queued' || record.status === 'paused';
  const speed = record.status === 'downloading' ? formatSpeed(record.speedBps) : '';
  const eta =
    record.status === 'downloading' && record.speedBps > 0
      ? formatEta((record.bytesTotal - record.bytesWritten) / record.speedBps)
      : '';

  return (
    <TouchableOpacity style={styles.card} onPress={onOpen} activeOpacity={0.85}>
      <View style={styles.artWrap}>
        {record.backdropUrl || record.posterUrl ? (
          <Image source={{ uri: record.backdropUrl || record.posterUrl }} style={styles.art} />
        ) : (
          <View style={styles.art} />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.artPosterWrap}>
          <Image source={{ uri: record.posterUrl }} style={styles.artPoster} />
        </View>

        <View style={[styles.statusPill, { backgroundColor: `${meta.color}22`, borderColor: meta.color }]}>
          <Ionicons name={meta.icon} size={11} color={meta.color} />
          <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.label}</Text>
        </View>

        <View style={styles.artBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>{record.title}</Text>
          <View style={styles.cardMetaRow}>
            {record.status === 'completed' && (
              <Text style={styles.cardMetaText}>{formatBytes(record.bytesTotal)} · saved offline</Text>
            )}
            {isActive && (
              <Text style={styles.cardMetaText} numberOfLines={1}>
                {formatBytes(record.bytesWritten)}{record.bytesTotal ? ` / ${formatBytes(record.bytesTotal)}` : ''}
                {!!speed && `  ·  ${speed}`}
                {!!eta && `  ·  ${eta}`}
              </Text>
            )}
            {record.status === 'failed' && (
              <Text style={[styles.cardMetaText, { color: colors.red }]} numberOfLines={1}>
                {record.errorMessage || 'Download failed'}
              </Text>
            )}
            {record.status === 'canceled' && <Text style={styles.cardMetaText}>Canceled</Text>}
          </View>
        </View>
      </View>

      <View style={styles.cardFooter}>
        {isActive ? (
          <CircularProgress progress={record.progress} size={40} strokeWidth={3}>
            <Text style={styles.pctText}>{pct}%</Text>
          </CircularProgress>
        ) : (
          <View style={{ width: 40 }} />
        )}

        <View style={styles.footerActions}>
          {isActive && (
            <>
              <TouchableOpacity
                style={styles.roundBtn}
                onPress={record.status === 'paused' ? onResume : onPause}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name={record.status === 'paused' ? 'play' : 'pause'} size={16} color={colors.black} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.roundBtnGhost} onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </>
          )}
          {record.status === 'completed' && (
            <TouchableOpacity style={styles.roundBtnGhost} onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={16} color={colors.red} />
            </TouchableOpacity>
          )}
          {record.status === 'failed' && (
            <>
              <TouchableOpacity style={styles.roundBtn} onPress={onRetry} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="refresh" size={16} color={colors.black} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.roundBtnGhost} onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </>
          )}
          {record.status === 'canceled' && (
            <TouchableOpacity style={styles.roundBtnGhost} onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  scrollContent: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 60 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: colors.textPrimary, marginBottom: 16 },

  storageCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  storageTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  storageIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(212,175,55,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  storageUsed: { color: '#fff', fontSize: 16, fontWeight: '800' },
  storageSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  storageBarTrack: { height: 6, borderRadius: 3, backgroundColor: '#1e1e1e', overflow: 'hidden' },
  storageBarFill: { height: 6, borderRadius: 3, backgroundColor: colors.gold },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 42,
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 14, paddingVertical: 0 },

  chipsRow: { gap: 8, paddingBottom: 18 },
  chip: {
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.textSecondary, fontSize: 12.5, fontWeight: '700' },
  chipTextActive: { color: colors.black },

  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 12,
  },
  artWrap: { width: '100%', height: 140, justifyContent: 'flex-end' },
  art: { ...StyleSheet.absoluteFillObject, backgroundColor: '#1a1a1a' },
  artPosterWrap: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    width: 40,
    height: 58,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  artPoster: { width: '100%', height: '100%' },
  statusPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
  },
  statusPillText: { fontSize: 10.5, fontWeight: '800' },
  artBody: { paddingLeft: 62, paddingRight: 14, paddingBottom: 12, gap: 3 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center' },
  cardMetaText: { color: colors.textSecondary, fontSize: 11.5, flexShrink: 1 },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pctText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  footerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roundBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.gold,
    justifyContent: 'center', alignItems: 'center',
  },
  roundBtnGhost: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center', alignItems: 'center',
  },
});

export default DownloadsScreen;
