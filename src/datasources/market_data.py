"""
株価・マーケットデータの取得

接続先の優先順位:
  1. J-Quants API（JPX公式、リアルタイム対応、要有料プラン）
  2. yfinance（無料、Yahoo Finance経由、15分遅延）

使い分け:
  - 日次バッチ分析: yfinance で十分（無料、ヒストリカル充実）
  - 場中リアルタイム: J-Quants API（有料プランが必要）
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class OHLCVData:
    """OHLCV（始値・高値・安値・終値・出来高）データ"""
    ticker: str
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int
    adjusted_close: float | None = None


class MarketDataClient:
    """
    株価データ取得クライアント

    環境変数:
        JQUANTS_API_TOKEN: J-Quants APIのリフレッシュトークン
        MARKET_DATA_SOURCE: "jquants" or "yfinance" (default: "yfinance")

    セットアップ:
        # --- yfinance（無料、すぐ使える） ---
        pip install yfinance

        # --- J-Quants API（JPX公式） ---
        # 1. https://jpx-jquants.com/ でアカウント作成
        # 2. プラン選択（Freeプランあり、リアルタイムはPremium以上）
        # 3. リフレッシュトークンを取得
        pip install jquantsapi
        export JQUANTS_API_TOKEN="your_refresh_token"
        export MARKET_DATA_SOURCE="jquants"
    """

    def __init__(self):
        self.source = os.environ.get("MARKET_DATA_SOURCE", "yfinance")
        self._jquants_client = None
        self._initialized = False

    async def initialize(self):
        """クライアント初期化"""
        if self._initialized:
            return

        if self.source == "jquants":
            await self._init_jquants()
        else:
            self._init_yfinance()

        self._initialized = True
        logger.info(f"MarketDataClient initialized (source={self.source})")

    async def _init_jquants(self):
        """J-Quants API初期化"""
        try:
            import jquantsapi

            token = os.environ.get("JQUANTS_API_TOKEN")
            if not token:
                raise ValueError(
                    "JQUANTS_API_TOKEN環境変数を設定してください。\n"
                    "取得方法: https://jpx-jquants.com/ でアカウント作成後、"
                    "マイページからリフレッシュトークンを取得"
                )
            self._jquants_client = jquantsapi.Client(refresh_token=token)
        except ImportError:
            raise ImportError(
                "jquantsapi がインストールされていません。\n"
                "  pip install jquantsapi"
            )

    def _init_yfinance(self):
        """yfinance初期化（特別な設定不要）"""
        try:
            import yfinance  # noqa: F401
        except ImportError:
            raise ImportError(
                "yfinance がインストールされていません。\n"
                "  pip install yfinance"
            )

    async def get_ohlcv(
        self,
        ticker: str,
        start_date: str,
        end_date: str,
    ) -> list[OHLCVData]:
        """
        OHLCV データを取得する

        Args:
            ticker: 銘柄コード（例: "4385" または "4385.T"）
            start_date: 開始日 (YYYY-MM-DD)
            end_date: 終了日 (YYYY-MM-DD)

        Returns:
            OHLCVData のリスト
        """
        await self.initialize()

        # ティッカーの正規化（.T サフィックス付与）
        normalized = ticker.replace(".T", "")
        yf_ticker = f"{normalized}.T"

        if self.source == "jquants":
            return await self._get_ohlcv_jquants(normalized, start_date, end_date)
        else:
            return self._get_ohlcv_yfinance(yf_ticker, start_date, end_date)

    async def _get_ohlcv_jquants(
        self, code: str, start: str, end: str
    ) -> list[OHLCVData]:
        """J-Quants APIから株価データ取得"""
        df = self._jquants_client.get_prices_daily_quotes(
            code=code, from_yyyymmdd=start.replace("-", ""),
            to_yyyymmdd=end.replace("-", ""),
        )
        results = []
        for _, row in df.iterrows():
            results.append(OHLCVData(
                ticker=code,
                date=str(row.get("Date", "")),
                open=float(row.get("Open", 0)),
                high=float(row.get("High", 0)),
                low=float(row.get("Low", 0)),
                close=float(row.get("Close", 0)),
                volume=int(row.get("Volume", 0)),
                adjusted_close=float(row.get("AdjustmentClose", row.get("Close", 0))),
            ))
        return results

    def _get_ohlcv_yfinance(
        self, ticker: str, start: str, end: str
    ) -> list[OHLCVData]:
        """yfinanceから株価データ取得"""
        import yfinance as yf

        stock = yf.Ticker(ticker)
        df = stock.history(start=start, end=end)

        results = []
        for date_idx, row in df.iterrows():
            results.append(OHLCVData(
                ticker=ticker,
                date=str(date_idx.date()),
                open=float(row["Open"]),
                high=float(row["High"]),
                low=float(row["Low"]),
                close=float(row["Close"]),
                volume=int(row["Volume"]),
            ))
        return results

    async def get_market_indicators(self) -> dict[str, Any]:
        """
        市場全体の指標を取得

        Returns:
            日経平均、TOPIX、日経VI、ドル円等
        """
        await self.initialize()

        if self.source == "yfinance":
            import yfinance as yf

            indicators = {}
            targets = {
                "nikkei225": "^N225",
                "topix": "^TPX",
                "nikkei_vi": "^JNV",  # 日経VI
                "usdjpy": "JPY=X",
                "sp500": "^GSPC",
                "vix": "^VIX",
            }

            for name, symbol in targets.items():
                try:
                    t = yf.Ticker(symbol)
                    hist = t.history(period="5d")
                    if not hist.empty:
                        latest = hist.iloc[-1]
                        prev = hist.iloc[-2] if len(hist) > 1 else latest
                        indicators[name] = {
                            "value": float(latest["Close"]),
                            "change_pct": float(
                                (latest["Close"] - prev["Close"]) / prev["Close"]
                            ),
                        }
                except Exception as e:
                    logger.warning(f"指標取得失敗 ({name}): {e}")
                    indicators[name] = None

            return indicators

        # J-Quants の場合
        # TODO: J-Quants APIのインデックスエンドポイント使用
        return {}

    async def get_stock_list(
        self, market: str = "prime"
    ) -> list[dict[str, Any]]:
        """
        上場銘柄一覧を取得

        Args:
            market: "prime", "standard", "growth"
        """
        await self.initialize()

        if self.source == "jquants":
            df = self._jquants_client.get_listed_info()
            market_map = {
                "prime": "プライム",
                "standard": "スタンダード",
                "growth": "グロース",
            }
            target = market_map.get(market, market)
            filtered = df[df["MarketCodeName"].str.contains(target, na=False)]
            return filtered.to_dict("records")

        # yfinanceには銘柄一覧機能がないため、
        # 外部の銘柄リスト（CSV等）を使用する必要がある
        logger.warning(
            "yfinanceでは銘柄一覧取得ができません。"
            "J-Quants APIを使用するか、銘柄リストCSVを用意してください。"
        )
        return []
