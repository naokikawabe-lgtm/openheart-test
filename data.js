/**
 * OpenHeart 財務ダッシュボード
 * boardデータモデル + 予算データ + チェック項目
 *
 * 記事参照: BASSDRUMのtakuさんが構築した財務ダッシュボードの構成を参考に、
 * boardのデータ同期・受注ステータス別表示・キャッシュフロー・予実管理・
 * 月末月初チェック・案件別損益を実装
 */

const COMPANY = {
    name: 'OpenHeart株式会社',
    fiscalYearStart: '2025-04-01',
    currency: 'JPY',
    lastSyncedAt: '2026-03-19 09:15:00',
};

// ========================================
// board 案件データ（受注ステータス別）
// ========================================
// status: 'confirmed' | 'prospect' | 'potential'
//   confirmed = 受注確定, prospect = 見込み, potential = ポテンシャル
const projects = [
    {
        id: 'PJ-001',
        name: 'A社 SaaSプラットフォーム開発',
        client: 'A社',
        status: 'confirmed',
        category: '開発',
        startMonth: '2025-07',
        endMonth: '2026-06',
        // 請求（売上）
        invoices: [
            { month: '2025-10', amount: 2800000, issued: true, paid: true, paidDate: '2025-11-30' },
            { month: '2025-11', amount: 2800000, issued: true, paid: true, paidDate: '2025-12-31' },
            { month: '2025-12', amount: 2800000, issued: true, paid: true, paidDate: '2026-01-31' },
            { month: '2026-01', amount: 2800000, issued: true, paid: true, paidDate: '2026-02-28' },
            { month: '2026-02', amount: 2800000, issued: true, paid: true, paidDate: '2026-03-31' },
            { month: '2026-03', amount: 2800000, issued: true, paid: false, paidDate: null },
            { month: '2026-04', amount: 2800000, issued: false, paid: false, paidDate: null },
            { month: '2026-05', amount: 2800000, issued: false, paid: false, paidDate: null },
            { month: '2026-06', amount: 2800000, issued: false, paid: false, paidDate: null },
        ],
        // 発注（外注費）
        orders: [
            { month: '2025-10', amount: 800000, vendor: 'フリーランスX', confirmed: true, paid: true },
            { month: '2025-11', amount: 800000, vendor: 'フリーランスX', confirmed: true, paid: true },
            { month: '2025-12', amount: 800000, vendor: 'フリーランスX', confirmed: true, paid: true },
            { month: '2026-01', amount: 800000, vendor: 'フリーランスX', confirmed: true, paid: true },
            { month: '2026-02', amount: 800000, vendor: 'フリーランスX', confirmed: true, paid: true },
            { month: '2026-03', amount: 800000, vendor: 'フリーランスX', confirmed: true, paid: false },
            { month: '2026-04', amount: 800000, vendor: 'フリーランスX', confirmed: false, paid: false },
        ],
    },
    {
        id: 'PJ-002',
        name: 'B社 コンサルティング',
        client: 'B社',
        status: 'confirmed',
        category: 'コンサル',
        startMonth: '2025-08',
        endMonth: '2026-03',
        invoices: [
            { month: '2025-10', amount: 1500000, issued: true, paid: true, paidDate: '2025-11-30' },
            { month: '2025-11', amount: 1500000, issued: true, paid: true, paidDate: '2025-12-31' },
            { month: '2025-12', amount: 1500000, issued: true, paid: true, paidDate: '2026-01-31' },
            { month: '2026-01', amount: 1500000, issued: true, paid: true, paidDate: '2026-02-28' },
            { month: '2026-02', amount: 1500000, issued: true, paid: true, paidDate: '2026-03-31' },
            { month: '2026-03', amount: 1500000, issued: true, paid: false, paidDate: null },
        ],
        orders: [],
    },
    {
        id: 'PJ-003',
        name: 'C社 API連携基盤構築',
        client: 'C社',
        status: 'confirmed',
        category: '開発',
        startMonth: '2025-09',
        endMonth: '2026-09',
        invoices: [
            { month: '2025-10', amount: 1200000, issued: true, paid: true, paidDate: '2025-11-30' },
            { month: '2025-11', amount: 1200000, issued: true, paid: true, paidDate: '2025-12-31' },
            { month: '2025-12', amount: 1200000, issued: true, paid: true, paidDate: '2026-01-31' },
            { month: '2026-01', amount: 1200000, issued: true, paid: true, paidDate: '2026-02-28' },
            { month: '2026-02', amount: 1200000, issued: true, paid: true, paidDate: '2026-03-31' },
            { month: '2026-03', amount: 1200000, issued: true, paid: false, paidDate: null },
            { month: '2026-04', amount: 1200000, issued: false, paid: false, paidDate: null },
            { month: '2026-05', amount: 1200000, issued: false, paid: false, paidDate: null },
        ],
        orders: [
            { month: '2025-10', amount: 350000, vendor: 'インフラ社', confirmed: true, paid: true },
            { month: '2025-11', amount: 350000, vendor: 'インフラ社', confirmed: true, paid: true },
            { month: '2025-12', amount: 350000, vendor: 'インフラ社', confirmed: true, paid: true },
            { month: '2026-01', amount: 350000, vendor: 'インフラ社', confirmed: true, paid: true },
            { month: '2026-02', amount: 350000, vendor: 'インフラ社', confirmed: true, paid: true },
            { month: '2026-03', amount: 350000, vendor: 'インフラ社', confirmed: true, paid: false },
        ],
    },
    {
        id: 'PJ-004',
        name: 'D社 年間保守契約',
        client: 'D社',
        status: 'confirmed',
        category: '保守',
        startMonth: '2025-10',
        endMonth: '2026-09',
        invoices: [
            { month: '2025-10', amount: 3500000, issued: true, paid: true, paidDate: '2025-11-30' },
            { month: '2025-12', amount: 1800000, issued: true, paid: true, paidDate: '2026-01-31' },
            { month: '2026-03', amount: 1800000, issued: true, paid: false, paidDate: null },
            { month: '2026-06', amount: 1800000, issued: false, paid: false, paidDate: null },
            { month: '2026-09', amount: 1800000, issued: false, paid: false, paidDate: null },
        ],
        orders: [],
    },
    {
        id: 'PJ-005',
        name: 'E社 データ分析基盤',
        client: 'E社',
        status: 'confirmed',
        category: '開発',
        startMonth: '2025-10',
        endMonth: '2025-12',
        invoices: [
            { month: '2025-10', amount: 800000, issued: true, paid: true, paidDate: '2025-11-30' },
            { month: '2025-12', amount: 2500000, issued: true, paid: true, paidDate: '2026-01-31' },
        ],
        orders: [
            { month: '2025-11', amount: 600000, vendor: 'データ社', confirmed: true, paid: true },
        ],
    },
    {
        id: 'PJ-006',
        name: 'F社 モバイルアプリ開発',
        client: 'F社',
        status: 'confirmed',
        category: '開発',
        startMonth: '2025-11',
        endMonth: '2026-07',
        invoices: [
            { month: '2025-11', amount: 2000000, issued: true, paid: true, paidDate: '2025-12-31' },
            { month: '2026-01', amount: 1500000, issued: true, paid: true, paidDate: '2026-02-28' },
            { month: '2026-02', amount: 1500000, issued: true, paid: true, paidDate: '2026-03-31' },
            { month: '2026-03', amount: 1500000, issued: true, paid: false, paidDate: null },
            { month: '2026-04', amount: 1500000, issued: false, paid: false, paidDate: null },
            { month: '2026-05', amount: 1500000, issued: false, paid: false, paidDate: null },
        ],
        orders: [
            { month: '2025-11', amount: 500000, vendor: 'デザイン事務所Y', confirmed: true, paid: true },
            { month: '2026-01', amount: 500000, vendor: 'デザイン事務所Y', confirmed: true, paid: true },
            { month: '2026-03', amount: 500000, vendor: 'デザイン事務所Y', confirmed: true, paid: false },
            { month: '2026-05', amount: 500000, vendor: 'デザイン事務所Y', confirmed: false, paid: false },
        ],
    },
    {
        id: 'PJ-007',
        name: 'G社 Webサイトリニューアル',
        client: 'G社',
        status: 'prospect',
        category: '開発',
        startMonth: '2026-04',
        endMonth: '2026-08',
        invoices: [
            { month: '2026-04', amount: 3000000, issued: false, paid: false, paidDate: null },
            { month: '2026-06', amount: 3000000, issued: false, paid: false, paidDate: null },
            { month: '2026-08', amount: 2000000, issued: false, paid: false, paidDate: null },
        ],
        orders: [
            { month: '2026-04', amount: 1000000, vendor: '制作会社Z', confirmed: false, paid: false },
            { month: '2026-06', amount: 800000, vendor: '制作会社Z', confirmed: false, paid: false },
        ],
    },
    {
        id: 'PJ-008',
        name: 'H社 IoTプラットフォーム',
        client: 'H社',
        status: 'prospect',
        category: '開発',
        startMonth: '2026-05',
        endMonth: '2026-12',
        invoices: [
            { month: '2026-05', amount: 5000000, issued: false, paid: false, paidDate: null },
            { month: '2026-08', amount: 5000000, issued: false, paid: false, paidDate: null },
            { month: '2026-11', amount: 5000000, issued: false, paid: false, paidDate: null },
        ],
        orders: [
            { month: '2026-05', amount: 1500000, vendor: 'ハードウェア社', confirmed: false, paid: false },
            { month: '2026-08', amount: 1200000, vendor: 'ハードウェア社', confirmed: false, paid: false },
        ],
    },
    {
        id: 'PJ-009',
        name: 'I社 新規大型開発案件',
        client: 'I社',
        status: 'confirmed',
        category: '開発',
        startMonth: '2026-01',
        endMonth: '2026-12',
        invoices: [
            { month: '2026-01', amount: 3000000, issued: true, paid: true, paidDate: '2026-02-28' },
            { month: '2026-02', amount: 1500000, issued: true, paid: true, paidDate: '2026-03-31' },
            { month: '2026-03', amount: 1500000, issued: true, paid: false, paidDate: null },
            { month: '2026-04', amount: 1500000, issued: false, paid: false, paidDate: null },
            { month: '2026-05', amount: 1500000, issued: false, paid: false, paidDate: null },
            { month: '2026-06', amount: 1500000, issued: false, paid: false, paidDate: null },
        ],
        orders: [
            { month: '2026-01', amount: 600000, vendor: 'クラウド社', confirmed: true, paid: true },
            { month: '2026-02', amount: 600000, vendor: 'クラウド社', confirmed: true, paid: true },
            { month: '2026-03', amount: 600000, vendor: 'クラウド社', confirmed: true, paid: false },
            { month: '2026-04', amount: 600000, vendor: 'クラウド社', confirmed: false, paid: false },
        ],
    },
    {
        id: 'PJ-010',
        name: 'J社 ECサイト構築',
        client: 'J社',
        status: 'confirmed',
        category: '開発',
        startMonth: '2026-02',
        endMonth: '2026-07',
        invoices: [
            { month: '2026-02', amount: 2500000, issued: true, paid: true, paidDate: '2026-03-31' },
            { month: '2026-03', amount: 2500000, issued: true, paid: false, paidDate: null },
            { month: '2026-04', amount: 2500000, issued: false, paid: false, paidDate: null },
            { month: '2026-05', amount: 2500000, issued: false, paid: false, paidDate: null },
        ],
        orders: [
            { month: '2026-02', amount: 800000, vendor: 'EC専門社', confirmed: true, paid: true },
            { month: '2026-03', amount: 800000, vendor: 'EC専門社', confirmed: true, paid: false },
            { month: '2026-04', amount: 800000, vendor: 'EC専門社', confirmed: false, paid: false },
        ],
    },
    {
        id: 'PJ-011',
        name: 'K社 年間パートナー契約',
        client: 'K社',
        status: 'confirmed',
        category: 'コンサル',
        startMonth: '2026-03',
        endMonth: '2027-02',
        invoices: [
            { month: '2026-03', amount: 5000000, issued: true, paid: false, paidDate: null },
            { month: '2026-09', amount: 5000000, issued: false, paid: false, paidDate: null },
        ],
        orders: [],
    },
    {
        id: 'PJ-012',
        name: 'L社 AI活用コンサル',
        client: 'L社',
        status: 'potential',
        category: 'コンサル',
        startMonth: '2026-06',
        endMonth: '2026-12',
        invoices: [
            { month: '2026-06', amount: 4000000, issued: false, paid: false, paidDate: null },
            { month: '2026-09', amount: 3000000, issued: false, paid: false, paidDate: null },
            { month: '2026-12', amount: 3000000, issued: false, paid: false, paidDate: null },
        ],
        orders: [
            { month: '2026-06', amount: 500000, vendor: 'AI研究所', confirmed: false, paid: false },
        ],
    },
];

