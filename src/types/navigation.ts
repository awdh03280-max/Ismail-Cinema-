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
  MovieDetails: { movieId: string; contentType?: 'movie' | 'tv' };
  MovieList: { category: string };
  Player: {
    movieId: string;
    title: string;
    poster: string;
    contentType?: 'movie' | 'tv';
    runtimeMinutes?: number;
    initialProgress?: number;
  };

  // Family Mode (in ProfileStack)
  FamilyModeSettings: undefined;
  FamilyModePin: {
    mode: 'setup' | 'unlock' | 'disable' | 'change';
  };

  // Social / Follow system
  PublicProfile: {
    uid: string;
    displayName: string;
    photoURL?: string | null;
  };
  FollowersScreen: {
    uid: string;
    displayName: string;
  };
  FollowingScreen: {
    uid: string;
    displayName: string;
  };
  NotificationsScreen: undefined;
};
