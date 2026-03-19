/**
 * OpenHeart 財務ダッシュボード - メインロジック
 */

// ユーティリティ
function formatCurrency(amount) {
    if (Math.abs(amount) >= 100000000) {
        return (amount / 100000000).toFixed(2) + '億円';
    }
    if (Math.abs(amount) >= 10000) {
        return (amount / 10000).toLocaleString('ja-JP', { maximumFractionDigits: 0 }) + '万円';
    }
    return amount.toLocaleString('ja-JP') + '円';
}

function formatCurrencyFull(amount) {
    return '¥' + amount.toLocaleString('ja-JP');
}

function sumAmounts(items) {
    return items.reduce((sum, item) => sum + item.amount, 0);
}

function getWeekCashFlow(week) {
    const totalIncome = sumAmounts(week.income);
    const totalExpense = sumAmounts(week.expenses);
    return totalIncome - totalExpense;
}

function getClosingBalance(week) {
    return week.openingBalance + getWeekCashFlow(week);
}

// 状態管理
let currentWeekIndex = weeklyData.length - 1; // 最新の実績週
let weeklyCFChart, cashBalanceChart, incomeExpenseChart, expenseBreakdownChart;

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    updateKPIs();
    updateWeekNav();
    updateWeeklyDetail();
    updateMonthlySummary();
    updateAlerts();
    initCharts();

    document.getElementById('prev-week').addEventListener('click', () => {
        if (currentWeekIndex > 0) {
            currentWeekIndex--;
            updateAll();
        }
    });

    document.getElementById('next-week').addEventListener('click', () => {
        if (currentWeekIndex < allWeeklyData.length - 1) {
            currentWeekIndex++;
            updateAll();
        }
    });
});

function updateAll() {
    updateKPIs();
    updateWeekNav();
    updateWeeklyDetail();
    updateCharts();
    updateAlerts();
}

function initHeader() {
    const now = new Date();
    document.getElementById('current-date').textContent =
        now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('fiscal-period').textContent = '2025年度（2025/4〜2026/3）';
    document.getElementById('last-updated').textContent =
        now.toLocaleDateString('ja-JP') + ' ' + now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

// KPI更新
function updateKPIs() {
    const currentWeek = allWeeklyData[currentWeekIndex];
    const closingBalance = getClosingBalance(currentWeek);
    const cf = getWeekCashFlow(currentWeek);

    // 現預金残高
    document.getElementById('cash-balance').textContent = formatCurrency(closingBalance);
    const balanceChange = document.getElementById('cash-balance-change');
    if (currentWeekIndex > 0) {
        const prevClosing = getClosingBalance(allWeeklyData[currentWeekIndex - 1]);
        const diff = closingBalance - prevClosing;
        balanceChange.textContent = (diff >= 0 ? '+' : '') + formatCurrency(diff) + ' (前週比)';
        balanceChange.className = 'kpi-change ' + (diff >= 0 ? 'positive' : 'negative');
    }

    // バーンレート（過去3ヶ月平均）
    const recentWeeks = weeklyData.slice(Math.max(0, weeklyData.length - 12));
    const totalExpenses = recentWeeks.reduce((sum, w) => sum + sumAmounts(w.expenses), 0);
    const monthsCount = 3;
    const burnRate = Math.round(totalExpenses / monthsCount);
    document.getElementById('burn-rate').textContent = formatCurrency(burnRate);

    // ランウェイ
    const monthlyBurn = burnRate;
    const runwayMonths = monthlyBurn > 0 ? Math.round(closingBalance / monthlyBurn * 10) / 10 : Infinity;
    document.getElementById('runway').textContent = runwayMonths + 'ヶ月';
    const exhaustDate = new Date();
    exhaustDate.setMonth(exhaustDate.getMonth() + Math.floor(runwayMonths));
    document.getElementById('runway-date').textContent =
        '資金枯渇予測: ' + exhaustDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });

    // 週次CF
    document.getElementById('weekly-cf').textContent = (cf >= 0 ? '+' : '') + formatCurrency(cf);
    document.getElementById('weekly-cf').style.color = cf >= 0 ? 'var(--success)' : 'var(--danger)';

    const weeklyCfChange = document.getElementById('weekly-cf-change');
    if (currentWeekIndex > 0) {
        const prevCF = getWeekCashFlow(allWeeklyData[currentWeekIndex - 1]);
        const diff = cf - prevCF;
        weeklyCfChange.textContent = (diff >= 0 ? '+' : '') + formatCurrency(diff) + ' (前週比)';
        weeklyCfChange.className = 'kpi-change ' + (diff >= 0 ? 'positive' : 'negative');
    }
}

