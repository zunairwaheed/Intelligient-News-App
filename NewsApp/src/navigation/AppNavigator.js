import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import HomeScreen from '../screens/news/HomeScreen';
import NewsDetailScreen from '../screens/news/NewsDetailScreen';
import SubmitNewsScreen from '../screens/news/SubmitNewsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import ChangeLocationScreen from '../screens/profile/ChangeLocationScreen';
import AdminReviewScreen from '../screens/news/AdminReviewScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const COLORS = { primary: '#1a73e8', gray: '#888' };

function HomeTabs() {
  const { user } = useAuth();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#e0e0e0' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Home: focused ? 'newspaper' : 'newspaper-outline',
            Submit: focused ? 'add-circle' : 'add-circle-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'News' }} />
      <Tab.Screen
        name="Submit"
        component={SubmitNewsScreen}
        options={{ tabBarLabel: 'Submit' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (!user) {
              e.preventDefault();
              navigation.navigate('Login', { redirectTo: 'Submit' });
            }
          },
        })}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (!user) {
              e.preventDefault();
              navigation.navigate('Login', { redirectTo: 'Profile' });
            }
          },
        })}
      />
    </Tab.Navigator>
  );
}

function RootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={HomeTabs} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="NewsDetail" component={NewsDetailScreen} />
      <Stack.Screen name="ChangeLocation" component={ChangeLocationScreen} />
      <Stack.Screen name="AdminReview" component={AdminReviewScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { loading } = useAuth();

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: '#050a14' }} />;
  }

  return (
    <NavigationContainer>
      <RootStack />
    </NavigationContainer>
  );
}
