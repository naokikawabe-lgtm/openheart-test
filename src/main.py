"""
AI Investment Automation System - メインエントリーポイント

使用例:
    python -m src.main
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import date

from .orchestrator import InvestmentOrchestrator

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


async def main():
    """メイン実行関数"""
    orchestrator = InvestmentOrchestrator()

    # 初期パラメータ
    initial_assets = 500_000  # 50万円
    current_portfolio = {
        "positions": [],
        "cash": initial_assets,
        "total_value": initial_assets,
    }

    today = date.today().isoformat()

    logger.info("=" * 60)
    logger.info("AI Investment Automation System")
    logger.info(f"初期資金: ¥{initial_assets:,.0f}")
    logger.info(f"目標: ¥1,000,000,000（10億円）")
    logger.info(f"実行日: {today}")
    logger.info("=" * 60)

    # 日次ワークフロー実行
    result = await orchestrator.run_daily_workflow(
        date=today,
        total_assets=initial_assets,
        current_portfolio=current_portfolio,
    )

    # 結果出力
    logger.info("\n" + "=" * 60)
    logger.info("ワークフロー実行結果")
    logger.info("=" * 60)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