// 週ナビゲーション
function updateWeekNav() {
    const week = allWeeklyData[currentWeekIndex];
    const projected = week.projected ? ' [予測]' : '';
    document.getElementById('selected-week').textContent = week.label + projected;
    document.getElementById('prev-week').disabled = currentWeekIndex === 0;
    document.getElementById('next-week').disabled = currentWeekIndex === allWeeklyData.length - 1;
}

// 週次明細テーブル
function updateWeeklyDetail() {
    const week = allWeeklyData[currentWeekIndex];
    const tbody = document.getElementById('weekly-detail-body');
    const tfoot = document.getElementById('weekly-detail-foot');

    let html = '';
    let totalIncome = 0;
    let totalExpense = 0;

    // 収入
    week.income.forEach(item => {
        totalIncome += item.amount;
        html += `<tr class="row-income">
            <td>収入</td>
            <td>${item.category}</td>
            <td class="amount-positive">${formatCurrencyFull(item.amount)}</td>
            <td>${item.note}</td>
        </tr>`;
    });

    // 支出
    week.expenses.forEach(item => {
        totalExpense += item.amount;
        html += `<tr class="row-expense">
            <td>支出</td>
            <td>${item.category}</td>
            <td class="amount-negative">-${formatCurrencyFull(item.amount)}</td>
            <td>${item.note}</td>
        </tr>`;
    });

    tbody.innerHTML = html;

    const net = totalIncome - totalExpense;
    tfoot.innerHTML = `
        <tr>
            <td colspan="2">収入合計</td>
            <td class="amount-positive">${formatCurrencyFull(totalIncome)}</td>
            <td></td>
        </tr>
        <tr>
            <td colspan="2">支出合計</td>
            <td class="amount-negative">-${formatCurrencyFull(totalExpense)}</td>
            <td></td>
        </tr>
        <tr class="row-total">
            <td colspan="2">週次収支</td>
            <td class="${net >= 0 ? 'amount-positive' : 'amount-negative'}">${net >= 0 ? '+' : ''}${formatCurrencyFull(net)}</td>
            <td></td>
        </tr>
        <tr class="row-total">
            <td colspan="2">期首残高 → 期末残高</td>
            <td>${formatCurrencyFull(week.openingBalance)} → ${formatCurrencyFull(getClosingBalance(week))}</td>
            <td></td>
        </tr>
    `;
}

// 月次サマリー
function updateMonthlySummary() {
    const monthMap = new Map();

    allWeeklyData.forEach(week => {
        if (!monthMap.has(week.month)) {
            monthMap.set(week.month, { income: 0, expense: 0, weeks: [] });
        }
        const m = monthMap.get(week.month);
        m.income += sumAmounts(week.income);
        m.expense += sumAmounts(week.expenses);
        m.weeks.push(week);
    });

    const tbody = document.getElementById('monthly-summary-body');
    let html = '';
    let runningBalance = allWeeklyData[0].openingBalance;

    monthMap.forEach((data, month) => {
        const net = data.income - data.expense;
        runningBalance += net;
        const burnRate = data.expense;
        const isProjected = data.weeks.some(w => w.projected);

        html += `<tr${isProjected ? ' style="opacity:0.6;font-style:italic"' : ''}>
            <td>${month}${isProjected ? ' (予測)' : ''}</td>
            <td class="amount-positive">${formatCurrencyFull(data.income)}</td>
            <td class="amount-negative">${formatCurrencyFull(data.expense)}</td>
            <td class="${net >= 0 ? 'amount-positive' : 'amount-negative'}">${net >= 0 ? '+' : ''}${formatCurrencyFull(net)}</td>
            <td>${formatCurrencyFull(runningBalance)}</td>
            <td>${formatCurrency(burnRate)}</td>
        </tr>`;
    });

    tbody.innerHTML = html;
}

