import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import Slider from '@react-native-community/slider';

interface ResizeSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  /** オリジナル画像の幅 (解像度直接指定モード用) */
  originalWidth?: number;
  /** オリジナル画像の高さ (解像度直接指定モード用) */
  originalHeight?: number;
}

const ACCENT = '#ff4e50';
const ACCENT2 = '#fc913a';
const TEXT_PRIMARY = '#f0f0f0';
const TEXT_SECONDARY = '#888';
const BORDER = '#2a2a2a';
const INPUT_BG = '#111';

const PRESETS = [25, 50, 75, 100];

const ResizeSlider: React.FC<ResizeSliderProps> = ({value, onValueChange, originalWidth, originalHeight}) => {
  const hasOriginal = originalWidth != null && originalHeight != null && originalWidth > 0 && originalHeight > 0;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>リサイズ倍率</Text>
        <Text style={styles.valueDisplay}>
          <Text style={styles.valueNumber}>{Math.round(value)}</Text>
          <Text style={styles.valueUnit}>%</Text>
        </Text>
      </View>

      {/* Slider */}
      <Slider
        style={styles.slider}
        minimumValue={1}
        maximumValue={100}
        step={1}
        value={value}
        onValueChange={(v: number) => onValueChange(Math.round(v))}
        minimumTrackTintColor={ACCENT}
        maximumTrackTintColor={BORDER}
        thumbTintColor={ACCENT}
      />

      {/* Preset buttons */}
      <View style={styles.presetsRow}>
        {PRESETS.map(preset => (
          <TouchableOpacity
            key={preset}
            style={[styles.presetBtn, value === preset && styles.presetBtnActive]}
            onPress={() => onValueChange(preset)}
            activeOpacity={0.7}>
            <Text style={[styles.presetText, value === preset && styles.presetTextActive]}>
              {preset}%
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {hasOriginal && (
        <Text style={styles.resolutionHint}>
          → {Math.round(originalWidth! * value / 100)} × {Math.round(originalHeight! * value / 100)} px
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  valueDisplay: {
    alignItems: 'baseline',
  },
  valueNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: ACCENT,
  },
  valueUnit: {
    fontSize: 14,
    color: ACCENT2,
    fontWeight: '700',
    marginLeft: 2,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    backgroundColor: INPUT_BG,
  },
  presetBtnActive: {
    borderColor: ACCENT,
    backgroundColor: '#2a0a0b',
  },
  presetText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '700',
  },
  presetTextActive: {
    color: ACCENT,
  },
  resolutionHint: {
    fontSize: 12,
    color: ACCENT2,
    textAlign: 'right',
  },
});

export default ResizeSlider;
