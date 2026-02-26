import React from 'react';
import {SafeAreaView, StyleSheet, Text, View, TouchableOpacity, Alert} from 'react-native';
import ImagePicker from '../components/ImagePicker';
import ResizeSlider from '../components/ResizeSlider';
import {useAppStore} from '../state/store';
import {resizeImage} from '../domain/useResizeImage';

const MainScreen = () => {
  const {
    selectedImage,
    resizePercent,
    isProcessing,
    setSelectedImage,
    setResizePercent,
    setProcessedImage,
    setIsProcessing,
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
      console.log(`処理完了 (engine: ${result.engine}):`, result.outputUri);
    } catch (err) {
      Alert.alert('エラー', `変換に失敗しました: ${String(err)}`);
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
        <TouchableOpacity 
          style={[styles.processButton, !selectedImage && styles.disabledButton]}
          onPress={handleProcess}
          disabled={!selectedImage || isProcessing}
        >
          <Text style={styles.buttonText}>
            {isProcessing ? '処理中...' : '画像を変換'}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {selectedImage 
            ? `選択された画像を${resizePercent}%にリサイズします` 
            : '画像を選択してください'
          }
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
  processButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
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