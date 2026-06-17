# NEON BREAK 移行診断

診断日: 2026-06-16

## 結果

| 項目 | 状態 | 確認内容 |
| --- | --- | --- |
| Git | 合格 | `git version 2.53.0.windows.3` |
| GitHub CLI | 未完了 | `gh`が未導入 |
| GitHub認証 | 合格 | Git Credential Managerで`waragamef-png`を確認 |
| リポジトリ取得 | 合格 | `origin`は`waragamef-png/neon-break`、`main`を取得 |
| 公開URL | 合格 | HTTPSでHTTP 200 |
| 公開内容 | 合格 | 主要ファイルが取得した`main`と一致 |
| ブロック切り替え | 公開対象 | アイドル、通常、動物をレベル順に循環 |
| Manifest | 合格 | UTF-8、有効なJSON、`display: standalone` |
| Service Worker | 合格 | APP_SHELL、旧キャッシュ削除、`neon-break-v5`を確認 |
| オフライン | 合格 | Chromeでサーバー停止後の再起動に成功 |
| 状態表示 | 合格 | オンライン、オフライン、更新中、準備失敗を表示 |
| 保存 | 合格 | ハイスコアと効果音設定のみ`localStorage` |
| 有料依存 | 合格 | 外部API、DB、決済、課金経路なし |
| 秘密情報 | 合格 | APIキー、トークン、パスワードの参照なし |

## 公開版

- URL: https://waragamef-png.github.io/neon-break/
- 人物顔版コミット: `7d022d3d524d7310cd57011284b3e60fedea9935`
- 公開対象のService Workerキャッシュ: `neon-break-v5`
- APP_SHELLの全URL: HTTP 200

## PWA・オフライン設計

Service Workerはインストール時にアプリ資産を事前キャッシュし、activate時に
現在名以外のキャッシュを削除します。画面遷移はネットワーク優先で、通信失敗時に
キャッシュ済み`index.html`を返す設計です。静的資産はキャッシュ優先です。

ゲームはサーバーデータを参照せず、主要機能は初回取得後に端末内で完結します。
同期対象や送信待ち入力はないため、現状の必要オフラインレベルはレベル1です。

2026-06-16のChrome試験では、APP_SHELL全資産のHTTP 200を確認後、同一プロファイルで
オンライン起動を2回実施しました。テスト用サーバーを完全停止した後もService Worker
経由でアプリ画面とCanvasを再取得でき、オフライン再起動に成功しました。

## 残課題

1. GitHub CLIを導入し、`waragamef-png`で`gh auth login`する。
2. iPhone SafariとAndroid Chromeで、インストール、通信断、再読み込み、
   再起動、再接続を確認する。
3. iOS向け`apple-touch-icon`として180x180以上のPNGを追加する。
4. JavaScript静的解析と自動テストを実行できる開発環境を整備する。
