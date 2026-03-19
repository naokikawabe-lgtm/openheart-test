"""
ニュース・センチメントデータの取得

接続先:
  1. NewsAPI: 日本語ニュース検索（無料プランあり）
  2. 適時開示 (TDnet): 上場企業の開示情報

推奨構成:
  - NewsAPI (ニュース) + Claude API (センチメント分析) の組み合わせ

注意:
  - 株探(Kabutan)のスクレイピングは2025年1月より公式に禁止されています
  - Twitter/X APIは個人利用には高額なため非推奨
"""

from __future__ import annotations

import logging
import os
from typing import Any

import aiohttp

logger = logging.getLogger(__name__)


class NewsSentimentClient:
    """
    ニュース・センチメントデータ取得クライアント

    環境変数:
        NEWS_API_KEY: NewsAPIのAPIキー
        ANTHROPIC_API_KEY: Claude APIキー（センチメント分析用）

    セットアップ:
        # NewsAPI（ニュース検索）
        # 1. https://newsapi.org/ でAPIキー取得（無料プラン: 100リクエスト/日）
        export NEWS_API_KEY="your_api_key"

        # Claude API（センチメント分析 - LLMベース）
        # 1. https://console.anthropic.com/ でAPIキー取得
        pip install anthropic
        export ANTHROPIC_API_KEY="your_api_key"
    """

    NEWSAPI_BASE = "https://newsapi.org/v2"
    TDNET_RSS = "https://www.release.tdnet.info/inbs/I_list_001_00.html"

    def __init__(self):
        self._news_api_key = os.environ.get("NEWS_API_KEY")
        self._anthropic_key = os.environ.get("ANTHROPIC_API_KEY")

    async def search_news(
        self,
        query: str,
        language: str = "jp",
        page_size: int = 20,
    ) -> list[dict[str, Any]]:
        """
        ニュース記事を検索する

        Args:
            query: 検索クエリ（銘柄名、ティッカー等）
            language: 言語 ("jp" for Japanese)
            page_size: 取得件数

        Returns:
            ニュース記事リスト
        """
        if not self._news_api_key:
            logger.warning(
                "NEWS_API_KEY未設定。https://newsapi.org/ で取得してください（無料）"
            )
            return []

        url = f"{self.NEWSAPI_BASE}/everything"
        params = {
            "q": query,
            "language": language,
            "pageSize": page_size,
            "sortBy": "publishedAt",
            "apiKey": self._news_api_key,
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as resp:
                if resp.status != 200:
                    logger.error(f"NewsAPI error: {resp.status}")
                    return []
                data = await resp.json()
                return data.get("articles", [])

    async def analyze_sentiment(
        self, texts: list[str]
    ) -> list[dict[str, Any]]:
        """
        Claude APIを使ってテキストのセンチメント分析を行う

        Args:
            texts: 分析対象テキスト（ニュース見出し等）

        Returns:
            各テキストのセンチメントスコア (-1.0〜1.0)
        """
        if not self._anthropic_key:
            logger.warning(
                "ANTHROPIC_API_KEY未設定。"
                "https://console.anthropic.com/ で取得してください"
            )
            return [{"text": t, "score": 0.0, "label": "unknown"} for t in texts]

        import anthropic

        client = anthropic.Anthropic(api_key=self._anthropic_key)

        texts_block = "\n".join(
            f"{i+1}. {text}" for i, text in enumerate(texts)
        )

        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "以下のニュース見出し・テキストについて、株式投資の観点から"
                        "センチメント分析を行ってください。\n\n"
                        "各テキストに対して、以下のJSON形式で回答してください:\n"
                        '{"results": [{"index": 1, "score": 0.5, "label": "positive", '
                        '"reason": "理由"}]}\n\n'
                        "scoreは-1.0（非常にネガティブ）〜1.0（非常にポジティブ）\n"
                        "labelは: very_negative, negative, neutral, positive, very_positive\n\n"
                        f"テキスト:\n{texts_block}"
                    ),
                }
            ],
        )

        # レスポンスパース
        import json
        try:
            response_text = message.content[0].text
            # JSON部分を抽出
            start = response_text.index("{")
            end = response_text.rindex("}") + 1
            parsed = json.loads(response_text[start:end])
            results = parsed.get("results", [])

            return [
                {
                    "text": texts[r["index"] - 1] if r["index"] - 1 < len(texts) else "",
                    "score": r.get("score", 0.0),
                    "label": r.get("label", "neutral"),
                    "reason": r.get("reason", ""),
                }
                for r in results
            ]
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            logger.error(f"センチメント分析のパースエラー: {e}")
            return [{"text": t, "score": 0.0, "label": "error"} for t in texts]

    async def get_stock_news_sentiment(
        self, ticker: str, company_name: str
    ) -> dict[str, Any]:
        """
        特定銘柄のニュースセンチメントを一括取得・分析

        Args:
            ticker: 銘柄コード
            company_name: 企業名

        Returns:
            ニュースセンチメントサマリー
        """
        # ニュース検索
        articles = await self.search_news(
            query=f"{company_name} OR {ticker}",
            page_size=10,
        )

        if not articles:
            return {
                "ticker": ticker,
                "articles_count": 0,
                "average_sentiment": 0.0,
                "sentiment_label": "no_data",
            }

        # 見出しのセンチメント分析
        headlines = [a.get("title", "") for a in articles if a.get("title")]
        sentiments = await self.analyze_sentiment(headlines)

        scores = [s["score"] for s in sentiments if isinstance(s.get("score"), (int, float))]
        avg_score = sum(scores) / len(scores) if scores else 0.0

        # ラベル判定
        if avg_score > 0.3:
            label = "positive"
        elif avg_score > 0.1:
            label = "slightly_positive"
        elif avg_score > -0.1:
            label = "neutral"
        elif avg_score > -0.3:
            label = "slightly_negative"
        else:
            label = "negative"

        return {
            "ticker": ticker,
            "company_name": company_name,
            "articles_count": len(articles),
            "sentiments": sentiments,
            "average_sentiment": round(avg_score, 4),
            "sentiment_label": label,
        }
