export type RootStackParamList = {
  Home: undefined;
  Search: undefined;
  Favorites: undefined;
  ContinueWatching: undefined;
  MovieDetails: { movieId: string };
  MovieList: { category: string };
  Player: {
    movieId: string;
    title: string;
    poster: string;
    runtimeMinutes?: number;
    initialProgress?: number;
  };
  FamilyModeSettings: undefined;
  FamilyModePin: {
    mode: 'setup' | 'unlock' | 'disable' | 'change';
  };
};
