import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import i18n from './localization/i18n';

// Screens
import HomeScreen from './screens/HomeScreen';
import SearchScreen from './screens/SearchScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import ContinueWatchingScreen from './screens/ContinueWatchingScreen';
import MovieDetailsScreen from './screens/MovieDetailsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

SplashScreen.preventAutoHideAsync();

const HomeStackNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: '#0a0e27' },
    }}
  >
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="MovieDetails" component={MovieDetailsScreen} />
  </Stack.Navigator>
);

const SearchStackNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: '#0a0e27' },
    }}
  >
    <Stack.Screen name="SearchHome" component={SearchScreen} />
    <Stack.Screen name="MovieDetails" component={MovieDetailsScreen} />
  </Stack.Navigator>
);

const FavoritesStackNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: '#0a0e27' },
    }}
  >
    <Stack.Screen name="FavoritesHome" component={FavoritesScreen} />
    <Stack.Screen name="MovieDetails" component={MovieDetailsScreen} />
  </Stack.Navigator>
);

const ContinueWatchingStackNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: '#0a0e27' },
    }}
  >
    <Stack.Screen name="ContinueHome" component={ContinueWatchingScreen} />
    <Stack.Screen name="MovieDetails" component={MovieDetailsScreen} />
  </Stack.Navigator>
);

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: any;
        if (route.name === 'HomeStack') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'SearchStack') {
          iconName = focused ? 'search' : 'search-outline';
        } else if (route.name === 'FavoritesStack') {
          iconName = focused ? 'heart' : 'heart-outline';
        } else if (route.name === 'ContinueWatchingStack') {
          iconName = focused ? 'play-circle' : 'play-circle-outline';
        }
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#e50914',
      tabBarInactiveTintColor: '#666',
      tabBarStyle: {
        backgroundColor: '#0a0e27',
        borderTopColor: '#1a1a2e',
        paddingTop: 8,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        marginTop: -4,
      },
    })}
  >
    <Tab.Screen
      name="HomeStack"
      component={HomeStackNavigator}
      options={{ title: 'Home' }}
    />
    <Tab.Screen
      name="SearchStack"
      component={SearchStackNavigator}
      options={{ title: 'Search' }}
    />
    <Tab.Screen
      name="FavoritesStack"
      component={FavoritesStackNavigator}
      options={{ title: 'Favorites' }}
    />
    <Tab.Screen
      name="ContinueWatchingStack"
      component={ContinueWatchingStackNavigator}
      options={{ title: 'Continue' }}
    />
  </Tab.Navigator>
);

const App = () => {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await i18n.init();
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        await SplashScreen.hideAsync();
      }
    };
    initializeApp();
  }, []);

  return (
    <NavigationContainer>
      <TabNavigator />
    </NavigationContainer>
  );
};

export default App;
