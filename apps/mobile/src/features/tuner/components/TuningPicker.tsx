import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  useWindowDimensions,
  Pressable,
} from "react-native";
import { useTunerStore } from "../store/tunerStore";
import { TUNINGS, type TuningDefinition } from "@guitar-tool/music-core";
import { AppSurface } from "../../../components/common/AppSurface";
import { AppText } from "../../../components/common/AppText";
import { useTheme } from "../../../theme/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from '@expo/vector-icons/Feather';

export const TuningPicker: React.FC = () => {
  const { activeTuning, setActiveTuning, clearPitchData, capoFret, setCapoFret } = useTunerStore();
  const [modalVisible, setModalVisible] = useState(false);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const handleSelect = (tuning: TuningDefinition) => {
    setActiveTuning(tuning);
    clearPitchData();
    setModalVisible(false);
  };

  const closeModal = () => setModalVisible(false);

  return (
    <View>
      <TouchableOpacity onPress={() => setModalVisible(true)} activeOpacity={0.8}>
        <AppSurface
          level={theme.mode === 'light' ? 'raised' : 'base'}
          className="flex-row items-center justify-between border-0 px-4 py-2 rounded-full"
        >
          <AppText variant="label" className="font-semibold">
            {activeTuning.name}
          </AppText>
          <Feather name="chevron-down" size={14} color={theme.colors.textSecondary} className="ml-2" />
        </AppSurface>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View className="flex-1 justify-end bg-black/40">
          <Pressable 
            className="flex-1" 
            onPress={closeModal}
          />

          <View 
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
            style={{ 
              backgroundColor: theme.colors.surface, 
              paddingBottom: insets.bottom + theme.spacing.lg,
              borderTopLeftRadius: theme.radius.xl,
              borderTopRightRadius: theme.radius.xl,
              maxHeight: height * 0.8,
            }}
            className="w-full pt-3"
          >
            {/* Drag handle */}
            <View className="items-center mb-4">
              <View className="w-10 h-1 rounded-full" style={{ backgroundColor: theme.colors.border }} />
            </View>

            {/* Title */}
            <View className="items-center px-4 pb-4">
              <AppText variant="heading" className="font-semibold text-xl">Choose Tuning</AppText>
            </View>

            <ScrollView 
              contentContainerStyle={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.md }}
              showsVerticalScrollIndicator={false}
              bounces={true}
            >
              {/* Capo Selector */}
              <AppSurface level="base" className="rounded-2xl p-4 mb-6" style={{ backgroundColor: theme.colors.surfaceElevated }}>
                <View className="flex-row items-center justify-between mb-4">
                  <AppText variant="body" className="font-semibold text-lg">Capo Position</AppText>
                  <AppText variant="caption" color="muted">Fret {capoFret}</AppText>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((fret) => (
                    <TouchableOpacity
                      key={fret}
                      onPress={() => {
                        setCapoFret(fret);
                        clearPitchData();
                      }}
                      className={`w-12 h-12 rounded-full items-center justify-center mr-3 border-2 ${
                        capoFret === fret ? 'border-blue-500 bg-blue-500/10' : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <AppText className={`font-semibold ${capoFret === fret ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}>
                        {fret === 0 ? 'Off' : fret}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </AppSurface>

              <AppText variant="label" color="muted" className="mb-3 ml-2 font-medium uppercase tracking-wider text-xs">Presets</AppText>

              {/* Tuning List */}
              {TUNINGS.map((preset) => {
                const isSelected = activeTuning.id === preset.id;
                const noteLabels = preset.stringsLowToHigh
                  .map((s) => s.note.replace(/[0-9]/g, ""))
                  .join("  ");

                return (
                  <Pressable
                    key={preset.id}
                    className="w-full mb-3"
                    onPress={() => handleSelect(preset)}
                  >
                    <AppSurface
                      level={isSelected ? 'raised' : 'base'}
                      className="w-full p-4 flex-row items-center justify-between"
                      style={{ 
                        backgroundColor: isSelected ? theme.colors.accentSoft : theme.colors.surface,
                        borderRadius: theme.radius.lg,
                        borderWidth: isSelected ? 2 : 1,
                        borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                      }}
                    >
                      <View className="flex-1">
                        <AppText 
                          variant="body" 
                          color={isSelected ? 'accent' : 'primary'}
                          className={`mb-1 ${isSelected ? 'font-bold' : 'font-medium'}`}
                        >
                          {preset.name}
                        </AppText>
                        <AppText variant="caption" color={isSelected ? 'primary' : 'muted'}>
                          {noteLabels}
                        </AppText>
                      </View>
                      {isSelected && (
                        <Feather name="check" size={20} color={theme.colors.accent} />
                      )}
                    </AppSurface>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};
