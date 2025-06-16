import React from 'react';
import {SafeAreaView, StyleSheet, Text, View} from 'react-native';

const MainScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>convert2gabigabi</Text>
      </View>
      <View style={styles.content}>
        {/* ImagePicker and ResizeSlider will go here */}
      </View>
      <View style={styles.footer}>
        {/* Action buttons will go here */}
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  footer: {
    padding: 20,
  },
});

export default MainScreen; 