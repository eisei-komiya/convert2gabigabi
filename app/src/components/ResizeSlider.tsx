import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, TextInput, TouchableOpacity} from 'react-native';

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

type ResizeMode = 'percent' | 'resolution';

const ResizeSlider: React.FC<ResizeSliderProps> = ({value, onValueChange, originalWidth, originalHeight}) => {
  const [mode, setMode] = useState<ResizeMode>('percent');

  // ── percent mode ──
  const [inputText, setInputText] = useState(value.toString());

  // ── resolution mode ──
  const [widthText, setWidthText] = useState('');
  const [heightText, setHeightText] = useState('');

  const hasOriginal = originalWidth != null && originalHeight != null && originalWidth > 0 && originalHeight > 0;
  const aspectRatio = hasOriginal ? (originalWidth! / originalHeight!) : 1;

  // 外部からvalueが変わった場合（プリセットボタン等）はinputTextも更新する
  useEffect(() => {
    setInputText(value.toString());
  }, [value]);

  // 画像が変わったとき、解像度モードのinputをリセット
  useEffect(() => {
    if (hasOriginal) {
      setWidthText(originalWidth!.toString());
      setHeightText(originalHeight!.toString());
    } else {
      setWidthText('');
      setHeightText('');
    }
  }, [originalWidth, originalHeight]);

  // ── percent mode handlers ──
  const handleTextChange = (text: string) => {
    setInputText(text);
    if (!text.endsWith('.')) {
      const numValue = parseFloat(text);
      if (!isNaN(numValue) && numValue > 0 && numValue <= 100) {
        onValueChange(numValue);
      }
    }
  };

  const handleBlur = () => {
    const numValue = parseFloat(inputText);
    if (!isNaN(numValue) && numValue > 0 && numValue <= 100) {
      onValueChange(numValue);
      setInputText(numValue.toString());
    } else {
      setInputText(value.toString());
    }
  };

  // ── resolution mode helpers ──
  /** 幅から高さを計算してstateに反映し、resizePercentに変換してparentに通知 */
  const applyWidth = (w: number) => {
    if (!hasOriginal || isNaN(w) || w <= 0) return;
    const h = Math.round(w / aspectRatio);
    setHeightText(h.toString());
    const percent = Math.min(100, Math.max(1, Math.round((w / originalWidth!) * 100)));
    onValueChange(percent);
  };

  /** 高さから幅を計算してstateに反映し、resizePercentに変換してparentに通知 */
  const applyHeight = (h: number) => {
    if (!hasOriginal || isNaN(h) || h <= 0) return;
    const w = Math.round(h * aspectRatio);
    setWidthText(w.toString());
    const percent = Math.min(100, Math.max(1, Math.round((h / originalHeight!) * 100)));
    onValueChange(percent);
  };

  const handleWidthChange = (text: string) => {
    setWidthText(text);
    const w = parseInt(text, 10);
    if (!isNaN(w) && w > 0) {
      const h = Math.round(w / aspectRatio);
      setHeightText(h.toString());
      // resizePercent通知はblur時のみ（入力中は更新しない）
    }
  };

  const handleWidthBlur = () => {
    const w = parseInt(widthText, 10);
    if (!isNaN(w) && w > 0) {
      applyWidth(w);
    } else if (hasOriginal) {
      setWidthText(originalWidth!.toString());
      setHeightText(originalHeight!.toString());
    }
  };

  const handleHeightChange = (text: string) => {
    setHeightText(text);
    const h = parseInt(text, 10);
    if (!isNaN(h) && h > 0) {
      const w = Math.round(h * aspectRatio);
      setWidthText(w.toString());
    }
  };

  const handleHeightBlur = () => {
    const h = parseInt(heightText, 10);
    if (!isNaN(h) && h > 0) {
      applyHeight(h);
    } else if (hasOriginal) {
      setWidthText(originalWidth!.toString());
      setHeightText(originalHeight!.toString());
    }
  };

  return (
    <View style={styles.container}>
      {/* Mode Toggle */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'percent' && styles.modeBtnActive]}
          onPress={() => setMode('percent')}
          activeOpacity={0.7}>
          <Text style={[styles.modeBtnText, mode === 'percent' && styles.modeBtnTextActive]}>倍率 (%)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'resolution' && styles.modeBtnActive]}
          onPress={() => setMode('resolution')}
          activeOpacity={0.7}>
          <Text style={[styles.modeBtnText, mode === 'resolution' && styles.modeBtnTextActive]}>解像度指定</Text>
        </TouchableOpacity>
      </View>

      {mode === 'percent' ? (
        <>
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
                value={inputText}
                onChangeText={handleTextChange}
                onBlur={handleBlur}
                keyboardType="numeric"
                placeholder="1〜100"
                placeholderTextColor={TEXT_SECONDARY}
                selectTextOnFocus
              />
              <Text style={styles.unit}>%</Text>
            </View>
          </View>
        </>
      ) : (
        <>
          <View style={styles.labelRow}>
            <Text style={styles.label}>解像度直接指定</Text>
            {hasOriginal && (
              <Text style={styles.aspectInfo}>
                アス比 {originalWidth}×{originalHeight}
              </Text>
            )}
          </View>

          {!hasOriginal ? (
            <Text style={styles.noImageHint}>画像を選択すると解像度指定が使えます</Text>
          ) : (
            <View style={styles.resolutionRow}>
              <View style={styles.resInputGroup}>
                <Text style={styles.resInputLabel}>幅 (px)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={widthText}
                    onChangeText={handleWidthChange}
                    onBlur={handleWidthBlur}
                    keyboardType="number-pad"
                    placeholder="幅"
                    placeholderTextColor={TEXT_SECONDARY}
                    selectTextOnFocus
                  />
                </View>
              </View>

              <Text style={styles.crossSymbol}>×</Text>

              <View style={styles.resInputGroup}>
                <Text style={styles.resInputLabel}>高さ (px)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={heightText}
                    onChangeText={handleHeightChange}
                    onBlur={handleHeightBlur}
                    keyboardType="number-pad"
                    placeholder="高さ"
                    placeholderTextColor={TEXT_SECONDARY}
                    selectTextOnFocus
                  />
                </View>
              </View>
            </View>
          )}

          {hasOriginal && (
            <Text style={styles.resizePercentHint}>
              → リサイズ倍率: {value}%
            </Text>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },

  /* mode toggle */
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    backgroundColor: INPUT_BG,
  },
  modeBtnActive: {
    borderColor: ACCENT2,
    backgroundColor: '#2a1a00',
  },
  modeBtnText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '700',
  },
  modeBtnTextActive: {
    color: ACCENT2,
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

  /* resolution mode */
  aspectInfo: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  noImageHint: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    paddingVertical: 12,
  },
  resolutionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  resInputGroup: {
    flex: 1,
    gap: 4,
  },
  resInputLabel: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  crossSymbol: {
    fontSize: 18,
    color: TEXT_SECONDARY,
    fontWeight: '700',
    paddingBottom: 10,
  },
  resizePercentHint: {
    fontSize: 12,
    color: ACCENT2,
    textAlign: 'right',
  },
});

export default ResizeSlider;
