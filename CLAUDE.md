# convert2gabigabi — AI エージェント作業ガイド

このファイルは Claude / GitHub Copilot などの AI エージェントが
**自律的に UI デザインを変更→確認→修正** できるようにするための手順書です。

---

## プロジェクト概要

React Native (+ Expo) + Rust コアの画像縮小アプリ。
ブラウザ (React Native Web) でも動作するため、**Web 版でスクリーンショットによる UI 確認**が可能。

---

## 自律 UI 開発ループ

```
1. UIファイルを編集 (app/src/screens/, app/src/components/)
2. Web ビルドを実行
3. Playwright でスクリーンショットを撮る
4. スクリーンショットを確認し、問題があれば 1 に戻る
5. テスト・Lint を通過したら commit & push
```

---

## ローカル開発コマンド

```bash
# 依存パッケージインストール
cd app && yarn install

# Web 版開発サーバー起動 (ポート 8081)
cd app && yarn web

# Web 用静的ビルド (web-build/ に出力)
cd app && npx expo export --platform web

# スクリーンショット撮影 (Playwright)
cd app && npx playwright test e2e/screenshot.spec.ts

# Lint
cd app && yarn lint

# Jest テスト
cd app && yarn test

# Rust テスト
cd rust_core && cargo test
```

---

## Docker を使う場合

```bash
# コンテナ起動 (Web UI: http://localhost:3001)
docker compose up web-dev

# コンテナ内でビルド
docker compose run --rm convert2gabigabi bash -c "cd app && npx expo export --platform web"
```

---

## ファイル構成 (UI 関連)

```
app/
  src/
    screens/
      MainScreen.tsx       # メイン画面
    components/
      ImagePicker.tsx      # 画像選択コンポーネント
      ResizeSlider.tsx     # 倍率スライダー
    state/
      store.ts             # Zustand 状態管理
  e2e/
    screenshot.spec.ts     # Playwright スクリーンショットテスト
  playwright.config.ts     # Playwright 設定
```

---

## デザイン指針

- **白基調 + Material 3**
- ダウンロードボタン・クリップボードコピーボタン必須
- フォント・余白は Material Design の spacing scale (4/8/16/24dp) を使用
- カラートークン例:
  - Primary: `#6750A4` (MD3 Purple)
  - Surface: `#FFFFFF`
  - On-surface: `#1C1B1F`

---

## スクリーンショット確認の手順

1. `cd app && npx expo export --platform web` で `web-build/` を生成
2. `npx serve web-build -l 4000 &` でローカルサーバーを起動
3. `npx playwright test e2e/screenshot.spec.ts` を実行
4. `app/e2e/screenshots/` 配下の PNG を確認する

CI (GitHub Actions) では `ui-preview` ワークフローが自動実行し、
スクリーンショットを **Artifacts** としてアップロードします。

---

## CI でのスクリーンショット確認

1. PR を作成 / push する
2. GitHub Actions の `ui-preview` ワークフローが起動
3. ワークフロー完了後、Actions タブの `Artifacts` から `ui-screenshots` をダウンロードして確認

---

## コミット規約

| プレフィックス | 用途 |
|---|---|
| `[feat]` | 新機能 |
| `[fix]` | バグ修正 |
| `[style]` | UI・スタイル変更 |
| `[refactor]` | リファクタリング |
| `[test]` | テスト追加・修正 |
| `[docs]` | ドキュメント |
| `[ci]` | CI/CD 変更 |

コミットメッセージは **日本語** で記述する。

---

## 注意事項

- `app/src/` のファイルを変更した場合は必ず `yarn lint` と `yarn test` を通過させる
- ネイティブ固有コード (android/, ios/) は変更しない
- Rust コアは UI 作業では触らない (`rust_core/` は対象外)
