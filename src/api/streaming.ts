// Streaming API — free embeddable sources keyed by TMDB ID.
// Servers are tried in order; failed ones are tracked so the player skips them.

export interface StreamingServer {
  id: string;
  name: string;
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
    id: 'vidsrc_xyz',
    name: 'VidSrc',
    getUrl: (id, _q, _s, contentType = 'movie', season, episode) => {
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
    id: 'embed_su',
    name: 'EmbedSu',
    getUrl: (id, _q, _s, contentType = 'movie', season, episode) => {
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
    id: 'multiembed',
    name: 'MultiEmbed',
    getUrl: (id, _q, _s, contentType = 'movie', season, episode) => {
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
    id: 'superembed',
    name: 'SuperEmbed',
    getUrl: (id, _q, _s, contentType = 'movie', season, episode) => {
      let url = `https://superembed.stream/embed?tmdb=${id}`;
      if (contentType === 'tv' && season != null && episode != null) {
        url += `&season=${season}&episode=${episode}`;
      }
      return url;
    },
    supportsQuality: false,
    supportsSubtitles: false,
  },
];

export const getDefaultServer = (): StreamingServer => SERVERS[0];

export const getServerById = (id: string): StreamingServer =>
  SERVERS.find((s) => s.id === id) ?? SERVERS[0];

// Subtitle language options
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
