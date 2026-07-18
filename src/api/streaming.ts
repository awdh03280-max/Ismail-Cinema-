// Streaming API — free embeddable sources keyed by TMDB movie ID.
// Sources are tried in order; if one fails the player falls back automatically.

export interface StreamingServer {
  id: string;
  name: string;
  /** subtitle is a BCP-47 language code, e.g. 'en', 'ar', or 'off' */
  getUrl: (
    tmdbId: string,
    quality?: Quality,
    subtitle?: string,
    contentType?: 'movie' | 'tv',
    season?: number,
    episode?: number
  ) => string;
  supportsQuality: boolean;
  supportsSubtitles: boolean;
}

export type Quality = 'auto' | '1080p' | '720p' | '480p' | '360p';

export const QUALITIES: Quality[] = ['auto', '1080p', '720p', '480p', '360p'];

export const SERVERS: StreamingServer[] = [
  {
    // vidsrc.xyz — maintained successor to vidsrc.to (active as of 2025-2026)
    id: 'vidsrc_xyz',
    name: 'VidSrc',
    getUrl: (id, _quality, _subtitle, contentType = 'movie', season, episode) => {
      const type = contentType === 'tv' ? 'tv' : 'movie';
      let url = `https://vidsrc.xyz/embed/${type}/${id}`;
      if (contentType === 'tv' && season != null && episode != null) {
        url += `/${season}/${episode}`;
      }
      return url;
    },
    supportsQuality: false,
    supportsSubtitles: false,
  },
  {
    // embed.su — formerly vidsrc.pro (rebranded, active as of 2025-2026)
    id: 'embed_su',
    name: 'EmbedSu',
    getUrl: (id, _quality, _subtitle, contentType = 'movie', season, episode) => {
      const type = contentType === 'tv' ? 'tv' : 'movie';
      let url = `https://embed.su/embed/${type}/${id}`;
      if (contentType === 'tv' && season != null && episode != null) {
        url += `/${season}/${episode}`;
      }
      return url;
    },
    supportsQuality: false,
    supportsSubtitles: false,
  },
  {
    id: 'autoembed',
    name: 'AutoEmbed',
    getUrl: (id, _quality, _subtitle, contentType = 'movie', season, episode) => {
      const type = contentType === 'tv' ? 'tv' : 'movie';
      let url = `https://autoembed.cc/embed/${type}/${id}`;
      if (contentType === 'tv' && season != null && episode != null) {
        url += `/${season}/${episode}`;
      }
      return url;
    },
    supportsQuality: false,
    supportsSubtitles: false,
  },
  {
    id: 'multiembed',
    name: 'MultiEmbed',
    getUrl: (id, _quality, _subtitle, contentType = 'movie', season, episode) => {
      let url = `https://multiembed.mov/?video_id=${id}&tmdb=1`;
      if (contentType === 'tv') {
        url += '&tv=1';
        if (season != null && episode != null) {
          url += `&s=${season}&e=${episode}`;
        }
      }
      return url;
    },
    supportsQuality: false,
    supportsSubtitles: false,
  },
  {
    id: 'twoembed',
    name: '2Embed',
    getUrl: (id, _quality, _subtitle, contentType = 'movie', season, episode) => {
      if (contentType === 'tv') {
        let url = `https://www.2embed.cc/embedtv/${id}`;
        if (season != null && episode != null) {
          url += `&s=${season}&e=${episode}`;
        }
        return url;
      }
      return `https://www.2embed.cc/embed/${id}`;
    },
    supportsQuality: false,
    supportsSubtitles: false,
  },
];

export const getDefaultServer = (): StreamingServer => SERVERS[0];

export const getServerById = (id: string): StreamingServer =>
  SERVERS.find((s) => s.id === id) ?? SERVERS[0];

export const getNextServer = (currentId: string): StreamingServer => {
  const idx = SERVERS.findIndex((s) => s.id === currentId);
  return SERVERS[(idx + 1) % SERVERS.length];
};

// Subtitle language options — served by the streaming player when supported.
export interface SubtitleLanguage {
  code: string;
  label: string;
  labelAr: string;
}

export const SUBTITLE_LANGUAGES: SubtitleLanguage[] = [
  { code: 'off', label: 'Off', labelAr: 'إيقاف' },
  { code: 'en', label: 'English', labelAr: 'الإنجليزية' },
  { code: 'ar', label: 'Arabic', labelAr: 'العربية' },
  { code: 'fr', label: 'French', labelAr: 'الفرنسية' },
  { code: 'de', label: 'German', labelAr: 'الألمانية' },
  { code: 'es', label: 'Spanish', labelAr: 'الإسبانية' },
];
