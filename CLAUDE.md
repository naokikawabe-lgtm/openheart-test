# OpenHeart Presentation System

Claude Codeで完結する、ハイクオリティなHTML資料作成システム。

## 設計思想

### なぜHTMLなのか

PowerPointやKeynoteは独自の複雑な形式を持ち、AIには「触りにくい」構造をしている。
AIスライド生成ツール（python-pptx, Marp, Copilot, Gamma等）はどれも「フォーマットの壁」に阻まれ、
登壇や社外提案に使えるクオリティは出せない。

**発想の転換**: AIが最も得意なのは「コーディング」。ブラウザは世界で最も精巧なレンダリングエンジン。
スライドを「パワポファイル」ではなく「1つのWebサイト」として作ればいい。

### 仕組み

スライドに見える資料の正体は、**非常に長い1枚のWebページ**。
16:9比率のセクションを画面送りで表示しているだけ。
Claude Codeにまず記事構成を書かせ、それを16:9のWebサイトとしてVibe Codingさせる。

> 「人間時代のアウトプット形式を疑って、AIが得意な形式に出力をずらす」
> — スライドに限らず、AI時代の汎用的な設計思想

### 効果

- 今までKeynoteで2日かかっていた資料作成が **3時間** で完了
- デザインクオリティはKeynote以上（図解がしっかり入る）
- 人間がAIに合わせることで、格段に使えるアウトプットが手に入る

## スライド作成ワークフロー

### Phase 1: 構成設計（記事構成）
1. ユーザーからテーマ・目的・対象者をヒアリング
2. `artifacts/{project-name}/outline.md` にMarkdown形式で **記事のような構成** を作成
3. 骨子をユーザーに確認
4. ここが最重要: **まず「伝えたいストーリー」を記事として整理する**

### Phase 2: 構造化
1. 骨子を `artifacts/{project-name}/structure.yaml` にYAML形式で構造化
2. 各スライドのタイプ（title/content/chart/quote/image/diagram/cta）を定義
3. 16:9セクションに収まるようコンテンツ密度をチェック
4. 制限を超える場合は自動的に複数スライドに分割

### Phase 3: HTML生成（Vibe Coding）
1. `artifacts/{project-name}/slides.html` に **単一HTMLファイル** として出力
2. CSS/JSはすべてインライン（外部依存なし、Google Fontsのみ例外）
3. `templates/base.html` のテンプレートと `templates/openheart-theme.css` のスタイルを参照
4. 1枚の長いWebページとして生成し、16:9セクションで区切る
5. **図解はSVGではなくHTML/CSS（Flexbox/Grid）で構成する**

### Phase 4: レビュー・微調整
1. ブラウザで開いて確認
2. フィードバックに基づいて修正（Claude Codeが即座に対応）
3. 必要に応じてPDF出力

## デザインルール（必須）

### 16:9ビューポートフィッティング（絶対厳守）
- 各セクション（スライド）は `width: 100vw; height: 100vh; height: 100dvh; overflow: hidden;`
- スクロールが発生するセクションは禁止
- すべてのスペーシングに `clamp()` を使用し、固定値は使わない
- アスペクト比16:9を意識したレイアウト設計

### コンテンツ密度制限
| スライドタイプ | 最大要素数 |
|---|---|
| タイトル | 見出し1 + サブタイトル1 |
| コンテンツ | 箇条書き最大5項目 |
| 特徴グリッド | 最大6カード |
| コード | 最大8-10行 |
| 引用 | テキスト1 + 出典1 |
| 図解 | 主要要素最大6つ |

制限を超える場合は自動的に複数スライドに分割すること。

### タイポグラフィ
- 日本語フォント: Noto Sans JP（Google Fonts）
- 英語フォント: Inter または Montserrat（Google Fonts）
- フォントサイズは `clamp()` で定義
  - ヒーロー: `clamp(2.5rem, 7vw, 5rem)`
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

### 図解の作り方（重要）
- **SVGではなくHTML/CSSで図を構成する**（AIが最も正確に生成できる）
- CSS Gridでフローチャート、比較表、マトリクスを表現
- Flexboxでステップ表示、タイムラインを構成
- `border`, `background`, `border-radius` で図形を描画
- 矢印は `::after` 擬似要素やCSS三角形で表現
- カードグリッドで情報を整理し、視覚的な図解として機能させる

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
│       ├── outline.md                 # 骨子（記事構成）
│       ├── structure.yaml             # 構造化データ
│       └── slides.html                # 最終HTML（単一ファイル）
└── examples/
    └── sample-presentation.html       # サンプルプレゼン
```

## 品質チェックリスト

生成したスライドは以下を満たしていること:
- [ ] すべてのセクションが100vh × 100vw内に収まっている（16:9意識）
- [ ] フォントがGoogle Fontsから正しく読み込まれている
- [ ] カラーパレットがOpenHeartテーマに準拠している
- [ ] キーボードナビゲーション（矢印キー、スペース）が機能する
- [ ] タッチ/スワイプ操作が機能する
- [ ] プログレスバーが正しく動作する
- [ ] `prefers-reduced-motion` に対応している
- [ ] モバイル（600px以下）でも崩れない
- [ ] コンテンツ密度制限を守っている
- [ ] アニメーションがスムーズに動作する
- [ ] 図解がHTML/CSSで構成されている（SVG不使用）
- [ ] 外部依存なし（Google Fonts以外）

## 使い方

ユーザーが「スライドを作って」「資料を作って」「プレゼンを作って」等と指示したら:
1. テーマ・目的・対象者を確認
2. 上記ワークフローに沿って作成（まず記事構成 → YAML → HTML）
3. `artifacts/` に出力

スライドのスタイルバリエーション:
- **openheart-dark**: ダークネイビー背景（プレゼン・登壇向け）
- **openheart-light**: ホワイト背景（資料配布・印刷向け）
- **openheart-gradient**: グラデーション活用（ブランディング・マーケ向け）

## 従来手法との違い

| 手法 | 問題点 |
|---|---|
| python-pptx | PowerPointの複雑な構造に阻まれる |
| Marp | Markdownの表現力に限界 |
| Copilot in PowerPoint | 「フォーマットの壁」で品質が上がらない |
| Gamma等のAIサービス | 編集にパワポ変換が必要→大きく崩れる |
| **OpenHeart Format** | **AIが最も得意なHTML/CSS/JSで直接生成** |
