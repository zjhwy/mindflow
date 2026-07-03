import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

interface UserInfo {
  userId: string;
  username: string;
  nickname?: string;
  role: string;
  avatar?: string;
}

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'));
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'));
  const user = ref<UserInfo | null>(null);
  const isAuthenticated = computed(() => !!accessToken.value && !!user.value);

  // ==================== Actions ====================

  async function login(username: string, password: string): Promise<boolean> {
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();
      if (result.code !== 0) {
        throw new Error(result.message ?? '登录失败');
      }

      const data = result.data;
      accessToken.value = data.accessToken;
      refreshToken.value = data.refreshToken;
      user.value = data.user;

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      return true;
    } catch (err) {
      console.error('登录失败:', err);
      return false;
    }
  }

  async function register(username: string, password: string): Promise<boolean> {
    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();
      if (result.code !== 0) {
        throw new Error(result.message ?? '注册失败');
      }

      return true;
    } catch (err) {
      console.error('注册失败:', err);
      return false;
    }
  }

  async function validateSession(): Promise<boolean> {
    if (!accessToken.value) return false;

    try {
      const response = await fetch('/api/v1/auth/me', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken.value}`,
        },
      });

      const result = await response.json();
      if (result.code !== 0) {
        logout();
        return false;
      }

      user.value = result.data;
      localStorage.setItem('user', JSON.stringify(result.data));
      return true;
    } catch {
      return !!user.value; // 网络失败但本地有数据则保持
    }
  }

  async function tryRefreshSession(): Promise<boolean> {
    if (!refreshToken.value) return false;

    try {
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refreshToken.value }),
      });

      const result = await response.json();
      if (result.code !== 0) {
        logout();
        return false;
      }

      const data = result.data;
      accessToken.value = data.accessToken;
      refreshToken.value = data.refreshToken;
      user.value = data.user;

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      return true;
    } catch {
      return false;
    }
  }

  function logout(): void {
    accessToken.value = null;
    refreshToken.value = null;
    user.value = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  function restoreFromStorage(): boolean {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');

    if (storedUser && token) {
      try {
        user.value = JSON.parse(storedUser);
        accessToken.value = token;
        refreshToken.value = localStorage.getItem('refreshToken');
        return true;
      } catch {
        logout();
      }
    }
    return false;
  }

  function getAuthHeaders(): Record<string, string> {
    return accessToken.value
      ? { Authorization: `Bearer ${accessToken.value}` }
      : {};
  }

  return {
    accessToken,
    refreshToken,
    user,
    isAuthenticated,
    login,
    register,
    validateSession,
    tryRefreshSession,
    logout,
    restoreFromStorage,
    getAuthHeaders,
  };
});
