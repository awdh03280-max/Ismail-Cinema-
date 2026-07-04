import React from 'react';
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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Shared header options
const sharedHeader = {
  headerStyle: { backgroundColor: '#0a0e27' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: 'bold' as const },
};

// Player screen — always full-screen, no header
const playerScreen = (
  <Stack.Screen
    name="Player"
    component={PlayerScreen}
    options={{
      headerShown: false,
      animation: 'fade',
      presentation: 'fullScreenModal',
    }}
  />
);

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ ...sharedHeader, headerShown: false }}>
    <Stack.Screen name="HomeScreen" component={HomeScreen} />
    <Stack.Screen
      name="MovieDetails"
      component={MovieDetailsScreen}
      options={{ headerShown: true }}
    />
    {playerScreen}
  </Stack.Navigator>
);

const SearchStack = () => (
  <Stack.Navigator screenOptions={sharedHeader}>
    <Stack.Screen
      name="SearchScreen"
      component={SearchScreen}
      options={{ title: 'Search' }}
    />
    <Stack.Screen
      name="MovieDetails"
      component={MovieDetailsScreen}
      options={{ title: 'Details' }}
    />
    {playerScreen}
  </Stack.Navigator>
);

const FavoritesStack = () => (
  <Stack.Navigator screenOptions={sharedHeader}>
    <Stack.Screen
      name="FavoritesScreen"
      component={FavoritesScreen}
      options={{ title: 'Favorites' }}
    />
    <Stack.Screen
      name="MovieDetails"
      component={MovieDetailsScreen}
      options={{ title: 'Details' }}
    />
    {playerScreen}
  </Stack.Navigator>
);

const ContinueWatchingStack = () => (
  <Stack.Navigator screenOptions={sharedHeader}>
    <Stack.Screen
      name="ContinueWatchingScreen"
      component={ContinueWatchingScreen}
      options={{ title: 'Continue Watching' }}
    />
    <Stack.Screen
      name="MovieDetails"
      component={MovieDetailsScreen}
      options={{ title: 'Details' }}
    />
    {playerScreen}
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={sharedHeader}>
    <Stack.Screen
      name="ProfileScreen"
      component={ProfileScreen}
      options={{ title: 'Profile' }}
    />
    <Stack.Screen
      name="FamilyModeSettings"
      component={FamilyModeSettingsScreen}
      options={{ title: 'Family Mode', headerShown: true }}
    />
    <Stack.Screen
      name="FamilyModePin"
      component={FamilyModePinScreen}
      options={{ headerShown: false, animation: 'slide_from_bottom' }}
    />
  </Stack.Navigator>
);

const BottomTabNavigator = () => {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#e50914',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#1a1a1a',
          borderTopColor: '#333',
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          title: t('home'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchStack}
        options={{
          title: t('search'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesStack}
        options={{
          title: t('favorites'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ContinueWatching"
        component={ContinueWatchingStack}
        options={{
          title: t('continue_watching'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="play-circle" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          title: t('profile'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const RootNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Splash" component={SplashScreen} />
    <Stack.Screen name="MainApp" component={BottomTabNavigator} />
  </Stack.Navigator>
);

const Navigation = () => (
  <NavigationContainer>
    <RootNavigator />
  </NavigationContainer>
);

export default Navigation;
