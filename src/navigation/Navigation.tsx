import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ContinueWatchingScreen from '../screens/ContinueWatchingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MovieDetailsScreen from '../screens/MovieDetailsScreen';
import SplashScreen from '../screens/SplashScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const HomeStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#0a0e27' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' },
      headerShown: false,
    }}
  >
    <Stack.Screen name="HomeScreen" component={HomeScreen} />
    <Stack.Screen name="MovieDetails" component={MovieDetailsScreen} options={{ headerShown: true }} />
  </Stack.Navigator>
);

const SearchStack = () => (
  <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#0a0e27' }, headerTintColor: '#fff' }}>
    <Stack.Screen name="SearchScreen" component={SearchScreen} options={{ title: 'Search' }} />
    <Stack.Screen name="MovieDetails" component={MovieDetailsScreen} options={{ title: 'Details' }} />
  </Stack.Navigator>
);

const FavoritesStack = () => (
  <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#0a0e27' }, headerTintColor: '#fff' }}>
    <Stack.Screen name="FavoritesScreen" component={FavoritesScreen} options={{ title: 'Favorites' }} />
    <Stack.Screen name="MovieDetails" component={MovieDetailsScreen} options={{ title: 'Details' }} />
  </Stack.Navigator>
);

const ContinueWatchingStack = () => (
  <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#0a0e27' }, headerTintColor: '#fff' }}>
    <Stack.Screen name="ContinueWatchingScreen" component={ContinueWatchingScreen} options={{ title: 'Continue Watching' }} />
    <Stack.Screen name="MovieDetails" component={MovieDetailsScreen} options={{ title: 'Details' }} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#0a0e27' }, headerTintColor: '#fff' }}>
    <Stack.Screen name="ProfileScreen" component={ProfileScreen} options={{ title: 'Profile' }} />
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
        tabBarLabelStyle: { fontSize: 12, marginTop: 4 },
        tabBarIcon: ({ color, size }) => {
          let iconName = 'home';
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
      }}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ title: t('home'), tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }} />
      <Tab.Screen name="Search" component={SearchStack} options={{ title: t('search'), tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} /> }} />
      <Tab.Screen name="Favorites" component={FavoritesStack} options={{ title: t('favorites'), tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size} color={color} /> }} />
      <Tab.Screen name="ContinueWatching" component={ContinueWatchingStack} options={{ title: t('continue_watching'), tabBarIcon: ({ color, size }) => <Ionicons name="play-circle" size={size} color={color} /> }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ title: t('profile'), tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} /> }} />
    </Tab.Navigator>
  );
};

const RootNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: '#0a0e27' } }}>
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