// ========================================
// 固定費（月次）
// ========================================
const fixedCosts = [
    { category: '人件費', label: '給与・社保', monthlyAmount: 3400000 },
    { category: 'オフィス', label: '賃料', monthlyAmount: 450000 },
    { category: 'インフラ', label: 'AWS/GCP/SaaS', monthlyAmount: 680000 },
    { category: 'その他固定', label: '顧問料・保険等', monthlyAmount: 250000 },
];

// ========================================
// 予算データ（月次）
// ========================================
const budgetData = {
    '2025-10': { revenue: 10000000, cost: 7500000 },
    '2025-11': { revenue: 10500000, cost: 7800000 },
    '2025-12': { revenue: 11000000, cost: 8500000 },
    '2026-01': { revenue: 12000000, cost: 8200000 },
    '2026-02': { revenue: 12500000, cost: 8000000 },
    '2026-03': { revenue: 15000000, cost: 8500000 },
    '2026-04': { revenue: 13000000, cost: 8800000 },
    '2026-05': { revenue: 14000000, cost: 9000000 },
    '2026-06': { revenue: 15000000, cost: 9200000 },
};

// ========================================
// 過去スナップショット（変動検出用）
// 前回同期時のデータと比較するために保持
// ========================================
const previousSnapshot = {
    snapshotDate: '2026-03-12',
    monthlyRevenue: {
        '2026-03': 13300000,  // 現在15300000 → K社の5000000が追加された
        '2026-04': 7000000,   // 現在8200000 → I社が月ずれで増加
        '2026-05': 5800000,   // 現在5800000 → 変更なし
    },
    // 変更があった案件の前回データ
    projectChanges: [
        {
            id: 'PJ-011',
            type: 'added',
            description: 'K社 年間パートナー契約が新規追加',
            impactMonth: '2026-03',
            impactAmount: 5000000,
        },
        {
            id: 'PJ-009',
            type: 'modified',
            description: 'I社 4月分の請求が1,800,000→1,500,000に変更',
            impactMonth: '2026-04',
            impactAmount: -300000,
        },
        {
            id: 'PJ-010',
            type: 'month_shift',
            description: 'J社 3月請求分の一部が4月に月ずれ',
            fromMonth: '2026-03',
            toMonth: '2026-04',
            impactAmount: 500000,
        },
    ],
};

// ========================================
// 銀行口座残高
// ========================================
const bankBalance = {
    asOf: '2026-03-19',
    accounts: [
        { name: 'みずほ銀行 普通預金', balance: 35200000 },
        { name: '三井住友銀行 普通預金', balance: 18500000 },
        { name: '住信SBIネット銀行', balance: 2800000 },
    ],
};

// ========================================
// 表示対象月の範囲
// ========================================
const displayMonths = [
    '2025-10', '2025-11', '2025-12',
    '2026-01', '2026-02', '2026-03',
    '2026-04', '2026-05', '2026-06',
];
