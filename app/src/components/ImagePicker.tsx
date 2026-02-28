import React from 'react';
import {View, TouchableOpacity, Text, StyleSheet} from 'react-native';

interface ImagePickerProps {
  onImageSelect: (imageUri: string) => void;
  selectedImage?: string;
}

const ACCENT = '#ff4e50';
const CARD_BG = '#1a1a1a';
const BORDER = '#2a2a2a';
const TEXT_SECONDARY = '#888';

const ImagePicker: React.FC<ImagePickerProps> = ({
  onImageSelect: _onImageSelect,
  selectedImage,
}) => {
  const handlePress = () => {
    // TODO: 画像選択機能を実装 (#11)
    console.log('Image picker pressed');
  };

  return (
    <TouchableOpacity
      style={[styles.button, selectedImage && styles.buttonSelected]}
      onPress={handlePress}
      activeOpacity={0.7}>
      <Text style={styles.icon}>🖼️</Text>
      <Text style={styles.buttonText}>
        {selectedImage ? '画像を変更する' : '画像を選択する'}
      </Text>
      {!selectedImage && (
        <Text style={styles.hint}>タップしてギャラリーを開く</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: BORDER,
    borderStyle: 'dashed',
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonSelected: {
    borderColor: ACCENT,
    borderStyle: 'solid',
    borderWidth: 1,
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  buttonText: {
    color: '#f0f0f0',
    fontSize: 15,
    fontWeight: '700',
  },
  hint: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    marginTop: 4,
  },
});

export default ImagePicker;
