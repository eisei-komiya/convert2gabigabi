import {create} from 'zustand';
import { ImageFormat } from '../domain/convertImage';

interface AppState {
  selectedImage: string | null;
  resizePercent: number;
  processedImage: string | null;
  isProcessing: boolean;
  outputFormat: ImageFormat;
  convertQuality: number;
  gabigabiLevel: number | null;
  setSelectedImage: (image: string | null) => void;
  setResizePercent: (percent: number) => void;
  setProcessedImage: (image: string | null) => void;
  setIsProcessing: (processing: boolean) => void;
  setOutputFormat: (format: ImageFormat) => void;
  setConvertQuality: (quality: number) => void;
  setGabigabiLevel: (level: number | null) => void;
}

export const useAppStore = create<AppState>(set => ({
  selectedImage: null,
  resizePercent: 100,
  processedImage: null,
  isProcessing: false,
  outputFormat: 'jpeg',
  convertQuality: 85,
  gabigabiLevel: null,
  setSelectedImage: image => set({selectedImage: image}),
  setResizePercent: percent => set({resizePercent: percent}),
  setProcessedImage: image => set({processedImage: image}),
  setIsProcessing: processing => set({isProcessing: processing}),
  setOutputFormat: format => set({outputFormat: format}),
  setConvertQuality: quality => set({convertQuality: quality}),
  setGabigabiLevel: level => set({gabigabiLevel: level}),
}));
