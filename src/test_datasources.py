"""
データソース接続テスト

使い方:
    python -m src.test_datasources

テスト内容:
    1. yfinance: 日本株OHLCVデータ取得
    2. yfinance: 市場指標（日経平均、TOPIX等）取得
    3. yfinance: 財務データ取得
    4. EDINET API: 接続確認（APIキーが設定されている場合）
    5. NewsAPI: 接続確認（APIキーが設定されている場合）
"""

from __future__ import annotations

import asyncio
import logging
import sys
from datetime import datetime, timedelta

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


async def test_yfinance_ohlcv():
    """yfinanceで日本株のOHLCVデータを取得するテスト"""
    from src.datasources.market_data import MarketDataClient

    client = MarketDataClient()
    end = datetime.now().strftime("%Y-%m-%d")
    start = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")

    test_tickers = [
        ("7203.T", "トヨタ自動車"),
        ("4385.T", "メルカリ"),
        ("6758.T", "ソニーグループ"),
    ]

    results = {}
    for ticker, name in test_tickers:
        try:
            data = await client.get_ohlcv(ticker, start, end)
            if data:
                latest = data[-1]
                results[ticker] = {
                    "name": name,
                    "days": len(data),
                    "latest_close": latest.close,
                    "latest_date": latest.date,
                    "latest_volume": latest.volume,
                }
                logger.info(
                    f"  OK {ticker} {name}: {len(data)}日分取得 | "
                    f"最終日 {latest.date} 終値 ¥{latest.close:,.0f} "
                    f"出来高 {latest.volume:,}"
                )
            else:
                logger.warning(f"  NG {ticker} {name}: データ取得できず")
        except Exception as e:
            logger.error(f"  NG {ticker} {name}: {e}")

    return results


async def test_market_indicators():
    """市場指標の取得テスト"""
    from src.datasources.market_data import MarketDataClient

    client = MarketDataClient()
    try:
        indicators = await client.get_market_indicators()
        for name, data in indicators.items():
            if data:
                logger.info(
                    f"  OK {name}: {data['value']:,.2f} "
                    f"(前日比 {data['change_pct']:+.2%})"
                )
            else:
                logger.warning(f"  NG {name}: 取得失敗")
        return indicators
    except Exception as e:
        logger.error(f"  NG 市場指標取得エラー: {e}")
        return {}


async def test_fundamentals():
    """ファンダメンタルデータの取得テスト"""
    from src.datasources.fundamental_data import FundamentalDataClient

    client = FundamentalDataClient()
    try:
        data = await client.get_financial_statements("7203")
        if data:
            logger.info(f"  OK トヨタ自動車 財務データ:")
            for key, value in data.items():
                if value is not None and key != "ticker":
                    if isinstance(value, float):
                        logger.info(f"      {key}: {value:,.2f}")
                    else:
                        logger.info(f"      {key}: {value}")
        else:
            logger.warning("  NG 財務データ取得できず")
        return data
    except Exception as e:
        logger.error(f"  NG 財務データ取得エラー: {e}")
        return {}


async def test_edinet():
    """EDINET API接続テスト"""
    import os

    if not os.environ.get("EDINET_API_KEY"):
        logger.info("  SKIP EDINET_API_KEY未設定（任意: https://disclosure.edinet-fsa.go.jp/）")
        return None

    from src.datasources.fundamental_data import FundamentalDataClient

    client = FundamentalDataClient()
    date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    try:
        filings = await client.get_edinet_filings(date)
        logger.info(f"  OK EDINET: {len(filings)}件の開示書類（{date}）")
        return filings
    except Exception as e:
        logger.error(f"  NG EDINET: {e}")
        return []


async def test_news():
    """NewsAPI接続テスト"""
    import os

    if not os.environ.get("NEWS_API_KEY"):
        logger.info("  SKIP NEWS_API_KEY未設定（任意: https://newsapi.org/）")
        return None

    from src.datasources.news_sentiment import NewsSentimentClient

    client = NewsSentimentClient()
    try:
        articles = await client.search_news("トヨタ 株価", page_size=5)
        logger.info(f"  OK NewsAPI: {len(articles)}件の記事取得")
        for a in articles[:3]:
            logger.info(f"      {a.get('title', 'N/A')[:60]}")
        return articles
    except Exception as e:
        logger.error(f"  NG NewsAPI: {e}")
        return []


async def main():
    logger.info("=" * 70)
    logger.info("  データソース接続テスト")
    logger.info("=" * 70)

    tests = [
        ("1. yfinance OHLCV（日本株）", test_yfinance_ohlcv),
        ("2. 市場指標（日経平均・TOPIX等）", test_market_indicators),
        ("3. ファンダメンタルデータ（yfinance）", test_fundamentals),
        ("4. EDINET API（金融庁）", test_edinet),
        ("5. NewsAPI（ニュース検索）", test_news),
    ]

    passed = 0
    skipped = 0
    failed = 0

    for title, test_fn in tests:
        logger.info(f"\n--- {title} ---")
        try:
            result = await test_fn()
            if result is None:
                skipped += 1
            elif result:
                passed += 1
            else:
                failed += 1
        except Exception as e:
            logger.error(f"  FAIL: {e}")
            failed += 1

    logger.info("\n" + "=" * 70)
    logger.info(f"  結果: {passed} passed, {skipped} skipped, {failed} failed")
    logger.info("=" * 70)

    if failed > 0:
        logger.info("\n次のステップ:")
        logger.info("  - 接続エラー(403/CONNECT tunnel) → ネットワーク/プロキシ設定を確認")
        logger.info("  - yfinanceエラー → pip install yfinance")
        logger.info("  - J-Quants API → export JQUANTS_API_TOKEN='token'")
        logger.info("  - EDINET → export EDINET_API_KEY='key'")
        logger.info("  - NewsAPI → export NEWS_API_KEY='key'")

    return failed == 0


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
