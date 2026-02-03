import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import zhTW from './locales/zh-TW.json';
import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import ru from './locales/ru.json';
import pt from './locales/pt.json';

const resources = {
    'zh-TW': { translation: zhTW },
    'en': { translation: en },
    'zh-CN': { translation: zhCN },
    'ja': { translation: ja },
    'ko': { translation: ko },
    'es': { translation: es },
    'fr': { translation: fr },
    'de': { translation: de },
    'ru': { translation: ru },
    'pt': { translation: pt },
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'zh-TW', // Default to Traditional Chinese
        interpolation: {
            escapeValue: false, // React already safes from xss
        },
        // 移除 localStorage 檢測，語言設定將完全由用戶設定檔控制
        detection: {
            order: ['navigator', 'htmlTag'],
            caches: [], // 不緩存到 localStorage
        },
    });

export default i18n;
