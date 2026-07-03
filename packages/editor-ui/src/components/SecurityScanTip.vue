<template>
  <Teleport to="body">
    <div v-if="visible" class="scan-tip-overlay" @click.self="onDismiss">
      <div class="scan-tip-card" :class="`scan-tip--${level}`">
        <h3>内容安全提示</h3>
        <p>{{ message }}</p>
        <div class="scan-tip-actions">
          <button v-if="level !== 'danger'" class="btn btn-text" @click="onDismiss">知道了</button>
          <button v-if="level === 'danger'" class="btn btn-danger" @click="onDismiss">关闭</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue';
const visible = ref(false);
const message = ref('');
const level = ref<'warning' | 'danger'>('warning');

function show(msg: string, lvl: 'warning' | 'danger' = 'warning') {
  message.value = msg; level.value = lvl; visible.value = true;
}
function onDismiss() { visible.value = false; }
defineExpose({ show });
</script>

<style scoped>
.scan-tip-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 500; }
.scan-tip-card { background: var(--bg-page); border-radius: var(--radius-md); padding: 24px; max-width: 400px; box-shadow: var(--shadow-modal); }
.scan-tip-card h3 { margin-bottom: 12px; font-size: var(--font-size-lg); }
.scan-tip-card p { margin-bottom: 16px; color: var(--text-secondary); }
.scan-tip--warning { border-top: 3px solid var(--color-warning); }
.scan-tip--danger { border-top: 3px solid var(--color-danger); }
.scan-tip-actions { display: flex; justify-content: flex-end; gap: 8px; }
.btn { padding: 6px 16px; border-radius: var(--radius-sm); border: none; font-size: var(--font-size-md); cursor: pointer; }
.btn-text { background: var(--bg-module); color: var(--text-primary); }
.btn-danger { background: var(--color-danger); color: #fff; }
</style>
