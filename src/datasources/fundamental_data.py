"""
ファンダメンタルデータの取得

接続先:
  1. J-Quants API: 財務データ（BS/PL/CF）、銘柄情報
  2. EDINET API: 有価証券報告書、決算短信の原本（XBRL）
  3. yfinance: 基本的な財務サマリー（補助的に使用）

EDINET API セットアップ:
  - https://disclosure.edinet-fsa.go.jp/ でAPIキー取得（無料）
  - export EDINET_API_KEY="your_api_key"
"""

from __future__ import annotations

import logging
import os
from typing import Any

import aiohttp

logger = logging.getLogger(__name__)


class FundamentalDataClient:
    """
    ファンダメンタルデータ取得クライアント

    環境変数:
        EDINET_API_KEY: EDINET APIのAPIキー（無料取得可能）
        JQUANTS_API_TOKEN: J-Quants APIのリフレッシュトークン

    セットアップ:
        # EDINET API（金融庁公式、無料）
        # 1. https://disclosure.edinet-fsa.go.jp/ でAPIキー取得
        # 2. 環境変数に設定
        export EDINET_API_KEY="your_api_key"

        # 必要パッケージ
        pip install aiohttp jquantsapi yfinance
    """

    EDINET_BASE_URL = "https://api.edinet-fsa.go.jp/api/v2"

    def __init__(self):
        self._edinet_api_key = os.environ.get("EDINET_API_KEY")
        self._jquants_token = os.environ.get("JQUANTS_API_TOKEN")
        self._jquants_client = None

    async def _get_jquants_client(self):
        if self._jquants_client is None and self._jquants_token:
            import jquantsapi
            self._jquants_client = jquantsapi.Client(
                refresh_token=self._jquants_token
            )
        return self._jquants_client

    async def get_financial_statements(
        self, ticker: str
    ) -> dict[str, Any]:
        """
        財務諸表データを取得する

        Args:
            ticker: 銘柄コード（例: "4385"）

        Returns:
            PL/BS/CFの主要項目
        """
        code = ticker.replace(".T", "")

        # J-Quants APIが利用可能なら優先
        jq = await self._get_jquants_client()
        if jq:
            return await self._get_financials_jquants(jq, code)

        # フォールバック: yfinance
        return self._get_financials_yfinance(f"{code}.T")

    async def _get_financials_jquants(
        self, client: Any, code: str
    ) -> dict[str, Any]:
        """J-Quants APIから財務データ取得"""
        df = client.get_statements(code=code)
        if df.empty:
            return {}

        latest = df.iloc[-1]
        return {
            "ticker": code,
            "period": str(latest.get("TypeOfCurrentPeriod", "")),
            "revenue": latest.get("NetSales"),
            "operating_income": latest.get("OperatingProfit"),
            "ordinary_income": latest.get("OrdinaryProfit"),
            "net_income": latest.get("Profit"),
            "total_assets": latest.get("TotalAssets"),
            "equity": latest.get("Equity"),
            "eps": latest.get("EarningsPerShare"),
            "bps": latest.get("BookValuePerShare"),
            "roe": latest.get("ReturnOnEquity"),
            "dividend_per_share": latest.get("DividendPerShare"),
        }

    def _get_financials_yfinance(self, ticker: str) -> dict[str, Any]:
        """yfinanceから財務サマリー取得"""
        import yfinance as yf

        stock = yf.Ticker(ticker)
        info = stock.info

        return {
            "ticker": ticker,
            "revenue": info.get("totalRevenue"),
            "operating_income": info.get("operatingIncome"),
            "net_income": info.get("netIncomeToCommon"),
            "total_assets": info.get("totalAssets"),
            "total_debt": info.get("totalDebt"),
            "market_cap": info.get("marketCap"),
            "trailing_pe": info.get("trailingPE"),
            "forward_pe": info.get("forwardPE"),
            "price_to_book": info.get("priceToBook"),
            "roe": info.get("returnOnEquity"),
            "revenue_growth": info.get("revenueGrowth"),
            "profit_margins": info.get("profitMargins"),
            "dividend_yield": info.get("dividendYield"),
            "free_cash_flow": info.get("freeCashflow"),
        }

    async def get_edinet_filings(
        self,
        date: str,
        filing_type: str = "2",  # 2=有価証券報告書
    ) -> list[dict[str, Any]]:
        """
        EDINET APIから開示書類一覧を取得

        Args:
            date: 検索日 (YYYY-MM-DD)
            filing_type: "2"=有報, "4"=四半期報告書

        Returns:
            開示書類リスト
        """
        if not self._edinet_api_key:
            logger.warning(
                "EDINET_API_KEY未設定。https://disclosure.edinet-fsa.go.jp/ で取得してください"
            )
            return []

        url = f"{self.EDINET_BASE_URL}/documents.json"
        params = {
            "date": date,
            "type": filing_type,
            "Subscription-Key": self._edinet_api_key,
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as resp:
                if resp.status != 200:
                    logger.error(f"EDINET API error: {resp.status}")
                    return []
                data = await resp.json()
                return data.get("results", [])

    async def screen_stocks(
        self, criteria: dict[str, Any]
    ) -> list[dict[str, Any]]:
        """
        銘柄スクリーニング

        Args:
            criteria: スクリーニング条件
                - market_cap_max: 時価総額上限（円）
                - revenue_growth_min: 売上成長率下限
                - roe_min: ROE下限
                - per_max: PER上限

        J-Quants APIが必要。yfinanceでは全銘柄走査が遅すぎるため非推奨。
        """
        jq = await self._get_jquants_client()
        if not jq:
            logger.warning(
                "スクリーニングにはJ-Quants APIが必要です。\n"
                "  export JQUANTS_API_TOKEN='your_token'"
            )
            return []

        # 全銘柄の財務データ取得
        statements = jq.get_statements()
        listed = jq.get_listed_info()

        # フィルタリング
        results = []
        market_cap_max = criteria.get("market_cap_max", float("inf"))
        revenue_growth_min = criteria.get("revenue_growth_min", 0)
        roe_min = criteria.get("roe_min", 0)

        # TODO: pandasでクロス結合＋条件フィルタリング
        # 実装は銘柄数が多いためDataFrame操作が効率的

        return results
