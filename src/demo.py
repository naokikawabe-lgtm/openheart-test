"""
デモ実行 - 実際の日本株銘柄データを使った投資意思決定プロセスのシミュレーション

実際のデータソースAPIが未接続の状態で、Agent Teamsの意思決定プロセスを
エンドツーエンドで確認するためのデモスクリプト。
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime

from .agents.base_agent import AgentReport
from .committee import InvestmentCommittee, ProposalStatus

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ============================================================
# デモ用: 模擬分析データ（実運用時はAgent Teamsが自動生成）
# ============================================================

DEMO_DATE = "2026-03-19"
TOTAL_ASSETS = 500_000  # 50万円（Seedフェーズ）

# Seedフェーズ向け: 小型成長株候補
DEMO_CANDIDATES = [
    {
        "ticker": "4385.T",
        "name": "メルカリ",
        "sector": "情報・通信",
        "market_cap_billion": 450,
        "rationale": "国内C2C市場独占＋米国Mercari成長加速。売上成長率25%、営業利益率改善中。",
        "fundamental_score": 0.72,
        "technical_signal": {
            "trend": "up",
            "macd": "bullish_crossover",
            "rsi_14": 58,
            "volume_ratio": 1.8,
            "pattern": "25日移動平均線ブレイクアウト",
        },
        "sentiment_score": 0.65,
        "entry_price": 2100,
        "stop_loss": 1932,  # -8%
        "take_profit": 2604,  # +24% (RR=3.0)
    },
    {
        "ticker": "4480.T",
        "name": "メドレー",
        "sector": "情報・通信",
        "market_cap_billion": 85,
        "rationale": "医療DX推進の恩恵。ジョブメドレー＋CLINICSの2軸成長。売上成長率35%超。",
        "fundamental_score": 0.78,
        "technical_signal": {
            "trend": "up",
            "macd": "bullish",
            "rsi_14": 52,
            "volume_ratio": 2.1,
            "pattern": "カップウィズハンドル形成中",
        },
        "sentiment_score": 0.60,
        "entry_price": 4500,
        "stop_loss": 4140,  # -8%
        "take_profit": 5580,  # +24% (RR=3.0)
    },
    {
        "ticker": "5765.T",
        "name": "フジミインコーポレーテッド",
        "sector": "化学",
        "market_cap_billion": 200,
        "rationale": "半導体研磨剤で世界シェア首位。AI半導体需要増でCMP材料の需要拡大。",
        "fundamental_score": 0.80,
        "technical_signal": {
            "trend": "sideways_to_up",
            "macd": "neutral",
            "rsi_14": 48,
            "volume_ratio": 1.2,
            "pattern": "ボックス圏上抜け兆候",
        },
        "sentiment_score": 0.70,
        "entry_price": 8500,
        "stop_loss": 7820,  # -8%
        "take_profit": 10540,  # +24% (RR=3.0)
    },
    {
        "ticker": "3697.T",
        "name": "SHIFT",
        "sector": "情報・通信",
        "market_cap_billion": 280,
        "rationale": "ソフトウェアテスト市場の成長恩恵。M&Aによる規模拡大。売上成長率40%超。",
        "fundamental_score": 0.75,
        "technical_signal": {
            "trend": "down_to_sideways",
            "macd": "bearish",
            "rsi_14": 38,
            "volume_ratio": 0.9,
            "pattern": "下降トレンド中、反発兆候なし",
        },
        "sentiment_score": 0.45,
        "entry_price": 15000,
        "stop_loss": 13800,  # -8%
        "take_profit": 18600,  # +24% (RR=3.0)
    },
    {
        "ticker": "6920.T",
        "name": "レーザーテック",
        "sector": "精密機器",
        "market_cap_billion": 1200,
        "rationale": "EUV向けマスク検査装置で独占。半導体微細化の恩恵大。ただし時価総額が大きい。",
        "fundamental_score": 0.68,
        "technical_signal": {
            "trend": "down",
            "macd": "bearish",
            "rsi_14": 32,
            "volume_ratio": 1.5,
            "pattern": "下降チャネル内、サポートライン接近",
        },
        "sentiment_score": 0.40,
        "entry_price": 13000,
        "stop_loss": 11960,  # -8%
        "take_profit": 16120,  # +24% (RR=3.0)
    },
]


def simulate_integrated_analysis(candidate: dict) -> dict:
    """Agent Teamsの分析結果を統合したシグナルをシミュレート"""
    weights = {
        "fundamental": 0.30,
        "technical": 0.25,
        "quantitative": 0.20,
        "sentiment": 0.15,
        "alternative": 0.10,
    }

    # テクニカルスコアを算出
    tech = candidate["technical_signal"]
    tech_score = 0.0
    if tech["trend"] == "up":
        tech_score += 0.4
    elif tech["trend"] == "sideways_to_up":
        tech_score += 0.2
    elif tech["trend"] == "down":
        tech_score -= 0.3

    if "bullish" in tech.get("macd", ""):
        tech_score += 0.3
    elif tech.get("macd") == "bearish":
        tech_score -= 0.3

    if tech["rsi_14"] < 30:
        tech_score += 0.1  # 売られすぎ→反発期待
    elif tech["rsi_14"] > 70:
        tech_score -= 0.1  # 買われすぎ

    if tech["volume_ratio"] > 1.5:
        tech_score += 0.2

    tech_score = max(-1.0, min(1.0, tech_score))

    # 統合スコア
    integrated = (
        weights["fundamental"] * (candidate["fundamental_score"] * 2 - 1)
        + weights["technical"] * tech_score
        + weights["quantitative"] * (candidate["fundamental_score"] * 1.5 - 0.5)
        + weights["sentiment"] * (candidate["sentiment_score"] * 2 - 1)
        + weights["alternative"] * 0.1  # デモ用固定値
    )

    # 信頼度（各スコアの分散が小さいほど高い）
    scores = [
        candidate["fundamental_score"],
        (tech_score + 1) / 2,
        candidate["sentiment_score"],
    ]
    avg = sum(scores) / len(scores)
    variance = sum((s - avg) ** 2 for s in scores) / len(scores)
    confidence = max(0.3, min(0.95, 1.0 - variance * 3))

    entry = candidate["entry_price"]
    stop = candidate["stop_loss"]
    target = candidate["take_profit"]
    risk = entry - stop
    reward = target - entry
    rr_ratio = reward / risk if risk > 0 else 0

    return {
        "ticker": candidate["ticker"],
        "name": candidate["name"],
        "sector": candidate["sector"],
        "action": "buy" if integrated > 0.15 else ("sell" if integrated < -0.15 else "hold"),
        "integrated_score": round(integrated, 4),
        "confidence": round(confidence, 4),
        "entry_price": entry,
        "stop_loss": stop,
        "take_profit": target,
        "risk_reward_ratio": round(rr_ratio, 2),
        "position_size_jpy": min(
            TOTAL_ASSETS * 0.30,  # Seed上限30%
            TOTAL_ASSETS * 0.30 * min(abs(integrated), 1.0),
        ),
        "position_pct": min(0.30, 0.30 * min(abs(integrated), 1.0)),
        "rationale": candidate["rationale"],
        "analysis_breakdown": {
            "fundamental": candidate["fundamental_score"],
            "technical": round(tech_score, 3),
            "sentiment": candidate["sentiment_score"],
        },
    }


async def run_demo():
    """デモ: 全銘柄候補に対して投資委員会稟議を実行"""

    logger.info("=" * 70)
    logger.info("  AI Investment Agent Teams - 投資意思決定デモ")
    logger.info(f"  日付: {DEMO_DATE}")
    logger.info(f"  総資産: ¥{TOTAL_ASSETS:,.0f}（Seedフェーズ）")
    logger.info("=" * 70)

    # ──────────────────────────────────────────────
    # Step 1-2: リサーチ＋分析（シミュレーション）
    # ──────────────────────────────────────────────
    logger.info("")
    logger.info("━" * 70)
    logger.info("  [Step 1-2] リサーチ & 分析チーム（シミュレーション）")
    logger.info("━" * 70)

    proposals = []
    for candidate in DEMO_CANDIDATES:
        signal = simulate_integrated_analysis(candidate)
        proposals.append(signal)

        action_icon = {"buy": "🟢 BUY ", "sell": "🔴 SELL", "hold": "⚪ HOLD"}
        logger.info(
            f"  {action_icon.get(signal['action'], '?')} {signal['ticker']} "
            f"{signal['name']:12s} | "
            f"統合スコア: {signal['integrated_score']:+.3f} | "
            f"信頼度: {signal['confidence']:.0%} | "
            f"RR比: {signal['risk_reward_ratio']:.1f}"
        )

    # ──────────────────────────────────────────────
    # Step 3: 戦略策定（BUYシグナルのみ稟議にかける）
    # ──────────────────────────────────────────────
    logger.info("")
    logger.info("━" * 70)
    logger.info("  [Step 3] 戦略策定 - BUYシグナル銘柄を投資提案として選定")
    logger.info("━" * 70)

    buy_proposals = [p for p in proposals if p["action"] == "buy"]
    logger.info(f"  投資提案数: {len(buy_proposals)} / {len(proposals)}銘柄")
    for p in buy_proposals:
        logger.info(
            f"    → {p['ticker']} {p['name']} "
            f"| ¥{p['position_size_jpy']:,.0f} ({p['position_pct']:.0%})"
        )

    # ──────────────────────────────────────────────
    # Step 4: 投資委員会稟議
    # ──────────────────────────────────────────────
    logger.info("")
    logger.info("━" * 70)
    logger.info("  [Step 4] 投資委員会稟議")
    logger.info("━" * 70)

    committee = InvestmentCommittee()

    approved_orders = []
    for proposal in buy_proposals:
        proposal_for_review = {
            **proposal,
            "phase": "seed",
            "portfolio_risk": {
                "total_var_95": 0.03,
                "sector_concentrations": {proposal["sector"]: 0.20},
            },
        }

        decision = await committee.review_proposal(proposal_for_review)

        status_icon = {
            ProposalStatus.APPROVED: "✅ 承認",
            ProposalStatus.CONDITIONALLY_APPROVED: "🟡 条件付承認",
            ProposalStatus.REJECTED: "❌ 却下",
            ProposalStatus.ESCALATED: "⚠️  エスカレーション",
        }

        logger.info("")
        logger.info(f"  ┌─ {proposal['ticker']} {proposal['name']} ─────────")
        logger.info(
            f"  │ 結果: {status_icon.get(decision.status, '?')}"
        )
        logger.info(
            f"  │ 賛成率: {decision.approval_rate:.0%} | "
            f"平均スコア: {decision.average_score:.0f}/100"
        )

        for vote in decision.votes:
            vote_icon = {
                "approve": "✓",
                "conditional_approve": "△",
                "reject": "✗",
                "abstain": "-",
            }
            logger.info(
                f"  │   {vote_icon.get(vote.vote.value, '?')} {vote.member_name:12s} "
                f"スコア:{vote.score:3.0f} | {vote.reasoning}"
            )
            if vote.conditions:
                for c in vote.conditions:
                    logger.info(f"  │     条件: {c}")
            if vote.risk_concerns:
                for r in vote.risk_concerns:
                    logger.info(f"  │     懸念: {r}")

        if decision.final_conditions:
            logger.info(f"  │ 付帯条件:")
            for cond in decision.final_conditions:
                logger.info(f"  │   • {cond}")

        logger.info(f"  └{'─' * 50}")

        if decision.status in (
            ProposalStatus.APPROVED,
            ProposalStatus.CONDITIONALLY_APPROVED,
        ):
            approved_orders.append({
                **proposal,
                "committee_decision": decision.status.value,
                "committee_score": decision.average_score,
                "conditions": decision.final_conditions,
            })

    # ──────────────────────────────────────────────
    # Step 5-6: リスク最終チェック & 執行
    # ──────────────────────────────────────────────
    logger.info("")
    logger.info("━" * 70)
    logger.info("  [Step 5-6] リスク最終チェック & 取引執行")
    logger.info("━" * 70)

    if not approved_orders:
        logger.info("  承認された提案がないため、本日の取引はありません。")
    else:
        total_investment = sum(o["position_size_jpy"] for o in approved_orders)
        remaining_cash = TOTAL_ASSETS - total_investment

        logger.info(f"  承認済み注文: {len(approved_orders)}件")
        logger.info(f"  総投資額: ¥{total_investment:,.0f}")
        logger.info(f"  残キャッシュ: ¥{remaining_cash:,.0f}")
        logger.info("")

        for order in approved_orders:
            logger.info(
                f"  📊 {order['action'].upper()} {order['ticker']} {order['name']}"
            )
            logger.info(
                f"     投資額: ¥{order['position_size_jpy']:,.0f} "
                f"({order['position_pct']:.0%} of portfolio)"
            )
            logger.info(
                f"     エントリー: ¥{order['entry_price']:,} | "
                f"損切り: ¥{order['stop_loss']:,} (-8%) | "
                f"利確: ¥{order['take_profit']:,} (+24%)"
            )
            logger.info(f"     RR比: {order['risk_reward_ratio']:.1f}")
            logger.info(f"     根拠: {order['rationale']}")
            if order.get("conditions"):
                logger.info(f"     条件: {', '.join(order['conditions'])}")
            logger.info("")

    # ──────────────────────────────────────────────
    # サマリー
    # ──────────────────────────────────────────────
    logger.info("━" * 70)
    logger.info("  投資意思決定サマリー")
    logger.info("━" * 70)
    logger.info(f"  候補銘柄数:     {len(DEMO_CANDIDATES)}")
    logger.info(f"  BUYシグナル:    {len(buy_proposals)}")
    logger.info(f"  委員会承認:     {len(approved_orders)}")
    logger.info(
        f"  却下:           {len(buy_proposals) - len(approved_orders)}"
    )

    not_buy = [p for p in proposals if p["action"] != "buy"]
    if not_buy:
        logger.info(f"  見送り銘柄:")
        for p in not_buy:
            logger.info(
                f"    {p['ticker']} {p['name']} → {p['action'].upper()} "
                f"(スコア: {p['integrated_score']:+.3f})"
            )

    logger.info("━" * 70)

    return {
        "candidates": len(DEMO_CANDIDATES),
        "buy_signals": len(buy_proposals),
        "approved": len(approved_orders),
        "orders": approved_orders,
    }


if __name__ == "__main__":
    asyncio.run(run_demo())
