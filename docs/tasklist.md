# タスクリスト

## 完了 ✅

- 技術スタック初版作成 (`stack.md`)
- 設計思想初版作成 (`architecture.md`)
- React Native プロジェクト初期化 (TypeScript)
- 必要ライブラリ追加 (`ffmpeg-kit-react-native`, `zustand` など)
- UI 実装
  - 画像選択コンポーネント (ImagePicker.tsx)
  - 倍率入力コンポーネント (ResizeSlider.tsx)
  - メイン画面 (MainScreen.tsx)
  - Zustand 状態管理 (store.ts)
- FFmpeg ライセンス調査・ドキュメント作成 (`docs/ffmpeg_license.md`)
- FFmpegKit 統合（ガビガビ化・フォーマット変換）
- New Architecture 有効化 (`newArchEnabled=true`)
- ガビガビレベル選択 UI
- フォーマット変換 (JPEG / PNG / WebP) + 品質指定
- Discord 用 10MB 圧縮機能
- 変換後プレビュー + ギャラリー保存 / 共有

## TODO

- [ ] クリップボード画像入力サポート
- [ ] MMKV に倍率プリセット保存／読込
- [ ] JS 単体テスト (`jest`)
- [ ] UI テスト (React Native Testing Library)
- [ ] CI パイプライン (GitHub Actions: Android build + Jest)
