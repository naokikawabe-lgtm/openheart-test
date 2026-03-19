"""
執行チーム - リスク管理、注文執行、ポートフォリオ監視
"""

from __future__ import annotations

import logging
from typing import Any

from .base_agent import AgentReport, BaseAgent

logger = logging.getLogger(__name__)


class RiskManager(BaseAgent):
    """投資提案のリスク評価と承認判断を行う"""

    def __init__(self):
        super().__init__(
            name="risk_manager",
            role="リスクマネージャー",
            description="投資提案のリスク評価と承認判断を行う",
        )
        self.risk_limits = {
            "max_portfolio_var_95_pct": 0.05,  # ポートフォリオVaR 5%以内
            "max_single_position_pct": 0.30,   # 単一銘柄30%以内
            "max_sector_concentration_pct": 0.30,  # セクター集中度30%以内
            "max_monthly_drawdown_pct": 0.15,  # 月次最大ドローダウン15%
            "max_correlation": 0.50,  # 銘柄間相関0.5以下
        }

    async def validate_inputs(self, inputs: dict[str, Any]) -> bool:
        return "proposals" in inputs and "current_portfolio" in inputs

    async def execute(self, inputs: dict[str, Any]) -> AgentReport:
        proposals = inputs["proposals"]
        portfolio = inputs["current_portfolio"]

        assessed_proposals = []
        for proposal in proposals:
            assessment = self._assess_proposal(proposal, portfolio)
            assessed_proposals.append(assessment)

        portfolio_risk = self._assess_portfolio_risk(
            portfolio, assessed_proposals
        )

        approved = [p for p in assessed_proposals if p["approved"]]
        rejected = [p for p in assessed_proposals if not p["approved"]]

        return AgentReport(
            agent_name=self.name,
            data={
                "assessed_proposals": assessed_proposals,
                "approved_count": len(approved),
                "rejected_count": len(rejected),
                "portfolio_risk": portfolio_risk,
                "risk_limit_breaches": portfolio_risk.get("breaches", []),
            },
            confidence=0.80,
            summary=f"承認: {len(approved)}件, 却下: {len(rejected)}件",
        )

    def _assess_proposal(
        self, proposal: dict[str, Any], portfolio: dict[str, Any]
    ) -> dict[str, Any]:
        """個別提案のリスク評価"""
        checks = {
            "position_size_ok": (
                proposal.get("position_pct", 1.0)
                <= self.risk_limits["max_single_position_pct"]
            ),
            "risk_reward_ok": (
                proposal.get("risk_reward_ratio", 0)
                >= 1.5
            ),
            "stop_loss_set": proposal.get("stop_loss") is not None,
            "liquidity_ok": True,  # TODO: 流動性チェック
        }

        approved = all(checks.values())
        rejection_reasons = [k for k, v in checks.items() if not v]

        return {
            **proposal,
            "risk_checks": checks,
            "approved": approved,
            "rejection_reasons": rejection_reasons,
        }

    def _assess_portfolio_risk(
        self,
        portfolio: dict[str, Any],
        new_proposals: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """ポートフォリオ全体のリスク評価"""
        # TODO: 新規提案を含めたポートフォリオ全体のリスク計算
        return {
            "total_var_95": None,
            "max_drawdown_estimate": None,
            "sector_concentrations": {},
            "breaches": [],
        }


class ExecutionAgent(BaseAgent):
    """承認された取引を最適に執行する"""

    def __init__(self):
        super().__init__(
            name="execution_agent",
            role="エグゼキューションエージェント",
            description="承認された取引を最適に執行する",
        )

    async def validate_inputs(self, inputs: dict[str, Any]) -> bool:
        return "approved_orders" in inputs

    async def execute(self, inputs: dict[str, Any]) -> AgentReport:
        orders = inputs["approved_orders"]
        results = []

        for order in orders:
            result = await self._execute_order(order)
            results.append(result)

        return AgentReport(
            agent_name=self.name,
            data={
                "execution_results": results,
                "total_orders": len(orders),
                "filled_count": sum(1 for r in results if r["status"] == "filled"),
                "total_slippage": sum(r.get("slippage", 0) for r in results),
            },
            confidence=0.90,
            summary=f"執行完了: {len(results)}件",
        )

    async def _execute_order(self, order: dict[str, Any]) -> dict[str, Any]:
        """注文の執行（実装時に証券会社APIに接続）"""
        # TODO: 証券会社API接続（SBI証券、楽天証券等）
        # 執行アルゴリズム: TWAP, VWAP, アイスバーグ注文
        logger.info(
            f"注文執行: {order.get('ticker')} {order.get('action')} "
            f"¥{order.get('position_size_jpy', 0):,.0f}"
        )
        return {
            "ticker": order.get("ticker"),
            "action": order.get("action"),
            "requested_size": order.get("position_size_jpy"),
            "filled_size": None,  # TODO: 実約定額
            "average_price": None,
            "slippage": None,
            "status": "simulated",
            "order_id": None,
        }


class PortfolioMonitor(BaseAgent):
    """ポートフォリオの状態を常時監視しアラートを発する"""

    def __init__(self):
        super().__init__(
            name="portfolio_monitor",
            role="ポートフォリオモニター",
            description="ポートフォリオの状態を常時監視しアラートを発する",
        )
        self.alert_thresholds = {
            "position_loss_pct": -0.08,  # 個別銘柄 -8% で損切りアラート
            "portfolio_daily_loss_pct": -0.03,  # 日次 -3% でアラート
            "portfolio_monthly_loss_pct": -0.15,  # 月次 -15% で全ポジション半減
        }

    async def validate_inputs(self, inputs: dict[str, Any]) -> bool:
        return "portfolio" in inputs

    async def execute(self, inputs: dict[str, Any]) -> AgentReport:
        portfolio = inputs["portfolio"]
        market_data = inputs.get("market_data", {})

        status = self._evaluate_portfolio(portfolio, market_data)
        alerts = self._check_alerts(status)
        rebalance_signals = self._check_rebalance_needs(portfolio)

        return AgentReport(
            agent_name=self.name,
            data={
                "portfolio_status": status,
                "alerts": alerts,
                "rebalance_signals": rebalance_signals,
                "positions_count": len(portfolio.get("positions", [])),
            },
            confidence=0.85,
            summary=f"監視完了 | アラート: {len(alerts)}件",
        )

    def _evaluate_portfolio(
        self, portfolio: dict[str, Any], market_data: dict[str, Any]
    ) -> dict[str, Any]:
        """ポートフォリオ評価"""
        return {
            "total_value": None,
            "daily_pnl": None,
            "daily_pnl_pct": None,
            "unrealized_pnl": None,
            "realized_pnl": None,
            "cash_balance": None,
        }

    def _check_alerts(self, status: dict[str, Any]) -> list[dict[str, Any]]:
        """アラートチェック"""
        alerts = []
        # TODO: 閾値チェックとアラート生成
        return alerts

    def _check_rebalance_needs(
        self, portfolio: dict[str, Any]
    ) -> list[dict[str, Any]]:
        """リバランス必要性チェック"""
        # TODO: 目標配分との乖離チェック
        return []
