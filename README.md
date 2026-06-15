# NEON BREAK

スマートフォン向けの人物顔ブロック崩しPWAです。Canvas、ポインター操作、
キーボード操作、効果音、ハイスコア保存、Service Workerによる
オフライン起動に対応しています。

## 公開先

- App: https://waragamef-png.github.io/neon-break/
- Repository: https://github.com/waragamef-png/neon-break
- Hosting: GitHub Pages (`main` branch, repository root)

公開と通常運用に有料サービスは使用しません。

## プロダクト

対象利用者は、スマートフォンで短時間に遊べる軽量なアーケードゲームを求める人です。
通信環境に左右されず、指一本ですぐ遊べるブロック崩しを提供します。

MVPはゲーム進行、タッチ・キーボード操作、人物顔ブロック、効果音、
ハイスコア保存、PWAインストール、オフライン起動です。オンライン同期、
ランキング、ログインは後続機能とし、初期版には含めません。

参照とゲーム操作は端末内で完結するため、オフラインレベルはレベル1です。

## 構成

- `index.html`: アプリ画面
- `styles.css`: モバイルファーストの表示
- `game.js`: ゲーム、入力、端末設定保存
- `assets/idol-faces.jpg`: AI生成した架空の成人アイドル顔スプライト
- `manifest.webmanifest`: PWA設定
- `sw.js`: アプリ資産のキャッシュ
- `icons/`: PWAアイコン

構造化された利用者データは現在ありません。ハイスコアと効果音設定だけを
小規模設定値として`localStorage`へ保存します。

人物画像は実在する芸能人やAKB48メンバー本人を再現したものではなく、
日本のポップアイドル写真を着想源に生成した架空の成人8人です。

## 更新

アプリ資産を変更した場合は、`sw.js`の`CACHE_NAME`を必ず新しい値へ
変更してください。

```bash
git add .
git commit -m "Update app"
git push origin main
```

公開後はオンライン起動、新版への更新、オフライン再起動、旧キャッシュ削除、
未保存データへの影響がないことを確認します。

## 引継ぎ

- [移行診断](docs/MIGRATION_DIAGNOSTIC.md)
- [リリース確認表](docs/RELEASE_CHECKLIST.md)
