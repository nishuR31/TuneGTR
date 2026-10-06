import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { TunerScreen } from '../screens/TunerScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { MonitorScreen } from '../screens/MonitorScreen';
import { useTunerStore } from '../features/tuner/store/tunerStore';
import { useTheme } from '../theme/ThemeProvider';
import Feather from '@expo/vector-icons/Feather';

const Tab = createBottomTabNavigator();

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tabBar,
        {
          bottom: Math.max(8, insets.bottom + 4),
          borderColor: theme.colors.border,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const label =
          options.tabBarLabel !== undefined
            ? (options.tabBarLabel as string)
            : options.title !== undefined
            ? options.title
            : route.name;

        const iconName: keyof typeof Feather.glyphMap =
          route.name === 'Tuner'
            ? 'mic'
            : route.name === 'Monitor'
            ? 'activity'
            : 'settings';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={`${label} Tab`}
            accessibilityHint={`Switches to the ${label} screen`}
            onPress={onPress}
            onLongPress={onLongPress}
            style={[
              styles.tabBtn,
              {
                borderColor: isFocused ? theme.colors.accent : 'rgba(255, 255, 255, 0.12)',
                backgroundColor: isFocused
                  ? 'rgba(99, 102, 241, 0.28)'
                  : 'rgba(255, 255, 255, 0.06)',
              },
            ]}
          >
            <Feather
              name={iconName}
              size={18}
              color={isFocused ? '#FFFFFF' : '#CBD5E1'}
            />
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isFocused ? '#FFFFFF' : '#CBD5E1',
                  fontWeight: isFocused ? '800' : '700',
                },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function MainNavigator() {
  const theme = useTheme();
  const isTesterModeUnlocked = useTunerStore((s) => s.isTesterModeUnlocked);

  return (
    <NavigationContainer>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: {
            backgroundColor: theme.colors.background,
            flex: 1,
            overflow: 'hidden',
          },
        }}
      >
        <Tab.Screen
          name="Tuner"
          component={TunerScreen}
          options={{ title: 'Tuner' }}
        />

        {isTesterModeUnlocked && (
          <Tab.Screen
            name="Monitor"
            component={MonitorScreen}
            options={{ title: 'Monitor' }}
          />
        )}

        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(11, 16, 32, 0.96)',
    borderWidth: 1.5,
    elevation: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    height: 64,
    paddingHorizontal: 8,
    paddingVertical: 6,
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 100,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        } as any)
      : {}),
  },
  tabBtn: {
    flex: 1,
    minWidth: 0,
    height: 48,
    marginHorizontal: 4,
    borderRadius: 20,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  tabLabel: {
    fontSize: 13,
    includeFontPadding: false,
    letterSpacing: 0.3,
  },
});
