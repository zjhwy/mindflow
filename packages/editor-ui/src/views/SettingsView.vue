<template>
  <div class="settings-container">
    <header class="settings-header">
      <button class="btn-back" @click="router.push('/')">← 返回</button>
      <h1>设置</h1>
    </header>

    <main class="settings-main">
      <section class="setting-section">
        <h3>主题</h3>
        <div class="setting-row">
          <label>色彩模式</label>
          <select :value="theme.mode" @change="theme.setMode(($event.target as any).value)">
            <option value="light">浅色</option>
            <option value="dark">深色</option>
            <option value="auto">跟随系统</option>
          </select>
        </div>
        <div class="setting-row">
          <label>强调色</label>
          <div class="color-palette">
            <button
              v-for="c in accentColors"
              :key="c"
              :class="['color-dot', `color-${c}`, { active: theme.accentColor === c }]"
              @click="theme.setAccentColor(c)"
            />
          </div>
        </div>
        <div class="setting-row">
          <label>字体缩放: {{ theme.fontSizeScale }}x</label>
          <input
            type="range"
            min="0.8"
            max="1.5"
            step="0.05"
            :value="theme.fontSizeScale"
            @input="theme.setFontSizeScale(Number(($event.target as any).value))"
          />
        </div>
      </section>

      <section class="setting-section">
        <h3>快捷键</h3>
        <div class="shortcut-list">
          <div v-for="s in shortcuts" :key="s.keys" class="shortcut-item">
            <kbd>{{ s.keys }}</kbd>
            <span>{{ s.description }}</span>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useThemeStore } from '../stores/theme.store';
import { useKeyboard } from '../composables/useKeyboard';
import type { AccentColor } from '../stores/theme.store';

const router = useRouter();
const theme = useThemeStore();
const accentColors: AccentColor[] = ['blue', 'purple', 'green', 'orange', 'red'];
const keyboard = useKeyboard();

const shortcuts = ref<Array<{ keys: string; description: string }>>([]);

onMounted(() => {
  shortcuts.value = keyboard.getBindings();
});
</script>

<style scoped>
.settings-container { min-height: 100vh; }
.settings-header { display: flex; align-items: center; gap: 16px; padding: 0 24px; height: 56px; border-bottom: 1px solid var(--border-default); }
.settings-header h1 { font-size: 18px; font-weight: 600; }
.settings-main { max-width: 640px; margin: 24px auto; padding: 0 24px; }

.setting-section { margin-bottom: 32px; }
.setting-section h3 { font-size: 16px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border-default); }
.setting-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; }
.setting-row label { font-size: 14px; }
.setting-row select { padding: 4px 8px; border: 1px solid var(--border-default); border-radius: var(--radius-sm); }
.setting-row input[type="range"] { width: 120px; }

.color-palette { display: flex; gap: 8px; }
.color-dot { width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform 0.15s; }
.color-dot.active { border-color: var(--text-primary); transform: scale(1.15); }
.color-blue { background: #1677ff; }
.color-purple { background: #722ed1; }
.color-green { background: #52c41a; }
.color-orange { background: #fa8c16; }
.color-red { background: #f5222d; }

.shortcut-list { display: flex; flex-direction: column; gap: 8px; }
.shortcut-item { display: flex; align-items: center; gap: 12px; font-size: 13px; }
.shortcut-item kbd {
  padding: 2px 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  min-width: 80px;
  text-align: center;
}

.btn-back {
  padding: 4px 12px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: none;
  font-size: 14px;
  cursor: pointer;
}
.btn-back:hover { border-color: var(--color-accent); color: var(--color-accent); }
</style>
