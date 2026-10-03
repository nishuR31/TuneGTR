import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTunerStore } from '../store/tunerStore';
import { useTheme } from '../../../theme/ThemeProvider';
import { AppText } from '../../../components/common/AppText';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const clamp = (v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));

export const TuningMeter: React.FC = React.memo(() => {
  const cents = useTunerStore(s=>s.cents);
  const state = useTunerStore(s=>s.tunerState);
  const theme = useTheme();
  const active = ['flat','sharp','in_tune','signal_detected'].includes(state);
  const position = clamp(cents,-50,50);
  const x = useSharedValue(50);
  React.useEffect(()=>{ x.value=withTiming(active ? 50 + position : 50,{duration:110}); },[active,position,x]);
  const marker = useAnimatedStyle(()=>({left:`${x.value}%`}));
  const color = state==='in_tune' ? theme.colors.success : state==='flat' ? theme.colors.warning : state==='sharp' ? theme.colors.error : theme.colors.accent;
  return <View style={styles.wrap}>
    <View style={styles.labels}>
      <AppText variant="caption" color="muted">FLAT</AppText>
      <AppText variant="caption" style={{color:theme.colors.success,fontWeight:'800'}}>IN TUNE</AppText>
      <AppText variant="caption" color="muted">SHARP</AppText>
    </View>
    <View style={[styles.track,{backgroundColor:theme.colors.surfaceRaised,borderColor:theme.colors.border}]}>
      <View style={[styles.zone,{left:'43%',width:'14%',backgroundColor:theme.colors.successSoft}]} />
      <View style={[styles.center,{backgroundColor:theme.colors.success}]} />
      <Animated.View style={[styles.marker,{backgroundColor:color,shadowColor:color},marker]} />
    </View>
    <View style={styles.scale}>
      <AppText variant="caption" color="muted">−50¢</AppText><AppText variant="caption" color="muted">−25¢</AppText><AppText variant="caption" color="muted">0¢</AppText><AppText variant="caption" color="muted">+25¢</AppText><AppText variant="caption" color="muted">+50¢</AppText>
    </View>
  </View>
});
const styles=StyleSheet.create({wrap:{width:'100%',maxWidth:430,paddingHorizontal:4},labels:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8},track:{height:16,borderRadius:99,borderWidth:1,overflow:'hidden',position:'relative'},zone:{position:'absolute',top:0,bottom:0},center:{position:'absolute',width:2,top:1,bottom:1,left:'50%',marginLeft:-1},marker:{position:'absolute',width:22,height:22,borderRadius:11,top:-4,marginLeft:-11,shadowOpacity:.35,shadowRadius:8,elevation:4},scale:{flexDirection:'row',justifyContent:'space-between',marginTop:6}});
