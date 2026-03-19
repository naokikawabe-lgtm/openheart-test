# OpenHeart Presentation System

このプロジェクトは、Claude Codeで完結するハイクオリティなHTML資料作成システムです。
PowerPointやKeynoteではなく、AIが得意なHTML/CSS/JSで資料を生成します。

## コンセプト

「人間時代のアウトプット形式を疑って、AIが得意な形式に出力をずらす」
— スライド資料もHTML形式で出力することで、デザイン品質と生産性を両立します。

## スライド作成ワークフロー

### Phase 1: 構成設計
1. ユーザーからテーマ・目的・対象者をヒアリング
2. `artifacts/{project-name}/outline.md` にMarkdown形式で骨子を作成
3. 骨子をユーザーに確認

### Phase 2: 構造化
1. 骨子を `artifacts/{project-name}/structure.yaml` にYAML形式で構造化
2. 各スライドのタイプ（title/content/chart/quote/image/cta）を定義
3. コンテンツ密度のチェック（後述のルール参照）

### Phase 3: HTML生成
1. `artifacts/{project-name}/slides.html` に単一HTMLファイルとして出力
2. CSS/JSはすべてインライン（外部依存なし）
3. `templates/base.html` のテンプレートと `templates/openheart-theme.css` のスタイルを参照

### Phase 4: レビュー・微調整
1. ブラウザで開いて確認
2. フィードバックに基づいて修正
3. 必要に応じてPDF出力

## デザインルール（必須）

### ビューポートフィッティング（絶対厳守）
- 各スライドは `height: 100vh; height: 100dvh; overflow: hidden;` であること
- スクロールが発生するスライドは禁止
- すべてのスペーシングに `clamp()` を使用し、固定値は使わない

### コンテンツ密度制限
| スライドタイプ | 最大要素数 |
|---|---|
| タイトル | 見出し1 + サブタイトル1 |
| コンテンツ | 箇条書き最大5項目 |
| 特徴グリッド | 最大6カード |
| コード | 最大8-10行 |
| 引用 | テキスト1 + 出典1 |

制限を超える場合は自動的に複数スライドに分割すること。

### タイポグラフィ
- 日本語フォント: Noto Sans JP（Google Fonts）
- 英語フォント: Inter または Montserrat（Google Fonts）
- フォントサイズは `clamp()` で定義
  - タイトル: `clamp(1.8rem, 5vw, 4rem)`
  - サブタイトル: `clamp(1rem, 2.5vw, 1.75rem)`
  - 本文: `clamp(0.8rem, 1.5vw, 1.125rem)`
  - キャプション: `clamp(0.65rem, 1vw, 0.875rem)`

### カラーパレット（OpenHeart テーマ）
```css
--oh-primary: #E63946;       /* OpenHeart レッド */
--oh-primary-light: #FF6B6B; /* ライトレッド */
--oh-secondary: #1D3557;     /* ディープネイビー */
--oh-accent: #457B9D;        /* アクセントブルー */
--oh-light: #F1FAEE;         /* ライトグリーン */
--oh-white: #FFFFFF;
--oh-dark: #0D1B2A;          /* ダークネイビー */
--oh-gray: #6C757D;
--oh-gray-light: #E9ECEF;
--oh-gradient: linear-gradient(135deg, #E63946 0%, #FF6B6B 50%, #457B9D 100%);
```

### アニメーション
- `.reveal` クラスで要素のフェードイン（opacity: 0 → 1, translateY: 30px → 0）
- 子要素は0.1秒ずつディレイをずらしてスタガー表現
- `prefers-reduced-motion` に対応すること

### レイアウトポリシー
- はみ出し禁止: コンテンツがスライド外にはみ出さないこと
- 重なり禁止: 要素同士が意図せず重ならないこと
- 余白確保: 最低 `clamp(1rem, 3vw, 2rem)` のパディング
- Flexbox/Grid を活用してセンタリング
- 画像の最大高さ: `min(50vh, 400px)`

## ファイル構成

```
openheart-test/
├── CLAUDE.md                          # この設計ドキュメント
├── templates/
│   ├── base.html                      # HTMLテンプレート（リファレンス実装）
│   └── openheart-theme.css            # OpenHeartテーマCSS
├── skills/
│   └── SKILL.md                       # スライド生成スキル定義
├── artifacts/                         # 生成物の出力先
│   └── {project-name}/
│       ├── outline.md                 # 骨子
│       ├── structure.yaml             # 構造化データ
│       └── slides.html                # 最終HTML
└── examples/
    └── sample-presentation.html       # サンプルプレゼン
```

## 品質チェックリスト

生成したスライドは以下を満たしていること:
- [ ] すべてのスライドが100vh内に収まっている
- [ ] フォントがGoogle Fontsから正しく読み込まれている
- [ ] カラーパレットがOpenHeartテーマに準拠している
- [ ] キーボードナビゲーション（矢印キー、スペース）が機能する
- [ ] タッチ/スワイプ操作が機能する
- [ ] プログレスバーが正しく動作する
- [ ] `prefers-reduced-motion` に対応している
- [ ] モバイル（600px以下）でも崩れない
- [ ] コンテンツ密度制限を守っている
- [ ] アニメーションがスムーズに動作する

## 使い方

ユーザーが「スライドを作って」「資料を作って」「プレゼンを作って」等と指示したら:
1. テーマ・目的・対象者を確認
2. 上記ワークフローに沿って作成
3. `artifacts/` に出力

スライドのスタイルバリエーション:
- **openheart-dark**: ダークネイビー背景（プレゼン・登壇向け）
- **openheart-light**: ホワイト背景（資料配布・印刷向け）
- **openheart-gradient**: グラデーション活用（ブランディング・マーケ向け）
