/// <reference types="gapi.client.drive-v3" />
import { gapi } from 'gapi-script';
import { userSettingsService, type UserSettings } from './userSettingsService';

// 簡化的 Google Drive 配置
const GOOGLE_CONFIG = {
    CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_CLIENT_ID_HERE.apps.googleusercontent.com",
    API_KEY: import.meta.env.VITE_GOOGLE_API_KEY || "YOUR_API_KEY_HERE",
    // SCOPES: "https://www.googleapis.com/auth/drive.file",
    // 先暫時改用基礎權限，測試是否能登入成功 (排除 Drive 權限問題)
    SCOPES: "email profile openid https://www.googleapis.com/auth/drive.file",
    APP_DATA_FOLDER: "QuickBook Data",
    DATA_FILE_NAME: "accounting_data.json"
};

export interface UserData {
    id: string;
    name: string;
    email: string;
    imageUrl: string;
    isGuest?: boolean;
}

// 區塊鏈核心結構
export interface Transaction {
    id: string;
    timestamp: number;
    type: 'expense' | 'income' | 'transfer' | 'adjustment' | 'exchange';
    prev_id: string | null; // 指向前一個區塊的 ID (Genesis Block 為 null)
    ref_original_id?: string; // For Adjustment Blocks
    payload: {
        amount: number;
        category: string; // For transfer, maybe 'Transfer'
        note: string;
        accountId: string; // Source Account
        currency?: string; // Source currency
        // Transfer / Exchange Fields
        toAccountId?: string;
        targetCurrency?: string; // Target currency for exchange
        exchangeRate?: number;
        targetAmount?: number;

        date?: number; // Optional override for transaction date
    };
    snapshot: {
        totalAssets: Record<string, number>; // Changed to Multi-Currency Map
        accounts: Record<string, Record<string, number>>; // { accountId: { currency: amount } }
    };
}

// Legacy Interface for Compatibility
export interface AccountingData {
    version: string;
    lastModified: string;
    data: any;
}

class SimpleDriveService {
    private isInitialized = false;
    private userData: UserData | null = null;
    // private dataFileId: string | null = null; // Unused in blockchain mode
    private isGuestMode = false;

    // In-Memory Chain State (最末端區塊)
    private latestBlock: Transaction | null = null;

    // Cache for Guest Mode traversal
    private mockChainCache = new Map<string, Transaction>();

    // 接替訪客登入
    async loginAsGuest(): Promise<UserData> {
        this.isGuestMode = true;
        this.userData = {
            id: 'guest_user',
            name: 'Guest User',
            email: 'guest@example.com',
            imageUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
            isGuest: true
        };
        // 訪客模式初始化 Genesis Block
        if (!this.latestBlock) {
            this.latestBlock = {
                id: 'genesis_guest',
                timestamp: Date.now(),
                type: 'adjustment',
                prev_id: null,
                payload: { amount: 0, currency: 'TWD', category: 'System', note: 'Guest Mode Start', accountId: 'acc_cash' },
                snapshot: {
                    totalAssets: {},
                    accounts: {}
                }
            };
            this.mockChainCache.set(this.latestBlock.id, this.latestBlock);
        }
        return this.userData;
    }

    // 初始化 Google API (包括 gapi 和 GIS)
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        // 1. 等待 GIS (google.accounts) 載入
        await this.waitForGoogleIdentityServices();

