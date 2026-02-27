import React from 'react';
import {View, TouchableOpacity, Text, StyleSheet, Image, Alert} from 'react-native';
import * as ExpoImagePicker from 'expo-image-picker';

interface ImagePickerProps {
  onImageSelect: (imageUri: string) => void;
  selectedImage?: string;
}

const ImagePicker: React.FC<ImagePickerProps> = ({
  onImageSelect,
  selectedImage,
}) => {
  const handlePress = async () => {
    const { status } = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限が必要', 'ギャラリーへのアクセスを許可してください');
      return;
    }
    const result = await ExpoImagePicker.launchImageLibraryAsync({
      mediaTypes: ExpoImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      onImageSelect(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handlePress}>
        {selectedImage ? (
          <Image source={{uri: selectedImage}} style={styles.image} />
        ) : (
          <Text style={styles.buttonText}>画像を選択</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  button: {
    width: 200,
    height: 200,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    borderStyle: 'dashed',
  },
  buttonText: {
    color: '#666',
    fontSize: 16,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
});

export default ImagePicker;
