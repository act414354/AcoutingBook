import i18n from '../i18n';
import { userSettingsService } from './userSettingsService';
import type { UserSettings } from './userSettingsService';

class LanguageService {
    private static instance: LanguageService;
    private isInitialized = false;

    private constructor() {}

    static getInstance(): LanguageService {
        if (!LanguageService.instance) {
            LanguageService.instance = new LanguageService();
        }
        return LanguageService.instance;
    }

    // 初始化語言設定（從用戶設定檔讀取）
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            console.log('🌐 初始化語言設定...');
            
            // 獲取用戶設定
            const settings = await userSettingsService.getSettings();
            
            if (settings && settings.preferences && settings.preferences.language) {
                // 使用用戶設定檔中的語言
                const userLanguage = settings.preferences.language;
                console.log('🌐 從用戶設定檔載入語言:', userLanguage);
                await this.changeLanguage(userLanguage);
            } else {
                // 使用預設語言（瀏覽器語言或 zh-TW）
                const browserLanguage = this.getBrowserLanguage();
                console.log('🌐 使用瀏覽器語言:', browserLanguage);
                await this.changeLanguage(browserLanguage);
            }
            
            this.isInitialized = true;
            console.log('✅ 語言設定初始化完成');
        } catch (error) {
            console.error('❌ 語言設定初始化失敗:', error);
            // 失敗時使用預設語言
            await this.changeLanguage('zh-TW');
            this.isInitialized = true;
        }
    }

    // 變更語言並保存到用戶設定檔
    async changeLanguage(language: string): Promise<void> {
        try {
            console.log('🌐 變更語言:', language);
            
            // 變更 i18n 語言
            await i18n.changeLanguage(language);
            
            // 保存到用戶設定檔
            await this.saveLanguageToSettings(language);
            
            console.log('✅ 語言變更完成:', language);
        } catch (error) {
            console.error('❌ 語言變更失敗:', error);
        }
    }

    // 獲取當前語言
    getCurrentLanguage(): string {
        return i18n.language;
    }

    // 獲取支援的語言列表
    getSupportedLanguages(): Array<{ code: string; name: string; nativeName: string }> {
        return [
            { code: 'zh-TW', name: 'Traditional Chinese', nativeName: '繁體中文' },
            { code: 'zh-CN', name: 'Simplified Chinese', nativeName: '简体中文' },
            { code: 'en', name: 'English', nativeName: 'English' },
            { code: 'ja', name: 'Japanese', nativeName: '日本語' },
            { code: 'ko', name: 'Korean', nativeName: '한국어' },
            { code: 'es', name: 'Spanish', nativeName: 'Español' },
            { code: 'fr', name: 'French', nativeName: 'Français' },
            { code: 'de', name: 'German', nativeName: 'Deutsch' },
            { code: 'ru', name: 'Russian', nativeName: 'Русский' },
            { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
        ];
    }

    // 保存語言設定到用戶設定檔
    private async saveLanguageToSettings(language: string): Promise<void> {
        try {
            const settings = await userSettingsService.getSettings();
            
            if (settings) {
                // 更新語言設定
                await userSettingsService.updateSettings({
                    preferences: {
                        ...settings.preferences,
                        language: language
                    }
                });
                
                console.log('💾 語言設定已保存到 Google Drive');
            }
        } catch (error) {
            console.error('❌ 保存語言設定失敗:', error);
        }
    }

    // 獲取瀏覽器語言
    private getBrowserLanguage(): string {
        const browserLang = navigator.language || (navigator as any).userLanguage;
        
        // 映射瀏覽器語言到支援的語言
        const langMap: Record<string, string> = {
            'zh-TW': 'zh-TW',
            'zh-HK': 'zh-TW',
            'zh-MO': 'zh-TW',
            'zh-CN': 'zh-CN',
            'zh-SG': 'zh-CN',
            'en-US': 'en',
            'en-GB': 'en',
            'en-AU': 'en',
            'en-CA': 'en',
            'ja-JP': 'ja',
            'ko-KR': 'ko',
            'es-ES': 'es',
            'es-MX': 'es',
            'fr-FR': 'fr',
            'de-DE': 'de',
            'ru-RU': 'ru',
            'pt-BR': 'pt',
            'pt-PT': 'pt'
        };
        
        return langMap[browserLang] || 'zh-TW';
    }

    // 重置初始化狀態（用於登出時）
    reset(): void {
        this.isInitialized = false;
    }
}

export const languageService = LanguageService.getInstance();
