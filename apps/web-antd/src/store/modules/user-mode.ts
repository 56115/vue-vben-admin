import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/**
 * 用户模式类型
 * - PARENT: 家长模式（显示完整信息、统计数据、专业分析）
 * - CHILD: 孩子模式（显示引导提示、激励内容、简化界面）
 */
export type UserMode = 'PARENT' | 'CHILD';

/**
 * 用户模式配置
 */
interface UserModeConfig {
  mode: UserMode;
  // 功能开关
  showDetailedAnalysis: boolean; // 显示详细分析
  showStatistics: boolean; // 显示统计数据
  showAnswers: boolean; // 显示答案
  showSolutions: boolean; // 显示解析
  showEncouragement: boolean; // 显示鼓励语
  showGameElements: boolean; // 显示游戏化元素
  // UI 配置
  language: 'professional' | 'friendly'; // 语言风格
  complexity: 'simple' | 'detailed'; // 复杂度
}

/**
 * 预设模式配置
 */
const MODE_PRESETS: Record<UserMode, UserModeConfig> = {
  PARENT: {
    mode: 'PARENT',
    showDetailedAnalysis: true,
    showStatistics: true,
    showAnswers: true,
    showSolutions: true,
    showEncouragement: false,
    showGameElements: false,
    language: 'professional',
    complexity: 'detailed',
  },
  CHILD: {
    mode: 'CHILD',
    showDetailedAnalysis: false,
    showStatistics: false,
    showAnswers: false,
    showSolutions: false,
    showEncouragement: true,
    showGameElements: true,
    language: 'friendly',
    complexity: 'simple',
  },
};

const STORAGE_KEY = 'omnireach:user-mode';

/**
 * 用户模式 Store
 *
 * 管理家长/孩子模式切换，提供不同的内容展示策略
 */
export const useUserModeStore = defineStore('userMode', () => {
  // ==================== State ====================

  const currentMode = ref<UserMode>('PARENT');
  const config = ref<UserModeConfig>(MODE_PRESETS.PARENT);

  // ==================== Getters ====================

  const isParentMode = computed(() => currentMode.value === 'PARENT');
  const isChildMode = computed(() => currentMode.value === 'CHILD');

  const modeLabel = computed(() => {
    return currentMode.value === 'PARENT' ? '家长模式' : '孩子模式';
  });

  const modeDescription = computed(() => {
    return currentMode.value === 'PARENT'
      ? '显示完整分析和统计数据，适合家长查看'
      : '显示引导性提示和激励内容，适合孩子使用';
  });

  // ==================== Actions ====================

  /**
   * 切换用户模式
   */
  function switchMode(mode: UserMode) {
    currentMode.value = mode;
    config.value = { ...MODE_PRESETS[mode] };
    saveToStorage();

  }

  /**
   * 切换到家长模式
   */
  function switchToParentMode() {
    switchMode('PARENT');
  }

  /**
   * 切换到孩子模式
   */
  function switchToChildMode() {
    switchMode('CHILD');
  }

  /**
   * 切换模式（快捷方法）
   */
  function toggleMode() {
    const newMode = currentMode.value === 'PARENT' ? 'CHILD' : 'PARENT';
    switchMode(newMode);
  }

  /**
   * 更新配置
   */
  function updateConfig(updates: Partial<UserModeConfig>) {
    config.value = { ...config.value, ...updates };
    saveToStorage();
  }

  /**
   * 重置为默认配置
   */
  function resetConfig() {
    config.value = { ...MODE_PRESETS[currentMode.value] };
    saveToStorage();
  }

  /**
   * 保存到 LocalStorage
   */
  function saveToStorage() {
    try {
      const data = {
        mode: currentMode.value,
        config: config.value,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[UserMode] Failed to save to storage:', error);
    }
  }

  /**
   * 从 LocalStorage 加载
   */
  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        currentMode.value = data.mode || 'PARENT';
        config.value = data.config || MODE_PRESETS[currentMode.value];

      }
    } catch (error) {
      console.error('[UserMode] Failed to load from storage:', error);
      // 加载失败时使用默认配置
      currentMode.value = 'PARENT';
      config.value = MODE_PRESETS.PARENT;
    }
  }

  /**
   * 清除存储
   */
  function clearStorage() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('[UserMode] Failed to clear storage:', error);
    }
  }

  // ==================== Content Filters ====================

  /**
   * 根据模式过滤内容
   */
  function filterContent<T>(
    content: T,
    parentContent: T,
    childContent: T,
  ): T {
    return isParentMode.value ? parentContent : childContent;
  }

  /**
   * 获取文本（根据模式返回不同版本）
   */
  function getText(parentText: string, childText: string): string {
    return filterContent('', parentText, childText);
  }

  /**
   * 检查是否应该显示某个功能
   */
  function shouldShow(feature: keyof UserModeConfig): boolean {
    return config.value[feature] === true;
  }

  // ==================== Initialization ====================

  // 初始化时从 LocalStorage 加载
  loadFromStorage();

  // ==================== Return ====================

  return {
    // State
    currentMode,
    config,

    // Getters
    isParentMode,
    isChildMode,
    modeLabel,
    modeDescription,

    // Actions
    switchMode,
    switchToParentMode,
    switchToChildMode,
    toggleMode,
    updateConfig,
    resetConfig,
    saveToStorage,
    loadFromStorage,
    clearStorage,

    // Content Filters
    filterContent,
    getText,
    shouldShow,
  };
});
