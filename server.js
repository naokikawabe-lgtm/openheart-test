/**
 * OpenHeart 財務ダッシュボード - freee連携サーバー
 *
 * freee会計APIとのOAuth2認証・データ取得を仲介する軽量サーバー。
 * フロントエンドから直接freee APIを叩くとclient_secretが露出するため、
 * このサーバーがプロキシとして認証とAPI呼び出しを担う。
 *
 * 起動方法:
 *   node server.js
 *
 * 環境変数（.envファイルまたは直接指定）:
 *   FREEE_CLIENT_ID      - freeeアプリのClient ID
 *   FREEE_CLIENT_SECRET   - freeeアプリのClient Secret
 *   FREEE_REDIRECT_URI    - コールバックURL（デフォルト: http://localhost:3000/callback）
 *   PORT                  - サーバーポート（デフォルト: 3000）
 */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

// ========================================
// 設定
// ========================================
const PORT = process.env.PORT || 3000;
const FREEE_CLIENT_ID = process.env.FREEE_CLIENT_ID || '';
const FREEE_CLIENT_SECRET = process.env.FREEE_CLIENT_SECRET || '';
const FREEE_REDIRECT_URI = process.env.FREEE_REDIRECT_URI || `http://localhost:${PORT}/callback`;
const FREEE_AUTH_URL = 'https://accounts.secure.freee.co.jp/public_api/authorize';
const FREEE_TOKEN_URL = 'https://accounts.secure.freee.co.jp/public_api/token';
const FREEE_API_BASE = 'https://api.freee.co.jp';

// トークンストレージ（本番ではDB等に保存すべき）
const TOKEN_FILE = path.join(__dirname, '.freee-tokens.json');

let tokens = loadTokens();

function loadTokens() {
    try {
        if (fs.existsSync(TOKEN_FILE)) {
            return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('トークンファイル読み込みエラー:', e.message);
    }
    return { access_token: null, refresh_token: null, expires_at: null, company_id: null };
}

function saveTokens(data) {
    tokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + (data.expires_in || 21600) * 1000,
        company_id: data.company_id || tokens.company_id,
    };
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
    return tokens;
}

// ========================================
// HTTPS リクエストヘルパー
// ========================================
function httpsRequest(options, postData) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });
        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

// ========================================
// freee OAuth2 フロー
// ========================================
async function exchangeCodeForToken(code) {
    const postData = querystring.stringify({
        grant_type: 'authorization_code',
        client_id: FREEE_CLIENT_ID,
        client_secret: FREEE_CLIENT_SECRET,
        code: code,
        redirect_uri: FREEE_REDIRECT_URI,
    });

    const urlObj = new URL(FREEE_TOKEN_URL);
    const result = await httpsRequest({
        hostname: urlObj.hostname,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
        },
    }, postData);

    if (result.status === 200) {
        return saveTokens(result.data);
    }
    throw new Error(`Token exchange failed: ${JSON.stringify(result.data)}`);
}

async function refreshAccessToken() {
    if (!tokens.refresh_token) throw new Error('リフレッシュトークンがありません');

    const postData = querystring.stringify({
        grant_type: 'refresh_token',
        client_id: FREEE_CLIENT_ID,
        client_secret: FREEE_CLIENT_SECRET,
        refresh_token: tokens.refresh_token,
    });

    const urlObj = new URL(FREEE_TOKEN_URL);
    const result = await httpsRequest({
        hostname: urlObj.hostname,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
        },
    }, postData);

    if (result.status === 200) {
        return saveTokens(result.data);
    }
    throw new Error(`Token refresh failed: ${JSON.stringify(result.data)}`);
}

async function getValidToken() {
    if (!tokens.access_token) throw new Error('未認証です。先にfreeeと連携してください。');
    if (tokens.expires_at && Date.now() > tokens.expires_at - 60000) {
        await refreshAccessToken();
    }
    return tokens.access_token;
}

