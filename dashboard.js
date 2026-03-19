/**
 * OpenHeart 財務ダッシュボード v2.0
 *
 * 記事「Claude Codeで財務ダッシュボードを作って社内業務を楽にした話」の
 * 構成を参考に実装:
 *   1. boardデータ同期 & ステータス別フィルタ
 *   2. キャッシュフロー（月別入出金＋案件明細展開）
 *   3. 過去スナップショットとの変動検出
 *   4. 予実管理
 *   5. 月末月初チェック業務
 *   6. 案件別損益
 */

// ========================================
// ユーティリティ
// ========================================
function fmt(amount) {
    if (Math.abs(amount) >= 100000000) return (amount / 100000000).toFixed(2) + '億円';
    if (Math.abs(amount) >= 10000) return (amount / 10000).toLocaleString('ja-JP', { maximumFractionDigits: 0 }) + '万円';
    return amount.toLocaleString('ja-JP') + '円';
}

function fmtFull(amount) {
    return '¥' + amount.toLocaleString('ja-JP');
}

function fmtMonth(m) {
    const [y, mo] = m.split('-');
    return `${parseInt(mo)}月`;
}

function fmtMonthFull(m) {
    const [y, mo] = m.split('-');
    return `${y}年${parseInt(mo)}月`;
}

function statusLabel(s) {
    return { confirmed: '確定', prospect: '見込み', potential: 'ポテンシャル' }[s] || s;
}

// ========================================
// 集計ヘルパー
// ========================================
let activeStatus = 'confirmed';

function filteredProjects() {
    if (activeStatus === 'all') return projects;
    if (activeStatus === 'confirmed') return projects.filter(p => p.status === 'confirmed');
    if (activeStatus === 'prospect') return projects.filter(p => p.status === 'confirmed' || p.status === 'prospect');
    if (activeStatus === 'potential') return projects;
    return projects;
}

function monthlyRevenue(month, pjs) {
    let total = 0;
    (pjs || filteredProjects()).forEach(p => {
        p.invoices.forEach(inv => {
            if (inv.month === month) total += inv.amount;
        });
    });
    return total;
}

function monthlyOrderCost(month, pjs) {
    let total = 0;
    (pjs || filteredProjects()).forEach(p => {
        p.orders.forEach(ord => {
            if (ord.month === month) total += ord.amount;
        });
    });
    return total;
}

function monthlyFixedCost() {
    return fixedCosts.reduce((s, c) => s + c.monthlyAmount, 0);
}

function monthlyCashIn(month) {
    // 入金 = 売上（確定案件で入金済み or 当月請求）
    let total = 0;
    projects.forEach(p => {
        if (activeStatus !== 'all' && activeStatus === 'confirmed' && p.status !== 'confirmed') return;
        if (activeStatus === 'prospect' && p.status === 'potential') return;
        p.invoices.forEach(inv => {
            if (inv.month === month) total += inv.amount;
        });
    });
    return total;
}

function monthlyCashOut(month) {
    return monthlyOrderCost(month) + monthlyFixedCost();
}

// ========================================
// 初期化
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    initTabs();
    initFilters();
    initSync();
    renderAll();
});

function renderAll() {
    renderKPIs();
    renderRevenueChart();
    renderCashflowOverviewChart();
    renderChanges();
    renderCashflowTab();
    renderBudgetTab();
    renderChecksTab();
    renderProjectsTab();
}

// ========================================
// Header
// ========================================
function initHeader() {
    const now = new Date();
    document.getElementById('current-date').textContent =
        now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('last-synced').textContent = COMPANY.lastSyncedAt;
}

// ========================================
// Tabs
// ========================================
function initTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
        });
    });
}

// ========================================
// Status Filters
// ========================================
function initFilters() {
    document.querySelectorAll('.filter-btn:not(.pj-filter)').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn:not(.pj-filter)').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeStatus = btn.dataset.status;
            renderAll();
        });
    });

    document.querySelectorAll('.pj-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.pj-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderProjectsTab(btn.dataset.pjstatus);
        });
    });
}

