// Streaming API — free embeddable sources keyed by TMDB ID.
// Last verified: 2026-07.
// Servers tried and found DEAD (DNS gone): vidsrc.xyz, embed.su, autoembed.cc,
// vidsrc.icu, moviesapi.club.  SuperEmbed (superembed.stream) returns 404 on
// all embed URL patterns.  Do not re-add those without re-verifying first.

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
    // vidsrc.me — verified 2026-07, shows movie thumbnail + play button
    id: 'vidsrc_me',
    name: 'VidSrc',
    getUrl: (id, _q, _s, contentType = 'movie', season, episode) => {
      if (contentType === 'tv' && season != null && episode != null) {
        return `https://vidsrc.me/embed/tv?tmdb=${id}&season=${season}&episode=${episode}`;
      }
      return `https://vidsrc.me/embed/movie?tmdb=${id}`;
    },
    supportsQuality: false,
    supportsSubtitles: false,
  },
  {
    // multiembed.mov — verified 2026-07, shows movie poster + play button
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
    // embed.smashystream.com — verified 2026-07, active multi-source player
    // (shows "Preparing multi-source scan" loading screen, then plays video)
    id: 'smashystream',
    name: 'SmashyStream',
    getUrl: (id, _q, _s, contentType = 'movie', season, episode) => {
      if (contentType === 'tv' && season != null && episode != null) {
        return `https://embed.smashystream.com/playere.php?tmdb=${id}&type=tv&season=${season}&episode=${episode}`;
      }
      return `https://embed.smashystream.com/playere.php?tmdb=${id}`;
    },
    supportsQuality: false,
    supportsSubtitles: false,
  },
  {
    // www.2embed.cc — verified 2026-07, recognised The Dark Knight (TMDB 155)
    id: 'twoembed_cc',
    name: '2Embed',
    getUrl: (id, _q, _s, contentType = 'movie', season, episode) => {
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
