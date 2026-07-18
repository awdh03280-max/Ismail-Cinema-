import React, { useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
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
import DownloadsScreen from '../screens/DownloadsScreen';
import ActorProfileScreen from '../screens/ActorProfileScreen';
import CollectionScreen from '../screens/CollectionScreen';
import SeriesCollectionScreen from '../screens/SeriesCollectionScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import AuthGate from '../components/AuthGate';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

type AnyScreen = React.ComponentType<any>;

// ── Auth-gated screen wrappers ─────────────────────────────────────────────
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

// ── Shared header options ──────────────────────────────────────────────────
const sharedHeader = {
  headerStyle: { backgroundColor: colors.black },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: 'bold' as const },
};

// ── Main stacks ────────────────────────────────────────────────────────────
// All Stack.Screen children are direct elements — no wrapper components or
// shared JSX variables. This is required for React Navigation's native stack
// renderer on Android, which cannot unwrap component-wrapped screens.

const HomeStack = () => {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ ...sharedHeader, headerShown: false }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen
        name="MovieDetails"
        component={MovieDetailsScreen}
        options={{ title: t('nav_details'), headerShown: true }}
      />
      <Stack.Screen
        name="ActorProfile"
        component={ActorProfileScreen as AnyScreen}
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="PublicProfile"
        component={PublicProfileScreen as AnyScreen}
        options={{ title: t('profile') }}
      />
      <Stack.Screen
        name="FollowersScreen"
        component={GatedFollowersScreen}
        options={{ title: t('nav_followers') }}
      />
      <Stack.Screen
        name="FollowingScreen"
        component={GatedFollowingScreen}
        options={{ title: t('nav_following') }}
      />
      <Stack.Screen
        name="NotificationsScreen"
        component={GatedNotificationsScreen}
        options={{ title: t('nav_activity') }}
      />
      <Stack.Screen
        name="WatchParty"
        component={GatedWatchPartyScreen}
        options={{ title: t('nav_watch_party'), headerShown: false }}
      />
      <Stack.Screen
        name="MovieList"
        component={MovieListScreen as AnyScreen}
        options={{ title: t('nav_movies') }}
      />
      <Stack.Screen
        name="Collection"
        component={CollectionScreen as AnyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SeriesCollection"
        component={SeriesCollectionScreen as AnyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
};

const SearchStack = () => {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={sharedHeader}>
      <Stack.Screen
        name="SearchScreen"
        component={SearchScreen}
        options={{ title: t('search') }}
      />
      <Stack.Screen
        name="MovieDetails"
        component={MovieDetailsScreen}
        options={{ title: t('nav_details') }}
      />
      <Stack.Screen
        name="ActorProfile"
        component={ActorProfileScreen as AnyScreen}
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="PublicProfile"
        component={PublicProfileScreen as AnyScreen}
        options={{ title: t('profile') }}
      />
      <Stack.Screen
        name="FollowersScreen"
        component={GatedFollowersScreen}
        options={{ title: t('nav_followers') }}
      />
      <Stack.Screen
        name="FollowingScreen"
        component={GatedFollowingScreen}
        options={{ title: t('nav_following') }}
      />
      <Stack.Screen
        name="NotificationsScreen"
        component={GatedNotificationsScreen}
        options={{ title: t('nav_activity') }}
      />
      <Stack.Screen
        name="WatchParty"
        component={GatedWatchPartyScreen}
        options={{ title: t('nav_watch_party'), headerShown: false }}
      />
      <Stack.Screen
        name="MovieList"
        component={MovieListScreen as AnyScreen}
        options={{ title: t('nav_movies') }}
      />
      <Stack.Screen
        name="Collection"
        component={CollectionScreen as AnyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SeriesCollection"
        component={SeriesCollectionScreen as AnyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
};

const DownloadsStack = () => {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={sharedHeader}>
      <Stack.Screen
        name="DownloadsScreen"
        component={DownloadsScreen}
        options={{ title: t('downloads') }}
      />
      <Stack.Screen
        name="MovieDetails"
        component={MovieDetailsScreen}
        options={{ title: t('nav_details') }}
      />
      <Stack.Screen
        name="ActorProfile"
        component={ActorProfileScreen as AnyScreen}
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="PublicProfile"
        component={PublicProfileScreen as AnyScreen}
        options={{ title: t('profile') }}
      />
      <Stack.Screen
        name="FollowersScreen"
        component={GatedFollowersScreen}
        options={{ title: t('nav_followers') }}
      />
      <Stack.Screen
        name="FollowingScreen"
        component={GatedFollowingScreen}
        options={{ title: t('nav_following') }}
      />
      <Stack.Screen
        name="NotificationsScreen"
        component={GatedNotificationsScreen}
        options={{ title: t('nav_activity') }}
      />
      <Stack.Screen
        name="WatchParty"
        component={GatedWatchPartyScreen}
        options={{ title: t('nav_watch_party'), headerShown: false }}
      />
      <Stack.Screen
        name="MovieList"
        component={MovieListScreen as AnyScreen}
        options={{ title: t('nav_movies') }}
      />
      <Stack.Screen
        name="Collection"
        component={CollectionScreen as AnyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SeriesCollection"
        component={SeriesCollectionScreen as AnyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
};

const ProfileStack = () => {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={sharedHeader}>
      <Stack.Screen
        name="ProfileScreen"
        component={ProfileScreen}
        options={{ title: t('profile') }}
      />
      <Stack.Screen
        name="FavoritesScreen"
        component={GatedFavoritesScreen}
        options={{ title: t('nav_my_favorites') }}
      />
      <Stack.Screen
        name="AchievementsScreen"
        component={AchievementsScreen}
        options={{ title: t('nav_achievements') }}
      />
      <Stack.Screen
        name="CinemaQuizScreen"
        component={CinemaQuizScreen as AnyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MovieDetails"
        component={MovieDetailsScreen}
        options={{ title: t('nav_details') }}
      />
      <Stack.Screen
        name="ActorProfile"
        component={ActorProfileScreen as AnyScreen}
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="PublicProfile"
        component={PublicProfileScreen as AnyScreen}
        options={{ title: t('profile') }}
      />
      <Stack.Screen
        name="FollowersScreen"
        component={GatedFollowersScreen}
        options={{ title: t('nav_followers') }}
      />
      <Stack.Screen
        name="FollowingScreen"
        component={GatedFollowingScreen}
        options={{ title: t('nav_following') }}
      />
      <Stack.Screen
        name="NotificationsScreen"
        component={GatedNotificationsScreen}
        options={{ title: t('nav_activity') }}
      />
      <Stack.Screen
        name="WatchParty"
        component={GatedWatchPartyScreen}
        options={{ title: t('nav_watch_party'), headerShown: false }}
      />
      <Stack.Screen
        name="MovieList"
        component={MovieListScreen as AnyScreen}
        options={{ title: t('nav_movies') }}
      />
      <Stack.Screen
        name="Collection"
        component={CollectionScreen as AnyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SeriesCollection"
        component={SeriesCollectionScreen as AnyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="FamilyModeSettings"
        component={FamilyModeSettingsScreen}
        options={{ title: t('nav_family_mode') }}
      />
      <Stack.Screen
        name="FamilyModePin"
        component={FamilyModePinScreen}
        options={{ headerShown: false, animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
};

// ── Bottom tab navigator ───────────────────────────────────────────────────
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
        name="Downloads"
        component={DownloadsStack}
        options={{
          title: t('downloads'),
          tabBarIcon: ({ color, size }) => <Ionicons name="download" size={size} color={color} />,
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

// ── Root navigator ─────────────────────────────────────────────────────────
// PlayerScreen lives here (outside BottomTabNavigator) so the tab bar is
// completely hidden during playback and the screen is truly full-screen.
// React Navigation traverses up the navigator tree when navigate('Player', …)
// is called from any sub-stack, so no changes are needed in child screens.
const RootNavigator = () => {
  const { isLoading } = useAuth();
  const [splashComplete, setSplashComplete] = useState(false);

  const handleSplashComplete = useCallback(() => setSplashComplete(true), []);

  const showSplash = !splashComplete || isLoading;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {showSplash ? (
        <Stack.Screen name="Splash">
          {() => <SplashScreen onComplete={handleSplashComplete} />}
        </Stack.Screen>
      ) : (
        <>
          <Stack.Screen name="MainApp" component={BottomTabNavigator} />
          <Stack.Screen
            name="Player"
            component={PlayerScreen}
            options={{
              headerShown: false,
              animation: 'fade',
              presentation: 'fullScreenModal',
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

// ── Navigation root ────────────────────────────────────────────────────────
const Navigation = () => (
  <NavigationContainer>
    <RootNavigator />
  </NavigationContainer>
);

export default Navigation;
