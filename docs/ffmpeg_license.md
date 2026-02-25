# FFmpeg ライセンス調査レポート

## 概要

本ドキュメントでは、convert2gabigabi アプリに FFmpeg を組み込む際の  
ライセンス上の注意点・商用利用可否をまとめる。

---

## FFmpeg のライセンス構成

FFmpeg 自体は **単一のライセンス** ではなく、  
ビルド時に有効化するコンポーネントによって適用ライセンスが変わる。

| ビルド構成 | 適用ライセンス | 商用利用 | ソース公開義務 |
|---|---|---|---|
| デフォルト（LGPL コンポーネントのみ） | **LGPL v2.1+** | ✅ 可 | FFmpeg 改変部分のみ公開が必要 |
| `--enable-gpl` オプション付き | **GPL v2+** | ✅ 可（ただし条件あり） | アプリ全体のソース公開が必要 |
| `--enable-nonfree` オプション付き | 非フリー（再配布禁止） | ❌ 不可 | 再配布そのものが禁止 |

---

## 商用利用の可否

### ✅ 無料アプリ・有料アプリ ともに利用可能（条件付き）

FFmpeg を **LGPL ビルド** で使用する場合：

- 無料アプリ・有料アプリいずれでも **商用利用は許可されている**
- ただし以下の条件を守る必要がある

#### LGPL v2.1 遵守要件（主要事項）

1. **動的リンク推奨**  
   FFmpeg を静的リンクする場合、ユーザーが FFmpeg 部分を差し替えられるよう  
   オブジェクトファイルを提供するか、動的リンク構成にする必要がある。  
   Android (.so) / iOS (.dylib) で動的ライブラリとして組み込む場合は比較的容易。

2. **著作権表示・ライセンス文の同梱**  
   アプリの About 画面や同梱ファイルに FFmpeg の著作権表示と  
   LGPL ライセンス全文（またはリンク）を記載すること。

3. **FFmpeg 自体の改変をした場合はソース公開が必要**  
   FFmpeg のソースを改変せず利用するだけであればソース公開は不要。

---

## GPL コンポーネントを使う場合

`--enable-gpl` でビルドした FFmpeg（例: libx264, libx265 等を有効化）を  
組み込んだ場合は GPL v2 が適用され、**アプリ全体のソースコード公開**が必要になる。  
商用有料アプリでソース非公開を維持したい場合は **GPL コンポーネントを使わない**こと。

---

## 本プロジェクトへの推奨方針

| 項目 | 推奨 |
|---|---|
| ビルド構成 | LGPL ビルド（`--enable-gpl` なし） |
| リンク方式 | 動的リンク（.so / .dylib） |
| 商用有料化 | **可能**（LGPL 条件遵守の上で） |
| ソース公開 | FFmpeg 未改変の場合は不要 |
| 著作権表示 | About 画面等に FFmpeg クレジットを必ず記載 |

---

## Android 向け実装メモ

- [FFmpeg-Android-Maker](https://github.com/Javernaut/FFmpeg-Android-Maker) や  
  [mobile-ffmpeg](https://github.com/arthenica/ffmpeg-kit) (FFmpegKit) を使うと  
  LGPL ビルド済みの .so をそのまま取得可能。
- **FFmpegKit** (arthenica) は LGPL ビルドを公式提供しており、  
  React Native 向けパッケージ `ffmpeg-kit-react-native` もある。

---

## iOS 向け実装メモ

- FFmpegKit は iOS 向けの xcframework も LGPL ビルドで提供している。
- App Store への提出は FFmpeg 組み込みでも行われている実績多数あり（LGPL 遵守前提）。

---

## 参考リンク

- [FFmpeg License and Legal Considerations（公式）](https://ffmpeg.org/legal.html)
- [FFmpegKit（arthenica）](https://github.com/arthenica/ffmpeg-kit)
- [ffmpeg-kit-react-native](https://github.com/arthenica/ffmpeg-kit/tree/main/react-native)
- [LGPL v2.1 全文](https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html)

---

最終更新: 2026-02-25