// アラート
function updateAlerts() {
    const currentWeek = allWeeklyData[currentWeekIndex];
    const closingBalance = getClosingBalance(currentWeek);
    const cf = getWeekCashFlow(currentWeek);

    const recentWeeks = weeklyData.slice(Math.max(0, weeklyData.length - 12));
    const totalExpenses = recentWeeks.reduce((sum, w) => sum + sumAmounts(w.expenses), 0);
    const monthlyBurn = totalExpenses / 3;
    const runwayMonths = monthlyBurn > 0 ? closingBalance / monthlyBurn : Infinity;

    const alerts = [];

    if (runwayMonths < 6) {
        alerts.push({
            type: 'danger',
            icon: '!!',
            text: `ランウェイが${runwayMonths.toFixed(1)}ヶ月です。6ヶ月を下回っています。早急な資金調達の検討を推奨します。`,
        });
    } else if (runwayMonths < 12) {
        alerts.push({
            type: 'warning',
            icon: '!',
            text: `ランウェイが${runwayMonths.toFixed(1)}ヶ月です。12ヶ月を下回っています。資金調達の計画を開始してください。`,
        });
    }

    if (cf < -3000000) {
        alerts.push({
            type: 'warning',
            icon: '!',
            text: `今週のキャッシュフローが${formatCurrency(cf)}と大きなマイナスです。支出項目を確認してください。`,
        });
    }

    // バーンレート増加チェック
    if (weeklyData.length >= 8) {
        const recent4 = weeklyData.slice(-4).reduce((s, w) => s + sumAmounts(w.expenses), 0);
        const prev4 = weeklyData.slice(-8, -4).reduce((s, w) => s + sumAmounts(w.expenses), 0);
        if (recent4 > prev4 * 1.15) {
            const increase = ((recent4 / prev4 - 1) * 100).toFixed(0);
            alerts.push({
                type: 'warning',
                icon: '!',
                text: `直近4週の支出が前4週比で${increase}%増加しています。コスト管理にご注意ください。`,
            });
        }
    }

    // 売上成長チェック
    if (weeklyData.length >= 8) {
        const recent4Income = weeklyData.slice(-4).reduce((s, w) => s + sumAmounts(w.income), 0);
        const prev4Income = weeklyData.slice(-8, -4).reduce((s, w) => s + sumAmounts(w.income), 0);
        if (recent4Income > prev4Income * 1.1) {
            const growth = ((recent4Income / prev4Income - 1) * 100).toFixed(0);
            alerts.push({
                type: 'info',
                icon: 'i',
                text: `直近4週の売上が前4週比で${growth}%成長しています。`,
            });
        }
    }

    if (alerts.length === 0) {
        alerts.push({
            type: 'info',
            icon: 'i',
            text: '現時点で特に注意が必要なアラートはありません。',
        });
    }

    const container = document.getElementById('alerts');
    container.innerHTML = alerts.map(a =>
        `<div class="alert alert-${a.type}">
            <span class="alert-icon">${a.icon}</span>
            <span>${a.text}</span>
        </div>`
    ).join('');
}

// チャート
function initCharts() {
    const ctxCF = document.getElementById('weekly-cashflow-chart').getContext('2d');
    const ctxBalance = document.getElementById('cash-balance-chart').getContext('2d');
    const ctxIE = document.getElementById('income-expense-chart').getContext('2d');
    const ctxBreakdown = document.getElementById('expense-breakdown-chart').getContext('2d');

    const cfData = buildCashFlowChartData();
    weeklyCFChart = new Chart(ctxCF, {
        type: 'bar',
        data: cfData,
        options: {
            responsive: true,
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: {
                    callbacks: {
                        label: ctx => ctx.dataset.label + ': ' + formatCurrencyFull(ctx.raw),
                    },
                },
            },
            scales: {
                y: {
                    ticks: {
                        callback: v => formatCurrency(v),
                    },
                },
            },
        },
    });

    const balData = buildBalanceChartData();
    cashBalanceChart = new Chart(ctxBalance, {
        type: 'line',
        data: balData,
        options: {
            responsive: true,
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: {
                    callbacks: {
                        label: ctx => ctx.dataset.label + ': ' + formatCurrencyFull(ctx.raw),
                    },
                },
            },
            scales: {
                y: {
                    ticks: {
                        callback: v => formatCurrency(v),
                    },
                },
            },
        },
    });

    const ieData = buildIncomeExpenseData();
    incomeExpenseChart = new Chart(ctxIE, {
        type: 'bar',
        data: ieData,
        options: {
            responsive: true,
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: {
                    callbacks: {
                        label: ctx => ctx.dataset.label + ': ' + formatCurrencyFull(ctx.raw),
                    },
                },
            },
            scales: {
                y: {
                    ticks: {
                        callback: v => formatCurrency(v),
                    },
                },
            },
        },
    });

    const breakdownData = buildExpenseBreakdownData();
    expenseBreakdownChart = new Chart(ctxBreakdown, {
        type: 'doughnut',
        data: breakdownData,
        options: {
            responsive: true,
            plugins: {
                legend: { display: true, position: 'right' },
                tooltip: {
                    callbacks: {
                        label: ctx => ctx.label + ': ' + formatCurrencyFull(ctx.raw),
                    },
                },
            },
        },
    });
}

