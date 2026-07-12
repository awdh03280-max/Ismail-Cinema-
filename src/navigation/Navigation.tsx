import React, { useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ContinueWatchingScreen from '../screens/ContinueWatchingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MovieDetailsScreen from '../screens/MovieDetailsScreen';
import PlayerScreen from '../screens/PlayerScreen';
import SplashScreen from '../screens/SplashScreen';
import FamilyModeSettingsScreen from '../screens/FamilyModeSettingsScreen';
import FamilyModePinScreen from '../screens/FamilyModePinScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import CinemaQuizScreen from '../screens/CinemaQuizScreen';
import PublicProfileScreen from '../screens/PublicProfileScreen';
import FollowersScreen from '../screens/FollowersScreen';
import FollowingScreen from '../screens/FollowingScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import WatchPartyScreen from '../screens/WatchPartyScreen';
import MovieListScreen from '../screens/MovieListScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import AuthGate from '../components/AuthGate';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

// ComponentType<any> because these screens use a loose `navigation: any` prop.
// Full param-list types can be added per-screen in a future refactor.
type AnyScreen = React.ComponentType<any>;

// ── Auth-gated screen wrappers ─────────────────────────────────────────────
// Browsing (Home/Search/Details/Player) never requires sign-in. Only these
// user-specific features are protected: Favorites, Watch Party, Friends
// (Followers/Following), Notifications. Wrapping here keeps each screen's
// own code untouched.
const GatedFavoritesScreen: AnyScreen = ({ navigation, ...rest }: any) => (
  <AuthGate navigation={navigation} message="Sign in to view and manage your favorites.">
    <FavoritesScreen navigation={navigation} {...rest} />
  </AuthGate>
);
const GatedWatchPartyScreen: AnyScreen = ({ navigation, ...rest }: any) => (
  <AuthGate navigation={navigation} message="Sign in to create or join a watch party.">
    <WatchPartyScreen navigation={navigation} {...rest} />
  </AuthGate>
);
const GatedFollowersScreen: AnyScreen = ({ navigation, ...rest }: any) => (
  <AuthGate navigation={navigation} message="Sign in to see followers.">
    <FollowersScreen navigation={navigation} {...rest} />
  </AuthGate>
);
const GatedFollowingScreen: AnyScreen = ({ navigation, ...rest }: any) => (
  <AuthGate navigation={navigation} message="Sign in to see who you follow.">
    <FollowingScreen navigation={navigation} {...rest} />
  </AuthGate>
);
const GatedNotificationsScreen: AnyScreen = ({ navigation, ...rest }: any) => (
  <AuthGate navigation={navigation} message="Sign in to view your notifications.">
    <NotificationsScreen navigation={navigation} {...rest} />
  </AuthGate>
);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ── Shared header options ─────────────────────────────────────────────────────
const sharedHeader = {
  headerStyle: { backgroundColor: colors.black },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: 'bold' as const },
};

// ── Player screen (shared across stacks) ─────────────────────────────────────
const playerScreen = (
  <Stack.Screen
    name="Player"
    component={PlayerScreen}
    options={{ headerShown: false, animation: 'fade', presentation: 'fullScreenModal' }}
  />
);

// ── Social screens (shared across stacks) ────────────────────────────────────
// Followers/Following/Notifications/WatchParty are auth-gated — browsing
// stays open, but these user-specific features require sign-in.
// Login/SignUp/ForgotPassword are included here too so the sign-in flow
// (triggered from the Profile tab or from an AuthGate prompt) is reachable
// from every stack, not just Profile.
const socialScreens = (
  <>
    <Stack.Screen name="PublicProfile" component={PublicProfileScreen as AnyScreen} options={{ title: 'Profile' }} />
    <Stack.Screen name="FollowersScreen" component={GatedFollowersScreen} options={{ title: 'Followers' }} />
    <Stack.Screen name="FollowingScreen" component={GatedFollowingScreen} options={{ title: 'Following' }} />
    <Stack.Screen name="NotificationsScreen" component={GatedNotificationsScreen} options={{ title: 'Activity' }} />
    <Stack.Screen name="WatchParty" component={GatedWatchPartyScreen} options={{ title: 'Watch Party', headerShown: false }} />
    <Stack.Screen name="MovieList" component={MovieListScreen as AnyScreen} options={{ title: 'Movies' }} />
    <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
    <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false, animation: 'slide_from_right' }} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: false, animation: 'slide_from_right' }} />
  </>
);

