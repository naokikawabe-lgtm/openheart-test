"""
オーケストレーター - Agent Teamsのワークフローを統括実行する

毎朝の投資判断ワークフロー:
  1. リサーチチーム（並列） → 市場/企業/オルタナティブデータ収集
  2. 分析チーム（並列）     → テクニカル/クオンツ/センチメント分析
  3. 戦略立案              → 統合シグナル → 投資提案生成
  4. 投資委員会稟議         → 4名の委員が独立審査 → 多数決
  5. リスク最終チェック     → 承認提案のリスク再評価
  6. 取引執行              → 最適執行アルゴリズムで発注
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Any

from .agents import (
    AlternativeDataAnalyst,
    CompanyAnalyst,
    ExecutionAgent,
    MarketResearcher,
    PortfolioMonitor,
    QuantitativeAnalyst,
    RiskManager,
    SentimentAnalyst,
    StrategyArchitect,
    TechnicalAnalyst,
)
from .committee import InvestmentCommittee, ProposalStatus

logger = logging.getLogger(__name__)


class InvestmentOrchestrator:
    """Agent Teams全体を統括するオーケストレーター"""

    def __init__(self):
        # リサーチチーム
        self.market_researcher = MarketResearcher()
        self.company_analyst = CompanyAnalyst()
        self.alternative_analyst = AlternativeDataAnalyst()

        # 分析チーム
        self.technical_analyst = TechnicalAnalyst()
        self.quant_analyst = QuantitativeAnalyst()
        self.sentiment_analyst = SentimentAnalyst()

        # 戦略チーム
        self.strategy_architect = StrategyArchitect()

        # 投資委員会
        self.investment_committee = InvestmentCommittee()

        # 執行チーム
        self.risk_manager = RiskManager()
        self.execution_agent = ExecutionAgent()
        self.portfolio_monitor = PortfolioMonitor()

    async def run_daily_workflow(
        self,
        date: str,
        total_assets: float,
        current_portfolio: dict[str, Any],
    ) -> dict[str, Any]:
        """毎朝の投資判断ワークフローを実行する"""
        workflow_id = f"daily_{date}_{datetime.now().strftime('%H%M%S')}"
        logger.info(f"=== 日次ワークフロー開始: {workflow_id} ===")

        # Step 1: リサーチチーム（並列実行）
        logger.info("[Step 1/6] リサーチチーム起動...")
        research_results = await asyncio.gather(
            self.market_researcher.run({"date": date}),
            self.company_analyst.run({
                "screening_criteria": {
                    "market_cap_max": 10_000_000_000,
                    "revenue_growth_min": 0.30,
                }
            }),
            self.alternative_analyst.run({"date": date}),
        )
        market_report, company_report, alternative_report = research_results

        # Step 2: 分析チーム（並列実行）
        logger.info("[Step 2/6] 分析チーム起動...")
        # テクニカル分析は各候補銘柄に対して実行
        tickers = [
            t for t in company_report.data.get("screening_results", [])
        ]
        technical_reports = []
        for ticker in tickers:
            report = await self.technical_analyst.run({
                "ticker": ticker,
                "ohlcv": [],  # TODO: 実データ取得
            })
            technical_reports.append(report)

        quant_report, sentiment_report = await asyncio.gather(
            self.quant_analyst.run({
                "portfolio": current_portfolio,
                "ticker": tickers[0] if tickers else None,
            }),
            self.sentiment_analyst.run({
                "date": date,
                "tickers": tickers,
            }),
        )

        # Step 3: 戦略策定
        logger.info("[Step 3/6] 戦略策定...")
        strategy_report = await self.strategy_architect.run({
            "total_assets": total_assets,
            "market_report": market_report.to_dict(),
            "company_reports": [r.to_dict() for r in [company_report]],
            "technical_reports": [r.to_dict() for r in technical_reports],
            "quant_report": quant_report.to_dict(),
            "sentiment_report": sentiment_report.to_dict(),
            "alternative_report": alternative_report.to_dict(),
        })

        proposals = strategy_report.data.get("proposals", [])
        logger.info(f"  投資提案数: {len(proposals)}")

        # Step 4: 投資委員会稟議
        logger.info("[Step 4/6] 投資委員会稟議...")
        committee_decisions = []
        approved_proposals = []

        for proposal in proposals:
            # 稟議用に追加情報を付与
            proposal_for_review = {
                **proposal,
                "phase": strategy_report.data.get("phase"),
                "portfolio_risk": quant_report.data.get("risk_metrics", {}),
            }
            decision = await self.investment_committee.review_proposal(
                proposal_for_review
            )
            committee_decisions.append(decision)

            if decision.status in (
                ProposalStatus.APPROVED,
                ProposalStatus.CONDITIONALLY_APPROVED,
            ):
                approved_proposals.append({
                    **proposal,
                    "conditions": decision.final_conditions,
                    "committee_score": decision.average_score,
                })

        logger.info(
            f"  承認: {len(approved_proposals)}/{len(proposals)}件"
        )

        # Step 5: リスク最終チェック
        logger.info("[Step 5/6] リスク最終チェック...")
        risk_report = await self.risk_manager.run({
            "proposals": approved_proposals,
            "current_portfolio": current_portfolio,
        })

        final_orders = [
            p for p in risk_report.data.get("assessed_proposals", [])
            if p.get("approved", False)
        ]

        # Step 6: 取引執行
        logger.info("[Step 6/6] 取引執行...")
        execution_report = await self.execution_agent.run({
            "approved_orders": final_orders,
        })

        # 結果サマリー
        result = {
            "workflow_id": workflow_id,
            "date": date,
            "total_assets": total_assets,
            "phase": strategy_report.data.get("phase"),
            "research": {
                "market": market_report.summary,
                "companies_screened": len(
                    company_report.data.get("screening_results", [])
                ),
                "alternative": alternative_report.summary,
            },
            "analysis": {
                "technical_reports": len(technical_reports),
                "quant": quant_report.summary,
                "sentiment": sentiment_report.summary,
            },
            "strategy": {
                "proposals_generated": len(proposals),
                "proposals_summary": strategy_report.summary,
            },
            "committee": {
                "reviewed": len(committee_decisions),
                "approved": len(approved_proposals),
                "decisions": [
                    {
                        "id": d.proposal_id,
                        "status": d.status.value,
                        "approval_rate": d.approval_rate,
                        "score": d.average_score,
                    }
                    for d in committee_decisions
                ],
            },
            "risk": {
                "final_approved": len(final_orders),
                "summary": risk_report.summary,
            },
            "execution": {
                "orders_executed": execution_report.data.get("total_orders", 0),
                "summary": execution_report.summary,
            },
        }

        logger.info(f"=== 日次ワークフロー完了: {workflow_id} ===")
        return result

    async def run_monitoring(
        self, portfolio: dict[str, Any], market_data: dict[str, Any]
    ):
        """リアルタイム監視ループ"""
        monitor_report = await self.portfolio_monitor.run({
            "portfolio": portfolio,
            "market_data": market_data,
        })

        alerts = monitor_report.data.get("alerts", [])
        if alerts:
            logger.warning(f"[アラート] {len(alerts)}件のアラートを検出")
            for alert in alerts:
                logger.warning(f"  - {alert}")

        return monitor_report
