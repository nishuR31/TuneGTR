import React, { useState } from "react";
import { View, TouchableOpacity, Linking, Platform } from "react-native";
import { useTheme } from "../../../theme/ThemeProvider";
import { AppSurface } from "../../../components/common/AppSurface";
import { AppText } from "../../../components/common/AppText";
import Feather from '@expo/vector-icons/Feather';
import { SecurityComplianceModal } from "./SecurityComplianceModal";

interface PermissionPromptProps {
  state: "permission_required" | "permission_denied";
  onRequestPermission: () => void;
}

export const PermissionPrompt: React.FC<PermissionPromptProps> = ({
  state,
  onRequestPermission,
}) => {
  const isDenied = state === "permission_denied";
  const theme = useTheme();
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  const openSettings = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  };

  return (
    <View className="flex-1 justify-center items-center px-6">
      <AppSurface isCard level="elevated" className="items-center w-full p-8 rounded-3xl">
        <View className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-full items-center justify-center mb-6">
          <Feather name="mic" size={32} color={theme.colors.accent} />
        </View>

        <AppText variant="heading" className="text-center font-bold text-2xl mb-3">
          {isDenied ? "Microphone Access Denied" : "Microphone Needed"}
        </AppText>
        
        <AppText variant="body" color="secondary" className="text-center leading-6 mb-8 text-[15px]">
          {isDenied
            ? "Guitar Tuner needs microphone access to detect the pitch of your guitar strings. Audio is processed locally and never recorded."
            : "To tune your guitar, we need access to your microphone. We only listen for pitch — nothing is recorded or sent anywhere."}
        </AppText>
        
        <TouchableOpacity
          className="w-full items-center mb-4"
          onPress={isDenied ? openSettings : onRequestPermission}
          activeOpacity={0.8}
        >
          <AppSurface 
            level="base" 
            className="w-full min-w-[200px] items-center py-4 px-6 rounded-full border-0 shadow-sm"
            style={{ backgroundColor: theme.colors.accent }}
          >
            <AppText variant="label" className="text-white font-bold text-base">
              {isDenied ? "Open Settings" : "Enable Microphone"}
            </AppText>
          </AppSurface>
        </TouchableOpacity>

        <TouchableOpacity 
          className="flex-row items-center py-2"
          onPress={() => setShowSecurityModal(true)}
        >
          <Feather name="shield" size={14} color={theme.colors.textMuted} className="mr-2" />
          <AppText variant="caption" color="muted" className="font-medium underline">
            Privacy & Security Info
          </AppText>
        </TouchableOpacity>
      </AppSurface>

      <SecurityComplianceModal 
        visible={showSecurityModal} 
        onClose={() => setShowSecurityModal(false)} 
      />
    </View>
  );
};
