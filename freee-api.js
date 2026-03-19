/**
 * freee会計API クライアント（フロントエンド側）
 *
 * server.js のAPIエンドポイントを経由してfreeeのデータを取得し、
 * ダッシュボードのデータ形式に変換する。
 *
 * freee APIから取得するデータ:
 *   - 取引（deals）     → 実際の入出金データ
 *   - 口座（walletables）→ リアルタイム口座残高
 *   - 損益計算書（trial_pl）→ PL実績
 *   - 貸借対照表（trial_bs）→ BS実績
 *   - 請求書（invoices） → 請求ベースの売上
 *   - 取引先（partners） → クライアント情報
 */

const FreeeClient = {
    baseUrl: '',  // server.jsと同一オリジンなので空文字

    // ========================================
    // 接続管理
    // ========================================
    async getStatus() {
        const res = await fetch(this.baseUrl + '/api/freee/status');
        return res.json();
    },

    async startAuth() {
        const res = await fetch(this.baseUrl + '/api/freee/auth');
        const data = await res.json();
        if (data.auth_url) {
            // 認証用ポップアップを開く
            const popup = window.open(data.auth_url, 'freee-auth', 'width=600,height=700');
            return new Promise((resolve) => {
                window.addEventListener('message', function handler(e) {
                    if (e.data && e.data.type === 'freee-auth-success') {
                        window.removeEventListener('message', handler);
                        resolve(true);
                    }
                });
                // ポップアップが閉じられた場合のフォールバック
                const checkClosed = setInterval(() => {
                    if (popup && popup.closed) {
                        clearInterval(checkClosed);
                        resolve(false);
                    }
                }, 1000);
            });
        }
        throw new Error(data.error || '認証URLの取得に失敗しました');
    },

    async disconnect() {
        const res = await fetch(this.baseUrl + '/api/freee/disconnect');
        return res.json();
    },

    // ========================================
    // データ取得
    // ========================================
    async syncAll() {
        const res = await fetch(this.baseUrl + '/api/freee/sync');
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || '同期に失敗しました');
        }
        const result = await res.json();
        return this.transformData(result.data);
    },

    async getDeals(startDate) {
        const params = startDate ? `?start_date=${startDate}` : '';
        const res = await fetch(this.baseUrl + '/api/freee/deals' + params);
        return res.json();
    },

    async getWalletables() {
        const res = await fetch(this.baseUrl + '/api/freee/walletables');
        return res.json();
    },

    async getTrialPl(fiscalYear, startMonth, endMonth) {
        const params = new URLSearchParams({ fiscal_year: fiscalYear });
        if (startMonth) params.set('start_month', startMonth);
        if (endMonth) params.set('end_month', endMonth);
        const res = await fetch(this.baseUrl + '/api/freee/trial_pl?' + params);
        return res.json();
    },

    async getTrialBs(fiscalYear) {
        const res = await fetch(this.baseUrl + `/api/freee/trial_bs?fiscal_year=${fiscalYear}`);
        return res.json();
    },

    async getInvoices() {
        const res = await fetch(this.baseUrl + '/api/freee/invoices');
        return res.json();
    },

    async getPartners() {
        const res = await fetch(this.baseUrl + '/api/freee/partners');
        return res.json();
    },

    // ========================================
    // データ変換: freee → ダッシュボード形式
    // ========================================
    transformData(rawData) {
        return {
            bankBalance: this.transformWalletables(rawData.walletables),
            deals: this.transformDeals(rawData.deals),
            trialPl: this.transformTrialPl(rawData.trialPl),
            trialBs: this.transformTrialBs(rawData.trialBs),
            invoices: this.transformInvoices(rawData.invoices),
            partners: this.transformPartners(rawData.partners),
            accountItems: rawData.accountItems,
            syncedAt: new Date().toISOString(),
        };
    },

    // 口座残高の変換
    transformWalletables(data) {
        if (!data || !data.walletables) return null;
        const accounts = data.walletables
            .filter(w => w.type === 'bank_account' || w.type === 'wallet')
            .map(w => ({
                name: w.name,
                type: w.type === 'bank_account' ? '銀行口座' : 'その他',
                balance: w.last_balance || 0,
                walletableId: w.id,
            }));

        return {
            asOf: new Date().toISOString().split('T')[0],
            accounts,
            totalBalance: accounts.reduce((s, a) => s + a.balance, 0),
        };
    },

    // 取引データの変換 → 月別入出金に集約
    transformDeals(data) {
        if (!data || !data.deals) return {};
        const monthly = {};

        data.deals.forEach(deal => {
            const month = deal.issue_date.substring(0, 7); // "YYYY-MM"
            if (!monthly[month]) {
                monthly[month] = { income: [], expense: [], totalIncome: 0, totalExpense: 0 };
            }

            deal.details.forEach(detail => {
                const entry = {
                    amount: detail.amount,
                    accountItem: detail.account_item_name || '',
                    taxCode: detail.tax_code || '',
                    description: detail.description || deal.ref_number || '',
                    partnerName: deal.partner_name || '',
                    date: deal.issue_date,
                };

                if (deal.type === 'income') {
                    monthly[month].income.push(entry);
                    monthly[month].totalIncome += detail.amount;
                } else if (deal.type === 'expense') {
                    monthly[month].expense.push(entry);
                    monthly[month].totalExpense += detail.amount;
                }
            });
        });

        return monthly;
    },

    // 損益計算書の変換
    transformTrialPl(data) {
        if (!data || !data.trial_pl) return null;
        const balances = data.trial_pl.balances || [];

        const extract = (name) => {
            const item = balances.find(b => b.account_item_name === name);
            return item ? (item.closing_balance || 0) : 0;
        };

        return {
            revenue: extract('売上高'),
            costOfSales: extract('売上原価'),
            grossProfit: extract('売上総利益'),
            sga: extract('販売費及び一般管理費'),
            operatingIncome: extract('営業利益'),
            ordinaryIncome: extract('経常利益'),
            netIncome: extract('当期純利益'),
            // 詳細科目
            details: balances.map(b => ({
                name: b.account_item_name,
                parentName: b.parent_account_item_name || '',
                closingBalance: b.closing_balance || 0,
                debitAmount: b.debit_amount || 0,
                creditAmount: b.credit_amount || 0,
            })),
        };
    },

    // 貸借対照表の変換
    transformTrialBs(data) {
        if (!data || !data.trial_bs) return null;
        const balances = data.trial_bs.balances || [];

        const extract = (name) => {
            const item = balances.find(b => b.account_item_name === name);
            return item ? (item.closing_balance || 0) : 0;
        };

        return {
            cash: extract('現金') + extract('普通預金') + extract('当座預金'),
            currentAssets: extract('流動資産'),
            fixedAssets: extract('固定資産'),
            totalAssets: extract('資産の部'),
            currentLiabilities: extract('流動負債'),
            fixedLiabilities: extract('固定負債'),
            totalLiabilities: extract('負債の部'),
            netAssets: extract('純資産の部'),
            details: balances.map(b => ({
                name: b.account_item_name,
                parentName: b.parent_account_item_name || '',
                closingBalance: b.closing_balance || 0,
            })),
        };
    },

    // 請求書データの変換
    transformInvoices(data) {
        if (!data || !data.invoices) return [];
        return data.invoices.map(inv => ({
            id: inv.id,
            invoiceNumber: inv.invoice_number,
            partnerName: inv.partner_name || '',
            issueDate: inv.issue_date,
            dueDate: inv.due_date,
            totalAmount: inv.total_amount,
            status: inv.invoice_status,
            paymentStatus: inv.payment_status,
            month: inv.issue_date ? inv.issue_date.substring(0, 7) : '',
        }));
    },

    // 取引先データの変換
    transformPartners(data) {
        if (!data || !data.partners) return [];
        return data.partners.map(p => ({
            id: p.id,
            name: p.name,
            code: p.code || '',
            shortName: p.short_name || p.name,
        }));
    },
};

// ========================================
// freeeデータをダッシュボードのグローバル変数にマージする
// ========================================
function mergeFreeeData(freeeData) {
    if (!freeeData) return;

    // 1. 口座残高を上書き
    if (freeeData.bankBalance) {
        bankBalance.asOf = freeeData.bankBalance.asOf;
        bankBalance.accounts = freeeData.bankBalance.accounts.map(a => ({
            name: a.name,
            balance: a.balance,
        }));
    }

    // 2. 取引データからキャッシュフロー実績を反映
    if (freeeData.deals) {
        // freeeDealsをグローバルに保持（ダッシュボードで参照）
        window._freeeDeals = freeeData.deals;
    }

    // 3. PLデータを保持
    if (freeeData.trialPl) {
        window._freeePl = freeeData.trialPl;
    }

    // 4. BSデータを保持
    if (freeeData.trialBs) {
        window._freeeBs = freeeData.trialBs;
    }

    // 5. 請求書データを保持
    if (freeeData.invoices) {
        window._freeeInvoices = freeeData.invoices;
    }

    // 6. 同期時刻を更新
    COMPANY.lastSyncedAt = new Date().toLocaleString('ja-JP');
}
