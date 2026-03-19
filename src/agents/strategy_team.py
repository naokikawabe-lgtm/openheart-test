"""
戦略立案チーム - 分析結果を統合し投資戦略を策定する
"""

from __future__ import annotations

from typing import Any

from .base_agent import AgentReport, BaseAgent


class StrategyArchitect(BaseAgent):
    """分析結果を統合し投資戦略を策定するメインストラテジスト"""

    def __init__(self):
        super().__init__(
            name="strategy_architect",
            role="ストラテジーアーキテクト",
            description="全Agentの分析結果を統合し、投資提案を策定する",
        )
        self.phase_config = {
            "seed": {  # 50万→500万
                "max_positions": 5,
                "max_position_pct": 0.30,
                "stop_loss_pct": -0.08,
                "trailing_stop_pct": -0.15,
                "min_risk_reward": 3.0,
            },
            "growth": {  # 500万→5000万
                "max_positions": 15,
                "max_position_pct": 0.10,
                "stop_loss_pct": -0.08,
                "trailing_stop_pct": -0.12,
                "min_risk_reward": 2.5,
            },
            "expansion": {  # 5000万→5億
                "max_positions": 30,
                "max_position_pct": 0.05,
                "stop_loss_pct": -0.07,
                "trailing_stop_pct": -0.10,
                "min_risk_reward": 2.0,
            },
            "stable": {  # 5億→10億
                "max_positions": 50,
                "max_position_pct": 0.03,
                "stop_loss_pct": -0.05,
                "trailing_stop_pct": -0.08,
                "min_risk_reward": 1.5,
            },
        }

    def _determine_phase(self, total_assets: float) -> str:
        """現在の資産額からフェーズを判定"""
        if total_assets < 5_000_000:
            return "seed"
        elif total_assets < 50_000_000:
            return "growth"
        elif total_assets < 500_000_000:
            return "expansion"
        else:
            return "stable"

    async def validate_inputs(self, inputs: dict[str, Any]) -> bool:
        required = ["market_report", "total_assets"]
        return all(k in inputs for k in required)

    async def execute(self, inputs: dict[str, Any]) -> AgentReport:
        total_assets = inputs["total_assets"]
        phase = self._determine_phase(total_assets)
        config = self.phase_config[phase]

        market_report = inputs["market_report"]
        company_reports = inputs.get("company_reports", [])
        technical_reports = inputs.get("technical_reports", [])
        quant_report = inputs.get("quant_report", {})
        sentiment_report = inputs.get("sentiment_report", {})
        alternative_report = inputs.get("alternative_report", {})

        # 各レポートのシグナルを統合
        integrated_signals = self._integrate_signals(
            market_report,
            company_reports,
            technical_reports,
            quant_report,
            sentiment_report,
            alternative_report,
        )

        # 投資提案の生成
        proposals = self._generate_proposals(
            integrated_signals, config, total_assets
        )

        return AgentReport(
            agent_name=self.name,
            data={
                "phase": phase,
                "phase_config": config,
                "total_assets": total_assets,
                "integrated_signals": integrated_signals,
                "proposals": proposals,
                "market_regime": market_report.get("data", {}).get(
                    "market_regime", "unknown"
                ),
            },
            confidence=self._calculate_overall_confidence(integrated_signals),
            summary=f"Phase: {phase} | 提案数: {len(proposals)} | 総資産: ¥{total_assets:,.0f}",
        )

    def _integrate_signals(
        self,
        market: Any,
        companies: list,
        technicals: list,
        quant: Any,
        sentiment: Any,
        alternative: Any,
    ) -> list[dict[str, Any]]:
        """全Agentのシグナルを統合してスコアリング"""
        # 重み付け: ファンダ30%, テクニカル25%, クオンツ20%, センチメント15%, オルタナ10%
        weights = {
            "fundamental": 0.30,
            "technical": 0.25,
            "quantitative": 0.20,
            "sentiment": 0.15,
            "alternative": 0.10,
        }
        # TODO: 各シグナルを正規化し、重み付き平均で統合スコアを算出
        return []

    def _generate_proposals(
        self,
        signals: list[dict[str, Any]],
        config: dict[str, Any],
        total_assets: float,
    ) -> list[dict[str, Any]]:
        """投資提案の生成"""
        proposals = []
        for signal in signals:
            score = signal.get("integrated_score", 0)
            if abs(score) < 0.3:  # シグナルが弱い場合はスキップ
                continue

            action = "buy" if score > 0 else "sell"
            position_size = self._calculate_position_size(
                score, config, total_assets
            )

            proposals.append(
                {
                    "ticker": signal.get("ticker"),
                    "action": action,
                    "position_size_jpy": position_size,
                    "position_pct": position_size / total_assets,
                    "entry_price": signal.get("entry_price"),
                    "stop_loss": signal.get("stop_loss"),
                    "take_profit": signal.get("take_profit"),
                    "risk_reward_ratio": signal.get("risk_reward_ratio"),
                    "integrated_score": score,
                    "rationale": signal.get("rationale", ""),
                    "confidence": signal.get("confidence", 0.5),
                }
            )
        return proposals

    def _calculate_position_size(
        self,
        signal_strength: float,
        config: dict[str, Any],
        total_assets: float,
    ) -> float:
        """ケリー基準（ハーフケリー）に基づくポジションサイズ算出"""
        # ハーフケリー = 0.5 * (勝率 * 平均利益 - 敗率 * 平均損失) / 平均利益
        max_position = total_assets * config["max_position_pct"]
        # シグナル強度に応じて調整
        adjusted_size = max_position * min(abs(signal_strength), 1.0)
        return adjusted_size

    def _calculate_overall_confidence(
        self, signals: list[dict[str, Any]]
    ) -> float:
        """全体の信頼度を算出"""
        if not signals:
            return 0.0
        confidences = [s.get("confidence", 0.5) for s in signals]
        return sum(confidences) / len(confidences)
