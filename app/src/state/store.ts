import {create} from 'zustand';

interface AppState {
  selectedImage: string | null;
  resizePercent: number;
  processedImage: string | null;
  isProcessing: boolean;
  setSelectedImage: (image: string | null) => void;
  setResizePercent: (percent: number) => void;
  setProcessedImage: (image: string | null) => void;
  setIsProcessing: (processing: boolean) => void;
}

export const useAppStore = create<AppState>(set => ({
  selectedImage: null,
  resizePercent: 50,
  processedImage: null,
  isProcessing: false,
  setSelectedImage: image => set({selectedImage: image}),
  setResizePercent: percent => set({resizePercent: percent}),
  setProcessedImage: image => set({processedImage: image}),
  setIsProcessing: processing => set({isProcessing: processing}),
})); 