// ========================================
// Sync Button
// ========================================
function initSync() {
    const btn = document.getElementById('sync-btn');
    btn.addEventListener('click', () => {
        btn.classList.add('syncing');
        btn.innerHTML = '<span class="sync-icon">&#8635;</span> 同期中...';
        setTimeout(() => {
            btn.classList.remove('syncing');
            btn.innerHTML = '<span class="sync-icon">&#8635;</span> boardデータ同期';
            const now = new Date();
            const ts = now.toLocaleDateString('ja-JP') + ' ' +
                now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            document.getElementById('last-synced').textContent = ts;
            COMPANY.lastSyncedAt = ts;
        }, 1500);
    });
}

// ========================================
// KPIs
// ========================================
function renderKPIs() {
    // 現預金残高
    const totalBank = bankBalance.accounts.reduce((s, a) => s + a.balance, 0);
    document.getElementById('kpi-cash-balance').textContent = fmt(totalBank);
    document.getElementById('kpi-cash-date').textContent = bankBalance.asOf + ' 時点';

    // バーンレート
    const fixed = monthlyFixedCost();
    document.getElementById('kpi-burn-rate').textContent = fmt(fixed);

    // ランウェイ
    const netMonthlyBurn = fixed - 5000000; // 平均月間収入を差し引いたネットバーン
    const runway = netMonthlyBurn > 0 ? (totalBank / netMonthlyBurn) : 99;
    const grossRunway = totalBank / fixed;
    document.getElementById('kpi-runway').textContent = grossRunway.toFixed(1) + 'ヶ月';
    document.getElementById('kpi-runway-sub').textContent = 'グロスバーンベース';

    // 今月売上
    const currentMonth = '2026-03';
    const rev = monthlyRevenue(currentMonth);
    document.getElementById('kpi-monthly-revenue').textContent = fmt(rev);
    const prevRev = monthlyRevenue('2026-02');
    const diff = rev - prevRev;
    const changeEl = document.getElementById('kpi-revenue-change');
    changeEl.textContent = (diff >= 0 ? '+' : '') + fmt(diff) + ' (前月比)';
    changeEl.className = 'kpi-change ' + (diff >= 0 ? 'positive' : 'negative');

    // チェック件数
    const checkCount = countCheckItems();
    document.getElementById('kpi-check-count').textContent = checkCount + '件';
    document.getElementById('kpi-check-count').style.color =
        checkCount > 5 ? 'var(--danger)' : checkCount > 0 ? 'var(--warning)' : 'var(--success)';
}

function countCheckItems() {
    let count = 0;
    const currentMonth = '2026-03';

    projects.forEach(p => {
        // 受注未確定
        if (p.status !== 'confirmed' && p.invoices.some(i => i.month <= '2026-06')) count++;
        // 請求書未発行
        p.invoices.forEach(inv => {
            if (inv.month <= currentMonth && !inv.issued) count++;
        });
        // 入金未済
        p.invoices.forEach(inv => {
            if (inv.issued && !inv.paid && inv.month < currentMonth) count++;
        });
        // 発注未確定
        p.orders.forEach(ord => {
            if (!ord.confirmed && ord.month <= '2026-04') count++;
        });
        // 支払未済
        p.orders.forEach(ord => {
            if (ord.confirmed && !ord.paid && ord.month <= currentMonth) count++;
        });
    });
    return count;
}

// ========================================
// Revenue Chart (Dashboard)
// ========================================
let revenueChart;
function renderRevenueChart() {
    const ctx = document.getElementById('revenue-chart').getContext('2d');
    if (revenueChart) revenueChart.destroy();

    const confirmed = displayMonths.map(m => monthlyRevenue(m, projects.filter(p => p.status === 'confirmed')));
    const prospect = displayMonths.map(m => monthlyRevenue(m, projects.filter(p => p.status === 'prospect')));
    const potential = displayMonths.map(m => monthlyRevenue(m, projects.filter(p => p.status === 'potential')));

    revenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: displayMonths.map(fmtMonth),
            datasets: [
                { label: '確定', data: confirmed, backgroundColor: 'rgba(37, 99, 235, 0.8)' },
                { label: '見込み', data: prospect, backgroundColor: 'rgba(245, 158, 11, 0.6)' },
                { label: 'ポテンシャル', data: potential, backgroundColor: 'rgba(209, 213, 219, 0.5)' },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                tooltip: { callbacks: { label: c => c.dataset.label + ': ' + fmtFull(c.raw) } },
            },
            scales: {
                x: { stacked: true },
                y: { stacked: true, ticks: { callback: v => fmt(v) } },
            },
        },
    });
}

