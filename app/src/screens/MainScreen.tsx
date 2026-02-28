import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from 'react-native';
import ImagePicker from '../components/ImagePicker';
import ResizeSlider from '../components/ResizeSlider';
import {useAppStore} from '../state/store';
import {resizeImage} from '../domain/useResizeImage';
import {compressForDiscord} from '../domain/useDiscordCompress';
import {useConvertImage, formatBytes, ImageFormat} from '../domain/useConvertImage';

const FORMAT_OPTIONS: {label: string; value: ImageFormat}[] = [
  {label: 'JPEG', value: 'jpeg'},
  {label: 'PNG', value: 'png'},
  {label: 'WebP', value: 'webp'},
];

const MainScreen = () => {
  const {
    selectedImage,
    resizePercent,
    isProcessing,
    outputFormat,
    convertQuality,
    setSelectedImage,
    setResizePercent,
    setProcessedImage,
    setIsProcessing,
    setOutputFormat,
    setConvertQuality,
  } = useAppStore();

  const handleImageSelect = (imageUri: string) => {
    setSelectedImage(imageUri);
  };

  const handleResizeChange = (percent: number) => {
    setResizePercent(percent);
  };

  const handleProcess = async () => {
    if (!selectedImage) {
      return;
    }
    setIsProcessing(true);
    try {
      const result = await resizeImage(selectedImage, resizePercent);
      setProcessedImage(result.outputUri);
      console.log(`リサイズ完了 (engine: ${result.engine}):`, result.outputUri);
    } catch (err) {
      Alert.alert('エラー', `変換に失敗しました: ${String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConvert = async () => {
    if (!selectedImage) {
      return;
    }
    setIsProcessing(true);
    try {
      const result = await useConvertImage(selectedImage, {
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
      Alert.alert('エラー', `変換に失敗しました: ${String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDiscordCompress = async () => {
    if (!selectedImage) {
      return;
    }
    setIsProcessing(true);
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
      Alert.alert('エラー', `Discord圧縮に失敗しました: ${String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>convert2gabigabi</Text>
      </View>
      <View style={styles.content}>
        <ImagePicker
          onImageSelect={handleImageSelect}
          selectedImage={selectedImage || undefined}
        />
        <ResizeSlider value={resizePercent} onValueChange={handleResizeChange} />

        {/* フォーマット変換セクション */}
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

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.processButton, !selectedImage && styles.disabledButton]}
            onPress={handleProcess}
            disabled={!selectedImage || isProcessing}>
            <Text style={styles.buttonText}>
              {isProcessing ? '処理中...' : 'ガビガビ化'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.convertButton, !selectedImage && styles.disabledButton]}
            onPress={handleConvert}
            disabled={!selectedImage || isProcessing}>
            <Text style={styles.buttonText}>
              {isProcessing ? '処理中...' : 'フォーマット変換'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.discordButton, !selectedImage && styles.disabledButton]}
          onPress={handleDiscordCompress}
          disabled={!selectedImage || isProcessing}
        >
          <Text style={styles.buttonText}>
            {isProcessing ? '処理中...' : 'Discord用に圧縮 (10MB以下)'}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {selectedImage
            ? `選択された画像を${resizePercent}%にリサイズ / ${outputFormat.toUpperCase()}に変換`
            : '画像を選択してください'}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sectionContainer: {
    width: '100%',
    marginTop: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  formatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  formatButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  formatButtonActive: {
    borderColor: '#007bff',
    backgroundColor: '#007bff',
  },
  formatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  formatButtonTextActive: {
    color: '#fff',
  },
  qualityRow: {
    marginTop: 12,
  },
  qualityLabel: {
    fontSize: 13,
    color: '#555',
    marginBottom: 6,
  },
  qualityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  qualityPreset: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f9f9f9',
  },
  qualityPresetActive: {
    borderColor: '#28a745',
    backgroundColor: '#28a745',
  },
  qualityPresetText: {
    fontSize: 13,
    color: '#555',
  },
  qualityPresetTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  processButton: {
    flex: 1,
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  convertButton: {
    flex: 1,
    backgroundColor: '#28a745',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  discordButton: {
    width: '100%',
    backgroundColor: '#5865F2',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  footerText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
});

export default MainScreen;
