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
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

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
// ComponentType<any> because these screens use a loose `navigation: any` prop.
// Full param-list types can be added per-screen in a future refactor.
type AnyScreen = React.ComponentType<any>;

const socialScreens = (
  <>
    <Stack.Screen name="PublicProfile" component={PublicProfileScreen as AnyScreen} options={{ title: 'Profile' }} />
    <Stack.Screen name="FollowersScreen" component={FollowersScreen as AnyScreen} options={{ title: 'Followers' }} />
    <Stack.Screen name="FollowingScreen" component={FollowingScreen as AnyScreen} options={{ title: 'Following' }} />
    <Stack.Screen name="NotificationsScreen" component={NotificationsScreen as AnyScreen} options={{ title: 'Activity' }} />
    <Stack.Screen name="WatchParty" component={WatchPartyScreen as AnyScreen} options={{ title: 'Watch Party', headerShown: false }} />
    <Stack.Screen name="MovieList" component={MovieListScreen as AnyScreen} options={{ title: 'Movies' }} />
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
    <Stack.Screen name="FavoritesScreen" component={FavoritesScreen} options={{ title: 'My Favorites' }} />
    <Stack.Screen name="AchievementsScreen" component={AchievementsScreen} options={{ title: 'Achievements' }} />
    <Stack.Screen name="CinemaQuizScreen" component={CinemaQuizScreen as AnyScreen} options={{ headerShown: false }} />
    <Stack.Screen name="MovieDetails" component={MovieDetailsScreen} options={{ title: 'Details' }} />
    {playerScreen}
    {socialScreens}
    <Stack.Screen name="FamilyModeSettings" component={FamilyModeSettingsScreen} options={{ title: 'Family Mode' }} />
    <Stack.Screen name="FamilyModePin" component={FamilyModePinScreen} options={{ headerShown: false, animation: 'slide_from_bottom' }} />
  </Stack.Navigator>
);

// ── Auth stack ────────────────────────────────────────────────────────────────
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="SignUp" component={SignUpScreen} options={{ animation: 'slide_from_right' }} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ animation: 'slide_from_right' }} />
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

// ── Root navigator — auth-aware ───────────────────────────────────────────────
/**
 * Auth flow (React Navigation recommended pattern):
 *  - Splash shows until animation completes AND Firebase auth has resolved
 *  - After splash: show MainApp (authenticated) or AuthStack (not authenticated)
 *  - On logout: `user` becomes null → React Navigation switches to AuthStack automatically
 *  - On login: `user` is set → MainApp appears automatically
 */
const RootNavigator = () => {
  const { user, isLoading } = useAuth();
  const [splashComplete, setSplashComplete] = useState(false);

  // Stable callback — prevents SplashScreen's useEffect from resetting the
  // ~2.53 s timer every time isLoading / user changes cause a parent re-render.
  const handleSplashComplete = useCallback(() => setSplashComplete(true), []);

  // Stay on splash while the animation is running OR while Firebase is resolving auth
  const showSplash = !splashComplete || isLoading;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {showSplash ? (
        <Stack.Screen name="Splash">
          {() => <SplashScreen onComplete={handleSplashComplete} />}
        </Stack.Screen>
      ) : user !== null ? (
        <Stack.Screen name="MainApp" component={BottomTabNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
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