// ========================================
// Cashflow Overview Chart (Dashboard)
// ========================================
let cfOverviewChart;
function renderCashflowOverviewChart() {
    const ctx = document.getElementById('cashflow-overview-chart').getContext('2d');
    if (cfOverviewChart) cfOverviewChart.destroy();

    const cashIn = displayMonths.map(m => monthlyCashIn(m));
    const cashOut = displayMonths.map(m => monthlyCashOut(m));
    const net = displayMonths.map((m, i) => cashIn[i] - cashOut[i]);

    cfOverviewChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: displayMonths.map(fmtMonth),
            datasets: [
                { label: '入金', data: cashIn, backgroundColor: 'rgba(22, 163, 74, 0.6)', order: 2 },
                { label: '出金', data: cashOut.map(v => -v), backgroundColor: 'rgba(220, 38, 38, 0.6)', order: 2 },
                {
                    label: 'キャッシュ増減',
                    data: net,
                    type: 'line',
                    borderColor: 'rgb(37, 99, 235)',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    pointRadius: 4,
                    order: 1,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: { callbacks: { label: c => c.dataset.label + ': ' + fmtFull(Math.abs(c.raw)) } },
            },
            scales: {
                y: { ticks: { callback: v => fmt(v) } },
            },
        },
    });
}

// ========================================
// Change Detection
// ========================================
function renderChanges() {
    document.getElementById('snapshot-date').textContent = previousSnapshot.snapshotDate;
    const list = document.getElementById('changes-list');

    if (previousSnapshot.projectChanges.length === 0) {
        list.innerHTML = '<p style="color:var(--gray-400);font-size:0.85rem">変動はありません。</p>';
        return;
    }

    list.innerHTML = previousSnapshot.projectChanges.map(c => {
        const typeLabels = { added: '追加', modified: '変更', month_shift: '月ずれ', deleted: '削除' };
        const amountStr = c.impactAmount >= 0 ? '+' + fmt(c.impactAmount) : fmt(c.impactAmount);
        return `
            <div class="change-item ${c.type}">
                <span class="change-badge ${c.type}">${typeLabels[c.type]}</span>
                <span>${c.description}</span>
                <span class="change-amount">${amountStr}</span>
            </div>`;
    }).join('');
}

