import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { TunerScreen } from '../screens/TunerScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useTheme } from '../theme/ThemeProvider';
import { View, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

const Tab = createBottomTabNavigator();

export function MainNavigator() {
  const theme = useTheme();
  
  const isGlass = theme.base === 'glass';
  const tabBg = isGlass 
    ? (theme.mode === 'dark' ? 'rgba(21, 26, 40, 0.75)' : 'rgba(255, 255, 255, 0.75)')
    : (theme.mode === 'light' ? theme.colors.surface : theme.colors.surfaceRaised);

  const tabBorder = isGlass
    ? (theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.08)')
    : theme.colors.border;

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: tabBg,
            borderWidth: 1,
            borderColor: tabBorder,
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: theme.mode === 'light' ? 0.08 : 0.25,
            shadowRadius: 16,
            height: 64,
            paddingBottom: 0,
            paddingTop: 0,
            position: 'absolute',
            bottom: 24,
            left: 20,
            right: 20,
            borderRadius: 32,
          },
          tabBarActiveTintColor: theme.colors.accent,
          tabBarInactiveTintColor: theme.colors.textMuted,
          tabBarActiveBackgroundColor: theme.colors.accentSoft,
          tabBarItemStyle: {
            borderRadius: 24,
            marginHorizontal: 12,
            marginVertical: 8,
          },
        }}
      >
        <Tab.Screen 
          name="Tuner" 
          component={TunerScreen} 
          options={{
            tabBarIcon: ({ color, size }) => (
              <Feather name="mic" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Settings" 
          component={SettingsScreen} 
          options={{
            tabBarIcon: ({ color, size }) => (
              <Feather name="settings" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    opacity: 0.8,
  }
});
