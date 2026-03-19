"""
Base Agent - 全Agentの基底クラス
"""

from __future__ import annotations

import json
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class AgentStatus(Enum):
    IDLE = "idle"
    RUNNING = "running"
    COMPLETED = "completed"
    ERROR = "error"


@dataclass
class AgentReport:
    """Agentが生成するレポートの基底クラス"""

    agent_name: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    status: str = "success"
    data: dict[str, Any] = field(default_factory=dict)
    confidence: float = 0.0  # 0.0 - 1.0
    summary: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "agent_name": self.agent_name,
            "timestamp": self.timestamp,
            "status": self.status,
            "data": self.data,
            "confidence": self.confidence,
            "summary": self.summary,
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)


class BaseAgent(ABC):
    """全投資Agentの基底クラス"""

    def __init__(self, name: str, role: str, description: str):
        self.name = name
        self.role = role
        self.description = description
        self.status = AgentStatus.IDLE
        self._history: list[AgentReport] = []

    @abstractmethod
    async def execute(self, inputs: dict[str, Any]) -> AgentReport:
        """Agentのメインロジックを実行する"""
        ...

    @abstractmethod
    async def validate_inputs(self, inputs: dict[str, Any]) -> bool:
        """入力データのバリデーション"""
        ...

    async def run(self, inputs: dict[str, Any]) -> AgentReport:
        """Agentの実行エントリーポイント"""
        logger.info(f"[{self.name}] 実行開始")
        self.status = AgentStatus.RUNNING

        try:
            if not await self.validate_inputs(inputs):
                raise ValueError(f"[{self.name}] 入力データが不正です")

            report = await self.execute(inputs)
            self._history.append(report)
            self.status = AgentStatus.COMPLETED
            logger.info(f"[{self.name}] 実行完了 (confidence={report.confidence:.2f})")
            return report

        except Exception as e:
            self.status = AgentStatus.ERROR
            logger.error(f"[{self.name}] エラー: {e}")
            return AgentReport(
                agent_name=self.name,
                status="error",
                summary=str(e),
            )

    @property
    def last_report(self) -> AgentReport | None:
        return self._history[-1] if self._history else None
