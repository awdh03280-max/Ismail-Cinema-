// Streaming API — free embeddable sources keyed by TMDB movie ID.
// Sources are tried in order; if one fails the player falls back automatically.

export interface StreamingServer {
  id: string;
  name: string;
  /** subtitle is a BCP-47 language code, e.g. 'en', 'ar', or 'off' */
  getUrl: (tmdbId: string, quality?: Quality, subtitle?: string) => string;
  supportsQuality: boolean;
  supportsSubtitles: boolean;
}

export type Quality = 'auto' | '1080p' | '720p' | '480p' | '360p';

export const QUALITIES: Quality[] = ['auto', '1080p', '720p', '480p', '360p'];

export const SERVERS: StreamingServer[] = [
  {
    id: 'vidsrc_to',
    name: 'VidSrc',
    // subtitle= param selects the default subtitle track when the player loads.
    getUrl: (id, _quality, subtitle) => {
      const base = `https://vidsrc.to/embed/movie/${id}`;
      return subtitle && subtitle !== 'off' ? `${base}?subtitle=${subtitle}` : base;
    },
    supportsQuality: false,
    supportsSubtitles: true,
  },
  {
    id: 'vidsrc_me',
    name: 'VidSrc 2',
    // ds_lang selects the subtitle language in the vidsrc.me player.
    getUrl: (id, _quality, subtitle) => {
      const base = `https://vidsrc.me/embed/movie?tmdb=${id}`;
      return subtitle && subtitle !== 'off' ? `${base}&ds_lang=${subtitle}` : base;
    },
    supportsQuality: false,
    supportsSubtitles: true,
  },
  {
    id: 'autoembed',
    name: 'AutoEmbed',
    getUrl: (id) => `https://player.autoembed.cc/embed/movie/${id}`,
    supportsQuality: false,
    supportsSubtitles: false,
  },
  {
    id: 'multiembed',
    name: 'MultiEmbed',
    getUrl: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
    supportsQuality: false,
    supportsSubtitles: false,
  },
  {
    id: 'twoembed',
    name: '2Embed',
    getUrl: (id) => `https://www.2embed.cc/embed/${id}`,
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
