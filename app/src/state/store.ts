import {create} from 'zustand';
import { ImageFormat } from '../domain/useConvertImage';

interface AppState {
  selectedImage: string | null;
  resizePercent: number;
  processedImage: string | null;
  isProcessing: boolean;
  outputFormat: ImageFormat;
  convertQuality: number;
  setSelectedImage: (image: string | null) => void;
  setResizePercent: (percent: number) => void;
  setProcessedImage: (image: string | null) => void;
  setIsProcessing: (processing: boolean) => void;
  setOutputFormat: (format: ImageFormat) => void;
  setConvertQuality: (quality: number) => void;
}

export const useAppStore = create<AppState>(set => ({
  selectedImage: null,
  resizePercent: 50,
  processedImage: null,
  isProcessing: false,
  outputFormat: 'jpeg',
  convertQuality: 85,
  setSelectedImage: image => set({selectedImage: image}),
  setResizePercent: percent => set({resizePercent: percent}),
  setProcessedImage: image => set({processedImage: image}),
  setIsProcessing: processing => set({isProcessing: processing}),
  setOutputFormat: format => set({outputFormat: format}),
  setConvertQuality: quality => set({convertQuality: quality}),
}));
