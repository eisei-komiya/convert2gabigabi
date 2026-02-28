import React, {useCallback} from 'react';
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
import ImagePickerComponent from '../components/ImagePicker';
import ResizeSlider from '../components/ResizeSlider';
import FileSizeLabel from '../components/FileSizeLabel';
import {useAppStore} from '../state/store';
import {resizeImage} from '../domain/useResizeImage';

const MainScreen = () => {
  const {
    selectedImage,
    resizePercent,
    isProcessing,
    processedImage,
    setSelectedImage,
    setResizePercent,
    setProcessedImage,
    setIsProcessing,
  } = useAppStore();

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
    try {
      const result = await resizeImage(selectedImage, resizePercent);
      setProcessedImage(result.outputUri);
    } catch (err) {
      Alert.alert('エラー', `変換に失敗しました: ${String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setProcessedImage(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d0d" />

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
          <PreviewCard
            label="Before"
            uri={selectedImage}
            placeholder="タップして画像を選択"
            onPickerPress={undefined}
          />
          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>›</Text>
          </View>
          <PreviewCard
            label="After"
            uri={processedImage}
            placeholder={selectedImage ? '変換後' : '—'}
            onPickerPress={undefined}
          />
        </View>

        {/* ── Image Picker Button ── */}
        <ImagePickerComponent
          onImageSelect={handleImageSelect}
          selectedImage={selectedImage || undefined}
        />

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

        {/* ── Resize Slider ── */}
        <View style={styles.sliderCard}>
          <ResizeSlider value={resizePercent} onValueChange={handleResizeChange} />
        </View>

        {/* ── Action Buttons ── */}
        <TouchableOpacity
          style={[styles.processButton, (!selectedImage || isProcessing) && styles.disabledButton]}
          onPress={handleProcess}
          disabled={!selectedImage || isProcessing}
          activeOpacity={0.8}>
          {isProcessing ? (
            <View style={styles.processingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.buttonText}> 処理中...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>⚡ 変換する</Text>
          )}
        </TouchableOpacity>

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
  onPickerPress?: () => void;
}

const PreviewCard: React.FC<PreviewCardProps> = ({label, uri, placeholder}) => (
  <View style={styles.previewCard}>
    <Text style={styles.previewLabel}>{label}</Text>
    {uri ? (
      <Image source={{uri}} style={styles.previewImage} resizeMode="cover" />
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

  /* process button */
  processButton: {
    backgroundColor: ACCENT,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: ACCENT,
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
