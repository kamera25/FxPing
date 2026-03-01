#!/bin/bash
# FxPing ビルドスクリプト
# macOS では DMG、Windows (Git Bash等) では NSIS インストーラーを生成します。

set -e

PLATFORM="macos"
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    PLATFORM="windows"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLATFORM="linux"
fi

# 引数でターゲットを明示的に指定可能にする (--windows)
BUILD_WINDOWS=false
for arg in "$@"; do
    if [ "$arg" == "--windows" ]; then
        BUILD_WINDOWS=true
    fi
done

echo "🔨 FxPing リリースビルドを開始します..."

if [ "$PLATFORM" == "macos" ]; then
    echo "🍎 macOS (DMG) のビルド中..."
    APPLE_SIGNING_IDENTITY="-" npm run tauri build
    
    if [ "$BUILD_WINDOWS" = true ]; then
        echo ""
        echo "🪟 Windows (EXE) のクロスビルドを試行します..."
        echo "⚠️  注意: これには cargo-xwin と NSIS (Homebrew) 等のセットアップが必要です。"
        npm run tauri build -- --target x86_64-pc-windows-gnu
    fi
elif [ "$PLATFORM" == "linux" ]; then
    echo "🐧 Linux (AppImage/Deb) のビルド中..."
    npm run tauri build
else
    echo "🪟 Windows (EXE) のビルド中..."
    npm run tauri build
fi

echo ""
echo "✅ ビルド完了!"

if [ "$PLATFORM" == "macos" ]; then
    echo "📦 DMG: src-tauri/target/release/bundle/dmg/"
    if [ "$BUILD_WINDOWS" = true ]; then
        echo "📦 EXE: src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/"
    fi
elif [ "$PLATFORM" == "linux" ]; then
    echo "📦 AppImage/Deb: src-tauri/target/release/bundle/"
else
    echo "📦 EXE: src-tauri/target/release/bundle/nsis/"
fi
