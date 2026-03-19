/**
 * OpenHeart 財務データ
 * 週次資金繰りデータモデル
 */

const COMPANY = {
    name: 'OpenHeart株式会社',
    fiscalYearStart: '2025-04-01',
    currency: 'JPY',
};

// 週次データ（2025年10月〜2026年3月）
const weeklyData = [
    // 2025年10月
    {
        weekStart: '2025-10-06',
        weekEnd: '2025-10-12',
        label: '10/6〜10/12',
        month: '2025-10',
        openingBalance: 48000000,
        income: [
            { category: '売上入金', amount: 2800000, note: 'A社 SaaS月額' },
            { category: '売上入金', amount: 1500000, note: 'B社 コンサル' },
        ],
        expenses: [
            { category: '人件費', amount: 3200000, note: '給与・社保' },
            { category: 'オフィス', amount: 450000, note: '賃料' },
            { category: 'インフラ', amount: 380000, note: 'AWS/GCP' },
            { category: '外注費', amount: 600000, note: 'デザイン外注' },
            { category: 'その他', amount: 120000, note: '消耗品・雑費' },
        ],
    },
    {
        weekStart: '2025-10-13',
        weekEnd: '2025-10-19',
        label: '10/13〜10/19',
        month: '2025-10',
        openingBalance: 47550000,
        income: [
            { category: '売上入金', amount: 1200000, note: 'C社 API利用料' },
        ],
        expenses: [
            { category: '人件費', amount: 200000, note: '業務委託' },
            { category: 'マーケティング', amount: 850000, note: '広告費' },
            { category: 'インフラ', amount: 150000, note: 'SaaS利用料' },
            { category: 'その他', amount: 80000, note: '交通費' },
        ],
    },
    {
        weekStart: '2025-10-20',
        weekEnd: '2025-10-26',
        label: '10/20〜10/26',
        month: '2025-10',
        openingBalance: 47470000,
        income: [
            { category: '売上入金', amount: 3500000, note: 'D社 年間契約' },
        ],
        expenses: [
            { category: '人件費', amount: 500000, note: '賞与引当' },
            { category: '外注費', amount: 1200000, note: '開発外注' },
            { category: 'その他', amount: 200000, note: '接待交際費' },
        ],
    },
    {
        weekStart: '2025-10-27',
        weekEnd: '2025-11-02',
        label: '10/27〜11/2',
        month: '2025-10',
        openingBalance: 49070000,
        income: [
            { category: '売上入金', amount: 800000, note: 'E社 スポット' },
        ],
        expenses: [
            { category: 'インフラ', amount: 280000, note: 'サーバー増強' },
            { category: 'その他', amount: 150000, note: '書籍・研修' },
        ],
    },
    // 2025年11月
    {
        weekStart: '2025-11-03',
        weekEnd: '2025-11-09',
        label: '11/3〜11/9',
        month: '2025-11',
        openingBalance: 49440000,
        income: [
            { category: '売上入金', amount: 2800000, note: 'A社 SaaS月額' },
            { category: '売上入金', amount: 1500000, note: 'B社 コンサル' },
        ],
        expenses: [
            { category: '人件費', amount: 3200000, note: '給与・社保' },
            { category: 'オフィス', amount: 450000, note: '賃料' },
            { category: 'インフラ', amount: 400000, note: 'AWS/GCP' },
            { category: '外注費', amount: 500000, note: 'デザイン外注' },
            { category: 'その他', amount: 130000, note: '消耗品・雑費' },
        ],
    },
    {
        weekStart: '2025-11-10',
        weekEnd: '2025-11-16',
        label: '11/10〜11/16',
        month: '2025-11',
        openingBalance: 49060000,
        income: [
            { category: '売上入金', amount: 1200000, note: 'C社 API利用料' },
            { category: 'その他収入', amount: 500000, note: '助成金入金' },
        ],
        expenses: [
            { category: '人件費', amount: 200000, note: '業務委託' },
            { category: 'マーケティング', amount: 1200000, note: '展示会出展' },
            { category: 'その他', amount: 350000, note: '出張費' },
        ],
    },
    {
        weekStart: '2025-11-17',
        weekEnd: '2025-11-23',
        label: '11/17〜11/23',
        month: '2025-11',
        openingBalance: 49010000,
        income: [
            { category: '売上入金', amount: 2000000, note: 'F社 新規契約' },
        ],
        expenses: [
            { category: '外注費', amount: 1500000, note: '開発外注' },
            { category: 'インフラ', amount: 200000, note: 'セキュリティツール' },
            { category: 'その他', amount: 100000, note: '法務費用' },
        ],
    },
    {
        weekStart: '2025-11-24',
        weekEnd: '2025-11-30',
        label: '11/24〜11/30',
        month: '2025-11',
        openingBalance: 49210000,
        income: [
            { category: '売上入金', amount: 900000, note: 'G社 スポット' },
        ],
        expenses: [
            { category: '人件費', amount: 500000, note: '賞与引当' },
            { category: 'その他', amount: 180000, note: '保険料' },
        ],
    },
    // 2025年12月
    {
        weekStart: '2025-12-01',
        weekEnd: '2025-12-07',
        label: '12/1〜12/7',
        month: '2025-12',
        openingBalance: 49430000,
        income: [
            { category: '売上入金', amount: 2800000, note: 'A社 SaaS月額' },
            { category: '売上入金', amount: 1500000, note: 'B社 コンサル' },
        ],
        expenses: [
            { category: '人件費', amount: 3200000, note: '給与・社保' },
            { category: 'オフィス', amount: 450000, note: '賃料' },
            { category: 'インフラ', amount: 420000, note: 'AWS/GCP' },
            { category: '外注費', amount: 800000, note: 'デザイン外注' },
            { category: 'その他', amount: 250000, note: '年末調整関連' },
        ],
    },
    {
        weekStart: '2025-12-08',
        weekEnd: '2025-12-14',
        label: '12/8〜12/14',
        month: '2025-12',
        openingBalance: 48610000,
        income: [
            { category: '売上入金', amount: 1200000, note: 'C社 API利用料' },
        ],
        expenses: [
            { category: 'マーケティング', amount: 600000, note: '広告費' },
            { category: 'インフラ', amount: 180000, note: 'SaaS利用料' },
            { category: 'その他', amount: 90000, note: '交通費' },
        ],
    },
    {
        weekStart: '2025-12-15',
        weekEnd: '2025-12-21',
        label: '12/15〜12/21',
        month: '2025-12',
        openingBalance: 48940000,
        income: [
            { category: '売上入金', amount: 1800000, note: 'D社 追加契約' },
        ],
        expenses: [
            { category: '人件費', amount: 6500000, note: '賞与支給' },
            { category: '外注費', amount: 400000, note: '開発外注' },
            { category: 'その他', amount: 300000, note: '忘年会・福利厚生' },
        ],
    },
    {
        weekStart: '2025-12-22',
        weekEnd: '2025-12-28',
        label: '12/22〜12/28',
        month: '2025-12',
        openingBalance: 43540000,
        income: [
            { category: '売上入金', amount: 500000, note: 'H社 スポット' },
        ],
        expenses: [
            { category: 'その他', amount: 200000, note: '年末経費' },
        ],
    },
    // 2026年1月
    {
        weekStart: '2026-01-05',
        weekEnd: '2026-01-11',
        label: '1/5〜1/11',
        month: '2026-01',
        openingBalance: 43840000,
        income: [
            { category: '売上入金', amount: 2800000, note: 'A社 SaaS月額' },
            { category: '売上入金', amount: 1500000, note: 'B社 コンサル' },
            { category: 'その他収入', amount: 2000000, note: '補助金入金' },
        ],
        expenses: [
            { category: '人件費', amount: 3400000, note: '給与・社保（昇給反映）' },
            { category: 'オフィス', amount: 450000, note: '賃料' },
            { category: 'インフラ', amount: 450000, note: 'AWS/GCP' },
            { category: '外注費', amount: 700000, note: 'デザイン外注' },
            { category: 'その他', amount: 150000, note: '消耗品' },
        ],
    },
    {
        weekStart: '2026-01-12',
        weekEnd: '2026-01-18',
        label: '1/12〜1/18',
        month: '2026-01',
        openingBalance: 44990000,
        income: [
            { category: '売上入金', amount: 1200000, note: 'C社 API利用料' },
            { category: '売上入金', amount: 3000000, note: 'I社 新規大型契約' },
        ],
        expenses: [
            { category: '人件費', amount: 300000, note: '業務委託' },
            { category: 'マーケティング', amount: 1500000, note: '新年キャンペーン' },
            { category: 'インフラ', amount: 200000, note: 'SaaS利用料' },
            { category: 'その他', amount: 120000, note: '交通費' },
        ],
    },
    {
        weekStart: '2026-01-19',
        weekEnd: '2026-01-25',
        label: '1/19〜1/25',
        month: '2026-01',
        openingBalance: 47070000,
        income: [
            { category: '売上入金', amount: 1500000, note: 'F社 月額' },
        ],
        expenses: [
            { category: '外注費', amount: 1800000, note: '新機能開発外注' },
            { category: 'インフラ', amount: 300000, note: 'セキュリティ監査' },
            { category: 'その他', amount: 150000, note: '採用費' },
        ],
    },
    {
        weekStart: '2026-01-26',
        weekEnd: '2026-02-01',
        label: '1/26〜2/1',
        month: '2026-01',
        openingBalance: 46320000,
        income: [
            { category: '売上入金', amount: 600000, note: 'スポット案件' },
        ],
        expenses: [
            { category: 'その他', amount: 250000, note: '会計・税務顧問' },
        ],
    },
    // 2026年2月
    {
        weekStart: '2026-02-02',
        weekEnd: '2026-02-08',
        label: '2/2〜2/8',
        month: '2026-02',
        openingBalance: 46670000,
        income: [
            { category: '売上入金', amount: 2800000, note: 'A社 SaaS月額' },
            { category: '売上入金', amount: 1500000, note: 'B社 コンサル' },
        ],
        expenses: [
            { category: '人件費', amount: 3400000, note: '給与・社保' },
            { category: 'オフィス', amount: 450000, note: '賃料' },
            { category: 'インフラ', amount: 480000, note: 'AWS/GCP' },
            { category: '外注費', amount: 600000, note: 'デザイン外注' },
            { category: 'その他', amount: 140000, note: '消耗品' },
        ],
    },
    {
        weekStart: '2026-02-09',
        weekEnd: '2026-02-15',
        label: '2/9〜2/15',
        month: '2026-02',
        openingBalance: 45900000,
        income: [
            { category: '売上入金', amount: 1200000, note: 'C社 API利用料' },
            { category: '売上入金', amount: 1500000, note: 'I社 月額' },
        ],
        expenses: [
            { category: '人件費', amount: 300000, note: '業務委託' },
            { category: 'マーケティング', amount: 900000, note: '広告費' },
            { category: 'その他', amount: 200000, note: '出張費' },
        ],
    },
    {
        weekStart: '2026-02-16',
        weekEnd: '2026-02-22',
        label: '2/16〜2/22',
        month: '2026-02',
        openingBalance: 47200000,
        income: [
            { category: '売上入金', amount: 1500000, note: 'F社 月額' },
            { category: '売上入金', amount: 2500000, note: 'J社 新規契約' },
        ],
        expenses: [
            { category: '外注費', amount: 2000000, note: '開発外注' },
            { category: 'インフラ', amount: 250000, note: 'インフラ増強' },
            { category: 'その他', amount: 180000, note: '法務費用' },
        ],
    },
    {
        weekStart: '2026-02-23',
        weekEnd: '2026-03-01',
        label: '2/23〜3/1',
        month: '2026-02',
        openingBalance: 48770000,
        income: [
            { category: '売上入金', amount: 700000, note: 'スポット案件' },
        ],
        expenses: [
            { category: '人件費', amount: 500000, note: '賞与引当' },
            { category: 'その他', amount: 200000, note: '保険料' },
        ],
    },
    // 2026年3月
    {
        weekStart: '2026-03-02',
        weekEnd: '2026-03-08',
        label: '3/2〜3/8',
        month: '2026-03',
        openingBalance: 48770000,
        income: [
            { category: '売上入金', amount: 2800000, note: 'A社 SaaS月額' },
            { category: '売上入金', amount: 1500000, note: 'B社 コンサル' },
        ],
        expenses: [
            { category: '人件費', amount: 3400000, note: '給与・社保' },
            { category: 'オフィス', amount: 450000, note: '賃料' },
            { category: 'インフラ', amount: 500000, note: 'AWS/GCP' },
            { category: '外注費', amount: 700000, note: 'デザイン外注' },
            { category: 'その他', amount: 160000, note: '消耗品' },
        ],
    },
    {
        weekStart: '2026-03-09',
        weekEnd: '2026-03-15',
        label: '3/9〜3/15',
        month: '2026-03',
        openingBalance: 47860000,
        income: [
            { category: '売上入金', amount: 1200000, note: 'C社 API利用料' },
            { category: '売上入金', amount: 1500000, note: 'I社 月額' },
            { category: '売上入金', amount: 2500000, note: 'J社 月額' },
        ],
        expenses: [
            { category: '人件費', amount: 300000, note: '業務委託' },
            { category: 'マーケティング', amount: 1000000, note: '年度末キャンペーン' },
            { category: 'インフラ', amount: 200000, note: 'SaaS利用料' },
            { category: 'その他', amount: 150000, note: '交通費' },
        ],
    },
    {
        weekStart: '2026-03-16',
        weekEnd: '2026-03-22',
        label: '3/16〜3/22',
        month: '2026-03',
        openingBalance: 51410000,
        income: [
            { category: '売上入金', amount: 1500000, note: 'F社 月額' },
            { category: '売上入金', amount: 5000000, note: 'K社 年間契約一括' },
        ],
        expenses: [
            { category: '外注費', amount: 1500000, note: '開発外注' },
            { category: 'インフラ', amount: 350000, note: 'インフラ年間契約' },
            { category: '人件費', amount: 800000, note: '採用関連費' },
            { category: 'その他', amount: 250000, note: '決算準備費用' },
        ],
    },
];

