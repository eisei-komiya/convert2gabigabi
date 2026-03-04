# Task List

## 完了 ✅

- 技術スタック初版作成 (`stack.md`)
- 設計思想初版作成 (`architecture.md`)
- React Native プロジェクト初期化 (TypeScript, Yarn v3)
- 必要ライブラリ追加 (`ffmpeg-kit-react-native`, `zustand` など)
- UI スケルトン作成
  - 画像選択コンポーネント (ImagePicker.tsx)
  - 倍率入力コンポーネント (ResizeSlider.tsx)
  - メイン画面 (MainScreen.tsx)
  - Zustand状態管理 (store.ts)
- FFmpeg ライセンス調査・商用利用可否ドキュメント作成 (`docs/ffmpeg_license.md`)
- FFmpegを主エンジンとして統合
  - `ffmpeg-kit-react-native` パッケージ追加
  - `data/ffmpeg/FfmpegProcessor.ts` 作成
  - `domain/useResizeImage.ts` UseCase作成
  - `MainScreen.tsx` をUseCase経由に更新
  - Clean Architectureのファイル構成整備
- New Architecture 有効化 (`newArchEnabled=true`)
- リサイズ倍率 100% プリセット追加

## TODO

- [ ] 変換後プレビュー + 保存処理 (`_gabigabi` 命名, Downloads ディレクトリ)
- [ ] ダウンロードボタン実装
- [ ] コピー(クリップボード)ボタン実装
- [ ] クリップボード画像入力サポート
- [ ] MMKV に倍率プリセット保存／読込
- [ ] JS 単体テスト (`jest`)
- [ ] UI テスト (React Native Testing Library)
- [ ] CI パイプライン (GitHub Actions: Android build + Jest)
- [ ] ffmpeg-kit-react-native Android依存追加・実機動作確認

---
最終更新: 2026-03-04
