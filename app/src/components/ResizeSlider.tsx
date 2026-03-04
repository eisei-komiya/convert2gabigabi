import React from 'react';
import {View, Text, StyleSheet, TextInput, TouchableOpacity} from 'react-native';

interface ResizeSliderProps {
  value: number;
  onValueChange: (value: number) => void;
}

const ACCENT = '#ff4e50';
const ACCENT2 = '#fc913a';
const TEXT_PRIMARY = '#f0f0f0';
const TEXT_SECONDARY = '#888';
const BORDER = '#2a2a2a';
const INPUT_BG = '#111';

const PRESETS = [25, 50, 75, 100];

const ResizeSlider: React.FC<ResizeSliderProps> = ({value, onValueChange}) => {
  const handleTextChange = (text: string) => {
    const numValue = parseFloat(text);
    if (!isNaN(numValue) && numValue > 0 && numValue <= 100) {
      onValueChange(numValue);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>リサイズ倍率</Text>
        <Text style={styles.valueDisplay}>
          <Text style={styles.valueNumber}>{value}</Text>
          <Text style={styles.valueUnit}>%</Text>
        </Text>
      </View>

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

      {/* Manual input */}
      <View style={styles.inputRow}>
        <Text style={styles.inputLabel}>カスタム:</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={value.toString()}
            onChangeText={handleTextChange}
            keyboardType="numeric"
            placeholder="1〜100"
            placeholderTextColor={TEXT_SECONDARY}
            selectTextOnFocus
          />
          <Text style={styles.unit}>%</Text>
        </View>
      </View>
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

  /* presets */
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

  /* input */
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputLabel: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    minWidth: 60,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: INPUT_BG,
  },
  input: {
    fontSize: 16,
    color: TEXT_PRIMARY,
    minWidth: 50,
    paddingVertical: 8,
    textAlign: 'center',
  },
  unit: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginLeft: 4,
  },
});

export default ResizeSlider;
