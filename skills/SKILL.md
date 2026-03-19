# OpenHeart Slide Generator Skill

## 概要
Claude Codeでハイクオリティなプレゼンテーション資料をHTML形式で生成するスキル。
PowerPointやKeynoteに頼らず、AIが得意なHTML/CSS/JSで資料を作成する。

## 起動トリガー
ユーザーが以下のような指示をした場合にこのスキルを使用:
- 「スライドを作って」「資料を作って」「プレゼンを作って」
- 「〇〇についての発表資料」「登壇資料」「提案書」
- `/slides` コマンド

## ワークフロー

### Step 1: ヒアリング（1回のやり取りで完了）
以下を確認する:
- **テーマ**: 何についての資料か
- **目的**: 登壇/提案/教育/ブランディング
- **対象者**: 誰に向けた資料か
- **スタイル**: dark / light / gradient（未指定の場合は目的に応じて選択）
- **スライド枚数目安**: 未指定の場合は内容に応じて10-20枚

### Step 2: 骨子作成
`artifacts/{project-name}/outline.md` に以下の形式で作成:

```markdown
# プレゼンテーションタイトル

## 概要
- 目的: xxx
- 対象: xxx
- 所要時間: xx分

## スライド構成
1. タイトルスライド
2. アジェンダ
3. セクション1: xxx
   - 3-1: xxx
   - 3-2: xxx
4. セクション2: xxx
   ...
N. まとめ・CTA
```

### Step 3: 構造化
`artifacts/{project-name}/structure.yaml` にYAML形式で構造化:

```yaml
presentation:
  title: "プレゼンテーションタイトル"
  subtitle: "サブタイトル"
  author: "発表者名"
  date: "2026-03-19"
  style: "dark"

slides:
  - type: title
    title: "メインタイトル"
    subtitle: "サブタイトル"

  - type: section
    number: "01"
    title: "セクション名"

  - type: content
    heading: "見出し"
    layout: bullets  # bullets | numbered | two-column
    items:
      - "項目1"
      - "項目2"

  - type: cards
    heading: "見出し"
    dark: true
    cards:
      - icon: "🎯"
        title: "カード名"
        description: "説明"

  - type: stats
    heading: "見出し"
    stats:
      - number: "100%"
        label: "ラベル"

  - type: quote
    text: "引用テキスト"
    author: "著者"

  - type: steps
    heading: "見出し"
    steps:
      - title: "ステップ1"
        description: "説明"

  - type: comparison
    heading: "見出し"
    headers: ["項目", "Before", "After"]
    rows:
      - ["項目名", "値1", "値2"]

  - type: cta
    title: "Thank You"
    message: "メッセージ"
    button_text: "ボタンテキスト"
    button_url: "#"
```

### Step 4: HTML生成
`artifacts/{project-name}/slides.html` に単一HTMLファイルとして出力。

生成ルール:
1. `templates/openheart-theme.css` の全CSSをインライン化
2. `templates/base.html` のJavaScriptをそのまま含める
3. Google Fontsのリンクを含める
4. 各スライドに `.reveal` クラスでアニメーションを付与
5. 外部ファイルへの依存なし（完全自己完結HTML）

### Step 5: デリバリー
- ファイルパスをユーザーに伝える
- ブラウザでの開き方を案内
- 操作方法（矢印キー、スワイプ）を説明

## デザイン判断基準

### スタイル自動選択
| 目的 | 推奨スタイル |
|---|---|
| 登壇・プレゼン | dark（ダークネイビー背景） |
| 資料配布・印刷 | light（ホワイト背景） |
| ブランディング | gradient（グラデーション活用） |

### コンテンツ量の目安
| 発表時間 | スライド枚数 |
|---|---|
| 5分（LT） | 8-12枚 |
| 15分 | 15-25枚 |
| 30分 | 25-40枚 |
| 60分 | 40-60枚 |

### 図解のポイント
- SVGではなくHTML/CSS（Flexbox/Grid）で図を構成
- CSS Grid で比較表、フローチャートを表現
- カードグリッドで情報を整理
- ステップ表示でプロセスを可視化
- 数値は大きく目立たせる

## 禁止事項
- ビューポートからのはみ出し
- 1スライドに情報を詰め込みすぎ
- Inter/Roboto以外の一般的すぎるフォント単体使用
- 目的のない装飾アニメーション
- 外部CDNやフレームワークへの依存
- 画像のbase64埋め込み（ローカルパスを使う）
