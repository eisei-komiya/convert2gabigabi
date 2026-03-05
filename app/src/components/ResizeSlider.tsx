import React, {useState, useEffect} from 'react';
import {View, Text, TextInput, StyleSheet, TouchableOpacity} from 'react-native';
import Slider from '@react-native-community/slider';

interface ResizeSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  originalWidth?: number;
  originalHeight?: number;
}

const ACCENT = '#ff4e50';
const ACCENT2 = '#fc913a';
const TEXT_PRIMARY = '#f0f0f0';
const TEXT_SECONDARY = '#888';
const BORDER = '#2a2a2a';
const INPUT_BG = '#111';

const ResizeSlider: React.FC<ResizeSliderProps> = ({value, onValueChange, originalWidth, originalHeight}) => {
  const hasOriginal = originalWidth != null && originalHeight != null && originalWidth > 0 && originalHeight > 0;
  const [directMode, setDirectMode] = useState(false);
  const [widthText, setWidthText] = useState('');
  const [heightText, setHeightText] = useState('');

  // Sync direct inputs when value or original dimensions change
  useEffect(() => {
    if (hasOriginal && directMode) {
      setWidthText(String(Math.round(originalWidth! * value / 100)));
      setHeightText(String(Math.round(originalHeight! * value / 100)));
    }
  }, [value, directMode]);

  const handleWidthChange = (text: string) => {
    setWidthText(text);
    const w = parseInt(text, 10);
    if (hasOriginal && w > 0) {
      const pct = Math.min(100, Math.max(1, Math.round((w / originalWidth!) * 100)));
      setHeightText(String(Math.round(originalHeight! * pct / 100)));
      onValueChange(pct);
    }
  };

  const handleHeightChange = (text: string) => {
    setHeightText(text);
    const h = parseInt(text, 10);
    if (hasOriginal && h > 0) {
      const pct = Math.min(100, Math.max(1, Math.round((h / originalHeight!) * 100)));
      setWidthText(String(Math.round(originalWidth! * pct / 100)));
      onValueChange(pct);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>リサイズ倍率</Text>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
          {hasOriginal && (
            <TouchableOpacity onPress={() => setDirectMode(!directMode)} activeOpacity={0.7}>
              <Text style={styles.modeToggle}>{directMode ? '% 指定' : '解像度指定'}</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.valueDisplay}>
            <Text style={styles.valueNumber}>{Math.round(value)}</Text>
            <Text style={styles.valueUnit}>%</Text>
          </Text>
        </View>
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

      {/* Direct resolution input */}
      {directMode && hasOriginal && (
        <View style={styles.directRow}>
          <View style={styles.directInput}>
            <Text style={styles.directLabel}>幅</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={widthText}
              onChangeText={handleWidthChange}
              placeholderTextColor="#555"
            />
          </View>
          <Text style={styles.directX}>×</Text>
          <View style={styles.directInput}>
            <Text style={styles.directLabel}>高さ</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={heightText}
              onChangeText={handleHeightChange}
              placeholderTextColor="#555"
            />
          </View>
          <Text style={styles.directUnit}>px</Text>
        </View>
      )}

      {/* Resolution hint (when not in direct mode) */}
      {!directMode && hasOriginal && (
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
  modeToggle: {
    fontSize: 12,
    color: ACCENT2,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  directRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  directInput: {
    flex: 1,
  },
  directLabel: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    marginBottom: 4,
  },
  input: {
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'center',
  },
  directX: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    fontWeight: '700',
    marginTop: 16,
  },
  directUnit: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: '600',
    marginTop: 16,
  },
  resolutionHint: {
    fontSize: 12,
    color: ACCENT2,
    textAlign: 'right',
  },
});

export default ResizeSlider;
