import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useThemeStore } from './stores/theme.store';
import './styles/global.css';

// ===== 本地开发 Mock 免登录注入 =====
// 在 Vite dev 模式下自动注入模拟用户凭据，跳过登录页
if (import.meta.env.DEV && !localStorage.getItem('accessToken')) {
  localStorage.setItem('accessToken', 'mock_access_token_dev');
  localStorage.setItem('refreshToken', 'mock_refresh_token_dev');
  localStorage.setItem('user', JSON.stringify({
    userId: 'u_dev_001',
    username: 'devuser',
    nickname: '开发者',
    role: 'admin',
  }));
  console.log('[dev] 已注入本地 Mock 用户凭据');
}

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// 初始化主题（需要在 pinia 注册后）
const theme = useThemeStore();
theme.init();

app.mount('#app');