        // 2. 載入 GAPI Client
        return new Promise((resolve, reject) => {
            gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        apiKey: GOOGLE_CONFIG.API_KEY,
                        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                    });
                    this.isInitialized = true;
                    resolve();
                } catch (error) {
                    console.error("GAPI Init Error:", error);
                    reject(error);
                }
            });
        });
    }

    // 等待 google.accounts.oauth2 載入
    private waitForGoogleIdentityServices(): Promise<void> {
        return new Promise((resolve) => {
            // @ts-ignore
            if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
                resolve();
                return;
            }

            // 如果還沒載入，每 100ms 檢查一次
            const interval = setInterval(() => {
                // @ts-ignore
                if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);

            // 10秒超時保護
            setTimeout(() => {
                clearInterval(interval);
                console.warn("Google Identity Services load timeout");
                resolve(); // 嘗試繼續，雖然可能會失敗
            }, 10000);
        });
    }

    // 使用新的 GIS (Google Identity Services) 進行登入
    async signIn(): Promise<UserData> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        return new Promise((resolve, reject) => {
            try {
                // @ts-ignore - google is defined by the script tag
                const tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: GOOGLE_CONFIG.CLIENT_ID,
                    scope: GOOGLE_CONFIG.SCOPES,
                    callback: async (tokenResponse: any) => {
                        if (tokenResponse.error !== undefined) {
                            reject(tokenResponse);
                            return;
                        }

                        try {
                            // 將 Token 設定給 gapi
                            // @ts-ignore
                            gapi.client.setToken(tokenResponse);

                            // 獲取使用者資訊 (需透過 API 呼叫，因為 GIS 不直接回傳 Profile)
                            const userInfo = await this.fetchUserInfo(tokenResponse.access_token);
                            this.userData = userInfo;

                            // 登入後嘗試同步最新的區塊
                            try {
                                await this.syncLatestBlock();
                            } catch (driveErr) {
                                console.warn("Sync failed:", driveErr);
                            }

                            resolve(this.userData);
                        } catch (err) {
                            console.error("Error in signIn callback:", err);
                            reject(err);
                        }
                    },
                });

                // 觸發彈窗
                // @ts-ignore
                tokenClient.requestAccessToken();

            } catch (error) {
                console.error('GIS Error:', error);
                reject(error);
            }
        });
    }

    // 使用 Access Token 獲取用戶資訊
    private async fetchUserInfo(accessToken: string): Promise<UserData> {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await response.json();
        return {
            id: data.sub,
            name: data.name,
            email: data.email,
            imageUrl: data.picture,
        };
    }

    // 登出
    async signOut(): Promise<void> {
        if (this.isInitialized) {
            // @ts-ignore
            const token = gapi.client.getToken();
            if (token !== null) {
                // @ts-ignore
                google.accounts.oauth2.revoke(token.access_token, () => { });
                // @ts-ignore
                gapi.client.setToken(null);
            }
        }
        this.userData = null;
        // this.dataFileId = null;
        this.isGuestMode = false;
        this.latestBlock = null;
        this.mockChainCache.clear();
    }

    // 檢查是否已登入
    isSignedIn(): boolean {
        if (this.isGuestMode) return true;
        // @ts-ignore
        return this.isInitialized && gapi.client.getToken() !== null && this.userData !== null;
    }

    // 獲取用戶資料
    getUser(): UserData | null {
        return this.userData;
    }

    // -------------------------------------------------------------
    // Core Ledger Logic (Blockchain-like)
    // -------------------------------------------------------------

    // 1. 同步最新的區塊 (真實 Drive 搜尋)
    async syncLatestBlock(): Promise<Transaction | null> {
        if (this.isGuestMode) return this.latestBlock;

        try {
            console.log("� 開始同步最新的每日交易檔案...");
            
            // 使用 dailyTransactionService 讀取所有交易
            const { dailyTransactionService } = await import('./dailyTransactionService');
            const transactions = await dailyTransactionService.getHistory(1000); // 讀取更多交易來重建快照
            
            if (transactions.length === 0) {
                console.log("📁 沒有找到任何交易記錄，開始新的區塊鏈");
                return null;
            }

            console.log(`📊 找到 ${transactions.length} 筆交易，開始重建快照...`);
            
            // 按時間順序處理交易來重建快照
            const sortedTransactions = transactions.sort((a, b) => a.timestamp - b.timestamp);
            
            let latestSnapshot: { totalAssets: Record<string, number>, accounts: Record<string, Record<string, number>> } = {
                totalAssets: {},
                accounts: {}
            };
            
            let latestTransaction: Transaction | null = null;
            
            for (const tx of sortedTransactions) {
                console.log(`🔍 處理交易: ${tx.id}, 類型: ${tx.type}, 金額: ${tx.payload.amount}, 帳戶: ${tx.payload.accountId}`);
                
                // 模擬處理交易來更新快照
                const accountId = tx.payload.accountId;
                const currency = tx.payload.currency || 'TWD';
                const amount = tx.payload.amount;
                
                if (!latestSnapshot.accounts[accountId]) {
                    latestSnapshot.accounts[accountId] = {};
                }
                
                if (tx.type === 'income') {
                    // 收入：增加餘額
                    latestSnapshot.accounts[accountId][currency] = (latestSnapshot.accounts[accountId][currency] || 0) + amount;
                    latestSnapshot.totalAssets[currency] = (latestSnapshot.totalAssets[currency] || 0) + amount;
                    console.log(`💰 收入: ${accountId} +${amount} ${currency} = ${latestSnapshot.accounts[accountId][currency]}`);
                } else if (tx.type === 'expense') {
                    // 支出：減少餘額
                    latestSnapshot.accounts[accountId][currency] = (latestSnapshot.accounts[accountId][currency] || 0) - amount;
                    latestSnapshot.totalAssets[currency] = (latestSnapshot.totalAssets[currency] || 0) - amount;
                    console.log(`💸 支出: ${accountId} -${amount} ${currency} = ${latestSnapshot.accounts[accountId][currency]}`);
                } else if (tx.type === 'transfer') {
                    // 轉帳：從一個帳戶轉到另一個帳戶
                    const toAccountId = tx.payload.toAccountId;
                    if (!toAccountId) {
                        console.warn('⚠️ 轉帳交易缺少目標帳戶');
                        continue;
                    }
                    const targetCurrency = tx.payload.targetCurrency || currency;
                    const targetAmount = tx.payload.targetAmount || amount;
                    
                    // 減少來源帳戶
                    if (!latestSnapshot.accounts[accountId]) {
                        latestSnapshot.accounts[accountId] = {};
                    }
                    latestSnapshot.accounts[accountId][currency] = (latestSnapshot.accounts[accountId][currency] || 0) - amount;
                    
                    // 增加目標帳戶
                    if (!latestSnapshot.accounts[toAccountId]) {
                        latestSnapshot.accounts[toAccountId] = {};
                    }
                    latestSnapshot.accounts[toAccountId][targetCurrency] = (latestSnapshot.accounts[toAccountId][targetCurrency] || 0) + targetAmount;
                    
                    console.log(`🔄 轉帳: ${accountId} -> ${toAccountId}, ${amount} ${currency} -> ${targetAmount} ${targetCurrency}`);
                }
                
                // 轉換為 Transaction 格式
                latestTransaction = {
                    id: tx.id,
                    timestamp: tx.timestamp,
                    type: tx.type,
                    prev_id: tx.prev_id,
                    payload: tx.payload,
                    snapshot: { ...latestSnapshot }
                };
            }
            
            if (latestTransaction) {
                console.log("✅ 快照重建完成，最新交易:", latestTransaction.id);
                console.log("📊 最新快照:", latestSnapshot);
                this.latestBlock = latestTransaction;
                return latestTransaction;
            }
            
            return null;
        } catch (error) {
            console.error("❌ 同步失敗:", error);
            return null;
        }
    }

    // 2. 獲取交易歷史 (並處理影子修正)
    async getHistory(limit: number = 20): Promise<Transaction[]> {
        const history: Transaction[] = [];
        const adjustments = new Map<string, Transaction>(); // Map<original_id, adjustment_tx>

        let currentBlock = this.latestBlock;

        // Traverse backward from latest
        while (currentBlock && history.length < limit) {
            // Check if this is an adjustment block
            if (currentBlock.type === 'adjustment' && currentBlock.ref_original_id) {
                // Store modification for later merging
                if (!adjustments.has(currentBlock.ref_original_id)) {
                    adjustments.set(currentBlock.ref_original_id, currentBlock);
                }
            } else {
                // This is a normal transaction (or the original one)

                // Check if there is a pending adjustment for this block
                if (adjustments.has(currentBlock.id)) {
                    const adjustment = adjustments.get(currentBlock.id)!;

                    // Merge: Use Original Metadata + Adjustment Payload
                    const mergedTx: Transaction = {
                        ...currentBlock,
                        payload: {
                            ...adjustment.payload,
                            note: adjustment.payload.note // + ' (Edited)'
                        },
                    };
                    history.push(mergedTx);
                } else {
                    history.push(currentBlock);
                }
            }

            // Move to previous
            if (!currentBlock.prev_id) break; // Genesis block reached

            if (this.isGuestMode) {
                currentBlock = this.mockChainCache.get(currentBlock.prev_id) || null;
            } else {
                // Real implementation: Fetch from Cache or Drive
                currentBlock = await this.fetchBlockByUUID(currentBlock.prev_id);
            }
        }

        return history;
    }

    // Helper: Fetch a specific block by ID (from Cache or Drive)
    private async fetchBlockByUUID(uuid: string): Promise<Transaction | null> {
        // 1. Check Cache
        if (this.mockChainCache.has(uuid)) {
            return this.mockChainCache.get(uuid)!;
        }

        // 2. Fetch from Drive
        try {
            // 使用每日交易檔案服務保存，不再使用 tx_*.json 格式
            console.log("💾 使用每日交易檔案格式保存交易");
            
            // 轉換為每日交易格式並保存
            const { blockchainTransactionService } = await import('./blockchainTransactionService');
            const accountName = "default"; // 可以從上下文獲取
            // await blockchainTransactionService.saveBlockToDrive(newBlock, accountName, newBlock.type);
            
            // 直接在 Google Drive 根目錄搜尋，不使用資料夾
            // Filename format: tx_{timestamp}_{uuid}.json
            // We search by "name contains uuid" to be safe
            const query = `name contains '${uuid}' and trashed=false`;

            const response = await gapi.client.drive.files.list({
                q: query,
                fields: 'files(id, name)',
                pageSize: 1
            });

            const files = response.result.files || [];
            if (files.length > 0) {
                const fileId = files[0].id!;
                const contentRes = await gapi.client.drive.files.get({
                    fileId: fileId,
                    alt: 'media'
                });

                const block = contentRes.result as unknown as Transaction;
                if (block && block.id === uuid) {
                    this.mockChainCache.set(uuid, block); // Cache it
                    return block;
                }
            }
        } catch (e) {
            console.error(`Failed to fetch block ${uuid}:`, e);
        }

        return null;
    }

    // 3. 修改交易 (Shadow Correction)
    async editTransaction(originalTx: Transaction, newPayload: Transaction['payload']): Promise<Transaction> {
        // Simplified Logic: Just append an Adjustment Block that reverses old and applies new
        // Since Diff logic is complex with currency changes in Multi-currency 2D map.

        // 1. Revert Old (Inverted logic of Append)
        const prevBlock = this.latestBlock;
        const prevSnapshot = prevBlock ? prevBlock.snapshot : { totalAssets: {}, accounts: {} };
        const newAccounts: Record<string, Record<string, number>> = JSON.parse(JSON.stringify(prevSnapshot.accounts || {}));
        const newTotalAssets: Record<string, number> = JSON.parse(JSON.stringify(prevSnapshot.totalAssets));

        const revert = (tx: Transaction) => {
            const qty = tx.payload.amount;
            const curr = tx.payload.currency || 'TWD';
            const acc = tx.payload.accountId;
            const type = tx.type;

            if (type === 'expense') {
                // Was -qty, so +qty
                newAccounts[acc][curr] = (newAccounts[acc][curr] || 0) + qty;
                newTotalAssets[curr] = (newTotalAssets[curr] || 0) + qty;
            } else if (type === 'income') {
                // Was +qty, so -qty
                newAccounts[acc][curr] = (newAccounts[acc][curr] || 0) - qty;
                newTotalAssets[curr] = (newTotalAssets[curr] || 0) - qty;
            } else if ((type === 'transfer' || type === 'exchange') && tx.payload.toAccountId) {
                // Was Source -qty, Target +targetQty
                // So Source +qty, Target -targetQty
                newAccounts[acc][curr] = (newAccounts[acc][curr] || 0) + qty;
                newTotalAssets[curr] = (newTotalAssets[curr] || 0) + qty;

                const tAcc = tx.payload.toAccountId;
                const tCurr = tx.payload.targetCurrency || curr;
                const tQty = tx.payload.targetAmount || qty;

                newAccounts[tAcc][tCurr] = (newAccounts[tAcc][tCurr] || 0) - tQty;
                newTotalAssets[tCurr] = (newTotalAssets[tCurr] || 0) - tQty;
            }
        };

        const apply = (payload: Transaction['payload'], type: Transaction['type']) => {
            const qty = payload.amount;
            const curr = payload.currency || 'TWD';
            const acc = payload.accountId;

            if (!newAccounts[acc]) newAccounts[acc] = {};
            if (!newTotalAssets[curr]) newTotalAssets[curr] = 0;

            if (type === 'expense') {
                newAccounts[acc][curr] = (newAccounts[acc][curr] || 0) - qty;
                newTotalAssets[curr] = (newTotalAssets[curr] || 0) - qty;
            } else if (type === 'income') {
                newAccounts[acc][curr] = (newAccounts[acc][curr] || 0) + qty;
                newTotalAssets[curr] = (newTotalAssets[curr] || 0) + qty;
            } else if ((type === 'transfer' || type === 'exchange') && payload.toAccountId) {
                newAccounts[acc][curr] = (newAccounts[acc][curr] || 0) - qty;
                newTotalAssets[curr] = (newTotalAssets[curr] || 0) - qty;

                const tAcc = payload.toAccountId;
                const tCurr = payload.targetCurrency || curr;
                const tQty = payload.targetAmount || qty;

                if (!newAccounts[tAcc]) newAccounts[tAcc] = {};
                if (!newTotalAssets[tCurr]) newTotalAssets[tCurr] = 0;

                newAccounts[tAcc][tCurr] = (newAccounts[tAcc][tCurr] || 0) + tQty;
                newTotalAssets[tCurr] = (newTotalAssets[tCurr] || 0) + tQty;
            }
        };

        // Execute Revert then Apply
        revert(originalTx);
        apply(newPayload, originalTx.type); // Type usually doesn't change, if it does, it's complex. Assuming type same for now.

        // Create Adjustment Block
        const adjustmentBlock: Transaction = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            type: 'adjustment',
            prev_id: this.latestBlock?.id || null,
            ref_original_id: originalTx.id,
            payload: newPayload,
            snapshot: {
                totalAssets: newTotalAssets,
                accounts: newAccounts
            }
        };

        // Save logic
        if (this.isGuestMode) {
            this.latestBlock = adjustmentBlock;
            this.mockChainCache.set(adjustmentBlock.id, adjustmentBlock);
            return adjustmentBlock;
        }

        await this.uploadBlockToDrive(adjustmentBlock);
        this.latestBlock = adjustmentBlock;
        return adjustmentBlock;
    }

    // 4. 新增交易 (Append Block)
    async appendTransaction(
        type: Transaction['type'],
        amount: number,
        category: string,
        note: string,
        accountId: string = 'acc_cash', // Default
        options?: {
            currency?: string;
            toAccountId?: string;
            targetCurrency?: string;
            exchangeRate?: number;
            targetAmount?: number;
            date?: number;
        }
    ): Promise<Transaction> {

        // 1. 準備上一筆資料 (Snapshot & ID)
        const prevBlock = this.latestBlock;
        const prevSnapshot = prevBlock ? prevBlock.snapshot : { totalAssets: {}, accounts: {} };
        const currentAssets = prevSnapshot.totalAssets || {};
        const currentAccounts = prevSnapshot.accounts || {};

        // Get currency from options or default to TWD
        const currency = options?.currency || 'TWD';

        // Asset logic
        let changeAmount = 0;
        if (type === 'expense') changeAmount = -Math.abs(amount);
        else if (type === 'income') changeAmount = Math.abs(amount);

        // Deep copy accounts to avoid readonly property issues
        const newAccounts: Record<string, Record<string, number>> = JSON.parse(JSON.stringify(currentAccounts));
        const newTotalAssets: Record<string, number> = JSON.parse(JSON.stringify(currentAssets));

        // Fix: Aggressively migrate ALL legacy accounts (number -> object)
        Object.keys(newAccounts).forEach(accId => {
            if (typeof newAccounts[accId] === 'number') {
                console.warn(`[Auto-Fix] Migrating legacy account ${accId} from number to object...`);
                // @ts-ignore
                const oldBalance = newAccounts[accId];
                // Default to TWD for legacy migration if currency not known, but ideal to use current context
                newAccounts[accId] = { 'TWD': oldBalance };
            }
        });

        const ensureAccount = (accId: string, curr: string = 'TWD') => {
            if (!newAccounts[accId]) newAccounts[accId] = {};
            // Double check migration just in case
            if (typeof newAccounts[accId] === 'number') {
                // @ts-ignore
                const val = newAccounts[accId];
                newAccounts[accId] = { 'TWD': val };
            }

            if (typeof newAccounts[accId][curr] === 'undefined') newAccounts[accId][curr] = 0;
        };

        const ensureAsset = (curr: string) => {
            if (!newTotalAssets[curr]) newTotalAssets[curr] = 0;
        };

        ensureAccount(accountId, currency);
        ensureAsset(currency);

        if (type === 'transfer' && options?.toAccountId) {
            // Deduct from Source
            newAccounts[accountId][currency] = (newAccounts[accountId][currency] || 0) - Math.abs(amount);

            // Add to Target
            const targetAmt = options.targetAmount !== undefined ? options.targetAmount : Math.abs(amount);
            const targetCurrency = options.targetCurrency || currency;
            ensureAccount(options.toAccountId, targetCurrency);
            newAccounts[options.toAccountId][targetCurrency] = (newAccounts[options.toAccountId][targetCurrency] || 0) + targetAmt;
        } else {
            // Normal Expense/Income
            newAccounts[accountId][currency] = (newAccounts[accountId][currency] || 0) + changeAmount;
            newTotalAssets[currency] = (newTotalAssets[currency] || 0) + changeAmount;
        }

        // 2. 建立新區塊
        const newBlock: Transaction = {
            id: crypto.randomUUID(),
            timestamp: options?.date || Date.now(),
            type,
            prev_id: prevBlock ? prevBlock.id : null,
            payload: {
                amount,
                category,
                note,
                accountId,
                ...options
            },
            snapshot: {
                totalAssets: newTotalAssets,
                accounts: newAccounts
            }
        };

        // 3. 寫入儲存
        if (this.isGuestMode) {
            console.log("[Guest] Block Appended:", newBlock);
            this.latestBlock = newBlock;
            this.mockChainCache.set(newBlock.id, newBlock); // Save to cache
            return newBlock;
        }

        try {
            // 不再在這裡保存，因為 blockchainTransactionService.saveTransaction 已經處理了
            console.log("📝 appendTransaction 已被 blockchainTransactionService.saveTransaction 取代");
            console.log("💾 交易已通過新的每日交易檔案格式保存");
            
            // 只更新內存狀態，不創建檔案
            this.latestBlock = newBlock;
            console.log("✅ 內存狀態已更新");
            
            return newBlock;
        } catch (error) {
            console.error("Failed to upload block:", error instanceof Error ? error.message : error);
            throw error;
        }
    }

    // 上傳單一區塊到 Drive
    private async uploadBlockToDrive(block: Transaction): Promise<void> {
        // 獲取 QuickBook Data 資料夾
        const folderResponse = await gapi.client.drive.files.list({
            q: "name='QuickBook Data' and mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields: 'files(id, name)'
        });

        const folders = folderResponse.result.files || [];
        if (folders.length === 0) {
            throw new Error("QuickBook Data 資料夾不存在");
        }

        const folderId = folders[0].id!;
        console.log("💾 上傳區塊到 QuickBook Data 資料夾:", folderId);

        // Explicitly get the token from GAPI
        // @ts-ignore
        const tokenObj = gapi.client.getToken();
        if (!tokenObj || !tokenObj.access_token) {
            throw new Error("No access token available. Please sign in again.");
        }
        const accessToken = tokenObj.access_token;

        const metadata = {
            name: `tx_${block.timestamp}_${block.id}.json`,
            parents: [folderId], // 指定保存到 QuickBook Data 資料夾
            properties: {
                type: 'transaction_block',
                prev_id: block.prev_id || 'genesis'
            }
        };

        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(block, null, 2) +
            close_delim;

        try {
            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': `multipart/related; boundary="${boundary}"`
                },
                body: multipartRequestBody
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("Include Upload Error Details:", errorData);
                throw new Error(errorData.error?.message || `Upload failed with status ${response.status}`);
            }

            const result = await response.json();
            console.log("Block uploaded to Drive:", result.id);
        } catch (error) {
            console.error("Fetch Upload Error:", error);
            throw error;
        }
    }

    // 搜尋現有的資料檔案 - 在 Google Drive 根目錄
    private async searchDataFileInRoot(): Promise<gapi.client.drive.File[]> {
        // 直接在根目錄搜尋資料檔案
        const query = `name='${GOOGLE_CONFIG.DATA_FILE_NAME}' and trashed=false`;
        const response = await gapi.client.drive.files.list({
            q: query,
            fields: 'files(id, name, createdTime, modifiedTime)'
        });
        const files = response.result.files || [];
        if (files.length > 0) {
            console.log("Found existing data file:", files[0].name);
        }
        return files;
    }

    // -------------------------------------------------------------
    // Settings Management - 使用新的 userSettingsService
    // -------------------------------------------------------------

    async getSettings(): Promise<UserSettings> {
        return await userSettingsService.getSettings() || await userSettingsService.initialize();
    }

    async saveSettings(settings: UserSettings): Promise<void> {
        await userSettingsService.updateSettings(settings);
    }

    // 5. 獲取分類使用頻率
    async getCategoryUsage(type: 'expense' | 'income'): Promise<Map<string, number>> {
        const history = await this.getHistory(100);
        const usage = new Map<string, number>();

        history.forEach(tx => {
            if (tx.type === type) {
                const cat = tx.payload.category;
                usage.set(cat, (usage.get(cat) || 0) + 1);
            }
        });

        return usage;
    }


    // 獲取當前快照
    getCurrentSnapshot(): { totalAssets: Record<string, number>, accounts: Record<string, Record<string, number>> } {
        return this.latestBlock?.snapshot || { totalAssets: {}, accounts: {} };
    }

    // 獲取帳戶餘額
    getAccountBalances(): Record<string, Record<string, number>> {
        return this.latestBlock?.snapshot.accounts || {};
    }

    // ==========================================
    // Legacy / Compatibility Methods (To fix Build)
    // ==========================================

    // 模擬讀取舊版資料
    async readAccountingData(): Promise<AccountingData> {
        return {
            version: "1.0",
            lastModified: new Date().toISOString(),
            data: {
                transactions: [],
                categories: [],
                settings: {}
            }
        };
    }

    // 模擬儲存舊版資料
    async saveAccountingData(data: AccountingData): Promise<void> {
        console.log("Legacy save called (Ignored due to Blockchain migration)", data);
    }

    // 模擬同步
    async syncData(): Promise<AccountingData> {
        return this.readAccountingData();
    }
}

export const simpleDriveService = new SimpleDriveService();
