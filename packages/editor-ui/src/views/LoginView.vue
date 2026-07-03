<template>
  <div class="login-container" :class="{ 'dark-mode': theme.isDarkMode }">
    <div class="login-card">
      <h1 class="login-title">MindFlow</h1>
      <p class="login-subtitle">思维导图 · zjhdml.online</p>

      <!-- 标签切换 -->
      <div class="tab-bar">
        <button
          :class="['tab-btn', { active: activeTab === 'login' }]"
          @click="activeTab = 'login'"
        >登录</button>
        <button
          :class="['tab-btn', { active: activeTab === 'register' }]"
          @click="activeTab = 'register'"
        >注册</button>
      </div>

      <!-- 表单 -->
      <form @submit.prevent="handleSubmit" class="login-form">
        <div class="form-group">
          <label>用户名</label>
          <input
            v-model="username"
            type="text"
            placeholder="请输入用户名"
            required
            autocomplete="username"
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input
            v-model="password"
            type="password"
            placeholder="请输入密码"
            required
            autocomplete="current-password"
            class="form-input"
          />
        </div>
        <div v-if="activeTab === 'register'" class="form-group">
          <label>确认密码</label>
          <input
            v-model="confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            required
            class="form-input"
          />
        </div>
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
        <button type="submit" class="btn-submit" :disabled="loading">
          {{ loading ? '处理中...' : (activeTab === 'login' ? '登录' : '注册') }}
        </button>
      </form>

      <p class="hint-text">
        {{ activeTab === 'login' ? '还没有账号？' : '已有账号？' }}
        <a href="#" @click.prevent="activeTab = activeTab === 'login' ? 'register' : 'login'">
          {{ activeTab === 'login' ? '立即注册' : '去登录' }}
        </a>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import { useThemeStore } from '../stores/theme.store';

const router = useRouter();
const auth = useAuthStore();
const theme = useThemeStore();

const activeTab = ref<'login' | 'register'>('login');
const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const errorMsg = ref('');
const loading = ref(false);

async function handleSubmit() {
  errorMsg.value = '';
  loading.value = true;

  try {
    if (activeTab.value === 'register') {
      if (password.value !== confirmPassword.value) {
        errorMsg.value = '两次密码不一致';
        loading.value = false;
        return;
      }
      if (password.value.length < 6) {
        errorMsg.value = '密码至少需要6位';
        loading.value = false;
        return;
      }
      const ok = await auth.register(username.value, password.value);
      if (ok) {
        activeTab.value = 'login';
        errorMsg.value = '';
      } else {
        errorMsg.value = '注册失败，请稍后重试';
      }
    } else {
      const ok = await auth.login(username.value, password.value);
      if (ok) {
        const redirect = router.currentRoute.value.query.redirect as string || '/';
        router.push(redirect);
      } else {
        errorMsg.value = '用户名或密码错误';
      }
    }
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--bg-canvas, #f0f2f5);
}
.login-card {
  width: 380px;
  padding: 40px;
  background: var(--bg-module, #fff);
  border-radius: var(--radius-lg, 12px);
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
}
.login-title { text-align: center; font-size: 24px; font-weight: 700; margin-bottom: 4px; }
.login-subtitle { text-align: center; font-size: 14px; color: var(--text-secondary, #999); margin-bottom: 24px; }

.tab-bar { display: flex; margin-bottom: 20px; border-radius: var(--radius-sm); background: var(--bg-secondary, #f5f5f5); overflow: hidden; }
.tab-btn { flex: 1; padding: 8px 0; border: none; background: transparent; font-size: 14px; cursor: pointer; transition: all 0.2s; color: var(--text-secondary); }
.tab-btn.active { background: var(--color-accent, #1677ff); color: #fff; }

.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 13px; margin-bottom: 6px; color: var(--text-secondary); }
.form-input { width: 100%; padding: 10px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-sm); font-size: 14px; outline: none; box-sizing: border-box; }
.form-input:focus { border-color: var(--color-accent, #1677ff); box-shadow: 0 0 0 2px rgba(22,119,255,0.1); }

.error-msg { color: var(--color-error, #f5222d); font-size: 13px; margin-bottom: 12px; }
.btn-submit { width: 100%; padding: 10px; background: var(--color-accent, #1677ff); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 15px; cursor: pointer; transition: opacity 0.2s; }
.btn-submit:hover:not(:disabled) { opacity: 0.9; }
.btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

.hint-text { text-align: center; margin-top: 16px; font-size: 13px; color: var(--text-secondary); }
.hint-text a { color: var(--color-accent, #1677ff); text-decoration: none; }
.hint-text a:hover { text-decoration: underline; }
</style>