function buildCashFlowChartData() {
    const labels = allWeeklyData.map(w => w.label);
    const cfValues = allWeeklyData.map(w => getWeekCashFlow(w));
    const colors = cfValues.map(v => v >= 0 ? 'rgba(22, 163, 74, 0.7)' : 'rgba(220, 38, 38, 0.7)');
    const borders = cfValues.map(v => v >= 0 ? 'rgb(22, 163, 74)' : 'rgb(220, 38, 38)');

    return {
        labels,
        datasets: [{
            label: '週次キャッシュフロー',
            data: cfValues,
            backgroundColor: colors,
            borderColor: borders,
            borderWidth: 1,
        }],
    };
}

function buildBalanceChartData() {
    const actualLabels = weeklyData.map(w => w.label);
    const actualBalances = weeklyData.map(w => getClosingBalance(w));
    const projLabels = projectedData.map(w => w.label);
    const projBalances = projectedData.map(w => getClosingBalance(w));
    const allLabels = [...actualLabels, ...projLabels];

    return {
        labels: allLabels,
        datasets: [
            {
                label: '実績残高',
                data: [...actualBalances, ...new Array(projLabels.length).fill(null)],
                borderColor: 'rgb(37, 99, 235)',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 3,
            },
            {
                label: '予測残高',
                data: [...new Array(actualLabels.length - 1).fill(null), actualBalances[actualBalances.length - 1], ...projBalances],
                borderColor: 'rgb(37, 99, 235)',
                backgroundColor: 'rgba(37, 99, 235, 0.05)',
                borderDash: [5, 5],
                fill: true,
                tension: 0.3,
                pointRadius: 3,
            },
        ],
    };
}

function buildIncomeExpenseData() {
    const labels = allWeeklyData.map(w => w.label);
    const incomes = allWeeklyData.map(w => sumAmounts(w.income));
    const expenses = allWeeklyData.map(w => sumAmounts(w.expenses));

    return {
        labels,
        datasets: [
            {
                label: '収入',
                data: incomes,
                backgroundColor: 'rgba(22, 163, 74, 0.6)',
                borderColor: 'rgb(22, 163, 74)',
                borderWidth: 1,
            },
            {
                label: '支出',
                data: expenses,
                backgroundColor: 'rgba(220, 38, 38, 0.6)',
                borderColor: 'rgb(220, 38, 38)',
                borderWidth: 1,
            },
        ],
    };
}

function buildExpenseBreakdownData() {
    const week = allWeeklyData[currentWeekIndex];
    const categoryMap = new Map();

    week.expenses.forEach(item => {
        categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + item.amount);
    });

    const categories = [...categoryMap.keys()];
    const amounts = [...categoryMap.values()];
    const palette = [
        'rgba(37, 99, 235, 0.7)',
        'rgba(220, 38, 38, 0.7)',
        'rgba(245, 158, 11, 0.7)',
        'rgba(22, 163, 74, 0.7)',
        'rgba(139, 92, 246, 0.7)',
        'rgba(236, 72, 153, 0.7)',
        'rgba(20, 184, 166, 0.7)',
    ];

    return {
        labels: categories,
        datasets: [{
            data: amounts,
            backgroundColor: palette.slice(0, categories.length),
            borderWidth: 1,
        }],
    };
}

function updateCharts() {
    // Update expense breakdown for selected week
    const breakdownData = buildExpenseBreakdownData();
    expenseBreakdownChart.data = breakdownData;
    expenseBreakdownChart.update();
}
