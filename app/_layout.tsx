import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../src/constants/theme';
import { memoryService } from '../src/services/MemoryService';

// Safe bottom padding that clears system navigation on all Android devices
const TAB_BAR_BOTTOM = Platform.OS === 'android' ? 16 : 24;
const TAB_BAR_HEIGHT = 60 + TAB_BAR_BOTTOM;

export default function AppLayout() {
  // Initialize persistent memory on app start
  useEffect(() => {
    memoryService.initialize().catch(() => {
      // Non-fatal: app works without persistent memory
      console.warn('[MemoryService] Init failed, running without persistence');
    });
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0a0a1a',
            elevation: 8,
            shadowOpacity: 0.2,
            shadowColor: '#000',
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(108, 99, 255, 0.2)',
          },
          headerTintColor: Colors.text,
          headerTitleStyle: {
            fontWeight: '700',
            letterSpacing: 0.5,
          },
          tabBarStyle: {
            backgroundColor: '#0a0a1a',
            borderTopColor: 'rgba(108, 99, 255, 0.3)',
            borderTopWidth: 1,
            height: TAB_BAR_HEIGHT,
            paddingBottom: TAB_BAR_BOTTOM,
            paddingTop: 6,
            elevation: 15,
            shadowColor: '#6c63ff',
            shadowOpacity: 0.2,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: -4 },
          },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.3,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Connect',
            headerTitle: 'Variable Claw',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'bluetooth' : 'bluetooth-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="voice"
          options={{
            title: 'Voice',
            headerTitle: 'Voice Control',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'mic' : 'mic-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="remote"
          options={{
            title: 'Remote',
            headerTitle: 'Quick Actions',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'game-controller' : 'game-controller-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            headerTitle: 'Settings',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'settings' : 'settings-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
