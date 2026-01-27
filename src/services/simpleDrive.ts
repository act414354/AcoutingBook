/// <reference types="gapi.client.drive-v3" />
import { gapi } from 'gapi-script';

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

export interface UserSettings {
    categories: {
        expense: string[];
        income: string[];
    };
    accounts: {
        id: string;
        name: string;
        type: 'cash' | 'bank' | 'credit';
        balance: number;
    }[];
    modules: {
        invest: boolean; // Keeping for backward compatibility if needed, or mapped to Stocks
        budget: boolean;
        splitwise: boolean;
        family: boolean;
        fund: boolean;
        futures: boolean;
        tw_stock: boolean;
        us_stock: boolean;
        crypto: boolean;
        metal: boolean;
        real_estate: boolean;
    };
    homeWidgets: {
        asset_card: boolean;
        t_plus_two: boolean;
        transactions: boolean;
    };
    // Future settings can go here
}

const DEFAULT_SETTINGS: UserSettings = {
    categories: {
        expense: ['Food', 'Transport', 'Housing', 'Entertainment', 'Education', 'Health', 'Other'],
        income: ['Salary', 'Bonus', 'Investment', 'Other']
    },
    accounts: [
        { id: 'acc_cash', name: 'Cash', type: 'cash', balance: 0 },
        { id: 'acc_bank', name: 'Bank', type: 'bank', balance: 0 }
    ],
    modules: {
        invest: false, // Legacy, disabled by default
        budget: false, // Hidden by default per new request
        splitwise: true, // Visible by default
        family: false,
        fund: false,
        futures: false,
        tw_stock: false,
        us_stock: false,
        crypto: false,
        metal: false,
        real_estate: false
    },
    homeWidgets: {
        asset_card: true,
        t_plus_two: true,
        transactions: true
    }
};

