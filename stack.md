# 技術スタック

## 目的
端末内およびクリップボードの JPEG/PNG 画像を、ユーザーが指定した縮小率で低解像度へ変換する Android アプリ。

## 言語
- **TypeScript 5.x + React Native 0.73**  
  型安全な JS 環境。クロスプラットフォーム UI を実装。

## UI
- **React Native + React Navigation 7 + Material 3 Design**  
  宣言的 UI。Expo Vector Icons でシンプルな白基調デザイン。

## 画像処理
- **Rust (image + mozjpeg + oxipng)**  
  Rust でバイナリレベル縮小・再圧縮。高速・メモリ安全。FFI(JNI/Obj-C) で呼び出し。
- **android.graphics.Bitmap API**  
  変換前後の Bitmap 生成とプレビュー表示用途のみ。
- **Glide 4.x**  
  読み込み・キャッシュ・EXIF 自動回転を担当。

## 主要ライブラリ／ツール
- **react-native-fs**：ファイルシステムアクセス
- **@react-native-clipboard/clipboard**：クリップボード操作
- **react-native-image-resizer**：ネイティブ→Rust ブリッジ参考実装
- **react-navigation**：画面遷移
- **zustand**：状態管理 (軽量)
- **MMKV**：設定保存（倍率プリセット）
- **JNI-rs / jni-android-sys**：RN NativeModule から Rust へ橋渡し
- **cbindgen / cargo-ndk**：Rust ライブラリのビルド支援

## ビルド
- **Yarn (npm) + Gradle (Android), Xcode (iOS)**
- EAS Build / GitHub Actions で CI

## テスト
- **JUnit 5**（ユニット）
- **Espresso**（UI）

## 最低対応 API
- **API 24 (Android 7.0)**  
  Compose/Glide が API21 以上を要求。Clipboard 画像 URI も API16+ で動作。

## 拡張余地
- ML Kit Super-resolution 等との併用で高解像度化も実装可
- 将来的に Flutter/Kotlin Multiplatform へ移行して多平台対応も検討可 