// 将来予測データ（4月以降の見込み）
const projectedData = [
    {
        weekStart: '2026-03-23',
        weekEnd: '2026-03-29',
        label: '3/23〜3/29（予測）',
        month: '2026-03',
        projected: true,
        openingBalance: 55010000,
        income: [
            { category: '売上入金', amount: 1000000, note: '見込み' },
        ],
        expenses: [
            { category: '人件費', amount: 500000, note: '賞与引当' },
            { category: 'その他', amount: 300000, note: '年度末経費' },
        ],
    },
    {
        weekStart: '2026-03-30',
        weekEnd: '2026-04-05',
        label: '3/30〜4/5（予測）',
        month: '2026-04',
        projected: true,
        openingBalance: 55210000,
        income: [
            { category: '売上入金', amount: 4300000, note: '定期入金見込み' },
            { category: '売上入金', amount: 4000000, note: '新規見込み' },
        ],
        expenses: [
            { category: '人件費', amount: 3600000, note: '給与（増員見込み）' },
            { category: 'オフィス', amount: 450000, note: '賃料' },
            { category: 'インフラ', amount: 550000, note: 'インフラ費' },
            { category: '外注費', amount: 1000000, note: '外注費' },
            { category: 'マーケティング', amount: 800000, note: '広告費' },
            { category: 'その他', amount: 200000, note: '雑費' },
        ],
    },
    {
        weekStart: '2026-04-06',
        weekEnd: '2026-04-12',
        label: '4/6〜4/12（予測）',
        month: '2026-04',
        projected: true,
        openingBalance: 52910000,
        income: [
            { category: '売上入金', amount: 1500000, note: '見込み' },
        ],
        expenses: [
            { category: 'マーケティング', amount: 1200000, note: '新年度施策' },
            { category: 'その他', amount: 300000, note: '雑費' },
        ],
    },
    {
        weekStart: '2026-04-13',
        weekEnd: '2026-04-19',
        label: '4/13〜4/19（予測）',
        month: '2026-04',
        projected: true,
        openingBalance: 52910000,
        income: [
            { category: '売上入金', amount: 2000000, note: '見込み' },
        ],
        expenses: [
            { category: '外注費', amount: 1500000, note: '開発外注' },
            { category: 'その他', amount: 200000, note: '雑費' },
        ],
    },
];

// 全データ結合
const allWeeklyData = [...weeklyData, ...projectedData];