// 區塊鏈核心結構
export interface Transaction {
    id: string;
    timestamp: number;
    type: 'expense' | 'income' | 'transfer' | 'adjustment';
    prev_id: string | null; // 指向前一個區塊的 ID (Genesis Block 為 null)
    ref_original_id?: string; // For Adjustment Blocks
    payload: {
        amount: number;
        category: string;
        note: string;
        accountId: string; // New Account Field
        date?: number; // Optional override for transaction date
    };
    snapshot: {
        totalAssets: number; // 累計總資產
        accounts: Record<string, number>; // 個別帳戶餘額 { accountId: balance }
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

    // Settings Cache
    private cachedSettings: UserSettings | null = null;

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
                payload: { amount: 0, category: 'System', note: 'Guest Mode Start', accountId: 'acc_cash' },
                snapshot: {
                    totalAssets: 0,
                    accounts: { 'acc_cash': 0, 'acc_bank': 0 }
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

    // 1. 同步最新的區塊 (Mock: 在真實 Drive 環境應搜尋 lastModified 最新的 JSON)
    async syncLatestBlock(): Promise<Transaction | null> {
        if (this.isGuestMode) return this.latestBlock;

        // TODO: searchDriveFiles ordered by createdTime desc limit 1
        console.log("Syncing latest block from Drive...");
        // 此處暫時返回 null (代表新帳本)，後續實作真實搜尋
        return null;
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
            if (this.isGuestMode) {
                currentBlock = this.mockChainCache.get(currentBlock.prev_id || '') || null;
            } else {
                // Real implementation would fetch from Drive
                break;
            }
        }

        return history;
    }

    // 3. 修改交易 (Shadow Correction)
    async editTransaction(originalTx: Transaction, newPayload: Transaction['payload']): Promise<Transaction> {
        // Calculate Diff (New - Old) for correct Asset Snapshot
        const snapshot = this.latestBlock?.snapshot || { totalAssets: 0, accounts: {} };
        const lastSnapshot = snapshot.totalAssets || 0;
        const lastAccounts = snapshot.accounts || {};

        const oldAmountSigned = originalTx.type === 'expense' ? -Math.abs(originalTx.payload.amount) : Math.abs(originalTx.payload.amount);
        const newAmountSigned = originalTx.type === 'expense' ? -Math.abs(newPayload.amount) : Math.abs(newPayload.amount);

        const diff = newAmountSigned - oldAmountSigned;
        const newTotalAssets = lastSnapshot + diff;

        // Account Balance Adjustments
        // NOTE: If account changed, we revert old account and apply to new account
        const oldAccountId = originalTx.payload.accountId || 'acc_cash'; // fallback
        const newAccountId = newPayload.accountId;

        const newAccounts = { ...lastAccounts };

        if (oldAccountId === newAccountId) {
            // Same account, just diff
            newAccounts[newAccountId] = (newAccounts[newAccountId] || 0) + diff;
        } else {
            // Revert old
            newAccounts[oldAccountId] = (newAccounts[oldAccountId] || 0) - oldAmountSigned;
            // Apply new
            newAccounts[newAccountId] = (newAccounts[newAccountId] || 0) + newAmountSigned;
        }

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

        // Save
        if (this.isGuestMode) {
            console.log("[Guest] Edited (Adjustment):", adjustmentBlock);
            this.latestBlock = adjustmentBlock;
            this.mockChainCache.set(adjustmentBlock.id, adjustmentBlock);
            return adjustmentBlock;
        }

        // Real Drive Upload
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
        accountId: string = 'acc_cash' // Default
    ): Promise<Transaction> {

        // 1. 準備上一筆資料 (Snapshot & ID)
        const prevBlock = this.latestBlock;
        const prevSnapshot = prevBlock ? prevBlock.snapshot : { totalAssets: 0, accounts: {} };
        const currentAssets = prevSnapshot.totalAssets;
        const currentAccounts = prevSnapshot.accounts || {};

        const changeAmount = (type === 'expense' ? -Math.abs(amount) : Math.abs(amount));
        const newAssets = currentAssets + changeAmount;

        // Update Account Balance
        const newAccounts = { ...currentAccounts };
        newAccounts[accountId] = (newAccounts[accountId] || 0) + changeAmount;

        // 2. 建立新區塊
        const newBlock: Transaction = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            type,
            prev_id: prevBlock ? prevBlock.id : null,
            payload: {
                amount,
                category,
                note,
                accountId
            },
            snapshot: {
                totalAssets: newAssets,
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
            await this.uploadBlockToDrive(newBlock);
            this.latestBlock = newBlock;
            // Legacy sync side-effect (read file id if exists)
            try {
                const folderId = await this.ensureAppFolder();
                await this.searchDataFile(folderId);
            } catch (e) { console.warn("Legacy search failed", e); }

            return newBlock;
        } catch (error) {
            console.error("Failed to upload block:", error);
            throw error;
        }
    }

    // 上傳單一區塊到 Drive
    private async uploadBlockToDrive(block: Transaction): Promise<void> {
        const folderId = await this.ensureAppFolder();

        const metadata = {
            name: `tx_${block.timestamp}_${block.id}.json`,
            parents: [folderId],
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

        const request = gapi.client.request({
            path: '/upload/drive/v3/files',
            method: 'POST',
            params: { 'uploadType': 'multipart' },
            headers: {
                'Content-Type': 'multipart/related; boundary="' + boundary + '"'
            },
            body: multipartRequestBody
        });

        return new Promise((resolve, reject) => {
            request.execute((file: any) => {
                if (file.error) {
                    reject(file.error);
                } else {
                    console.log("Block uploaded to Drive:", file.id);
                    resolve(file);
                }
            });
        });
    }

    // 確保 App 資料夾存在
    private async ensureAppFolder(): Promise<string> {
        const query = "mimeType='application/vnd.google-apps.folder' and name='QuickBook' and trashed=false";
        const response = await gapi.client.drive.files.list({
            q: query,
            fields: 'files(id, name)'
        });

        const files = response.result.files || [];
        if (files.length > 0) {
            return files[0].id!;
        }

        const metadata = {
            name: 'QuickBook',
            mimeType: 'application/vnd.google-apps.folder'
        };

        const createRes = await gapi.client.drive.files.create({
            resource: metadata,
            fields: 'id'
        });

        return createRes.result.id!;
    }

    // 搜尋現有的資料檔案
    private async searchDataFile(folderId: string): Promise<gapi.client.drive.File[]> {
        // Updated to not filter strictly by exact name, but keeping compatibility
        const query = `name='${GOOGLE_CONFIG.DATA_FILE_NAME}' and '${folderId}' in parents and trashed=false`;
        const response = await gapi.client.drive.files.list({
            q: query,
            fields: 'files(id, name, createdTime, modifiedTime)'
        });
        const files = response.result.files || [];
        if (files.length > 0) {
            // this.dataFileId = files[0].id!;
        }
        return files;
    }

    // -------------------------------------------------------------
    // Settings Management
    // -------------------------------------------------------------

    async getSettings(): Promise<UserSettings> {
        if (this.cachedSettings) return this.cachedSettings;

        if (this.isGuestMode) {
            // Guest Mode: Return defaults or cached
            this.cachedSettings = DEFAULT_SETTINGS;
            return this.cachedSettings;
        }

        // Real Drive: Try to load 'user_config.json'
        // For now, allow fallback to defaults if not found
        // TODO: Implement actual Drive File Read for settings
        console.log("Loading settings from Drive... (Mocking fallback)");
        this.cachedSettings = DEFAULT_SETTINGS;
        return this.cachedSettings;
    }

    async saveSettings(settings: UserSettings): Promise<void> {
        this.cachedSettings = settings;

        if (this.isGuestMode) {
            console.log("[Guest] Settings Saved:", settings);
            return;
        }

        // Real Drive: Upload 'user_config.json'
        console.log("Saving settings to Drive...", settings);
        // TODO: Implement actual Drive File Write
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
    getCurrentSnapshot(): { totalAssets: number, accounts: Record<string, number> } {
        return this.latestBlock?.snapshot || { totalAssets: 0, accounts: {} };
    }

    // 獲取帳戶餘額
    getAccountBalances(): Record<string, number> {
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
