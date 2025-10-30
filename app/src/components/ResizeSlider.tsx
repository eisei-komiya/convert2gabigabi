import React from 'react';
import {View, Text, StyleSheet, TextInput} from 'react-native';

interface ResizeSliderProps {
  value: number;
  onValueChange: (value: number) => void;
}

const ResizeSlider: React.FC<ResizeSliderProps> = ({value, onValueChange}) => {
  const handleTextChange = (text: string) => {
    const numValue = parseFloat(text);
    if (!isNaN(numValue) && numValue > 0 && numValue <= 100) {
      onValueChange(numValue);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>リサイズ倍率 (%)</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={value.toString()}
          onChangeText={handleTextChange}
          keyboardType="numeric"
          placeholder="50"
        />
        <Text style={styles.unit}>%</Text>
      </View>
      <Text style={styles.hint}>1〜100の範囲で指定してください</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  input: {
    fontSize: 18,
    textAlign: 'center',
    minWidth: 50,
    paddingVertical: 8,
  },
  unit: {
    fontSize: 16,
    marginLeft: 5,
    color: '#666',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
});

export default ResizeSlider; 