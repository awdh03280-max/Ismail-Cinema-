/**
 * Movie Series Collections — franchise/universe rows for the Home screen's
 * "Movie Series Collections" section. Distinct from src/data/collections.ts,
 * which groups titles by genre; these group titles by a specific franchise.
 */

export interface SeriesCollection {
  id: string;
  name: string;
  subtitle: string;
  icon: string;                          // emoji displayed on card
  gradient: [string, string];            // LinearGradient start → end
  /** How to fetch this franchise's titles from TMDB. */
  source:
    | { type: 'tmdbCollection'; collectionId: number }
    | { type: 'company'; companyId: number };
}

export const SERIES_COLLECTIONS: SeriesCollection[] = [
  {
    id: 'marvel',
    name: 'Marvel Cinematic Universe',
    subtitle: 'Earth\u2019s Mightiest Heroes',
    icon: '🦸',
    gradient: ['#5c0000', '#140000'],
    source: { type: 'company', companyId: 420 },
  },
  {
    id: 'dc',
    name: 'DC Universe',
    subtitle: 'Gotham to Metropolis',
    icon: '🦇',
    gradient: ['#001233', '#00040d'],
    source: { type: 'company', companyId: 128064 },
  },
  {
    id: 'harrypotter',
    name: 'Harry Potter',
    subtitle: 'The Wizarding World',
    icon: '⚡',
    gradient: ['#2a1a00', '#0d0800'],
    source: { type: 'tmdbCollection', collectionId: 1241 },
  },
  {
    id: 'fastfurious',
    name: 'Fast & Furious',
    subtitle: 'Family. Speed. Loyalty.',
    icon: '🏎️',
    gradient: ['#330000', '#0d0000'],
    source: { type: 'tmdbCollection', collectionId: 9485 },
  },
  {
    id: 'johnwick',
    name: 'John Wick',
    subtitle: 'The Continental awaits',
    icon: '🔫',
    gradient: ['#1a1a1a', '#000000'],
    source: { type: 'tmdbCollection', collectionId: 404609 },
  },
  {
    id: 'missionimpossible',
    name: 'Mission: Impossible',
    subtitle: 'Your mission, should you choose to accept it',
    icon: '🕶️',
    gradient: ['#001a0d', '#000502'],
    source: { type: 'tmdbCollection', collectionId: 87359 },
  },
  {
    id: 'conjuring',
    name: 'The Conjuring Universe',
    subtitle: 'Based on true horror',
    icon: '👹',
    gradient: ['#1a0000', '#050000'],
    source: { type: 'tmdbCollection', collectionId: 313086 },
  },
  {
    id: 'piratescaribbean',
    name: 'Pirates of the Caribbean',
    subtitle: 'Why is the rum always gone?',
    icon: '🏴‍☠️',
    gradient: ['#003322', '#000d08'],
    source: { type: 'tmdbCollection', collectionId: 295 },
  },
  {
    id: 'transformers',
    name: 'Transformers',
    subtitle: 'More than meets the eye',
    icon: '🤖',
    gradient: ['#331a00', '#0d0700'],
    source: { type: 'tmdbCollection', collectionId: 8650 },
  },
  {
    id: 'finaldestination',
    name: 'Final Destination',
    subtitle: 'You can\u2019t cheat death',
    icon: '💀',
    gradient: ['#1a0011', '#050004'],
    source: { type: 'tmdbCollection', collectionId: 8864 },
  },
];
