<template>
  <div class="home-container">
    <header class="home-header">
      <h1>MindFlow</h1>
      <div class="header-right">
        <span class="user-info">{{ auth.user?.username }}</span>
        <button class="btn-text" @click="router.push('/settings')">设置</button>
        <button class="btn-text" @click="handleLogout">退出</button>
      </div>
    </header>

    <main class="home-main">
      <div class="welcome-card">
        <h2>欢迎回来，{{ auth.user?.username }}</h2>
        <p>今日已创建 0 个导图，编辑 0 个节点</p>
      </div>

      <div class="actions-bar">
        <button class="btn-primary" @click="createNewDocument">新建思维导图</button>
      </div>

      <div class="documents-section">
        <h3>最近文档</h3>
        <div v-if="documents.length === 0" class="empty-state">
          <p>暂无文档，点击上方按钮创建你的第一个思维导图</p>
        </div>
        <div v-else class="doc-grid">
          <div
            v-for="doc in documents"
            :key="doc.fileId"
            class="doc-card"
            @click="openDocument(doc.fileId)"
          >
            <div class="doc-name">{{ doc.name }}</div>
            <div class="doc-meta">
              <span>{{ doc.totalNodes ?? 0 }} 节点</span>
              <span>{{ formatDate(doc.updatedAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import { api } from '../api/client';

const router = useRouter();
const auth = useAuthStore();
const documents = ref<any[]>([]);

onMounted(async () => {
  await loadDocuments();
});

async function loadDocuments() {
  try {
    const result = await api.get<any>(`/documents`);
    if (result.code === 0) {
      documents.value = result.data?.items ?? [];
    }
  } catch {
    // 网络问题使用空列表
  }
}

function createNewDocument() {
  router.push('/editor');
}

function openDocument(fileId: string) {
  router.push(`/editor/${fileId}`);
}

function handleLogout() {
  auth.logout();
  router.push('/login');
}

function formatDate(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}
</script>

<style scoped>
.home-container { min-height: 100vh; display: flex; flex-direction: column; }
.home-header { display: flex; align-items: center; padding: 0 24px; height: 56px; border-bottom: 1px solid var(--border-default); }
.home-header h1 { font-size: 18px; font-weight: 600; }
.header-right { margin-left: auto; display: flex; align-items: center; gap: 16px; }
.user-info { font-size: 14px; color: var(--text-secondary); }
.home-main { flex: 1; padding: 24px; max-width: 900px; margin: 0 auto; width: 100%; box-sizing: border-box; }

.welcome-card {
  padding: 24px;
  background: linear-gradient(135deg, var(--color-accent, #1677ff) 0%, #722ed1 100%);
  border-radius: 12px;
  color: #fff;
  margin-bottom: 24px;
}
.welcome-card h2 { font-size: 20px; margin-bottom: 8px; }
.welcome-card p { font-size: 14px; opacity: 0.85; }

.actions-bar { margin-bottom: 24px; }
.documents-section h3 { font-size: 16px; margin-bottom: 12px; }
.empty-state { text-align: center; padding: 40px; color: var(--text-placeholder); }
.doc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.doc-card {
  padding: 16px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.doc-card:hover { border-color: var(--color-accent); box-shadow: 0 2px 8px rgba(22,119,255,0.1); }
.doc-name { font-size: 15px; font-weight: 500; margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.doc-meta { font-size: 12px; color: var(--text-secondary); display: flex; gap: 12px; }

.btn-primary {
  padding: 10px 24px;
  background: var(--color-accent, #1677ff);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm, 4px);
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-primary:hover { opacity: 0.9; }
.btn-text { padding: 4px 8px; border: none; background: none; color: var(--text-secondary); cursor: pointer; font-size: 14px; }
.btn-text:hover { color: var(--text-primary); }
</style>
