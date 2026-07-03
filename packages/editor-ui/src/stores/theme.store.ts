import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type AccentColor = 'blue' | 'purple' | 'green' | 'orange' | 'red';

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(
    (localStorage.getItem('theme-mode') as ThemeMode) ?? 'auto'
  );
  const accentColor = ref<AccentColor>(
    (localStorage.getItem('theme-accent') as AccentColor) ?? 'blue'
  );
  const fontSizeScale = ref<number>(
    Number(localStorage.getItem('theme-font-scale') ?? 1)
  );

  // 系统主题检测
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  const isDarkMode = computed(() => {
    if (mode.value === 'dark') return true;
    if (mode.value === 'light') return false;
    return prefersDark.matches;
  });

  // 监听系统主题变化
  prefersDark.addEventListener('change', () => {
    if (mode.value === 'auto') {
      applyTheme();
    }
  });

  function setMode(newMode: ThemeMode): void {
    mode.value = newMode;
    localStorage.setItem('theme-mode', newMode);
    applyTheme();
  }

  function setAccentColor(color: AccentColor): void {
    accentColor.value = color;
    localStorage.setItem('theme-accent', color);
    applyAccentColor();
  }

  function setFontSizeScale(scale: number): void {
    fontSizeScale.value = Math.max(0.8, Math.min(1.5, scale));
    localStorage.setItem('theme-font-scale', String(fontSizeScale.value));
    applyFontScale();
  }

  function toggleDarkMode(): void {
    setMode(isDarkMode.value ? 'light' : 'dark');
  }

  function applyTheme(): void {
    document.documentElement.classList.toggle('dark', isDarkMode.value);
  }

  function applyAccentColor(): void {
    const colors: Record<AccentColor, string> = {
      blue: '#1677ff',
      purple: '#722ed1',
      green: '#52c41a',
      orange: '#fa8c16',
      red: '#f5222d',
    };
    document.documentElement.style.setProperty('--color-accent', colors[accentColor.value]);
  }

  function applyFontScale(): void {
    document.documentElement.style.setProperty('--font-scale', String(fontSizeScale.value));
  }

  function init(): void {
    applyTheme();
    applyAccentColor();
    applyFontScale();
  }

  return {
    mode,
    accentColor,
    fontSizeScale,
    isDarkMode,
    setMode,
    setAccentColor,
    setFontSizeScale,
    toggleDarkMode,
    init,
  };
});
