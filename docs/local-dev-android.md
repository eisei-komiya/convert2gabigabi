# ローカル開発環境セットアップ（Android）

このドキュメントでは、実機Androidスマホを使ったローカル開発環境の構築手順を説明します。
EASクラウドビルドを使わず、ローカルビルド + Wi-Fi hot reloadで快適に開発できます。

## 前提条件

- Linux（Fedora/Ubuntu等）
- Node.js v18以上
- Java 17以上（Temurin推奨）
- Android SDK（Android Studioまたは単体インストール）
- Androidスマホ（USBデバッグ有効）

## 1. 環境確認

```bash
java -version       # 17以上であること
node -v             # 18以上であること
adb version         # Android Debug Bridge が使えること
echo $ANDROID_HOME  # Android SDKパスが設定されていること
```

## 2. 初回ビルド（APKをスマホにインストール）

USBケーブルでPCとスマホを接続してから実行します。

### スマホ側の準備

1. **開発者向けオプション**を有効化
   - 設定 → デバイス情報 → ビルド番号を**7回タップ**
2. **USBデバッグ**をON
   - 設定 → 開発者向けオプション → USBデバッグ
3. USBでPCに接続し、「このPCを信頼しますか？」→ **許可**

### 接続確認

```bash
adb devices
# 例: 000662488000606  device  ← 表示されればOK
```

### ビルド＆インストール

```bash
cd app
npx expo run:android
```

初回は10〜20分程度かかります。2回目以降はキャッシュが効いて1分以内で完了します。

> **補足**: このプロジェクトは `expo-dev-client` を使用しているため、Expo Goアプリでは動作しません。必ず `npx expo run:android` でカスタムdev clientをビルドしてください。

---

## 3. Wi-Fi経由でのHot Reload設定

初回ビルド後、USBなしでWi-Fi経由でコード変更を即反映させる設定です。

### 自分のPCのIPアドレスを調べる

```bash
ip route get 1 | awk '{print $7; exit}'
# または
hostname -I | awk '{print $1}'
# 例: 192.168.0.42
```

### スマホのIPアドレスを調べる

方法1: adbで調べる（USB接続中に実行）
```bash
adb shell ip route | awk '{print $9}'
# 例: 192.168.0.173
```

方法2: スマホ本体で調べる
- 設定 → Wi-Fi → 接続中のネットワーク → IPアドレス

### Wi-Fiデバッグ有効化手順（USB接続中に実行）

```bash
# 1. Wi-FiデバッグモードをON（ポート5555で待ち受け）
adb tcpip 5555

# 2. スマホのIPで接続（IPは上記で調べたものに変更）
adb connect <スマホのIP>:5555
# 例: adb connect 192.168.0.173:5555

# 3. ポートフォワード設定（スマホのlocalhost:8081 → PCのlocalhost:8081）
adb -s <スマホのIP>:5555 reverse tcp:8081 tcp:8081
# 例: adb -s 192.168.0.173:5555 reverse tcp:8081 tcp:8081
```

この設定が完了したら**USBを抜いてOK**です。

> **注意**: PCまたはスマホを再起動すると設定がリセットされます。再度上記手順が必要です。

---

## 4. 開発サーバー起動

```bash
cd app
npx react-native start
```

スマホのアプリを開けば自動で接続されます。コードを変更するとスマホ画面に即反映されます。

---

## 5. 毎回の開発フロー（セットアップ済みの場合）

### PCとスマホが同じWi-Fiに繋がっている場合

```bash
# Wi-Fi接続が切れてる場合は再接続（スマホIPは環境に応じて変更）
adb connect 192.168.0.173:5555
adb -s 192.168.0.173:5555 reverse tcp:8081 tcp:8081

# 開発サーバー起動
cd app && npx react-native start
```

### ネイティブコードを変更した場合（再ビルドが必要なケース）

以下の場合は再ビルドが必要です：
- `package.json` に新しいネイティブライブラリを追加した
- Expo SDKのバージョンを上げた
- `/android` や `/ios` 配下のネイティブコードを直接変更した

通常のJS/TSコードの変更（画面レイアウト、ロジック等）は再ビルド不要です。

```bash
cd app
npx expo run:android  # USBでスマホを繋いだ状態で実行
```

---

## トラブルシューティング

### `adb devices` でスマホが表示されない

1. USBケーブルを抜き差し
2. スマホの画面に「USBデバッグを許可しますか？」と表示されていないか確認 → 許可
3. USBデバッグがONになっているか確認

### 「Could not connect to development server」エラー

```bash
# ポートフォワードを再設定
adb -s <スマホのIP>:5555 reverse tcp:8081 tcp:8081

# Metro が起動しているか確認
curl http://localhost:8081/status
# "packager-status:running" と表示されればOK
```

### アプリが白/黒い画面のまま起動しない

```bash
# アプリを完全終了してから再起動
adb shell am force-stop com.app
adb shell am start -n com.app/.MainActivity
```

### `require` エラーが出る（RN 0.80以降の既知問題）

`npx expo start` ではなく `npx react-native start` で起動してください。

```bash
# NG（lazy bundlingが有効になりエラーになる場合がある）
npx expo start

# OK
npx react-native start
```
