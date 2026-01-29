# QuickBook UI/UX 設計規格書

## 專案概述

QuickBook 是一個簡潔高效的記帳應用程式，支援多帳戶管理、多幣別交易、證券交易等功能。本規格書詳細說明了應用程式的 UI/UX 設計原則、元件規範和互動設計。

## 設計原則

### 1. 簡潔直觀 (Simplicity & Intuition)
- 介面設計簡潔，避免不必要的裝飾元素
- 功能分組清晰，使用者能快速找到所需功能
- 使用直觀的圖標和文字標籤

### 2. 一致性 (Consistency)
- 色彩方案、字體、間距保持一致
- 互動模式統一，降低學習成本
- 元件設計規範化，確保視覺一致性

### 3. 響應式設計 (Responsive Design)
- 支援各種螢幕尺寸
- 觸控友好的按鈕和互動元素
- 適配行動裝置和桌面裝置

### 4. 無障礙設計 (Accessibility)
- 足夠的色彩對比度
- 清晰的文字大小和字重
- 支援鍵盤導航

## 色彩系統

### 主色調 (Primary Colors)
```css
--primary-blue: #3B82F6
--primary-cyan: #06B6D4
--primary-green: #10B981
```

### 背景色 (Background Colors)
```css
--bg-primary: #1F2937
--bg-secondary: #111827
--bg-tertiary: #374151
--bg-card: #1F2937
```

### 文字色 (Text Colors)
```css
--text-primary: #FFFFFF
--text-secondary: #D1D5DB
--text-tertiary: #9CA3AF
--text-muted: #6B7280
```

### 狀態色 (Status Colors)
```css
--success: #10B981
--warning: #F59E0B
--error: #EF4444
--info: #3B82F6
```

### 帳戶類型色彩
```css
--cash: #10B981 (綠色)
--bank: #3B82F6 (藍色)
--credit: #8B5CF6 (紫色)
--ewallet: #F97316 (橙色)
--securities: #06B6D4 (青色)
--exchange: #EF4444 (紅色)
```

## 字體系統

### 字體族
```css
--font-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif
--font-mono: 'SF Mono', 'Monaco', 'Inconsolata', monospace
```

### 字體大小
```css
--text-xs: 0.75rem (12px)
--text-sm: 0.875rem (14px)
--text-base: 1rem (16px)
--text-lg: 1.125rem (18px)
--text-xl: 1.25rem (20px)
--text-2xl: 1.5rem (24px)
--text-3xl: 1.875rem (30px)
```

### 字重
```css
--font-normal: 400
--font-medium: 500
--font-semibold: 600
--font-bold: 700
```

## 間距系統

```css
--space-1: 0.25rem (4px)
--space-2: 0.5rem (8px)
--space-3: 0.75rem (12px)
--space-4: 1rem (16px)
--space-6: 1.5rem (24px)
--space-8: 2rem (32px)
--space-12: 3rem (48px)
--space-16: 4rem (64px)
```

## 元件設計規範

### 1. 按鈕 (Buttons)

#### 主要按鈕
```css
.btn-primary {
  background: linear-gradient(135deg, var(--primary-blue), var(--primary-cyan));
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(59, 130, 246, 0.3);
}
```

#### 次要按鈕
```css
.btn-secondary {
  background: rgba(59, 130, 246, 0.1);
  color: var(--primary-blue);
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: rgba(59, 130, 246, 0.2);
}
```

#### 圖標按鈕
```css
.btn-icon {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  transform: scale(1.1);
}
```

### 2. 卡片 (Cards)

```css
.card {
  background: var(--bg-card);
  border: 1px solid rgba(107, 114, 128, 0.5);
  border-radius: 0.75rem;
  padding: 1rem;
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
}

.card:hover {
  border-color: rgba(59, 130, 246, 0.3);
  transform: translateY(-2px);
}
```

### 3. 輸入框 (Input Fields)

```css
.input {
  background: var(--bg-tertiary);
  border: 2px solid transparent;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  color: var(--text-primary);
  transition: all 0.2s ease;
}

.input:focus {
  border-color: var(--primary-blue);
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
```

### 4. 帳戶圖標 (Account Icons)

每種帳戶類型都有專屬的圖標和顏色：