// ========================================
// Cashflow Tab
// ========================================
let cfDetailChart;
function renderCashflowTab() {
    // Chart
    const ctx = document.getElementById('cashflow-detail-chart').getContext('2d');
    if (cfDetailChart) cfDetailChart.destroy();

    let balance = bankBalance.accounts.reduce((s, a) => s + a.balance, 0);
    const balances = [];
    const cashIns = [];
    const cashOuts = [];

    // 過去月の残高をバックトラック
    const currentMonthIdx = displayMonths.indexOf('2026-03');
    let tempBalance = balance;
    for (let i = currentMonthIdx - 1; i >= 0; i--) {
        const m = displayMonths[i];
        tempBalance = tempBalance - (monthlyCashIn(m) - monthlyCashOut(m));
    }

    let runningBalance = tempBalance;
    displayMonths.forEach(m => {
        const ci = monthlyCashIn(m);
        const co = monthlyCashOut(m);
        runningBalance += (ci - co);
        cashIns.push(ci);
        cashOuts.push(co);
        balances.push(runningBalance);
    });

    cfDetailChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: displayMonths.map(fmtMonth),
            datasets: [
                { label: '入金', data: cashIns, backgroundColor: 'rgba(22, 163, 74, 0.6)' },
                { label: '出金', data: cashOuts, backgroundColor: 'rgba(220, 38, 38, 0.5)' },
                {
                    label: '残高推移',
                    data: balances,
                    type: 'line',
                    borderColor: 'rgb(37, 99, 235)',
                    borderWidth: 2,
                    pointRadius: 4,
                    yAxisID: 'y1',
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: { callbacks: { label: c => c.dataset.label + ': ' + fmtFull(c.raw) } },
            },
            scales: {
                y: { position: 'left', ticks: { callback: v => fmt(v) } },
                y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: { callback: v => fmt(v) } },
            },
        },
    });

    // Table
    const tbody = document.getElementById('cashflow-body');
    let html = '';
    let rb = tempBalance;

    displayMonths.forEach(m => {
        const ci = monthlyCashIn(m);
        const co = monthlyCashOut(m);
        const net = ci - co;
        rb += net;
        const rowId = 'cf-detail-' + m;

        html += `
            <tr>
                <td><strong>${fmtMonthFull(m)}</strong></td>
                <td class="amount-positive">${fmtFull(ci)}</td>
                <td class="amount-negative">${fmtFull(co)}</td>
                <td class="${net >= 0 ? 'amount-positive' : 'amount-negative'}">${net >= 0 ? '+' : ''}${fmtFull(net)}</td>
                <td>${fmtFull(rb)}</td>
                <td><button class="expand-btn" onclick="toggleDetail('${rowId}')">明細</button></td>
            </tr>`;

        // 案件別明細（展開行）
        const pjs = filteredProjects().filter(p =>
            p.invoices.some(i => i.month === m) || p.orders.some(o => o.month === m)
        );
        pjs.forEach(p => {
            const rev = p.invoices.filter(i => i.month === m).reduce((s, i) => s + i.amount, 0);
            const cost = p.orders.filter(o => o.month === m).reduce((s, o) => s + o.amount, 0);
            html += `
                <tr class="detail-row ${rowId}">
                    <td>${p.id}</td>
                    <td>${p.name}</td>
                    <td class="amount-positive">${rev > 0 ? fmtFull(rev) : '-'}</td>
                    <td class="amount-negative">${cost > 0 ? fmtFull(cost) : '-'}</td>
                    <td></td>
                    <td></td>
                </tr>`;
        });

        // 固定費行
        html += `
            <tr class="detail-row ${rowId}">
                <td></td>
                <td style="color:var(--gray-400)">固定費（人件費・オフィス・インフラ等）</td>
                <td></td>
                <td class="amount-negative">${fmtFull(monthlyFixedCost())}</td>
                <td></td>
                <td></td>
            </tr>`;
    });

    tbody.innerHTML = html;
}

function toggleDetail(rowClass) {
    document.querySelectorAll('.' + rowClass).forEach(row => {
        row.classList.toggle('open');
    });
}

