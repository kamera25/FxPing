#!/bin/bash
# FxPing ビルドスクリプト
# entitlementsを正しく埋め込むため、APPLE_SIGNING_IDENTITY を設定してビルドします。

set -e

echo "🔨 FxPing リリースビルドを開始します..."
APPLE_SIGNING_IDENTITY="-" npm run tauri build

echo ""
echo "✅ ビルド完了!"
echo "📦 DMG: src-tauri/target/release/bundle/dmg/"