// ── Main stacks ───────────────────────────────────────────────────────────────
const HomeStack = () => (
  <Stack.Navigator screenOptions={{ ...sharedHeader, headerShown: false }}>
    <Stack.Screen name="HomeScreen" component={HomeScreen} />
    <Stack.Screen name="MovieDetails" component={MovieDetailsScreen} options={{ headerShown: true }} />
    {playerScreen}
    {socialScreens}
  </Stack.Navigator>
);

const SearchStack = () => (
  <Stack.Navigator screenOptions={sharedHeader}>
    <Stack.Screen name="SearchScreen" component={SearchScreen} options={{ title: 'Search' }} />
    <Stack.Screen name="MovieDetails" component={MovieDetailsScreen} options={{ title: 'Details' }} />
    {playerScreen}
    {socialScreens}
  </Stack.Navigator>
);

const ContinueWatchingStack = () => (
  <Stack.Navigator screenOptions={sharedHeader}>
    <Stack.Screen name="ContinueWatchingScreen" component={ContinueWatchingScreen} options={{ title: 'Continue Watching' }} />
    <Stack.Screen name="MovieDetails" component={MovieDetailsScreen} options={{ title: 'Details' }} />
    {playerScreen}
    {socialScreens}
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={sharedHeader}>
    <Stack.Screen name="ProfileScreen" component={ProfileScreen} options={{ title: 'Profile' }} />
    <Stack.Screen name="FavoritesScreen" component={GatedFavoritesScreen} options={{ title: 'My Favorites' }} />
    <Stack.Screen name="AchievementsScreen" component={AchievementsScreen} options={{ title: 'Achievements' }} />
    <Stack.Screen name="CinemaQuizScreen" component={CinemaQuizScreen as AnyScreen} options={{ headerShown: false }} />
    <Stack.Screen name="MovieDetails" component={MovieDetailsScreen} options={{ title: 'Details' }} />
    {playerScreen}
    {socialScreens}
    <Stack.Screen name="FamilyModeSettings" component={FamilyModeSettingsScreen} options={{ title: 'Family Mode' }} />
    <Stack.Screen name="FamilyModePin" component={FamilyModePinScreen} options={{ headerShown: false, animation: 'slide_from_bottom' }} />
  </Stack.Navigator>
);

// ── Bottom tab navigator ──────────────────────────────────────────────────────
const BottomTabNavigator = () => {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: '#5a5a5a',
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: 'rgba(212, 175, 55, 0.16)',
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
        },
        tabBarLabelStyle: { fontSize: 12, marginTop: 4, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          title: t('home'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchStack}
        options={{
          title: t('search'),
          tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ContinueWatching"
        component={ContinueWatchingStack}
        options={{
          title: t('continue_watching'),
          tabBarIcon: ({ color, size }) => <Ionicons name="play-circle" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          title: t('profile'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

// ── Root navigator ────────────────────────────────────────────────────────────
/**
 * Navigation flow:
 *  - Splash shows until its own animation completes.
 *  - After splash: always go straight to MainApp (Home) — browsing never
 *    requires sign-in. Auth only happens from the Profile tab (see
 *    ProfileSignInPrompt) or from an AuthGate prompt on a protected screen
 *    (Favorites, Watch Party, Followers/Following, Notifications).
 *  - We still wait for Firebase's initial auth check (isLoading) before
 *    leaving the splash so Profile/AuthGate don't flash a "signed out" state
 *    for a returning, already-authenticated user.
 */
const RootNavigator = () => {
  const { isLoading } = useAuth();
  const [splashComplete, setSplashComplete] = useState(false);

  // Stable callback — prevents SplashScreen's useEffect from resetting the
  // ~2.53 s timer every time isLoading changes cause a parent re-render.
  const handleSplashComplete = useCallback(() => setSplashComplete(true), []);

  // Stay on splash while the animation is running OR while Firebase is resolving auth
  const showSplash = !splashComplete || isLoading;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {showSplash ? (
        <Stack.Screen name="Splash">
          {() => <SplashScreen onComplete={handleSplashComplete} />}
        </Stack.Screen>
      ) : (
        <Stack.Screen name="MainApp" component={BottomTabNavigator} />
      )}
    </Stack.Navigator>
  );
};

// ── Navigation root ───────────────────────────────────────────────────────────
const Navigation = () => (
  <NavigationContainer>
    <RootNavigator />
  </NavigationContainer>
);

export default Navigation;