// ========================================
// Budget Tab
// ========================================
let budgetChart;
function renderBudgetTab() {
    const months = Object.keys(budgetData).sort();
    const ctx = document.getElementById('budget-chart').getContext('2d');
    if (budgetChart) budgetChart.destroy();

    const budgetRev = months.map(m => budgetData[m].revenue);
    const actualRev = months.map(m => monthlyRevenue(m, projects.filter(p => p.status === 'confirmed')));
    const budgetCost = months.map(m => budgetData[m].cost);
    const actualCost = months.map(m => monthlyOrderCost(m, projects.filter(p => p.status === 'confirmed')) + monthlyFixedCost());

    budgetChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months.map(fmtMonth),
            datasets: [
                {
                    label: '予算（売上）',
                    data: budgetRev,
                    backgroundColor: 'rgba(37, 99, 235, 0.3)',
                    borderColor: 'rgb(37, 99, 235)',
                    borderWidth: 1,
                },
                {
                    label: '実績（売上）',
                    data: actualRev,
                    backgroundColor: 'rgba(37, 99, 235, 0.7)',
                    borderColor: 'rgb(37, 99, 235)',
                    borderWidth: 1,
                },
                {
                    label: '予算（費用）',
                    data: budgetCost.map(v => -v),
                    backgroundColor: 'rgba(220, 38, 38, 0.2)',
                    borderColor: 'rgb(220, 38, 38)',
                    borderWidth: 1,
                },
                {
                    label: '実績（費用）',
                    data: actualCost.map(v => -v),
                    backgroundColor: 'rgba(220, 38, 38, 0.6)',
                    borderColor: 'rgb(220, 38, 38)',
                    borderWidth: 1,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: { callbacks: { label: c => c.dataset.label + ': ' + fmtFull(Math.abs(c.raw)) } },
            },
            scales: {
                y: { ticks: { callback: v => fmt(v) } },
            },
        },
    });

    // Table
    const tbody = document.getElementById('budget-body');
    tbody.innerHTML = months.map(m => {
        const bRev = budgetData[m].revenue;
        const aRev = monthlyRevenue(m, projects.filter(p => p.status === 'confirmed'));
        const pct = bRev > 0 ? Math.round(aRev / bRev * 100) : 0;
        const bCost = budgetData[m].cost;
        const aCost = monthlyOrderCost(m, projects.filter(p => p.status === 'confirmed')) + monthlyFixedCost();
        const diff = aCost - bCost;
        const barColor = pct >= 100 ? 'var(--success)' : pct >= 80 ? 'var(--warning)' : 'var(--danger)';

        return `
            <tr>
                <td><strong>${fmtMonthFull(m)}</strong></td>
                <td>${fmtFull(bRev)}</td>
                <td>${fmtFull(aRev)}</td>
                <td>
                    ${pct}%
                    <div class="progress-bar">
                        <div class="progress-bar-fill" style="width:${Math.min(pct, 100)}%;background:${barColor}"></div>
                    </div>
                </td>
                <td>${fmtFull(bCost)}</td>
                <td>${fmtFull(aCost)}</td>
                <td class="${diff <= 0 ? 'amount-positive' : 'amount-negative'}">
                    ${diff <= 0 ? '' : '+'}${fmtFull(diff)}
                </td>
            </tr>`;
    }).join('');
}

// ========================================
// Checks Tab
// ========================================
function renderChecksTab() {
    const currentMonth = '2026-03';
    const nextMonth = '2026-04';

    // 1. 受注未確定
    const unconfirmed = projects.filter(p => p.status !== 'confirmed' && p.invoices.some(i => i.month <= '2026-06'));
    renderCheckList('check-unconfirmed', 'check-unconfirmed-count', unconfirmed, p =>
        `<div class="check-project">${p.name}</div>
         <div class="check-detail">${p.client} | ステータス: ${statusLabel(p.status)} | 売上見込: ${fmt(p.invoices.reduce((s, i) => s + i.amount, 0))}</div>`
    );

    // 2. 請求書未発行（当月以前）
    const uninvoiced = [];
    projects.forEach(p => {
        p.invoices.forEach(inv => {
            if (inv.month <= currentMonth && !inv.issued) {
                uninvoiced.push({ project: p, invoice: inv });
            }
        });
    });
    renderCheckList('check-uninvoiced', 'check-uninvoiced-count', uninvoiced, item =>
        `<div class="check-project">${item.project.name}</div>
         <div class="check-detail">${fmtMonthFull(item.invoice.month)} | ${fmtFull(item.invoice.amount)}</div>`
    );

    // 3. 入金未済（請求済み・未入金）
    const unpaid = [];
    projects.forEach(p => {
        p.invoices.forEach(inv => {
            if (inv.issued && !inv.paid) {
                unpaid.push({ project: p, invoice: inv });
            }
        });
    });
    renderCheckList('check-unpaid', 'check-unpaid-count', unpaid, item =>
        `<div class="check-project">${item.project.name}</div>
         <div class="check-detail">${fmtMonthFull(item.invoice.month)} | ${fmtFull(item.invoice.amount)} | 請求済・入金待ち</div>`
    );

    // 4. 発注未確定
    const unordered = [];
    projects.forEach(p => {
        p.orders.forEach(ord => {
            if (!ord.confirmed && ord.month <= nextMonth) {
                unordered.push({ project: p, order: ord });
            }
        });
    });
    renderCheckList('check-unordered', 'check-unordered-count', unordered, item =>
        `<div class="check-project">${item.project.name}</div>
         <div class="check-detail">${item.order.vendor} | ${fmtMonthFull(item.order.month)} | ${fmtFull(item.order.amount)}</div>`
    );

    // 5. 支払未済（発注確定・未支払）
    const unpaidOrders = [];
    projects.forEach(p => {
        p.orders.forEach(ord => {
            if (ord.confirmed && !ord.paid) {
                unpaidOrders.push({ project: p, order: ord });
            }
        });
    });
    renderCheckList('check-unpaid-orders', 'check-unpaid-orders-count', unpaidOrders, item =>
        `<div class="check-project">${item.project.name}</div>
         <div class="check-detail">${item.order.vendor} | ${fmtMonthFull(item.order.month)} | ${fmtFull(item.order.amount)} | 支払待ち</div>`
    );
}

