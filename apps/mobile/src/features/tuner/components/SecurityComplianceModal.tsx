import React, { useState } from "react";
import { View, Modal, TouchableOpacity, ScrollView, Platform } from "react-native";
import { useTheme } from "../../../theme/ThemeProvider";
import { AppSurface } from "../../../components/common/AppSurface";
import { AppText } from "../../../components/common/AppText";
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SecurityComplianceModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SecurityComplianceModal: React.FC<SecurityComplianceModalProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(10,12,24,0.60)' }}>
        <TouchableOpacity className="flex-1" onPress={onClose} activeOpacity={1} />
        
        <AppSurface 
          level="elevated"
          className="w-full pt-4 rounded-t-3xl border-t border-x"
          style={{ 
            backgroundColor: theme.colors.surface,
            paddingBottom: Math.max(insets.bottom, 24),
            maxHeight: '90%',
            borderColor: theme.colors.border,
          }}
        >
          {/* Header */}
          <View 
            className="flex-row items-center justify-between px-6 pb-4 border-b"
            style={{ borderColor: theme.colors.border }}
          >
            <View className="flex-row items-center">
              <Feather name="shield" size={22} color={theme.colors.text} style={{ marginRight: 10 }} />
              <AppText variant="heading" className="font-bold text-xl">Privacy & Security</AppText>
            </View>
            <TouchableOpacity 
              onPress={onClose} 
              className="p-2 rounded-full"
              style={{ backgroundColor: theme.colors.surfaceRaised }}
            >
              <Feather name="x" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView className="px-6 py-4" showsVerticalScrollIndicator={false}>
            {/* Section 1: Local Processing */}
            <View className="mb-6">
              <View className="flex-row items-center mb-2">
                <AppSurface 
                  level="base" 
                  className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                  style={{ backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border }}
                >
                  <Feather name="cpu" size={20} color={theme.colors.text} />
                </AppSurface>
                <AppText variant="body" className="font-bold text-lg">100% Local Processing</AppText>
              </View>
              <AppText variant="body" color="secondary" className="leading-6 ml-13">
                Your audio never leaves your device. We use highly optimized local algorithms to process the microphone input in real-time. No servers, no cloud storage, no tracking.
              </AppText>
            </View>

            {/* Section 2: Microphone Permission */}
            <View className="mb-6">
              <View className="flex-row items-center mb-2">
                <AppSurface 
                  level="base" 
                  className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                  style={{ backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border }}
                >
                  <Feather name="mic" size={20} color={theme.colors.text} />
                </AppSurface>
                <AppText variant="body" className="font-bold text-lg">Microphone Permission</AppText>
              </View>
              <AppText variant="body" color="secondary" className="leading-6 ml-13">
                To tune your instrument, the app needs to "hear" the pitch. The microphone permission is strictly used to capture the frequency of your guitar strings.
              </AppText>
            </View>

            {/* Section 3: Zero Data Collection */}
            <View className="mb-6">
              <View className="flex-row items-center mb-2">
                <AppSurface 
                  level="base" 
                  className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                  style={{ backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border }}
                >
                  <Feather name="lock" size={20} color={theme.colors.text} />
                </AppSurface>
                <AppText variant="body" className="font-bold text-lg">Zero Data Collection</AppText>
              </View>
              <AppText variant="body" color="secondary" className="leading-6 ml-13">
                We do not collect any personal data, audio recordings, or usage metrics. This app is designed to be fully functional completely offline.
              </AppText>
            </View>
            
            {/* Disclaimer */}
            <AppSurface level="base" className="p-4 rounded-xl mt-2 mb-8" style={{ backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border }}>
              <AppText variant="caption" color="muted" className="text-center leading-5">
                Local-only microphone access purely for real-time acoustic pitch detection. Standard OS sandboxing & privacy permissions apply.
              </AppText>
            </AppSurface>

          </ScrollView>
        </AppSurface>
      </View>
    </Modal>
  );
};
