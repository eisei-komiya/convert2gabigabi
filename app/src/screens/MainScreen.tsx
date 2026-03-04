import React, {useCallback, useEffect, useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import ImagePickerComponent from '../components/ImagePicker';
import ResizeSlider from '../components/ResizeSlider';
import FileSizeLabel from '../components/FileSizeLabel';
import ErrorModal from '../components/ErrorModal';
import {useAppStore} from '../state/store';
import {resizeImage} from '../domain/useResizeImage';
import {compressForDiscord} from '../domain/useDiscordCompress';
import {convertImage, formatBytes, ImageFormat} from '../domain/convertImage';

const FORMAT_OPTIONS: {label: string; value: ImageFormat}[] = [
  {label: 'JPEG', value: 'jpeg'},
  {label: 'PNG', value: 'png'},
  {label: 'WebP (非対応)', value: 'webp'},
];

const GABIGABI_LEVELS: {label: string; value: number}[] = [
  {label: '1 軽微', value: 1},
  {label: '2 普通', value: 2},
  {label: '3 重め', value: 3},
  {label: '4 極重', value: 4},
  {label: '5 💀', value: 5},
];

interface FileInfo {
  name: string;
  sizeStr: string;
  width?: number;
  height?: number;
}

const MainScreen = () => {
  const {
    selectedImage,
    resizePercent,
    isProcessing,
    processedImage,
    outputFormat,
    convertQuality,
    gabigabiLevel,
    setSelectedImage,
    setResizePercent,
    setProcessedImage,
    setIsProcessing,
    setOutputFormat,
    setConvertQuality,
    setGabigabiLevel,
  } = useAppStore();

  const [errorModal, setErrorModal] = useState<{visible: boolean; title: string; message: string}>({
    visible: false,
    title: 'エラー',
    message: '',
  });

  const [processingAction, setProcessingAction] = useState<'gabigabi' | 'convert' | 'discord' | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);

  // Load file info when image is selected (#97)
  useEffect(() => {
    if (!selectedImage) {
      setFileInfo(null);
      return;
    }
    (async () => {
      try {
        const info = await FileSystem.getInfoAsync(selectedImage, {size: true});
        const sizeBytes = info.exists ? (info as FileSystem.FileInfo & {size: number}).size ?? 0 : 0;
        const name = selectedImage.split('/').pop() ?? '';
        setFileInfo({
          name,
          sizeStr: formatBytes(sizeBytes),
        });
      } catch {
        setFileInfo(null);
      }
    })();
  }, [selectedImage]);

  const showError = useCallback((title: string, message: string) => {
    setErrorModal({visible: true, title, message});
  }, []);

  const hideError = useCallback(() => {
    setErrorModal(prev => ({...prev, visible: false}));
  }, []);

  const handleImageSelect = useCallback(
    (imageUri: string) => {
      setSelectedImage(imageUri);
      setProcessedImage(null);
    },
    [setSelectedImage, setProcessedImage],
  );

  const handleResizeChange = useCallback(
    (percent: number) => {
      setResizePercent(percent);
    },
    [setResizePercent],
  );

  const handleProcess = async () => {
    if (!selectedImage) {
      return;
    }
    setIsProcessing(true);
    setProcessingAction('gabigabi');
    try {
      const inputInfo = await FileSystem.getInfoAsync(selectedImage, {size: true});
      const inputBytes = inputInfo.exists ? (inputInfo as FileSystem.FileInfo & {size: number}).size ?? 0 : 0;
      const result = await resizeImage(selectedImage, resizePercent, gabigabiLevel);
      setProcessedImage(result.outputUri);
      const beforeStr = formatBytes(inputBytes);
      const afterStr = formatBytes(result.outputBytes);
      Alert.alert('ガビガビ化完了', `Before: ${beforeStr}\nAfter: ${afterStr}`);
      console.log(`リサイズ完了 (engine: ${result.engine}):`, result.outputUri);
    } catch (err) {
      showError('エラー', `変換に失敗しました: ${String(err)}`);
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  const handleConvert = async () => {
    if (!selectedImage) {
      return;
    }
    setIsProcessing(true);
    setProcessingAction('convert');
    try {
      const result = await convertImage(selectedImage, {
        outputFormat,
        quality: convertQuality,
      });
      setProcessedImage(result.outputUri);
      const sizeStr = formatBytes(result.outputBytes);
      Alert.alert(
        '変換完了',
        `${outputFormat.toUpperCase()}形式に変換しました\nサイズ: ${sizeStr}`,
      );
      console.log(`フォーマット変換完了 (engine: ${result.engine}):`, result.outputUri);
    } catch (err) {
      showError('エラー', `変換に失敗しました: ${String(err)}`);
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  const handleSave = async () => {
    if (!processedImage) {
      return;
    }
    const {status} = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限が必要', 'カメラロールへのアクセスを許可してください');
      return;
    }
    try {
      await MediaLibrary.saveToLibraryAsync(processedImage);
      Alert.alert('保存完了', 'カメラロールに保存しました');
    } catch (err) {
      showError('エラー', `保存に失敗しました: ${String(err)}`);
    }
  };

  const handleShare = async () => {
    if (!processedImage) {
      return;
    }
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('共有不可', 'このデバイスでは共有機能が利用できません');
        return;
      }
      await Sharing.shareAsync(processedImage);
    } catch (err) {
      showError('エラー', `共有に失敗しました: ${String(err)}`);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setProcessedImage(null);
  };

  const handleDiscordCompress = async () => {
    if (!selectedImage) {
      return;
    }
    setIsProcessing(true);
    setProcessingAction('discord');
    try {
      const result = await compressForDiscord(selectedImage);
      setProcessedImage(result.outputUri);
      const sizeMB = (result.outputBytes / (1024 * 1024)).toFixed(2);
      const ratioPct = Math.round((1 - result.compressionRatio) * 100);
      if (result.outputUri === selectedImage) {
        Alert.alert('完了', `すでに10MB以下です（${sizeMB} MB）`);
      } else {
        Alert.alert('圧縮完了', `${sizeMB} MB（${ratioPct}% 削減）`);
      }
    } catch (err) {
      showError('エラー', `Discord圧縮に失敗しました: ${String(err)}`);
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d0d" />

      {/* ── Error Modal ── */}
      <ErrorModal
        visible={errorModal.visible}
        title={errorModal.title}
        message={errorModal.message}
        onClose={hideError}
      />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.appName}>convert2gabigabi</Text>
        <Text style={styles.appSubtitle}>画像リサイズツール</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ── Before / After Preview ── */}
        <View style={styles.previewRow}>
          {/* Before: placeholder text removed (#96) */}
          <PreviewCard
            label="Before"
            uri={selectedImage}
            placeholder=""
          />
          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>›</Text>
          </View>
          <PreviewCard
            label="After"
            uri={processedImage}
            placeholder={selectedImage ? '変換後' : '—'}
          />
        </View>

        {/* ── Image Picker Button ── */}
        <ImagePickerComponent
          onImageSelect={handleImageSelect}
          selectedImage={selectedImage || undefined}
        />

        {/* ── File Info (#97) ── */}
        {selectedImage && fileInfo && (
          <View style={styles.fileInfoCard}>
            <Text style={styles.fileInfoTitle}>📄 ファイル情報</Text>
            <Text style={styles.fileInfoText} numberOfLines={1}>
              名前: {fileInfo.name}
            </Text>
            <Text style={styles.fileInfoText}>
              サイズ: {fileInfo.sizeStr}
            </Text>
          </View>
        )}

        {/* ── File Size ── */}
        {selectedImage && (
          <View style={styles.sizeRow}>
            <FileSizeLabel label="元のサイズ" uri={selectedImage} />
            {processedImage && (
              <>
                <Text style={styles.sizeSeparator}>→</Text>
                <FileSizeLabel label="変換後" uri={processedImage} />
              </>
            )}
          </View>
        )}

        {/* ════════════════════════════════════════
            Section: ガビガビ化 (#98)
        ════════════════════════════════════════ */}
        <View style={styles.groupSection}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupHeaderText}>⚡ ガビガビ化</Text>
            <Text style={styles.groupHeaderSub}>縮小率・レベルを調整して画像を劣化させる</Text>
          </View>

          {/* ── Resize Slider ── */}
          <View style={styles.sliderCard}>
            <ResizeSlider value={resizePercent} onValueChange={handleResizeChange} />
          </View>

          {/* ── Gabigabi Level ── */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>ガビガビレベル</Text>
            <View style={styles.formatRow}>
              {GABIGABI_LEVELS.map(item => (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.formatButton,
                    gabigabiLevel === item.value && styles.gabigabiButtonActive,
                  ]}
                  onPress={() => setGabigabiLevel(item.value)}>
                  <Text
                    style={[
                      styles.formatButtonText,
                      gabigabiLevel === item.value && styles.formatButtonTextActive,
                    ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Gabigabi Action Button ── */}
          <TouchableOpacity
            style={[styles.processButton, (!selectedImage || isProcessing) && styles.disabledButton]}
            onPress={handleProcess}
            disabled={!selectedImage || isProcessing}
            activeOpacity={0.8}>
            {processingAction === 'gabigabi' ? (
              <View style={styles.processingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.buttonText}> 処理中...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>⚡ ガビガビ化する</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ════════════════════════════════════════
            Section: フォーマット変換 (#98)
        ════════════════════════════════════════ */}
        <View style={styles.groupSection}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupHeaderText}>🔄 フォーマット変換</Text>
            <Text style={styles.groupHeaderSub}>出力形式・品質を指定して変換する</Text>
          </View>

          {/* ── Format Selection ── */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>出力フォーマット</Text>
            <View style={styles.formatRow}>
              {FORMAT_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.formatButton,
                    outputFormat === opt.value && styles.formatButtonActive,
                  ]}
                  onPress={() => setOutputFormat(opt.value)}>
                  <Text
                    style={[
                      styles.formatButtonText,
                      outputFormat === opt.value && styles.formatButtonTextActive,
                    ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {outputFormat !== 'png' && (
              <View style={styles.qualityRow}>
                <Text style={styles.qualityLabel}>
                  品質: {convertQuality}%
                </Text>
                <View style={styles.qualityButtons}>
                  {[60, 75, 85, 95].map(q => (
                    <TouchableOpacity
                      key={q}
                      style={[
                        styles.qualityPreset,
                        convertQuality === q && styles.qualityPresetActive,
                      ]}
                      onPress={() => setConvertQuality(q)}>
                      <Text
                        style={[
                          styles.qualityPresetText,
                          convertQuality === q && styles.qualityPresetTextActive,
                        ]}>
                        {q}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* ── Convert Action Button ── */}
          <TouchableOpacity
            style={[styles.convertButton, (!selectedImage || isProcessing) && styles.disabledButton]}
            onPress={handleConvert}
            disabled={!selectedImage || isProcessing}
            activeOpacity={0.8}>
            {processingAction === 'convert' ? (
              <View style={styles.processingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.buttonText}> 処理中...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>🔄 フォーマット変換する</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Discord Compress Button ── */}
        <TouchableOpacity
          style={[styles.discordButton, (!selectedImage || isProcessing) && styles.disabledButton]}
          onPress={handleDiscordCompress}
          disabled={!selectedImage || isProcessing}
          activeOpacity={0.8}>
          {processingAction === 'discord' ? (
            <View style={styles.processingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.buttonText}> 処理中...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>📤 Discord用に圧縮 (10MB以下)</Text>
          )}
        </TouchableOpacity>

        {/* ── Save / Share Buttons ── */}
        {processedImage && (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.saveButton]}
              onPress={handleSave}
              activeOpacity={0.8}>
              <Text style={styles.buttonText}>💾 カメラロールに保存</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareButton]}
              onPress={handleShare}
              activeOpacity={0.8}>
              <Text style={styles.buttonText}>🔗 共有</Text>
            </TouchableOpacity>
          </View>
        )}

        {(selectedImage || processedImage) && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleReset}
            activeOpacity={0.7}>
            <Text style={styles.resetButtonText}>リセット</Text>
          </TouchableOpacity>
        )}

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

/* ── Inline sub-component: preview card ── */
interface PreviewCardProps {
  label: string;
  uri: string | null;
  placeholder: string;
}

const PreviewCard: React.FC<PreviewCardProps> = ({label, uri, placeholder}) => (
  <View style={styles.previewCard}>
    <Text style={styles.previewLabel}>{label}</Text>
    {uri ? (
      <Image source={{uri}} style={styles.previewImage} resizeMode="cover" />
    ) : (
      <View style={styles.previewEmpty}>
        {placeholder ? <Text style={styles.previewEmptyText}>{placeholder}</Text> : null}
      </View>
    )}
  </View>
);

/* ── Styles ── */
const DARK_BG = '#0d0d0d';
const CARD_BG = '#1a1a1a';
const ACCENT = '#ff4e50';
const ACCENT2 = '#fc913a';
const TEXT_PRIMARY = '#f0f0f0';
const TEXT_SECONDARY = '#888';
const BORDER = '#2a2a2a';
const GROUP_BORDER_GABIGABI = '#ff4e5033';
const GROUP_BORDER_CONVERT = '#fc913a33';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  /* header */
  header: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  appName: {
    fontSize: 22,
    fontWeight: '900',
    color: ACCENT,
    letterSpacing: 1,
  },
  appSubtitle: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },

  /* before/after row */
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
    gap: 8,
  },
  previewCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    textAlign: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  previewImage: {
    width: '100%',
    height: 150,
  },
  previewEmpty: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewEmptyText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
  },
  arrowContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  arrow: {
    fontSize: 28,
    color: ACCENT2,
    fontWeight: '700',
  },

  /* file info card (#97) */
  fileInfoCard: {
    backgroundColor: CARD_BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    marginBottom: 8,
  },
  fileInfoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fileInfoText: {
    fontSize: 13,
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },

  /* size row */
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 8,
  },
  sizeSeparator: {
    color: ACCENT2,
    fontSize: 18,
    fontWeight: '700',
  },

  /* group section wrapper (#98) */
  groupSection: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  groupHeader: {
    backgroundColor: '#1e1e1e',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  groupHeaderText: {
    fontSize: 16,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: 0.5,
  },
  groupHeaderSub: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },

  /* slider card */
  sliderCard: {
    backgroundColor: CARD_BG,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  /* format section */
  sectionContainer: {
    backgroundColor: CARD_BG,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  formatRow: {
    flexDirection: 'row',
    gap: 8,
  },
  formatButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    backgroundColor: '#222',
  },
  formatButtonActive: {
    borderColor: ACCENT2,
    backgroundColor: ACCENT2,
  },
  gabigabiButtonActive: {
    borderColor: '#ff9800',
    backgroundColor: '#ff9800',
  },
  formatButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  formatButtonTextActive: {
    color: '#fff',
  },
  qualityRow: {
    marginTop: 12,
  },
  qualityLabel: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginBottom: 8,
  },
  qualityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  qualityPreset: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#222',
  },
  qualityPresetActive: {
    borderColor: ACCENT2,
    backgroundColor: ACCENT2,
  },
  qualityPresetText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  qualityPresetTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  /* button row */
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },

  /* process button */
  processButton: {
    backgroundColor: ACCENT,
    paddingVertical: 16,
    margin: 12,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: ACCENT,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  convertButton: {
    backgroundColor: ACCENT2,
    paddingVertical: 16,
    margin: 12,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: ACCENT2,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  discordButton: {
    backgroundColor: '#5865F2',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#5865F2',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    backgroundColor: '#333',
    shadowOpacity: 0,
    elevation: 0,
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  /* save / share buttons */
  saveButton: {
    flex: 1,
    backgroundColor: '#2ecc71',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#2ecc71',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#3498db',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#3498db',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },

  /* reset button */
  resetButton: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  resetButtonText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '600',
  },

  spacer: {
    height: 20,
  },
});

export default MainScreen;
