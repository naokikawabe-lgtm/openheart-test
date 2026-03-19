"""
AI Investment Agent Teams - チーム構成設定

Agent Teamsによる株取引自動化のための構成定義。
調査、分析、戦略立案、意思決定、投資委員会稟議を自動化する。
"""

TEAM_CONFIG = {
    "team_name": "AI Investment Committee System",
    "version": "1.0.0",

    # ============================================================
    # Agent定義
    # ============================================================
    "agents": {
        # ----------------------------------------------------------
        # 1. リサーチチーム（調査）
        # ----------------------------------------------------------
        "market_researcher": {
            "role": "マーケットリサーチャー",
            "description": "マクロ経済指標、市場トレンド、ニュースを収集・整理する",
            "responsibilities": [
                "GDP、CPI、雇用統計等のマクロ経済データ収集",
                "日銀・FRB等の金融政策動向モニタリング",
                "市場センチメント分析（VIX、信用評価残、騰落レシオ）",
                "セクター別資金フロー分析",
            ],
            "inputs": ["経済カレンダー", "ニュースフィード", "市場データAPI"],
            "outputs": ["market_report"],
            "schedule": "毎日 06:00 JST",
        },

        "company_analyst": {
            "role": "企業アナリスト",
            "description": "個別企業のファンダメンタルズを調査・分析する",
            "responsibilities": [
                "財務諸表分析（PL、BS、CF）",
                "競合比較分析",
                "経営陣の質・ガバナンス評価",
                "成長ドライバーとリスク要因の特定",
            ],
            "inputs": ["EDINET", "決算短信", "有価証券報告書", "IR資料"],
            "outputs": ["company_report"],
            "schedule": "銘柄スクリーニング: 毎週月曜、決算期: リアルタイム",
        },

        "alternative_data_analyst": {
            "role": "オルタナティブデータアナリスト",
            "description": "非伝統的データソースから投資シグナルを抽出する",
            "responsibilities": [
                "SNSセンチメント分析（Twitter/X、掲示板）",
                "衛星画像による経済活動分析",
                "Webトラフィック・アプリ利用動向",
                "特許出願・採用動向の分析",
            ],
            "inputs": ["SNS API", "Webスクレイピング", "特許DB"],
            "outputs": ["alternative_signal_report"],
            "schedule": "毎日 07:00 JST",
        },

        # ----------------------------------------------------------
        # 2. 分析チーム（多角的分析）
        # ----------------------------------------------------------
        "technical_analyst": {
            "role": "テクニカルアナリスト",
            "description": "チャートパターンとテクニカル指標による分析を行う",
            "responsibilities": [
                "トレンド分析（移動平均線、MACD、一目均衡表）",
                "モメンタム分析（RSI、ストキャスティクス）",
                "出来高分析（OBV、VWAP）",
                "チャートパターン認識（ブレイクアウト、サポレジ）",
            ],
            "inputs": ["OHLCV データ", "板情報", "歩み値"],
            "outputs": ["technical_analysis_report"],
            "schedule": "リアルタイム（場中15分間隔）",
        },

        "quantitative_analyst": {
            "role": "クオンツアナリスト",
            "description": "統計モデルと機械学習による定量分析を行う",
            "responsibilities": [
                "ファクターモデル分析（バリュー、モメンタム、クオリティ）",
                "リスクモデル構築（VaR、CVaR、最大ドローダウン）",
                "相関分析とポートフォリオ最適化",
                "機械学習による株価予測モデル運用",
            ],
            "inputs": ["ヒストリカルデータ", "ファクターDB"],
            "outputs": ["quant_analysis_report", "risk_metrics"],
            "schedule": "毎日 08:00 JST + リアルタイムリスク監視",
        },

        "sentiment_analyst": {
            "role": "センチメントアナリスト",
            "description": "市場心理と投資家行動を分析する",
            "responsibilities": [
                "ニュースセンチメントスコアリング（NLP）",
                "機関投資家ポジション分析（大量保有報告）",
                "信用取引残高・空売り比率分析",
                "オプション市場からのインプライドボラティリティ分析",
            ],
            "inputs": ["ニュースフィード", "適時開示", "オプションデータ"],
            "outputs": ["sentiment_report"],
            "schedule": "毎日 08:30 JST",
        },

        # ----------------------------------------------------------
        # 3. 戦略立案チーム
        # ----------------------------------------------------------
        "strategy_architect": {
            "role": "ストラテジーアーキテクト",
            "description": "分析結果を統合し投資戦略を策定する",
            "responsibilities": [
                "全Agentの分析レポートを統合",
                "投資テーマの設定と優先順位付け",
                "エントリー/エグジット戦略の策定",
                "ポジションサイズとリスク配分の決定",
            ],
            "inputs": [
                "market_report",
                "company_report",
                "alternative_signal_report",
                "technical_analysis_report",
                "quant_analysis_report",
                "sentiment_report",
            ],
            "outputs": ["investment_proposal"],
            "schedule": "毎日 09:00 JST（寄付き前）",
        },

        # ----------------------------------------------------------
        # 4. 意思決定・執行チーム
        # ----------------------------------------------------------
        "risk_manager": {
            "role": "リスクマネージャー",
            "description": "投資提案のリスク評価と承認判断を行う",
            "responsibilities": [
                "投資提案のリスク/リターン評価",
                "ポートフォリオ全体のリスク制約チェック",
                "ストレステスト実施",
                "損切り・利確ルールの遵守監視",
            ],
            "inputs": ["investment_proposal", "current_portfolio", "risk_metrics"],
            "outputs": ["risk_assessment"],
            "schedule": "投資提案受領時（リアルタイム）",
        },

        "execution_agent": {
            "role": "エグゼキューションエージェント",
            "description": "承認された取引を最適に執行する",
            "responsibilities": [
                "注文の最適執行（TWAP、VWAP、アイスバーグ）",
                "スリッページ最小化",
                "執行コスト分析（TCA）",
                "約定結果のレポーティング",
            ],
            "inputs": ["approved_orders"],
            "outputs": ["execution_report"],
            "schedule": "取引承認時（リアルタイム）",
        },

        "portfolio_monitor": {
            "role": "ポートフォリオモニター",
            "description": "ポートフォリオの状態を常時監視しアラートを発する",
            "responsibilities": [
                "リアルタイム損益監視",
                "リスク限度額の監視とアラート",
                "リバランスシグナルの発信",
                "日次パフォーマンスレポートの生成",
            ],
            "inputs": ["current_portfolio", "market_data"],
            "outputs": ["portfolio_status", "alert"],
            "schedule": "場中: リアルタイム、場後: 16:00 JST",
        },
    },

    # ============================================================
    # ワークフロー定義
    # ============================================================
    "workflow": {
        "daily_morning": {
            "description": "毎朝の投資判断ワークフロー",
            "steps": [
                {
                    "step": 1,
                    "name": "データ収集",
                    "agents": [
                        "market_researcher",
                        "company_analyst",
                        "alternative_data_analyst",
                    ],
                    "parallel": True,
                    "timeout_minutes": 30,
                },
                {
                    "step": 2,
                    "name": "多角的分析",
                    "agents": [
                        "technical_analyst",
                        "quantitative_analyst",
                        "sentiment_analyst",
                    ],
                    "parallel": True,
                    "timeout_minutes": 30,
                },
                {
                    "step": 3,
                    "name": "戦略策定",
                    "agents": ["strategy_architect"],
                    "parallel": False,
                    "timeout_minutes": 15,
                },
                {
                    "step": 4,
                    "name": "投資委員会稟議",
                    "agents": ["investment_committee"],
                    "parallel": False,
                    "timeout_minutes": 20,
                },
                {
                    "step": 5,
                    "name": "リスク最終チェック",
                    "agents": ["risk_manager"],
                    "parallel": False,
                    "timeout_minutes": 10,
                },
                {
                    "step": 6,
                    "name": "取引執行",
                    "agents": ["execution_agent"],
                    "parallel": False,
                    "timeout_minutes": 5,
                },
            ],
        },
        "realtime_monitoring": {
            "description": "場中のリアルタイム監視ワークフロー",
            "steps": [
                {
                    "step": 1,
                    "name": "継続監視",
                    "agents": [
                        "portfolio_monitor",
                        "technical_analyst",
                        "risk_manager",
                    ],
                    "parallel": True,
                    "continuous": True,
                },
            ],
        },
    },
}
