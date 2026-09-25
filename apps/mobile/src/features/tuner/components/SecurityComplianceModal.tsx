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
      <View className="flex-1 bg-black/50 justify-end">
        <TouchableOpacity className="flex-1" onPress={onClose} activeOpacity={1} />
        
        <View 
          className="w-full pt-4 rounded-t-3xl"
          style={{ 
            backgroundColor: theme.colors.background,
            paddingBottom: Math.max(insets.bottom, 24),
            maxHeight: '90%'
          }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 pb-4 border-b border-gray-200 dark:border-gray-800">
            <AppText variant="heading" className="font-bold text-xl">Privacy & Security</AppText>
            <TouchableOpacity onPress={onClose} className="p-2 -mr-2 bg-gray-100 dark:bg-gray-800 rounded-full">
              <Feather name="x" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView className="px-6 py-4" showsVerticalScrollIndicator={false}>
            {/* Section 1: Local Processing */}
            <View className="mb-6">
              <View className="flex-row items-center mb-2">
                <View className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 items-center justify-center mr-3">
                  <Feather name="shield" size={20} color={theme.colors.success} />
                </View>
                <AppText variant="body" className="font-bold text-lg">100% Local Processing</AppText>
              </View>
              <AppText variant="body" color="secondary" className="leading-6">
                Your audio never leaves your device. We use highly optimized local algorithms to process the microphone input in real-time. No servers, no cloud storage, no tracking.
              </AppText>
            </View>

            {/* Section 2: Microphone Permission */}
            <View className="mb-6">
              <View className="flex-row items-center mb-2">
                <View className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 items-center justify-center mr-3">
                  <Feather name="mic" size={20} color={theme.colors.accent} />
                </View>
                <AppText variant="body" className="font-bold text-lg">Why We Need the Microphone</AppText>
              </View>
              <AppText variant="body" color="secondary" className="leading-6">
                To tune your instrument, the app needs to "hear" the pitch. The microphone permission is strictly used to capture the frequency of your guitar strings.
              </AppText>
            </View>

            {/* Section 3: Data Collection */}
            <View className="mb-6">
              <View className="flex-row items-center mb-2">
                <View className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 items-center justify-center mr-3">
                  <Feather name="eye-off" size={20} color="#a855f7" />
                </View>
                <AppText variant="body" className="font-bold text-lg">Zero Data Collection</AppText>
              </View>
              <AppText variant="body" color="secondary" className="leading-6">
                We do not collect any personal data, audio recordings, or usage metrics. This app is designed to be fully functional completely offline. 
              </AppText>
            </View>
            
            {/* Disclaimer */}
            <AppSurface level="raised" className="p-4 rounded-xl mt-2 mb-8">
              <AppText variant="caption" color="muted" className="text-center leading-5">
                By using this app, you agree to grant local-only microphone access purely for tuning purposes. Standard OS permissions apply.
              </AppText>
            </AppSurface>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
