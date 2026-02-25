# Task List

## 完了 ✅
- 技術スタック初版作成 (`stack.md`)
- 設計思想初版作成 (`architecture.md`)
- React Native プロジェクト初期化 (TypeScript, Yarn v3) ✅
- 必要ライブラリ追加 (`react-native-fs`, `zustand`, `MMKV` など) ✅
- UI スケルトン作成 ✅
  - 画像選択コンポーネント (ImagePicker.tsx) ✅
  - 倍率入力コンポーネント (ResizeSlider.tsx) ✅
  - メイン画面 (MainScreen.tsx) ✅
  - Zustand状態管理 (store.ts) ✅
- Docker環境構築 ✅
  - Dockerfile, docker-compose.yml作成 ✅
  - Expo + React Native Web対応 ✅
- [x] FFmpeg ライセンス調査・商用利用可否ドキュメント作成 (`docs/ffmpeg_license.md`) ✅
- [x] FFmpegを主エンジンとして統合 ✅
  - `ffmpeg-kit-react-native` パッケージ追加 ✅
  - `data/ffmpeg/FfmpegProcessor.ts` 作成 ✅
  - `data/native/RustBridge.ts` 作成（Rustフォールバック）✅
  - `domain/useResizeImage.ts` UseCase作成 ✅
  - `MainScreen.tsx` をUseCase経由に更新 ✅
  - Clean Architectureのファイル構成整備 ✅
- [A] Rust コア画像縮小ライブラリ枠組み作成 (`resize` 関数, `cargo init`, `cargo test`) ✅
- [A] React Native Native Module Bridge ✅ (Android JNI Bridge 実装済み)
  - Android: jni-rs 経由で Rust 呼び出し ✅
  - iOS: C-ABI プロトタイプ (後回し) ⏸️
- [A] Rust 単体テスト (`cargo test`) ✅

## 進行中 🔄
- 開発ルール策定 (`convert2gabigabi-rule.mdc`)
- 要件詳細の精緻化

## TODO
- [A] Rust ↔︎ RN 結合テスト (1 枚画像のリサイズ確認) 🔄
- [B] クリップボード画像入力サポート
- [B] 変換後プレビュー + 保存処理 (`_gabigabi` 命名, Downloads ディレクトリ)
- [B] ダウンロードボタン実装
- [B] コピー(クリップボード)ボタン実装
- [B] MMKV に倍率プリセット保存／読込
- [B] JS 単体テスト (`jest`)
- [B] UI テスト (React Native Testing Library)
- [B] CI パイプライン (GitHub Actions: Rust + Android build + Jest)
- [B] ffmpeg-kit-react-native Android依存追加・実機動作確認

---
最終更新: 2026-02-25
