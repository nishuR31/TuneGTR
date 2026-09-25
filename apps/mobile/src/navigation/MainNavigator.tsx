import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { TunerScreen } from '../screens/TunerScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useTheme } from '../theme/ThemeProvider';
import { StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

const Tab = createBottomTabNavigator();

/**
 * Main tab navigator — full claymorphism tab bar.
 * Opaque solid surface, clay elevation shadow, rounded pill shape.
 */
export function MainNavigator() {
  const theme = useTheme();

  // Clay tab bar: solid opaque surface with clay shadow
  const tabBg = theme.mode === 'light' ? theme.colors.surface : theme.colors.surfaceRaised;
  const tabShadowOpacity = theme.mode === 'light' ? 0.10 : 0.30;

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: tabBg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            elevation: 10,
            shadowColor: theme.mode === 'light' ? '#252B3A' : '#000000',
            shadowOffset: { width: 2, height: 6 },
            shadowOpacity: tabShadowOpacity,
            shadowRadius: 18,
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
