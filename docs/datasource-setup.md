# データソース接続ガイド

## クイックスタート（最小構成・無料）

```bash
# 1. パッケージインストール
pip install yfinance aiohttp

# 2. 実行（環境変数なしでOK）
python -m src.demo
```

yfinanceだけで株価データ・基本財務データは取得可能。追加のAPIキー不要。

---

## データソース一覧

### 1. 株価データ（OHLCV）

| ソース | 料金 | リアルタイム | ヒストリカル | セットアップ |
|--------|------|-------------|-------------|------------|
| **yfinance** | 無料 | 15分遅延 | 充実 | `pip install yfinance` |
| **J-Quants API** | 無料〜 | Premiumのみ | 充実 | アカウント登録要 |

#### yfinance（推奨: まずこれから）

```bash
pip install yfinance
```

```python
import yfinance as yf

# 日本株は ".T" サフィックスが必要
stock = yf.Ticker("4385.T")  # メルカリ
hist = stock.history(period="3mo")
print(hist)
```

#### J-Quants API（本格運用時）

```bash
# 1. https://jpx-jquants.com/ でアカウント作成
# 2. Freeプラン: 12週間遅延データ、月12,000リクエスト
#    Lightプラン (1,650円/月): 前日終値データ
#    Standardプラン (3,300円/月): 当日データ
#    Premiumプラン (16,500円/月): リアルタイムデータ

pip install jquantsapi
export JQUANTS_API_TOKEN="your_refresh_token"
export MARKET_DATA_SOURCE="jquants"
```

---

### 2. ファンダメンタルデータ

| ソース | 料金 | 内容 | セットアップ |
|--------|------|------|------------|
| **yfinance** | 無料 | 基本財務サマリー | 追加設定不要 |
| **J-Quants API** | 無料〜 | 決算データ詳細 | 上記と共通 |
| **EDINET API** | 無料 | 有報・四半報原本 | APIキー取得 |

#### EDINET API（金融庁公式・無料）

```bash
# 1. https://disclosure.edinet-fsa.go.jp/ でユーザー登録
# 2. APIキーを取得
export EDINET_API_KEY="your_api_key"
```

開示書類（有価証券報告書、四半期報告書等）の検索・取得が可能。
XBRL形式の財務データも取得できる。

---

### 3. ニュース・センチメント分析

| ソース | 料金 | 内容 | セットアップ |
|--------|------|------|------------|
| **NewsAPI** | 無料(100件/日) | ニュース検索 | APIキー取得 |
| **Claude API** | 従量課金 | NLPセンチメント分析 | APIキー取得 |

#### NewsAPI

```bash
# 1. https://newsapi.org/ でアカウント作成
# 2. 無料プラン: 100リクエスト/日（個人開発には十分）
export NEWS_API_KEY="your_api_key"
```

#### Claude API（センチメント分析エンジン）

```bash
# 1. https://console.anthropic.com/ でAPIキー取得
pip install anthropic
export ANTHROPIC_API_KEY="your_api_key"
```

ニュース見出しをClaude APIに投げてセンチメントスコアを算出する。
1リクエストで複数記事をバッチ処理するため、コスト効率が良い。

---

### 4. 注文執行（証券会社API）

| 証券会社 | API | 料金 | 備考 |
|---------|-----|------|------|
| **kabuステーション** (auカブコム) | kabu STATION API | 口座開設無料 | REST API、最も開発者フレンドリー |
| **SBI証券** | なし（非公式手段あり） | - | 公式APIなし |
| **楽天証券** | MarketSpeed II RSS | 口座開設無料 | Excel連携ベース |

#### kabu STATION API（推奨）

```bash
# 1. auカブコム証券で口座開設
# 2. kabuステーションをインストール・起動
# 3. API利用申請
# ローカルホストのREST APIとして利用可能
# https://kabucom.github.io/kabusapi/ptal/
```

---

## 環境変数まとめ

```bash
# === 最小構成（無料） ===
# 設定不要。yfinanceがデフォルトで使われる

# === 推奨構成 ===
export MARKET_DATA_SOURCE="yfinance"          # or "jquants"
export JQUANTS_API_TOKEN="xxx"                # J-Quants利用時
export EDINET_API_KEY="xxx"                   # 有報データ
export NEWS_API_KEY="xxx"                     # ニュース検索
export ANTHROPIC_API_KEY="xxx"                # センチメント分析

# === 本番構成（注文執行あり） ===
export KABU_API_PASSWORD="xxx"                # kabuステーションAPI
```

## 段階的な導入ステップ

```
Step 1: yfinance のみ（無料・即日開始）
  → 株価データ + 基本財務データ で分析開始

Step 2: + NewsAPI + Claude API
  → センチメント分析を追加

Step 3: + J-Quants API (Light/Standard)
  → 銘柄スクリーニング + 詳細財務データ

Step 4: + EDINET API
  → 有価証券報告書の自動解析

Step 5: + kabu STATION API
  → 注文の自動執行
```
