import { gapi } from 'gapi-script';
import initSettingTemplate from '../data/init_setting.json';

export interface UserSettings {
  version: string;
  lastUpdated: string | null;
  userId: string | null;
  preferences: {
    language: string;
    theme: string;
    currency: {
      default: string;
      displayCurrency: string;
    };
    dateFormat: string;
    timeFormat: string;
    customCurrencies: string[];
  };
  modules: Record<string, boolean>;
  homeWidgets: {
    assetCard: boolean;
    tPlusTwo: boolean;
    transactions: boolean;
  };
  accounts: Array<{
    id: string;
    name: string;
    type: string;
    currency?: string;
    properties?: any;
    deleted?: boolean;
    initialBalance?: number;
    createdAt?: string;
  }>;
  categories: {
    income: Array<{ id: string; name: string; color: string }>;
    expense: Array<{ id: string; name: string; color: string }>;
  };
  ui: {
    compactMode: boolean;
    showAnimations: boolean;
    autoBackup: boolean;
  };
}

class UserSettingsService {
  private static instance: UserSettingsService;
  private settings: UserSettings | null = null;
  private readonly SETTINGS_FILE_NAME = 'user_setting.json';
  private readonly MAX_ACCOUNTS = 1000; // 帳戶數量限制

  private constructor() {}

  static getInstance(): UserSettingsService {
    if (!UserSettingsService.instance) {
      UserSettingsService.instance = new UserSettingsService();
    }
    return UserSettingsService.instance;
  }

  // 驗證帳戶數量是否超過限制
  validateAccountCount(accounts: any[]): boolean {
    if (accounts.length > this.MAX_ACCOUNTS) {
      console.warn(`❌ 帳戶數量超過限制 (${accounts.length}/${this.MAX_ACCOUNTS})`);
      return false;
    }
    return true;
  }

  // 檢查是否可以添加新帳戶
  canAddAccount(currentAccounts: any[]): boolean {
    return currentAccounts.length < this.MAX_ACCOUNTS;
  }

  // 初始化設定 - 從 Google Drive 載入，如果沒有則自動創建
  async initialize(userId?: string, autoSave: boolean = true): Promise<UserSettings> {
    try {
      console.log('🔍 從 Google Drive 載入或創建用戶設定...');
      
      // 嘗試從 Google Drive 載入設定檔
      const settings = await this.loadFromDrive();
      
      if (settings) {
        // 找到現有設定檔
        console.log('✅ 找到現有設定檔');
        
        // 如果有 userId，檢查是否匹配
        if (userId && settings.userId && settings.userId !== userId) {
          // 不同用戶，重新初始化
          console.log('👤 不同用戶檢測到，創建新設定');
          return this.createDefaultSettings(userId, autoSave);
        }
        
        // 合併預設設定（處理版本升級）
        this.settings = this.mergeWithDefaults(settings);
        
        // 更新 userId 和時間戳
        if (userId) {
          this.settings.userId = userId;
        }
        this.settings.lastUpdated = new Date().toISOString();
        
        // 可選是否自動保存
        if (autoSave) {
          await this.saveToDrive();
        }
        return this.settings;
      } else {
        // 沒有找到設定檔，這是新用戶，自動創建預設設定
        console.log('🆕 新用戶檢測到，自動創建預設設定');
        return this.createDefaultSettings(userId, autoSave);
      }
    } catch (error) {
      console.error('❌ 初始化用戶設定失敗:', error);
      return this.createDefaultSettings(userId, autoSave);
    }
  }

  // 創建預設設定 - 基於 init_setting.json
  private createDefaultSettings(userId?: string, autoSave: boolean = true): UserSettings {
    console.log('🎨 創建預設設定...');
    
    const defaultSettings = JSON.parse(JSON.stringify(initSettingTemplate)) as UserSettings;
    this.settings = defaultSettings;
    
    if (userId) {
      this.settings.userId = userId;
    }
    this.settings.lastUpdated = new Date().toISOString();
    
    // 設置語言偏好（基於瀏覽器語言）
    const browserLang = navigator.language || 'zh-TW';
    if (browserLang.includes('en')) {
      this.settings.preferences.language = 'en';
    } else if (browserLang.includes('ja')) {
      this.settings.preferences.language = 'ja';
    } else if (browserLang.includes('ko')) {
      this.settings.preferences.language = 'ko';
    } else if (browserLang.includes('de')) {
      this.settings.preferences.language = 'de';
    } else {
      this.settings.preferences.language = 'zh-TW';
    }
    
    // 設置貨幣偏好（基於瀏覽器語言）
    if (browserLang.includes('en')) {
      this.settings.preferences.currency.default = 'USD';
      this.settings.preferences.currency.displayCurrency = 'USD';
    } else if (browserLang.includes('ja')) {
      this.settings.preferences.currency.default = 'JPY';
      this.settings.preferences.currency.displayCurrency = 'JPY';
    } else if (browserLang.includes('ko')) {
      this.settings.preferences.currency.default = 'KRW';
      this.settings.preferences.currency.displayCurrency = 'KRW';
    } else if (browserLang.includes('de')) {
      this.settings.preferences.currency.default = 'EUR';
      this.settings.preferences.currency.displayCurrency = 'EUR';
    }
    
    // 可選是否自動保存
    if (autoSave) {
      console.log('💾 自動保存新用戶設定到 Google Drive QuickBook Data 資料夾...');
      this.saveToDrive().catch(error => {
        console.error('❌ 保存新用戶設定失敗:', error);
      });
    } else {
      console.log('📝 設定已創建，但不自動保存');
    }
    
    console.log('✅ 預設設定創建完成:', this.settings);
    return this.settings!;
  }