function renderCheckList(containerId, countId, items, renderFn) {
    const container = document.getElementById(containerId);
    const countEl = document.getElementById(countId);

    countEl.textContent = items.length + '件';
    countEl.style.color = items.length > 0 ? 'var(--warning)' : 'var(--success)';

    if (items.length === 0) {
        container.innerHTML = '<p style="color:var(--gray-400);font-size:0.8rem">該当なし</p>';
        return;
    }

    container.innerHTML = items.map(item =>
        `<div class="check-item">${renderFn(item)}</div>`
    ).join('');
}

// ========================================
// Projects Tab
// ========================================
let projectChart;
function renderProjectsTab(filter) {
    filter = filter || 'all';

    let pjs = [...projects];
    if (filter === 'confirmed') pjs = pjs.filter(p => p.status === 'confirmed');
    if (filter === 'active') pjs = pjs.filter(p => p.endMonth >= '2026-03');

    // Chart
    const ctx = document.getElementById('project-pl-chart').getContext('2d');
    if (projectChart) projectChart.destroy();

    const labels = pjs.map(p => p.id);
    const revenues = pjs.map(p => p.invoices.reduce((s, i) => s + i.amount, 0));
    const costs = pjs.map(p => p.orders.reduce((s, o) => s + o.amount, 0));
    const grossProfit = pjs.map((p, i) => revenues[i] - costs[i]);

    projectChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: '売上', data: revenues, backgroundColor: 'rgba(37, 99, 235, 0.7)' },
                { label: '外注費', data: costs, backgroundColor: 'rgba(220, 38, 38, 0.5)' },
                {
                    label: '粗利',
                    data: grossProfit,
                    type: 'line',
                    borderColor: 'rgb(22, 163, 74)',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    pointRadius: 4,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: { callbacks: { label: c => c.dataset.label + ': ' + fmtFull(c.raw) } },
            },
            scales: {
                y: { ticks: { callback: v => fmt(v) } },
            },
        },
    });

    // Table
    const tbody = document.getElementById('project-body');
    tbody.innerHTML = pjs.map(p => {
        const rev = p.invoices.reduce((s, i) => s + i.amount, 0);
        const cost = p.orders.reduce((s, o) => s + o.amount, 0);
        const gp = rev - cost;
        const gpRate = rev > 0 ? Math.round(gp / rev * 100) : 0;

        return `
            <tr>
                <td>${p.id}</td>
                <td><strong>${p.name}</strong></td>
                <td>${p.client}</td>
                <td><span class="status-badge ${p.status}">${statusLabel(p.status)}</span></td>
                <td class="amount-positive">${fmtFull(rev)}</td>
                <td class="amount-negative">${cost > 0 ? fmtFull(cost) : '-'}</td>
                <td style="font-weight:700">${fmtFull(gp)}</td>
                <td>
                    ${gpRate}%
                    <div class="progress-bar">
                        <div class="progress-bar-fill" style="width:${Math.min(gpRate, 100)}%;background:${gpRate >= 50 ? 'var(--success)' : gpRate >= 30 ? 'var(--warning)' : 'var(--danger)'}"></div>
                    </div>
                </td>
            </tr>`;
    }).join('');
}
