import React, {useCallback, useEffect, useRef, useState} from 'react';
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
  Modal,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import Share from 'react-native-share';
import * as FileSystem from 'expo-file-system/legacy';
import ImagePickerComponent from '../components/ImagePicker';
import ResizeSlider from '../components/ResizeSlider';
import ErrorModal from '../components/ErrorModal';
import {useAppStore} from '../state/store';
import {resizeImage} from '../domain/useResizeImage';
import {compressForDiscord} from '../domain/useDiscordCompress';
import {convertImage, formatBytes, ImageFormat} from '../domain/convertImage';
import {FFmpegKit} from 'ffmpeg-kit-react-native';

const FORMAT_OPTIONS: {label: string; value: ImageFormat}[] = [
  {label: 'JPEG', value: 'jpeg'},
  {label: 'PNG', value: 'png'},
  {label: 'WebP (非対応)', value: 'webp'},
];

const GABIGABI_LEVELS: {label: string; value: number}[] = [
  {label: '0', value: 0},
  {label: '1', value: 1},
  {label: '2', value: 2},
  {label: '3', value: 3},
  {label: '4', value: 4},
  {label: '5', value: 5},
];

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

/* ── Fullscreen image modal with pinch-to-zoom ── */
interface ImageModalProps {
  uri: string | null;
  visible: boolean;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({uri, visible, onClose}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const lastScale = useRef(1);
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastTranslateX = useRef(0);
  const lastTranslateY = useRef(0);

  const reset = useCallback(() => {
    scale.setValue(1);
    lastScale.current = 1;
    translateX.setValue(0);
    translateY.setValue(0);
    lastTranslateX.current = 0;
    lastTranslateY.current = 0;
  }, [scale, translateX, translateY]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        translateX.setOffset(lastTranslateX.current);
        translateY.setOffset(lastTranslateY.current);
        translateX.setValue(0);
        translateY.setValue(0);
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          // Pinch-to-zoom
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if ((panResponder as any)._initialDistance == null) {
            (panResponder as any)._initialDistance = distance;
          }
          const newScale = Math.max(
            0.5,
            Math.min(5, lastScale.current * (distance / (panResponder as any)._initialDistance)),
          );
          scale.setValue(newScale);
        } else {
          translateX.setValue(gestureState.dx);
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        (panResponder as any)._initialDistance = null;
        lastScale.current = (scale as any)._value;
        translateX.flattenOffset();
        translateY.flattenOffset();
        lastTranslateX.current = (translateX as any)._value;
        lastTranslateY.current = (translateY as any)._value;
      },
    }),
  ).current;

  if (!uri) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={modalStyles.overlay}>
        <TouchableOpacity style={modalStyles.closeBtn} onPress={handleClose}>
          <Text style={modalStyles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Animated.Image
          source={{uri}}
          style={[
            modalStyles.image,
            {
              transform: [
                {scale},
                {translateX},
                {translateY},
              ],
            },
          ]}
          resizeMode="contain"
          {...panResponder.panHandlers}
        />
        <TouchableOpacity style={modalStyles.resetBtn} onPress={reset}>
          <Text style={modalStyles.resetBtnText}>リセット</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  closeBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  resetBtn: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  resetBtnText: {
    color: '#fff',
    fontSize: 14,
  },
});

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

  // #80: selected media type
  const [selectedMediaType, setSelectedMediaType] = useState<'image' | 'video' | null>(null);

  // #77: fullscreen modal state
  const [fullscreenUri, setFullscreenUri] = useState<string | null>(null);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);

  // #97: file info
  const [fileInfo, setFileInfo] = useState<{name: string; size: string; width: number; height: number} | null>(null);
  const outputBytesRef = useRef(0);

  useEffect(() => {
    if (!selectedImage) {
      setFileInfo(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const info = await FileSystem.getInfoAsync(selectedImage, {size: true});
        const bytes = info.exists ? (info as FileSystem.FileInfo & {size: number}).size ?? 0 : 0;
        const sizeStr = bytes >= 1024 * 1024
          ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
          : `${(bytes / 1024).toFixed(1)} KB`;
        const name = selectedImage.split('/').pop() ?? '';
        Image.getSize(
          selectedImage,
          (width, height) => {
            if (!cancelled) setFileInfo({name, size: sizeStr, width, height});
          },
          () => {
            if (!cancelled) setFileInfo({name, size: sizeStr, width: 0, height: 0});
          },
        );
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [selectedImage]);

  const showError = useCallback((title: string, message: string) => {
    setErrorModal({visible: true, title, message});
  }, []);

  const hideError = useCallback(() => {
    setErrorModal(prev => ({...prev, visible: false}));
  }, []);

  const handleImageSelect = useCallback(
    (imageUri: string, mediaType: 'image' | 'video' = 'image') => {
      setSelectedImage(imageUri);
      setSelectedMediaType(mediaType);
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

  // #77: open fullscreen
  const handleImagePress = useCallback((uri: string | null) => {
    if (!uri) return;
    setFullscreenUri(uri);
    setFullscreenVisible(true);
  }, []);

  // #34: cancel FFmpeg
  const handleCancel = useCallback(async () => {
    try {
      await FFmpegKit.cancel();
    } catch (err) {
      console.warn('Cancel failed:', err);
    }
  }, []);

  const handleProcess = async () => {
    if (!selectedImage) {
      return;
    }
    setIsProcessing(true);
    setProcessingAction('gabigabi');
    try {
      let resultUri: string;
      let resultBytes: number;

      if (selectedMediaType === 'video') {
        // 動画のガビガビ化
        const result = await processVideoWithFfmpeg(selectedImage, resizePercent, gabigabiLevel ?? 0);
        resultUri = result.outputUri;
        resultBytes = result.outputBytes;
      } else {
      const inputInfo = await FileSystem.getInfoAsync(selectedImage, {size: true});
      const inputBytes = inputInfo.exists ? (inputInfo as FileSystem.FileInfo & {size: number}).size ?? 0 : 0;

      // ガビガビレベル0 かつ フォーマット変換が必要な場合はフォーマット変換のみ
      // ガビガビレベル1以上の場合はガビガビ化（リサイズ+品質劣化）
      // 両方の設定を1回の「変換」で適用する

      if (gabigabiLevel === null || gabigabiLevel === 0) {
        // ガビガビなし → フォーマット変換 + リサイズのみ
        if (resizePercent === 100 && outputFormat === 'jpeg') {
          // 何も変更なし
          Alert.alert('変換不要', '現在の設定では変換の必要がありません。\nガビガビレベルを上げるか、フォーマットやリサイズを変更してください。');
          return;
        }
        if (resizePercent < 100) {
          // リサイズだけ実行（ガビガビレベル0 = 高品質）
          const result = await resizeImage(selectedImage, resizePercent, 0);
          resultUri = result.outputUri;
          resultBytes = result.outputBytes;
        } else {
          // フォーマット変換のみ
          const result = await convertImage(selectedImage, {
            outputFormat,
            quality: convertQuality,
          });
          resultUri = result.outputUri;
          resultBytes = result.outputBytes;
        }
      } else {
        // ガビガビ化（リサイズ + 品質劣化）
        const result = await resizeImage(selectedImage, resizePercent, gabigabiLevel!);
        resultUri = result.outputUri;
        resultBytes = result.outputBytes;
      }
      } // end else (image)

      setProcessedImage(resultUri);
      outputBytesRef.current = resultBytes;
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

  // #78: fix share bug — copy to cache before sharing to avoid permission error
  const handleShare = async () => {
    if (!processedImage) {
      return;
    }
    try {
      const filePath = processedImage.replace('file://', '');
      const ext = filePath.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'mp4' ? 'video/mp4' : 'image/jpeg';
      await Share.open({
        url: `file://${filePath}`,
        type: mimeType,
      });
    } catch (err: any) {
      // User cancelled share dialog
      if (err?.message?.includes('User did not share') || err?.message?.includes('cancel')) {
        return;
      }
      showError('エラー', `共有に失敗しました: ${String(err)}`);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setSelectedMediaType(null);
    setProcessedImage(null);
    outputBytesRef.current = 0;
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
      outputBytesRef.current = result.outputBytes;
      
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

      {/* ── Fullscreen Image Modal (#77) ── */}
      <ImageModal
        uri={fullscreenUri}
        visible={fullscreenVisible}
        onClose={() => setFullscreenVisible(false)}
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

        {/* ── Before / After Preview with Info (#119) ── */}
        <View style={styles.previewRow}>
          <View style={styles.previewColumn}>
            <PreviewCard
              label="BEFORE"
              uri={selectedImage}
              mediaType={selectedMediaType ?? 'image'}
              placeholder={selectedImage ? '' : ''}
              onPickerPress={undefined}
              onImagePress={handleImagePress}
            />
            {selectedImage && fileInfo && (
              <View style={styles.infoBlock}>
                <Text style={styles.infoText} numberOfLines={1} ellipsizeMode="middle">📄 {fileInfo.name}</Text>
                <Text style={styles.infoText}>💾 {fileInfo.size}</Text>
                {fileInfo.width > 0 && (
                  <Text style={styles.infoText}>🖼 {fileInfo.width} × {fileInfo.height} px</Text>
                )}
                <Text style={styles.infoText}>🏷 {(fileInfo.name.split('.').pop() ?? '').toUpperCase()}</Text>
              </View>
            )}
          </View>
          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>›</Text>
          </View>
          <View style={styles.previewColumn}>
            <PreviewCard
              label="AFTER"
              uri={processedImage}
              mediaType="image"
              placeholder={selectedImage ? '変換後' : '—'}
              onPickerPress={undefined}
              onImagePress={handleImagePress}
            />
            {selectedImage && fileInfo && (
              <View style={styles.infoBlock}>
                <Text style={styles.infoText}>🏷 {outputFormat.toUpperCase()}</Text>
                <Text style={styles.infoText}>🖼 {Math.round(fileInfo.width * resizePercent / 100)} × {Math.round(fileInfo.height * resizePercent / 100)} px</Text>
                {outputFormat !== 'png' && (
                  <Text style={styles.infoText}>✨ 品質 {convertQuality}%</Text>
                )}
                <Text style={styles.infoText}>💾 {processedImage ? formatBytes(outputBytesRef.current) : '変換後に表示'}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Image Picker Button ── */}
        <ImagePickerComponent
          onImageSelect={handleImageSelect}
          selectedImage={selectedImage || undefined}
          selectedMediaType={selectedMediaType ?? undefined}
        />

        {/* ── Template Section (旧ガビガビレベル) ── */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>テンプレート</Text>
          <View style={styles.formatRow}>
            {GABIGABI_LEVELS.map(item => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.formatButton,
                  gabigabiLevel === item.value && styles.gabigabiButtonActive,
                ]}
                onPress={() => handleTemplateSelect(item.value)}>
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

        {/* ── Settings ── */}

        {/* #80: video not supported notice */}
        {selectedMediaType === 'video' && (
          <View style={styles.videoNoticeCard}>
            <Text style={styles.videoNoticeText}>🎬 動画のガビガビ化は今後対応予定です</Text>
          </View>
        )}

        {/* ── Resize Slider ── */}
        <View style={styles.sliderCard}>
          <ResizeSlider
            value={resizePercent}
            onValueChange={handleResizeChange}
            originalWidth={fileInfo?.width}
            originalHeight={fileInfo?.height}
          />
        </View>

        {/* ── Format Conversion Section ── */}
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
                    onPress={() => handleQualityChange(q)}>
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

      {/* ── Floating Action Area (#112) ── */}
      <View style={styles.floatingArea}>
        {/* Cancel Button during processing */}
        {isProcessing && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            activeOpacity={0.8}>
            <Text style={styles.cancelButtonText}>⛔ キャンセル</Text>
          </TouchableOpacity>
        )}

        {/* Save / Share Buttons after conversion */}
        {processedImage && !isProcessing && (
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

        {/* Main action buttons */}
        <TouchableOpacity
          style={[styles.processButton, (!selectedImage || isProcessing || selectedMediaType === 'video') && styles.disabledButton]}
          onPress={handleProcess}
          disabled={!selectedImage || isProcessing || selectedMediaType === 'video'}
          activeOpacity={0.8}>
          {isProcessing && processingAction === 'gabigabi' ? (
            <View style={styles.processingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.buttonText}> 処理中...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>🔄 変換</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.discordButton, (!selectedImage || isProcessing || selectedMediaType === 'video') && styles.disabledButton]}
          onPress={handleDiscordCompress}
          disabled={!selectedImage || isProcessing || selectedMediaType === 'video'}
          activeOpacity={0.8}>
          {processingAction === 'discord' ? (
            <View style={styles.processingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.buttonText}> 処理中...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>📤 Discord用に10MB以下にクイック圧縮</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

/* ── Inline sub-component: preview card ── */
interface PreviewCardProps {
  label: string;
  uri: string | null;
  mediaType?: 'image' | 'video';
  placeholder: string;
  onPickerPress?: () => void;
  onImagePress?: (uri: string | null) => void;
}

const PreviewCard: React.FC<PreviewCardProps> = ({label, uri, mediaType = 'image', placeholder, onImagePress}) => (
  <View style={styles.previewCard}>
    <Text style={styles.previewLabel}>{label}</Text>
    {uri ? (
      mediaType === 'video' ? (
        <View style={[styles.previewEmpty, styles.videoPreview]}>
          <Text style={styles.videoPreviewIcon}>🎬</Text>
          <Text style={styles.videoPreviewText}>動画</Text>
        </View>
      ) : (
        <TouchableOpacity onPress={() => onImagePress?.(uri)} activeOpacity={0.85}>
          <Image source={{uri}} style={styles.previewImage} resizeMode="cover" />
          <View style={styles.previewTapHint}>
            <Text style={styles.previewTapHintText}>🔍 タップで拡大</Text>
          </View>
        </TouchableOpacity>
      )
    ) : (
      <View style={styles.previewEmpty}>
        <Text style={styles.previewEmptyText}>{placeholder}</Text>
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
    paddingBottom: 180,
  },

  /* header */
  header: {
    paddingTop: 48,
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
    alignItems: 'flex-start',
    marginTop: 20,
    marginBottom: 12,
    gap: 8,
  },
  previewColumn: {
    flex: 1,
  },
  infoBlock: {
    backgroundColor: CARD_BG,
    borderRadius: 10,
    padding: 8,
    marginTop: 6,
    gap: 2,
  },
  infoText: {
    fontSize: 11,
    color: '#aaa',
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
  previewTapHint: {
    position: 'absolute',
    bottom: 4,
    right: 6,
  },
  previewTapHintText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
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

  /* slider card */
  sliderCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },

  /* format section */
  sectionContainer: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 16,
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
    borderColor: ACCENT,
    backgroundColor: ACCENT,
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
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: ACCENT,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  convertButton: {
    flex: 1,
    backgroundColor: ACCENT2,
    paddingVertical: 16,
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

  /* cancel button (#34) */
  cancelButton: {
    backgroundColor: '#555',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#777',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
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

  /* floating action area (#112) */
  floatingArea: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 10,
  },

  /* file info (#97) */
  fileInfoCard: {
    backgroundColor: CARD_BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    marginBottom: 12,
    gap: 4,
  },
  fileInfoTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  fileInfoText: {
    fontSize: 13,
    color: TEXT_PRIMARY,
  },

  /* video notice (#80) */
  videoNoticeCard: {
    backgroundColor: '#1e1a10',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ff9800',
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  videoNoticeText: {
    fontSize: 14,
    color: '#ff9800',
    fontWeight: '700',
  },

  /* video preview (#80) */
  videoPreview: {
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  videoPreviewIcon: {
    fontSize: 40,
  },
  videoPreviewText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
});

export default MainScreen;
