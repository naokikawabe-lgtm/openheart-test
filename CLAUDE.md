# OpenHeart Project — Claude Instructions

## 🔴 最優先：セッション開始時の自動チェック（毎回必ず実行）

**セッション開始直後、ユーザーへの返答より前に以下を実行すること：**

```
ファイルの確認: /home/user/openheart-test/.daily-report-trigger
```

### トリガーファイルが存在する場合 → 即時レポート実行

1. `/home/user/openheart-test/daily-report-prompt.md` を読み込む
2. そのファイルの指示に従い、OpenHeart日次経営レポートを**完全に実行**する
   - Google Calendar 全メンバーのスケジュール取得
   - Slack 個別キーワード検索（ORクエリ禁止）
   - Notion ページ直接フェッチ
   - Part A（全社活動ログ）を #daily-briefing に投稿
   - Part B（経営ブリーフィング）をスレッド返信
   - Notion 経営コーチDB にレコード作成
3. 実行完了後：
   - `/home/user/openheart-test/.last-report-date` に今日の日付（YYYY-MM-DD）を書き込む
   - `/home/user/openheart-test/.daily-report-trigger` を削除する
4. ユーザーに「本日の日次レポートを自動生成・配信しました」と簡潔に報告する

### トリガーファイルが存在しない場合 → 何もせず通常モードで応答

---

## プロジェクト概要

**会社**: 株式会社OpenHeart  
**担当者**: 河邊尚貴（COO/CFO/CSO）  
**主要ツール**: Slack（openheart-hq）/ Notion / Google Calendar

## 重要な定数

- Slack #daily-briefing: `C0AL8ELJW4X`
- Notion 経営コーチDB: `d57b4348-7227-4b81-a385-f4c7a299cfce`
- 日次レポートプロンプト: `/home/user/openheart-test/daily-report-prompt.md`
- チームメンバー: 河邊尚貴・渡邊浩司(CEO)・藤田秀(CTO)・三野宮定里(CDO)・今須えみ・森山圭介
