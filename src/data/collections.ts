/**
 * Movie / TV collections for the Home screen "Browse Collections" section.
 * Each entry drives both the CollectionsSection card and the CollectionScreen.
 */

export interface Collection {
  id: string;
  name: string;
  subtitle: string;
  icon: string;                          // emoji displayed on card
  gradient: [string, string];            // LinearGradient start → end
  genreIds: number[];                    // TMDB genre IDs
  contentType: 'movie' | 'tv';
  sortBy?: string;                       // TMDB sort_by param (default popularity.desc)
}

export const COLLECTIONS: Collection[] = [
  {
    id: 'action',
    name: 'Action & Thrills',
    subtitle: 'High-octane blockbusters',
    icon: '💥',
    gradient: ['#7a0000', '#1a0000'],
    genreIds: [28, 53],
    contentType: 'movie',
  },
  {
    id: 'scifi',
    name: 'Sci-Fi Epics',
    subtitle: 'Beyond the stars',
    icon: '🚀',
    gradient: ['#002b5c', '#000d1f'],
    genreIds: [878, 12],
    contentType: 'movie',
  },
  {
    id: 'horror',
    name: 'Horror & Terror',
    subtitle: 'Watch if you dare',
    icon: '👻',
    gradient: ['#2a003d', '#070007'],
    genreIds: [27, 9648],
    contentType: 'movie',
  },
  {
    id: 'drama',
    name: 'Drama Masterpieces',
    subtitle: 'Stories that move you',
    icon: '🎭',
    gradient: ['#171740', '#00000e'],
    genreIds: [18],
    contentType: 'movie',
    sortBy: 'vote_average.desc',
  },
  {
    id: 'comedy',
    name: 'Comedy Gold',
    subtitle: 'Guaranteed laughs',
    icon: '😂',
    gradient: ['#4a3500', '#130e00'],
    genreIds: [35],
    contentType: 'movie',
  },
  {
    id: 'romance',
    name: 'Romance',
    subtitle: 'Stories of love',
    icon: '❤️',
    gradient: ['#6e1818', '#1a0000'],
    genreIds: [10749, 18],
    contentType: 'movie',
  },
  {
    id: 'fantasy',
    name: 'Fantasy & Magic',
    subtitle: 'Worlds beyond imagination',
    icon: '🧙',
    gradient: ['#003322', '#00100b'],
    genreIds: [14, 12],
    contentType: 'movie',
  },
  {
    id: 'crime',
    name: 'Crime & Heist',
    subtitle: 'Master criminals',
    icon: '🕵️',
    gradient: ['#1c1c00', '#090700'],
    genreIds: [80, 53],
    contentType: 'movie',
  },
  {
    id: 'tvseries',
    name: 'Top TV Series',
    subtitle: 'Binge-worthy shows',
    icon: '📺',
    gradient: ['#003347', '#001018'],
    genreIds: [18, 10759],
    contentType: 'tv',
    sortBy: 'vote_average.desc',
  },
];