#### 現金 (Cash)
- 圖標：錢包圖標
- 顏色：綠色 (#10B981)
- 背景：rgba(16, 185, 129, 0.1)

#### 銀行 (Bank)
- 圖標：銀行建築圖標
- 顏色：藍色 (#3B82F6)
- 背景：rgba(59, 130, 246, 0.1)

#### 信用卡 (Credit)
- 圖標：信用卡圖標
- 顏色：紫色 (#8B5CF6)
- 背景：rgba(139, 92, 246, 0.1)

#### 電子錢包 (E-Wallet)
- 圖標：手機圖標
- 顏色：橙色 (#F97316)
- 背景：rgba(249, 115, 22, 0.1)

#### 證券帳戶 (Securities)
- 圖標：圖表圖標
- 顏色：青色 (#06B6D4)
- 背景：rgba(6, 182, 212, 0.1)

#### 交易所 (Exchange)
- 圖標：交換圖標
- 顏色：紅色 (#EF4444)
- 背景：rgba(239, 68, 68, 0.1)

## 互動設計

### 1. 微互動 (Micro-interactions)

#### 按鈕點擊
```css
.btn:active {
  transform: scale(0.95);
}
```

#### 拖拽效果
```css
.draggable {
  cursor: move;
  transition: all 0.2s ease;
}

.draggable:hover {
  transform: scale(1.02);
}

.drag-over {
  border-color: var(--primary-blue);
  background: rgba(59, 130, 246, 0.1);
}
```

#### 載入動畫
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.loading {
  animation: pulse 2s infinite;
}
```

### 2. 狀態回饋

#### 成功狀態
- 綠色勾選圖標
- 成功訊息提示
- 輕微的綠色光暈效果

#### 錯誤狀態
- 紅色警告圖標
- 錯誤訊息提示
- 輕微的紅色邊框

#### 載入狀態
- 旋轉載入圖標
- 脈衝動畫效果
- 半透明遮罩

## 頁面佈局

### 1. 儀表板 (Dashboard)
- 頂部：總資產顯示
- 中部：快速操作按鈕
- 底部：最近交易列表

### 2. 記帳頁面 (Record)
- 頂部：交易類型選擇器
- 中部：交易表單
- 浮動：新增交易按鈕

### 3. 帳戶設定 (Account Settings)
- 頂部：標題和操作按鈕
- 中部：新增帳戶表單（可展開）
- 底部：帳戶列表（支援拖拽排序）

### 4. 統計頁面 (Statistics)
- 頂部：時間範圍選擇器
- 中部：圖表區域
- 底部：詳細數據表格

## 響應式設計

### 斷點設定
```css
--breakpoint-sm: 640px
--breakpoint-md: 768px
--breakpoint-lg: 1024px
--breakpoint-xl: 1280px
```

### 行動裝置 (< 768px)
- 單欄佈局
- 底部導航
- 觸控友好的按鈕尺寸 (最小 44px)

### 桌面裝置 (≥ 768px)
- 多欄佈局
- 側邊導航
- 滑鼠懸停效果

## 無障礙設計

### 1. 色彩對比度
- 所有文字與背景的對比度至少 4.5:1
- 大文字與背景的對比度至少 3:1

### 2. 鍵盤導航
- 所有互動元素支援 Tab 鍵導航
- 清晰的焦點指示器
- 合理的 Tab 順序

### 3. 螢幕閱讀器支援
- 語義化 HTML 標籤
- 適當的 ARIA 標籤
- 圖標的替代文字

## 動畫與過渡

### 1. 頁面轉場
```css
.page-transition {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 2. 元件動畫
```css
.slide-up {
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 3. 載入動畫
```css
.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

## 最新更新 (2025-01-28)

### 新增功能

#### 1. 帳戶管理優化
- **編輯模式切換**：新增「編輯帳戶/檢視模式」按鈕
- **拖拽排序**：編輯模式下支援帳戶拖拽重新排序
- **雙按鈕設計**：獨立的編輯模式和新增帳戶按鈕

#### 2. 表單優化
- **欄位重排序**：帳戶類型 → 帳戶名稱 → 初始資金
- **移除 placeholder**：輸入框不再顯示灰色提示文字
- **預設值顯示**：初始資金預設顯示 0

#### 3. 證券帳戶功能
- **手續費折扣**：支援自訂手續費折扣 (1 = 100%, 0.5 = 50%)
- **最低手續費**：設定最低手續費金額
- **費用計算**：動態顯示總交易費率

#### 4. 多語言支援
- **完整中英文**：所有介面文字支援中英文切換
- **動態翻譯**：即時更新語言顯示
- **本地化儲存**：記住使用者語言偏好

### 設計改進

#### 1. 視覺優化
- **拖拽指示器**：編輯模式下顯示三條橫線圖標
- **高亮效果**：拖拽目標位置藍色高亮
- **平滑動畫**：所有互動都有過渡效果

#### 2. 互動體驗
- **模式切換**：清晰的編輯/檢視模式狀態
- **即時儲存**：排序後自動儲存到 Google Drive
- **確認對話框**：刪除操作需要確認

#### 3. 響應式改進
- **觸控優化**：按鈕尺寸適合觸控操作
- **移動端適配**：拖拽功能在手機上正常運作
- **平板支援**：中等螢幕尺寸的最佳化

## 技術規格

### 1. 框架與工具
- **前端框架**：React 18 + TypeScript
- **樣式系統**：TailwindCSS
- **圖標系統**：Heroicons
- **國際化**：react-i18next
- **狀態管理**：React Hooks

### 2. 瀏覽器支援
- **Chrome**：90+
- **Firefox**：88+
- **Safari**：14+
- **Edge**：90+

### 3. 效能要求
- **首次載入**：< 2 秒
- **頁面轉換**：< 300ms
- **互動回應**：< 100ms

## 測試規範

### 1. 視覺回歸測試
- 所有頁面截圖對比
- 響應式佈局檢查
- 色彩對比度驗證

### 2. 互動測試
- 拖拽功能測試
- 表單驗證測試
- 鍵盤導航測試

### 3. 無障礙測試
- 螢幕閱讀器測試
- 鍵盤操作測試
- 色彩對比度測試

## 未來規劃

### 1. 功能擴展
- 預算管理功能
- 投資組合分析
- 自動分類標籤
- 雲端同步備份

### 2. 設計優化
- 深色模式優化
- 自定義主題色彩
- 動態圖表動畫
- 手勢操作支援

### 3. 效能提升
- 圖片懶載入
- 虛擬滾動
- 離線快取
- PWA 支援

---

**文件版本**：1.0  
**最後更新**：2025-01-28  
**設計師**：Cascade AI Assistant  
**審核狀態**：待審核
