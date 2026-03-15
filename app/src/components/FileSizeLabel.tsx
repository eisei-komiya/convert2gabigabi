import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { formatBytes } from '../domain/convertImage';

interface FileSizeLabelProps {
  label: string;
  uri: string;
}

const TEXT_SECONDARY = '#888';
const ACCENT2 = '#fc913a';

const FileSizeLabel: React.FC<FileSizeLabelProps> = ({label, uri}) => {
  const [size, setSize] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uri) {
      setSize(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    // expo-file-system accepts file:// URIs directly
    const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;
    FileSystem.getInfoAsync(fileUri, { size: true })
      .then(info => {
        if (!active) return;
        if (info.exists) {
          const bytes = (info as FileSystem.FileInfo & { size: number }).size ?? 0;
          setSize(formatBytes(bytes));
        } else {
          setSize('取得失敗');
        }
      })
      .catch(() => {
        if (!active) return;
        setSize('取得失敗');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [uri]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>...</Text>
      </View>
    );
  }

  if (!size) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{size}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: ACCENT2,
    marginTop: 2,
  },
});

export default FileSizeLabel;
