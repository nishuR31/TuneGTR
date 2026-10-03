import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { TunerScreen } from '../screens/TunerScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { MonitorScreen } from '../screens/MonitorScreen';
import { useTunerStore } from '../features/tuner/store/tunerStore';
import { useTheme } from '../theme/ThemeProvider';
import Feather from '@expo/vector-icons/Feather';

const Tab = createBottomTabNavigator();

interface CustomTabButtonProps {
  children?: React.ReactNode;
  onPress?: (e: any) => void;
  accessibilityState?: { selected?: boolean };
  icon: keyof typeof Feather.glyphMap;
  label: string;
}

const CustomTabButton: React.FC<CustomTabButtonProps> = ({
  onPress,
  accessibilityState,
  icon,
  label,
}) => {
  const theme = useTheme();
  const isSelected = !!accessibilityState?.selected;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={accessibilityState}
      accessibilityLabel={`${label} Tab`}
      accessibilityHint={`Switches to the ${label} screen`}
      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
      style={[
        styles.tabBtn,
        {
          borderColor: isSelected ? theme.colors.accent : 'transparent',
          backgroundColor: isSelected
            ? theme.mode === 'dark'
              ? 'rgba(99, 102, 241, 0.20)'
              : 'rgba(79, 70, 229, 0.12)'
            : 'transparent',
        },
      ]}
    >
      <Feather
        name={icon}
        size={19}
        color={isSelected ? theme.colors.accent : theme.colors.textMuted}
      />
      <Text
        style={[
          styles.tabLabel,
          {
            color: isSelected ? theme.colors.text : theme.colors.textMuted,
            fontWeight: isSelected ? '800' : '600',
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

export function MainNavigator() {
  const theme = useTheme();
  const isTesterModeUnlocked = useTunerStore((s) => s.isTesterModeUnlocked);

  return (
    <NavigationContainer>
      <Tab.Navigator
        detachInactiveScreens={true}
        screenOptions={{
          headerShown: false,
          sceneStyle: {
            backgroundColor: theme.colors.background,
            flex: 1,
            overflow: 'hidden',
          },
          tabBarStyle: {
            backgroundColor: theme.mode === 'dark' ? 'rgba(15, 20, 36, 0.88)' : 'rgba(255, 255, 255, 0.92)',
            borderWidth: 1.2,
            borderColor: theme.colors.border,
            elevation: 12,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: theme.mode === 'dark' ? 0.38 : 0.12,
            shadowRadius: 20,
            height: 68,
            paddingBottom: 0,
            paddingTop: 0,
            position: 'absolute',
            bottom: 18,
            left: 18,
            right: 18,
            borderRadius: 28,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-around',
            ...(Platform.OS === 'web'
              ? ({
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                } as any)
              : {}),
          },
        }}
      >
        <Tab.Screen
          name="Tuner"
          component={TunerScreen}
          options={{
            tabBarButton: (props) => (
              <CustomTabButton {...props} icon="mic" label="Tuner" />
            ),
          }}
        />

        {isTesterModeUnlocked && (
          <Tab.Screen
            name="Monitor"
            component={MonitorScreen}
            options={{
              tabBarButton: (props) => (
                <CustomTabButton {...props} icon="activity" label="Monitor" />
              ),
            }}
          />
        )}

        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarButton: (props) => (
              <CustomTabButton {...props} icon="settings" label="Settings" />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBtn: {
    flex: 1,
    height: 48,
    marginHorizontal: 4,
    marginVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  tabLabel: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
