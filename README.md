# convert2gabigabi

画像リサイズアプリケーション - React Native + Rust

## 🐳 Docker開発環境

### 環境要件
- Docker
- Docker Compose

### クイックスタート

```bash
# 1. リポジトリクローン
git clone <repository-url>
cd convert2gabigabi

# 2. Docker環境構築・起動
docker-compose up --build

# 3. ブラウザでアクセス
# Metro server: http://localhost:8081
# Web版UI: http://localhost:3001
```

### 主要コマンド

```bash
# 開発サーバー起動
docker-compose up

# バックグラウンド起動
docker-compose up -d

# Rustテスト実行
docker-compose exec convert2gabigabi bash -c "cd rust_core && cargo test"

# コンテナ内でbash起動
docker-compose exec convert2gabigabi bash

# 環境クリーンアップ
docker-compose down --volumes
```

### UIテスト方法

1. **Webブラウザ**: `http://localhost:3001` でUIテスト
2. **実機テスト**: Expo Goアプリで`exp://localhost:8081`に接続

## 📱 実機テスト (Expo Go)

1. スマートフォンに [Expo Go](https://expo.dev/client) をインストール
2. 同じWiFiネットワークに接続
3. QRコードをスキャンしてアプリ起動

## 🦀 Rust開発

```bash
# Rust単体テスト
docker-compose exec convert2gabigabi bash -c "cd rust_core && cargo test"

# Rustライブラリビルド
docker-compose exec convert2gabigabi bash -c "cd rust_core && cargo build --release"
```

## 📁 プロジェクト構成

```
convert2gabigabi/
├── app/                    # React Native アプリ
│   ├── src/
│   │   ├── components/     # UIコンポーネント
│   │   ├── screens/        # 画面コンポーネント
│   │   └── state/          # 状態管理 (Zustand)
│   └── package.json
├── rust_core/              # Rust 画像処理ライブラリ
│   ├── src/
│   └── Cargo.toml
├── Dockerfile
├── docker-compose.yml
└── README.md
```