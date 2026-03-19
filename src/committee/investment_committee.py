"""
投資委員会 - 投資提案の稟議プロセスを自動化する

投資委員会は複数の独立した審査役Agentで構成され、
各Agentが異なる観点から投資提案を評価し、多数決で承認/却下を決定する。
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class Vote(Enum):
    APPROVE = "approve"
    REJECT = "reject"
    CONDITIONAL_APPROVE = "conditional_approve"
    ABSTAIN = "abstain"


class ProposalStatus(Enum):
    DRAFT = "draft"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    CONDITIONALLY_APPROVED = "conditionally_approved"
    REJECTED = "rejected"
    ESCALATED = "escalated"


@dataclass
class CommitteeMemberVote:
    """委員の投票結果"""

    member_name: str
    role: str
    vote: Vote
    score: float  # 0-100
    reasoning: str
    conditions: list[str] = field(default_factory=list)
    risk_concerns: list[str] = field(default_factory=list)
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class CommitteeDecision:
    """投資委員会の最終決定"""

    proposal_id: str
    status: ProposalStatus
    votes: list[CommitteeMemberVote]
    approval_rate: float
    average_score: float
    final_conditions: list[str]
    decision_summary: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    escalation_reason: str | None = None


class CommitteeMember:
    """投資委員会メンバー（審査役Agent）の基底クラス"""

    def __init__(self, name: str, role: str, expertise: str):
        self.name = name
        self.role = role
        self.expertise = expertise

    async def review(self, proposal: dict[str, Any]) -> CommitteeMemberVote:
        """提案を審査し投票する（サブクラスでオーバーライド）"""
        raise NotImplementedError


class CIO(CommitteeMember):
    """最高投資責任者 - 全体戦略との整合性を審査"""

    def __init__(self):
        super().__init__(
            name="CIO",
            role="最高投資責任者",
            expertise="投資戦略全体の方向性と整合性",
        )

    async def review(self, proposal: dict[str, Any]) -> CommitteeMemberVote:
        score = 0.0
        concerns = []
        conditions = []

        # 1. フェーズ戦略との整合性チェック
        phase = proposal.get("phase", "unknown")
        position_pct = proposal.get("position_pct", 0)
        phase_limits = {
            "seed": 0.30,
            "growth": 0.10,
            "expansion": 0.05,
            "stable": 0.03,
        }
        if position_pct <= phase_limits.get(phase, 0.05):
            score += 25
        else:
            concerns.append(
                f"ポジションサイズ({position_pct:.1%})がフェーズ上限を超過"
            )

        # 2. リスクリワード比チェック
        rr_ratio = proposal.get("risk_reward_ratio", 0)
        min_rr = {"seed": 3.0, "growth": 2.5, "expansion": 2.0, "stable": 1.5}
        if rr_ratio >= min_rr.get(phase, 2.0):
            score += 25
        else:
            concerns.append(f"リスクリワード比({rr_ratio:.1f})が基準未達")

        # 3. 信頼度チェック
        confidence = proposal.get("confidence", 0)
        if confidence >= 0.7:
            score += 25
        elif confidence >= 0.5:
            score += 15
            conditions.append("ポジションサイズを50%に縮小すること")
        else:
            concerns.append(f"信頼度が低い({confidence:.0%})")

        # 4. 損切りルール設定チェック
        if proposal.get("stop_loss") is not None:
            score += 25
        else:
            concerns.append("損切りラインが未設定")

        vote = self._determine_vote(score, concerns)

        return CommitteeMemberVote(
            member_name=self.name,
            role=self.role,
            vote=vote,
            score=score,
            reasoning=f"戦略整合性評価: スコア{score}/100",
            conditions=conditions,
            risk_concerns=concerns,
        )

    def _determine_vote(self, score: float, concerns: list[str]) -> Vote:
        if score >= 75:
            return Vote.APPROVE
        elif score >= 50 and len(concerns) <= 1:
            return Vote.CONDITIONAL_APPROVE
        else:
            return Vote.REJECT


class RiskCommitteeMember(CommitteeMember):
    """リスク管理委員 - リスク面から提案を審査"""

    def __init__(self):
        super().__init__(
            name="リスク管理委員",
            role="リスク管理責任者",
            expertise="リスク定量化とリスク制限の遵守",
        )

    async def review(self, proposal: dict[str, Any]) -> CommitteeMemberVote:
        score = 0.0
        concerns = []
        conditions = []

        # 1. VaRチェック
        portfolio_risk = proposal.get("portfolio_risk", {})
        var_95 = portfolio_risk.get("total_var_95")
        if var_95 is not None and var_95 <= 0.05:
            score += 20
        elif var_95 is None:
            score += 10  # データ不足でも部分点
            conditions.append("VaR算出後に再評価すること")
        else:
            concerns.append(f"VaR({var_95:.1%})がリスク限度超過")

        # 2. 集中度チェック
        sector_concentration = portfolio_risk.get("sector_concentrations", {})
        max_concentration = max(sector_concentration.values()) if sector_concentration else 0
        if max_concentration <= 0.30:
            score += 20
        else:
            concerns.append(f"セクター集中度({max_concentration:.1%})が高い")

        # 3. 相関チェック
        score += 20  # TODO: 実装時に相関チェック

        # 4. ストレステスト
        score += 20  # TODO: ストレステスト結果に基づく評価

        # 5. 流動性リスク
        score += 20  # TODO: 流動性リスク評価

        vote = Vote.APPROVE if score >= 70 else (
            Vote.CONDITIONAL_APPROVE if score >= 50 else Vote.REJECT
        )

        return CommitteeMemberVote(
            member_name=self.name,
            role=self.role,
            vote=vote,
            score=score,
            reasoning=f"リスク評価: スコア{score}/100",
            conditions=conditions,
            risk_concerns=concerns,
        )


class ComplianceOfficer(CommitteeMember):
    """コンプライアンス担当 - 規制・法令遵守の観点から審査"""

    def __init__(self):
        super().__init__(
            name="コンプライアンス担当",
            role="コンプライアンスオフィサー",
            expertise="金融規制、インサイダー取引規制、適合性確認",
        )

    async def review(self, proposal: dict[str, Any]) -> CommitteeMemberVote:
        score = 0.0
        concerns = []
        conditions = []

        # 1. インサイダー取引チェック
        # TODO: 重要事実の公表前取引でないことを確認
        score += 25

        # 2. 空売り規制チェック
        if proposal.get("action") == "sell_short":
            conditions.append("空売り規制の遵守を確認すること")
            score += 15
        else:
            score += 25

        # 3. 大量保有報告義務チェック
        # TODO: 5%ルールの確認
        score += 25

        # 4. 適合性確認
        score += 25

        vote = Vote.APPROVE if score >= 80 else (
            Vote.CONDITIONAL_APPROVE if score >= 60 else Vote.REJECT
        )

        return CommitteeMemberVote(
            member_name=self.name,
            role=self.role,
            vote=vote,
            score=score,
            reasoning=f"コンプライアンス評価: スコア{score}/100",
            conditions=conditions,
            risk_concerns=concerns,
        )


class QuantCommitteeMember(CommitteeMember):
    """クオンツ委員 - 定量分析の観点から審査"""

    def __init__(self):
        super().__init__(
            name="クオンツ委員",
            role="定量分析責任者",
            expertise="統計的有意性、モデルリスク、バックテスト結果",
        )

    async def review(self, proposal: dict[str, Any]) -> CommitteeMemberVote:
        score = 0.0
        concerns = []
        conditions = []

        # 1. シグナル強度チェック
        integrated_score = abs(proposal.get("integrated_score", 0))
        if integrated_score >= 0.7:
            score += 30
        elif integrated_score >= 0.5:
            score += 20
        elif integrated_score >= 0.3:
            score += 10
            conditions.append("ポジションサイズを縮小すること")
        else:
            concerns.append(f"シグナル強度が弱い({integrated_score:.2f})")

        # 2. 信頼度チェック
        confidence = proposal.get("confidence", 0)
        if confidence >= 0.7:
            score += 25
        elif confidence >= 0.5:
            score += 15
        else:
            concerns.append(f"モデル信頼度が低い({confidence:.0%})")

        # 3. バックテスト整合性
        # TODO: 過去のバックテスト結果との整合性確認
        score += 20

        # 4. データ品質
        score += 25  # TODO: 入力データの品質チェック

        vote = Vote.APPROVE if score >= 70 else (
            Vote.CONDITIONAL_APPROVE if score >= 50 else Vote.REJECT
        )

        return CommitteeMemberVote(
            member_name=self.name,
            role=self.role,
            vote=vote,
            score=score,
            reasoning=f"定量分析評価: スコア{score}/100",
            conditions=conditions,
            risk_concerns=concerns,
        )


class InvestmentCommittee:
    """
    投資委員会 - 稟議プロセスの自動化

    稟議フロー:
    1. 投資提案を受領
    2. 各委員が独立して審査・投票
    3. 投票結果を集計
    4. 承認基準に基づき最終決定
    5. 条件付き承認の場合は条件を付与
    6. 基準未達の場合はエスカレーション（人間の判断を仰ぐ）
    """

    def __init__(self):
        self.members: list[CommitteeMember] = [
            CIO(),
            RiskCommitteeMember(),
            ComplianceOfficer(),
            QuantCommitteeMember(),
        ]
        # 承認基準
        self.approval_threshold = 0.60  # 60%以上の賛成で承認
        self.min_score_threshold = 50.0  # 平均スコア50以上
        self.escalation_threshold = 0.40  # 40%未満はエスカレーション
        self._decision_history: list[CommitteeDecision] = []

    async def review_proposal(
        self, proposal: dict[str, Any]
    ) -> CommitteeDecision:
        """投資提案の稟議プロセスを実行する"""
        proposal_id = (
            f"{proposal.get('ticker', 'unknown')}_"
            f"{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        )
        logger.info(f"[投資委員会] 稟議開始: {proposal_id}")

        # 1. 各委員による独立審査
        votes: list[CommitteeMemberVote] = []
        for member in self.members:
            vote = await member.review(proposal)
            votes.append(vote)
            logger.info(
                f"  [{member.name}] {vote.vote.value} "
                f"(スコア: {vote.score})"
            )

        # 2. 投票結果の集計
        approval_count = sum(
            1 for v in votes
            if v.vote in (Vote.APPROVE, Vote.CONDITIONAL_APPROVE)
        )
        approval_rate = approval_count / len(votes)
        average_score = sum(v.score for v in votes) / len(votes)

        # 3. 条件の集約
        all_conditions = []
        for v in votes:
            all_conditions.extend(v.conditions)
        unique_conditions = list(set(all_conditions))

        # 4. 最終決定
        status, summary, escalation_reason = self._make_decision(
            approval_rate, average_score, votes, unique_conditions
        )

        decision = CommitteeDecision(
            proposal_id=proposal_id,
            status=status,
            votes=votes,
            approval_rate=approval_rate,
            average_score=average_score,
            final_conditions=unique_conditions,
            decision_summary=summary,
            escalation_reason=escalation_reason,
        )

        self._decision_history.append(decision)
        logger.info(
            f"[投資委員会] 稟議結果: {status.value} "
            f"(賛成率: {approval_rate:.0%}, 平均スコア: {average_score:.0f})"
        )

        return decision

    def _make_decision(
        self,
        approval_rate: float,
        average_score: float,
        votes: list[CommitteeMemberVote],
        conditions: list[str],
    ) -> tuple[ProposalStatus, str, str | None]:
        """最終決定ロジック"""
        # コンプライアンス担当が却下した場合は無条件で却下
        compliance_votes = [v for v in votes if v.role == "コンプライアンスオフィサー"]
        if any(v.vote == Vote.REJECT for v in compliance_votes):
            return (
                ProposalStatus.REJECTED,
                "コンプライアンス上の懸念により却下",
                None,
            )

        # 承認基準判定
        if approval_rate >= self.approval_threshold and average_score >= self.min_score_threshold:
            if conditions:
                return (
                    ProposalStatus.CONDITIONALLY_APPROVED,
                    f"条件付き承認（賛成率{approval_rate:.0%}、条件{len(conditions)}件）",
                    None,
                )
            return (
                ProposalStatus.APPROVED,
                f"承認（賛成率{approval_rate:.0%}、平均スコア{average_score:.0f}）",
                None,
            )

        # エスカレーション判定
        if approval_rate < self.escalation_threshold:
            return (
                ProposalStatus.ESCALATED,
                "低賛成率のためエスカレーション",
                f"賛成率{approval_rate:.0%}が閾値{self.escalation_threshold:.0%}未満",
            )

        # それ以外は却下
        all_concerns = []
        for v in votes:
            all_concerns.extend(v.risk_concerns)
        return (
            ProposalStatus.REJECTED,
            f"却下（賛成率{approval_rate:.0%}、平均スコア{average_score:.0f}）",
            None,
        )

    async def review_batch(
        self, proposals: list[dict[str, Any]]
    ) -> list[CommitteeDecision]:
        """複数提案の一括稟議"""
        decisions = []
        for proposal in proposals:
            decision = await self.review_proposal(proposal)
            decisions.append(decision)
        return decisions

    @property
    def decision_history(self) -> list[CommitteeDecision]:
        return self._decision_history