  // 從 Google Drive 載入設定檔 - 從 QuickBook Data 資料夾
  private async loadFromDrive(): Promise<UserSettings | null> {
    try {
      console.log('🔍 從 QuickBook Data 資料夾載入設定檔...');
      
      // 先獲取 QuickBook Data 資料夾 ID
      const folderResponse = await gapi.client.drive.files.list({
        q: "name='QuickBook Data' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id, name)'
      });

      const folders = folderResponse.result.files;
      if (!folders || folders.length === 0) {
        console.log('📁 QuickBook Data 資料夾不存在');
        return null;
      }

      const folderId = folders[0].id!;
      console.log('📁 QuickBook Data 資料夾 ID:', folderId);
      
      // 在資料夾中搜尋檔案
      const response = await gapi.client.drive.files.list({
        q: `name='${this.SETTINGS_FILE_NAME}' and '${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, modifiedTime)'
      });

      const files = response.result.files;
      console.log('📁 找到的檔案:', files);
      
      if (files && files.length > 0) {
        const fileId = files[0].id!;
        console.log('📥 下載檔案 ID:', fileId);
        
        // 下載檔案內容
        const downloadResponse = await gapi.client.drive.files.get({
          fileId: fileId,
          alt: 'media'
        });
        
        const settingsData = downloadResponse.result as UserSettings;
        console.log('✅ 成功載入設定:', settingsData);
        return settingsData;
      } else {
        console.log('📁 QuickBook Data 資料夾中沒有找到 user_setting.json 檔案');
      }
      
      return null;
    } catch (error) {
      console.error('❌ 從 Google Drive 載入設定失敗:', error);
      return null;
    }
  }

  // 保存設定檔到 Google Drive QuickBook Data 資料夾
  async saveToDrive(): Promise<void> {
    if (!this.settings) return;
    
    try {
      console.log('💾 保存設定檔到 Google Drive QuickBook Data 資料夾...');
      
      // 先獲取 QuickBook Data 資料夾 ID
      const folderResponse = await gapi.client.drive.files.list({
        q: "name='QuickBook Data' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id, name)'
      });

      const folders = folderResponse.result.files;
      if (!folders || folders.length === 0) {
        console.log('📁 QuickBook Data 資料夾不存在，直接創建新檔案');
        const appFolderId = await this.getQuickBookDataFolder();
        const settingsJson = JSON.stringify(this.settings, null, 2);
        
        // 使用 multipart upload 方法
        await this.uploadFileWithMultipart(this.SETTINGS_FILE_NAME, appFolderId, settingsJson);
        console.log('✅ 新檔案創建成功');
        return;
      }

      const folderId = folders[0].id!;
      
      // 檢查資料夾中是否已存在檔案
      const listResponse = await gapi.client.drive.files.list({
        q: `name='${this.SETTINGS_FILE_NAME}' and '${folderId}' in parents and trashed=false`,
        fields: 'files(id, name)'
      });

      const files = listResponse.result.files;
      const settingsJson = JSON.stringify(this.settings, null, 2);
      
      if (files && files.length > 0) {
        // 更新現有檔案 - 使用 multipart
        const fileId = files[0].id!;
        console.log('🔄 更新現有檔案:', fileId);
        
        await this.updateFileWithMultipart(fileId, settingsJson);
        console.log('✅ 檔案更新成功');
      } else {
        // 創建新檔案 - 使用 multipart
        console.log('🆕 創建新檔案在 QuickBook Data 資料夾中...');
        
        await this.uploadFileWithMultipart(this.SETTINGS_FILE_NAME, folderId, settingsJson);
        console.log('✅ 新檔案創建成功（位於 QuickBook Data 資料夾）');
      }
      
      console.log('🎉 設定已成功保存到 Google Drive');
    } catch (error) {
      console.error('❌ 保存設定到 Google Drive 失敗:', error);
      throw error;
    }
  }

  // 使用 multipart 上傳檔案
  private async uploadFileWithMultipart(fileName: string, folderId: string, content: string): Promise<any> {
    const metadata = {
      name: fileName,
      parents: [folderId],
      mimeType: 'application/json'
    };
    
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([content], { type: 'application/json' }));
    
    const token = gapi.auth.getToken().access_token;
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: form
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    return await response.json();
  }

  // 使用 multipart 更新檔案
  private async updateFileWithMultipart(fileId: string, content: string): Promise<any> {
    const metadata = {
      mimeType: 'application/json'
    };
    
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([content], { type: 'application/json' }));
    
    const token = gapi.auth.getToken().access_token;
    const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: form
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Update failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    return await response.json();
  }

  // 獲取 QuickBook Data 資料夾 ID
  private async getQuickBookDataFolder(): Promise<string> {
    try {
      const response = await gapi.client.drive.files.list({
        q: "name='QuickBook Data' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id, name)'
      });

      const folders = response.result.files;
      if (folders && folders.length > 0) {
        return folders[0].id!;
      } else {
        // 創建 QuickBook Data 資料夾
        console.log('📁 創建 QuickBook Data 資料夾...');
        const createResponse = await gapi.client.drive.files.create({
          resource: {
            name: 'QuickBook Data',
            mimeType: 'application/vnd.google-apps.folder'
          }
        });
        console.log('✅ QuickBook Data 資料夾創建成功:', createResponse.result.id);
        return createResponse.result.id!;
      }
    } catch (error) {
      console.error('❌ 獲取/創建 QuickBook Data 資料夾失敗:', error);
      throw error;
    }
  }

  // 合併預設設定
  private mergeWithDefaults(current: UserSettings): UserSettings {
    const defaults = JSON.parse(JSON.stringify(initSettingTemplate)) as UserSettings;
    
    // 深度合併，保留用戶自定義的設定
    const merged = {
      ...defaults,
      ...current,
      preferences: {
        ...defaults.preferences,
        ...current.preferences,
        currency: {
          ...defaults.preferences.currency,
          ...current.preferences.currency
        }
      },
      modules: {
        ...defaults.modules,
        ...current.modules
      },
      homeWidgets: {
        ...defaults.homeWidgets,
        ...current.homeWidgets
      },
      categories: {
        ...defaults.categories,
        ...current.categories
      },
      ui: {
        ...defaults.ui,
        ...current.ui
      }
    };
    
    return merged;
  }

  // 獲取設定
  getSettings(): UserSettings | null {
    return this.settings;
  }

  // 設定設定 (用於從 Google Drive 載入現有設定)
  async setSettings(settings: UserSettings, autoSave: boolean = true): Promise<void> {
    this.settings = settings;
    // 可選是否自動保存到 Google Drive
    if (autoSave) {
      // 使用 Promise.resolve() 讓保存異步執行，不阻塞
      Promise.resolve().then(() => this.saveToDrive()).catch(error => {
        console.error('❌ 背景保存失敗:', error);
      });
    }
  }

  // 清除設定
  async clear(): Promise<void> {
    this.settings = null;
  }

  // 更新設定
  async updateSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
    if (!this.settings) {
      throw new Error('Settings not initialized');
    }

    // 深度合併更新
    this.settings = this.deepMerge(this.settings!, updates);
    this.settings!.lastUpdated = new Date().toISOString();
    
    await this.saveToDrive();
    return this.settings!;
  }

  // 深度合併對象
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  // 重置為預設值
  async reset(userId?: string): Promise<UserSettings> {
    await this.clear();
    return this.createDefaultSettings(userId);
  }

  // 導出設定
  exportSettings(): string {
    if (!this.settings) {
      throw new Error('No settings to export');
    }
    return JSON.stringify(this.settings, null, 2);
  }

  // 導入設定
  async importSettings(settingsJson: string): Promise<UserSettings> {
    try {
      const imported = JSON.parse(settingsJson) as UserSettings;
      
      // 驗證設定格式
      if (!this.validateSettings(imported)) {
        throw new Error('Invalid settings format');
      }
      
      this.settings = this.mergeWithDefaults(imported);
      if (this.settings) {
        this.settings.lastUpdated = new Date().toISOString();
      }
      
      await this.saveToDrive();
      return this.settings!;
    } catch (error) {
      console.error('Failed to import settings:', error);
      throw error;
    }
  }

  // 驗證設定格式
  private validateSettings(settings: any): boolean {
    try {
      // 基本結構驗證
      const requiredKeys = ['version', 'preferences', 'modules', 'categories'];
      for (const key of requiredKeys) {
        if (!(key in settings)) {
          return false;
        }
      }
      
      // 檢查必要欄位
      if (!settings.preferences || !settings.preferences.language) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }
}

export const userSettingsService = UserSettingsService.getInstance();
