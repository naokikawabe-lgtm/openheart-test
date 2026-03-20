# OpenHeart Slide Generator Skill

## 設計思想

PowerPointやKeynoteは独自の複雑な形式を持ち、AIには「触りにくい」構造をしている。
AIの能力が「フォーマットの壁」に阻まれている。

**解決策**: AIが最も得意な「コーディング」で資料を作り、ブラウザでレンダリングする。
スライドを「パワポファイル」ではなく「1つのWebサイト」として作る。

実態は **非常に長い1枚のWebページ** を、16:9比率のセクションで区切って画面送りしているだけ。

## 起動トリガー

ユーザーが以下のような指示をした場合にこのスキルを使用:
- 「スライドを作って」「資料を作って」「プレゼンを作って」
- 「〇〇についての発表資料」「登壇資料」「提案書」

## ワークフロー

### Step 1: ヒアリング（1回のやり取りで完了）
以下を確認:
- **テーマ**: 何についての資料か
- **目的**: 登壇/提案/教育/ブランディング
- **対象者**: 誰に向けた資料か
- **スタイル**: dark / light / gradient（未指定の場合は目的に応じて選択）
- **スライド枚数目安**: 未指定の場合は内容に応じて10-20枚

### Step 2: 記事構成を書く（最重要）
`artifacts/{project-name}/outline.md` にMarkdown形式で作成。

**ポイント**: まず「伝えたいストーリー」を記事として整理する。
Claude Codeに記事構成を書かせ、それをスライドに変換する。

```markdown
# プレゼンテーションタイトル

## 概要
- 目的: xxx
- 対象: xxx
- 所要時間: xx分

## ストーリー構成
1. タイトル — 第一印象でインパクト
2. 課題提起 — なぜこの話をするのか
3. 現状分析 — 数値・事実で裏付け
4. 発想の転換 — 核心の気づき（引用で印象づけ）
5. ソリューション — 図解で分かりやすく
6. 具体的方法 — ステップ表示
7. Before/After — 比較で効果を可視化
8. 詳細機能 — カードグリッドで整理
9. まとめ — 要点を番号付きリストで
10. CTA — 行動を促す
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
      - icon: "&#x1f3af;"
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

  - type: diagram-flow
    heading: "見出し"
    nodes:
      - label: "入力"
        type: "default"
      - label: "処理"
        type: "primary"
      - label: "出力"
        type: "accent"

  - type: diagram-versus
    heading: "見出し"
    before:
      title: "従来"
      items: ["項目1", "項目2"]
    after:
      title: "新方式"
      items: ["項目1", "項目2"]

  - type: cta
    title: "Thank You"
    message: "メッセージ"
```

### Step 4: HTML生成（Vibe Coding）
`artifacts/{project-name}/slides.html` に **単一HTMLファイル** として出力。

生成ルール:
1. `templates/openheart-theme.css` の全CSSをインライン化
2. `templates/base.html` のJavaScriptをそのまま含める
3. Google Fontsのリンクを含める（唯一の外部依存）
4. 各スライドに `.reveal` クラスでアニメーションを付与
5. **1枚の長いWebページとして生成し、16:9セクションで区切る**
6. **図解はHTML/CSSで構成（SVG不使用）**

### Step 5: デリバリー
- ファイルパスをユーザーに伝える
- ブラウザでの開き方を案内
- 操作方法の説明:
  - `→` / `↓` / `Space`: 次のスライド
  - `←` / `↑`: 前のスライド
  - `Home` / `End`: 最初/最後
  - スワイプ / マウスホイール対応

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

### 図解の作り方（重要）
- **SVGではなくHTML/CSSで図を構成する**
- CSS Gridでフローチャート、比較表、マトリクスを表現
- Flexboxでステップ表示、タイムラインを構成
- `border`, `background`, `border-radius` で図形を描画
- 矢印は `::after` 擬似要素やCSS三角形で表現
- カードグリッドで情報を整理し、視覚的な図解として機能させる
- 利用可能なCSS図解コンポーネント:
  - `.diagram-flow`: フローチャート（横方向）
  - `.diagram-flow-vertical`: フローチャート（縦方向）
  - `.diagram-matrix`: 2×2マトリクス
  - `.diagram-versus`: Before/After比較レイアウト
  - `.card-grid`: カードベースの情報整理
  - `.steps`: ステッププロセス表示
  - `.stat-grid`: 数値インパクト表示

## 禁止事項
- ビューポートからのはみ出し（絶対厳守）
- 1スライドに情報を詰め込みすぎ
- SVGの使用（HTML/CSSで図解を構成すること）
- 目的のない装飾アニメーション
- 外部CDNやフレームワークへの依存（Google Fonts以外）
- 画像のbase64埋め込み（ローカルパスを使う）
- 固定値のスペーシング（`clamp()` を使う）
