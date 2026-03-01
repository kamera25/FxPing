# FxPing

![FxPing](assets/screenshot1.png)

**FxPing** は、複数のホストに対して同時にPingを実行し、ネットワークの接続状況をリアルタイムで監視できる、無料のデスクトップネットワークツールです。

FxPing は、ExPing の精神を受け継ぎつつ、モダンなクロスプラットフォーム技術で再構築したツールです。

## ✨ 主な機能

- **マルチターゲットPing** — 複数のIPアドレス・ホスト名に対して同時にPingを実行
- **リアルタイム監視** — Ping結果をリアルタイムで表示・更新
- **Traceroute** — 対象ホストへのネットワーク経路を可視化（ICMP / UDP対応）
- **NG検知** — 応答タイムアウトや閾値超過を自動検知し、アラートで通知
- **統計情報** — 各ホストの平均・最小・最大RTTなどの統計データを表示
- **ログ・CSV出力** — 監視結果をCSVおよびログファイルとして保存可能
- **ExPing形式対応** — ExPing形式の設定ファイルを読み込み可能
- **ダークモードUI** — モダンで見やすいダークテーマのインターフェース
- **UIサイズ切替** — 大・中・小のUIサイズから選択可能
- **IPv4 / IPv6 対応** — デュアルスタック環境に対応

## 🛠️ 技術スタック

| レイヤー | 技術 |
|---|---|
| フレームワーク | [Tauri 2](https://tauri.app/) |
| フロントエンド | React 19 + TypeScript |
| 状態管理 | Zustand |
| バックエンド | Rust |
| Ping実装 | surge-ping |
| ビルドツール | Vite 7 |
| テスト | Vitest |

## 📦 使い方

- リリース版は、[リリース](https://github.com/kamera25/fxping/releases)からダウンロードしてください。
- [使い方](assets/howtouse.md) をご参照ください。

---

##  必要要件

- [Node.js](https://nodejs.org/) (v18 以上)
- [Rust](https://www.rust-lang.org/tools/install) (最新の stable)
- [Tauri CLI](https://tauri.app/start/)

## 🚀 セットアップ(開発者向け)

```bash
# リポジトリのクローン
git clone https://github.com/kamera25/fxping.git
cd fxping

# 依存パッケージのインストール
npm install

# 開発モードで起動
npm run tauri dev
```

> **Note:** Ping の実行には管理者権限（sudo）が必要な場合があります。

## 🏗️ ビルド

### macOS
```bash
# クイックビルド (.dmg)
./build.sh

# Windows向けも同時にビルドする場合 (要セットアップ)
./build.sh --windows
```

### Windows (Git Bash / WSL)
```bash
# インストーラー (.exe) のビルド
./build.sh
```


ビルド成果物は `src-tauri/target/release/bundle/` に生成されます。

## 📁 プロジェクト構成

```
fxping/
├── src/                    # フロントエンド (React + TypeScript)
│   ├── components/         # UIコンポーネント
│   ├── hooks/              # カスタムフック
│   ├── store/              # 状態管理 (Zustand)
│   ├── styles/             # グローバルスタイル・デザイントークン
│   ├── utils/              # ユーティリティ関数
│   └── types.ts            # 型定義
├── src-tauri/              # バックエンド (Rust)
│   └── src/
│       ├── fxping.rs       # Tauriコマンド定義
│       ├── pinger.rs       # Ping実行エンジン
│       ├── tracer.rs       # Traceroute実行エンジン
│       ├── resolve.rs      # DNS解決
│       ├── error.rs        # エラーハンドリング
│       └── tcpip/          # TCP/IPデータ型 (Newtype Pattern)
├── package.json
└── README.md
```

## 🙏 謝辞
- **[Tauri](https://tauri.app/)** — 軽量かつセキュアなクロスプラットフォームデスクトップアプリケーションフレームワーク
- **[surge-ping](https://crates.io/crates/surge-ping)** — Rust 製の高性能 ICMP ライブラリ
- **[ExPing](http://www.woodybells.com/exping.html)** — FxPing の着想の原点です。

ExPing は Windows 環境で教育、現場業務で長年にわたり信頼されてきたネットワーク監視ツールです。  
そのシンプルながらも強力な機能設計は、FxPing の開発において大きな道標となりました。


## 📄 ライセンス

MIT License — 詳しくは [LICENSE](./LICENSE) をご覧ください。

Copyright (c) 2026 NAKAOKU Takahiro