// ========================================
// freee API 呼び出し
// ========================================
async function freeeGet(endpoint, params) {
    const token = await getValidToken();
    const qs = params ? '?' + querystring.stringify(params) : '';
    const apiUrl = new URL(endpoint + qs, FREEE_API_BASE);

    const result = await httpsRequest({
        hostname: apiUrl.hostname,
        path: apiUrl.pathname + apiUrl.search,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
        },
    });

    if (result.status === 401) {
        // トークン期限切れ → リフレッシュして再試行
        await refreshAccessToken();
        const newToken = tokens.access_token;
        const retry = await httpsRequest({
            hostname: apiUrl.hostname,
            path: apiUrl.pathname + apiUrl.search,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${newToken}`,
                'Accept': 'application/json',
            },
        });
        return retry.data;
    }

    return result.data;
}

// ========================================
// データ取得エンドポイント群
// ========================================
async function fetchAllFreeeData() {
    const companyId = tokens.company_id;
    if (!companyId) throw new Error('事業所IDが不明です。再認証してください。');

    // 並列でデータ取得
    const [deals, walletables, trialPl, trialBs, invoices, partners, accountItems] =
        await Promise.all([
            // 取引一覧（直近1年）
            freeeGet('/api/1/deals', {
                company_id: companyId,
                limit: 100,
                start_issue_date: getOneYearAgo(),
                type: 'income_and_expense',
            }),
            // 口座一覧（残高付き）
            freeeGet('/api/1/walletables', {
                company_id: companyId,
                with_balance: true,
            }),
            // 損益計算書
            freeeGet('/api/1/reports/trial_pl', {
                company_id: companyId,
                fiscal_year: new Date().getFullYear(),
            }),
            // 貸借対照表
            freeeGet('/api/1/reports/trial_bs', {
                company_id: companyId,
                fiscal_year: new Date().getFullYear(),
            }),
            // 請求書一覧
            freeeGet('/api/1/invoices', {
                company_id: companyId,
                limit: 100,
                start_issue_date: getOneYearAgo(),
            }),
            // 取引先一覧
            freeeGet('/api/1/partners', {
                company_id: companyId,
                limit: 100,
            }),
            // 勘定科目一覧
            freeeGet('/api/1/account_items', {
                company_id: companyId,
            }),
        ]);

    return { deals, walletables, trialPl, trialBs, invoices, partners, accountItems };
}

function getOneYearAgo() {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split('T')[0];
}

// ========================================
// HTTP サーバー
// ========================================
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
};

function sendJson(res, status, data) {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(data));
}

function serveStatic(res, filePath) {
    const ext = path.extname(filePath);
    const mime = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': mime });
        res.end(data);
    });
}

const server = http.createServer(async (req, res) => {
    const parsed = url.parse(req.url, true);
    const pathname = parsed.pathname;

    // CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return;
    }

    try {
        // ======== API エンドポイント ========

        // freee接続状態の確認
        if (pathname === '/api/freee/status') {
            const configured = !!(FREEE_CLIENT_ID && FREEE_CLIENT_SECRET);
            const connected = !!tokens.access_token;
            sendJson(res, 200, {
                configured,
                connected,
                company_id: tokens.company_id,
                expires_at: tokens.expires_at,
                client_id_set: !!FREEE_CLIENT_ID,
            });
            return;
        }

        // freee認証開始（認可URLを返す）
        if (pathname === '/api/freee/auth') {
            if (!FREEE_CLIENT_ID) {
                sendJson(res, 400, { error: 'FREEE_CLIENT_IDが設定されていません' });
                return;
            }
            const authUrl = `${FREEE_AUTH_URL}?` + querystring.stringify({
                client_id: FREEE_CLIENT_ID,
                redirect_uri: FREEE_REDIRECT_URI,
                response_type: 'code',
            });
            sendJson(res, 200, { auth_url: authUrl });
            return;
        }

        // OAuth2コールバック
        if (pathname === '/callback') {
            const code = parsed.query.code;
            if (!code) {
                res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<h2>認可コードが見つかりません</h2>');
                return;
            }
            await exchangeCodeForToken(code);
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
                <html><body style="font-family:sans-serif;text-align:center;padding:60px">
                <h2>freee連携が完了しました</h2>
                <p>事業所ID: ${tokens.company_id}</p>
                <p>このウィンドウを閉じてダッシュボードに戻ってください。</p>
                <script>
                    if (window.opener) {
                        window.opener.postMessage({ type: 'freee-auth-success' }, '*');
                        setTimeout(() => window.close(), 2000);
                    }
                </script>
                </body></html>
            `);
            return;
        }

        // freee全データ取得（同期）
        if (pathname === '/api/freee/sync') {
            const data = await fetchAllFreeeData();
            sendJson(res, 200, { success: true, data, synced_at: new Date().toISOString() });
            return;
        }

        // 個別エンドポイント: 取引一覧
        if (pathname === '/api/freee/deals') {
            const data = await freeeGet('/api/1/deals', {
                company_id: tokens.company_id,
                limit: parsed.query.limit || 100,
                start_issue_date: parsed.query.start_date || getOneYearAgo(),
                type: parsed.query.type || 'income_and_expense',
            });
            sendJson(res, 200, data);
            return;
        }

        // 個別エンドポイント: 口座残高
        if (pathname === '/api/freee/walletables') {
            const data = await freeeGet('/api/1/walletables', {
                company_id: tokens.company_id,
                with_balance: true,
            });
            sendJson(res, 200, data);
            return;
        }

        // 個別エンドポイント: 損益計算書
        if (pathname === '/api/freee/trial_pl') {
            const data = await freeeGet('/api/1/reports/trial_pl', {
                company_id: tokens.company_id,
                fiscal_year: parsed.query.fiscal_year || new Date().getFullYear(),
                start_month: parsed.query.start_month,
                end_month: parsed.query.end_month,
            });
            sendJson(res, 200, data);
            return;
        }

        // 個別エンドポイント: 貸借対照表
        if (pathname === '/api/freee/trial_bs') {
            const data = await freeeGet('/api/1/reports/trial_bs', {
                company_id: tokens.company_id,
                fiscal_year: parsed.query.fiscal_year || new Date().getFullYear(),
            });
            sendJson(res, 200, data);
            return;
        }

        // 個別エンドポイント: 請求書
        if (pathname === '/api/freee/invoices') {
            const data = await freeeGet('/api/1/invoices', {
                company_id: tokens.company_id,
                limit: parsed.query.limit || 100,
            });
            sendJson(res, 200, data);
            return;
        }

        // 個別エンドポイント: 取引先
        if (pathname === '/api/freee/partners') {
            const data = await freeeGet('/api/1/partners', {
                company_id: tokens.company_id,
            });
            sendJson(res, 200, data);
            return;
        }

        // freee切断
        if (pathname === '/api/freee/disconnect') {
            tokens = { access_token: null, refresh_token: null, expires_at: null, company_id: null };
            if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE);
            sendJson(res, 200, { success: true });
            return;
        }

        // ======== 静的ファイル配信 ========
        let filePath = pathname === '/' ? '/index.html' : pathname;
        filePath = path.join(__dirname, filePath);

        // パストラバーサル防止
        if (!filePath.startsWith(__dirname)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }

        serveStatic(res, filePath);

    } catch (err) {
        console.error('エラー:', err.message);
        sendJson(res, 500, { error: err.message });
    }
});

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║  OpenHeart 財務ダッシュボード サーバー                 ║
║  http://localhost:${PORT}                               ║
╠════════════════════════════════════════════════════════╣
║  freee連携ステータス:                                  ║
║    Client ID:  ${FREEE_CLIENT_ID ? '設定済み' : '未設定 (FREEE_CLIENT_ID)'}               ║
║    認証状態:   ${tokens.access_token ? '接続済み' : '未接続'}                          ║
╠════════════════════════════════════════════════════════╣
║  freee連携の設定方法:                                  ║
║  1. https://app.secure.freee.co.jp/developers で      ║
║     OAuthアプリを作成                                  ║
║  2. 環境変数を設定:                                    ║
║     FREEE_CLIENT_ID=xxx                                ║
║     FREEE_CLIENT_SECRET=xxx                            ║
║  3. サーバーを再起動してダッシュボードから認証          ║
╚════════════════════════════════════════════════════════╝
`);
});
