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
  
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme.mode === 'light' ? theme.colors.background : '#151A28',
            borderTopWidth: 0,
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
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
