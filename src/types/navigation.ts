// ── Auth stack ────────────────────────────────────────────────────────────────
export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

// ── Main app stack ────────────────────────────────────────────────────────────
export type RootStackParamList = {
  // Root
  Splash: undefined;
  Auth: undefined;
  MainApp: undefined;

  // Tab screens
  Home: undefined;
  Search: undefined;
  Favorites: undefined;
  ContinueWatching: undefined;
  Profile: undefined;

  // Shared screens
  MovieDetails: { movieId: string };
  MovieList: { category: string };
  Player: {
    movieId: string;
    title: string;
    poster: string;
    runtimeMinutes?: number;
    initialProgress?: number;
  };

  // Family Mode (in ProfileStack)
  FamilyModeSettings: undefined;
  FamilyModePin: {
    mode: 'setup' | 'unlock' | 'disable' | 'change';
  };
};
