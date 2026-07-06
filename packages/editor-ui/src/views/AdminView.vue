<template>
  <div class="admin-container">
    <!-- 顶部导航 -->
    <header class="admin-header">
      <div class="header-left">
        <button class="btn-back" @click="router.push('/')">← 返回</button>
        <h1>管理后台</h1>
      </div>
      <div class="header-right">
        <span class="user-role">管理员：{{ auth.user?.username }}</span>
        <button class="btn-text" @click="router.push('/settings')">个人设置</button>
      </div>
    </header>

    <!-- Tab 导航 -->
    <nav class="admin-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['tab-btn', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </nav>

    <main class="admin-main">
      <!-- ========== 仪表盘 ========== -->
      <section v-if="activeTab === 'dashboard'" class="dashboard">
        <div v-if="loadingStats" class="loading">加载中...</div>
        <template v-else>
          <div class="stat-cards">
            <div v-for="card in statCards" :key="card.key" class="stat-card">
              <div class="stat-value" :style="{ color: card.color }">{{ card.value }}</div>
              <div class="stat-label">{{ card.label }}</div>
            </div>
          </div>

          <div class="panel">
            <h3>角色分布</h3>
            <div class="role-bars">
              <div v-for="(count, role) in stats.usersByRole" :key="role" class="role-bar">
                <span class="role-name">{{ roleLabels[role] || role }}</span>
                <div class="bar-track">
                  <div class="bar-fill" :style="{ width: maxRoleCount ? (count / maxRoleCount * 100) + '%' : '0%' }" />
                </div>
                <span class="role-count">{{ count }}</span>
              </div>
            </div>
          </div>

          <div class="panel">
            <h3>系统概览</h3>
            <div class="overview-grid">
              <div class="overview-item">
                <span class="ov-label">文档总数</span>
                <span class="ov-value">{{ stats.totalDocuments }}</span>
              </div>
              <div class="overview-item">
                <span class="ov-label">节点总数</span>
                <span class="ov-value">{{ stats.totalNodes }}</span>
              </div>
              <div class="overview-item">
                <span class="ov-label">连线总数</span>
                <span class="ov-value">{{ stats.totalConnections }}</span>
              </div>
              <div class="overview-item">
                <span class="ov-label">今日活跃</span>
                <span class="ov-value">{{ stats.recentLogins }}</span>
              </div>
            </div>
          </div>
        </template>
      </section>

      <!-- ========== 用户管理 ========== -->
      <section v-if="activeTab === 'users'" class="users-panel">
        <div class="toolbar">
          <input
            v-model="userSearch"
            type="text"
            class="search-input"
            placeholder="搜索用户名或邮箱..."
            @input="onUserSearch"
          />
          <select v-model="userRoleFilter" class="filter-select" @change="loadUsers">
            <option value="">全部角色</option>
            <option value="admin">管理员</option>
            <option value="editor">编辑者</option>
            <option value="viewer">查看者</option>
          </select>
          <select v-model="userActiveFilter" class="filter-select" @change="loadUsers">
            <option value="">全部状态</option>
            <option value="true">已激活</option>
            <option value="false">已禁用</option>
          </select>
        </div>

        <div v-if="loadingUsers" class="loading">加载中...</div>
        <template v-else>
          <table v-if="users.length > 0" class="data-table">
            <thead>
              <tr>
                <th>用户名</th>
                <th>邮箱</th>
                <th>角色</th>
                <th>状态</th>
                <th>部门</th>
                <th>文档数</th>
                <th>最后登录</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id" :class="{ locked: user.isLocked }">
                <td>{{ user.nickname || user.username }}</td>
                <td class="text-muted">{{ user.email }}</td>
                <td>
                  <select
                    :value="user.role"
                    class="role-select"
                    @change="handleRoleChange(user, ($event.target as HTMLSelectElement).value)"
                  >
                    <option value="admin">管理员</option>
                    <option value="editor">编辑者</option>
                    <option value="viewer">查看者</option>
                  </select>
                </td>
                <td>
                  <span :class="['status-badge', user.isActive ? 'active' : 'disabled']">
                    {{ user.isActive ? '正常' : '已禁用' }}
                  </span>
                  <span v-if="user.isLocked" class="status-badge locked">已锁定</span>
                </td>
                <td class="text-muted">{{ user.department || '-' }}</td>
                <td>{{ user.documentCount }}</td>
                <td class="text-muted">{{ formatDate(user.lastLoginAt) }}</td>
                <td class="action-cell">
                  <button
                    v-if="!user.isLocked"
                    class="btn-mini"
                    :class="user.isActive ? 'btn-warn' : 'btn-ok'"
                    @click="toggleUserStatus(user)"
                  >
                    {{ user.isActive ? '禁用' : '启用' }}
                  </button>
                  <button
                    v-if="user.isLocked"
                    class="btn-mini btn-ok"
                    @click="unlockUser(user)"
                  >
                    解锁
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-state">无匹配用户</div>

          <div v-if="userTotalPages > 1" class="pagination">
            <button :disabled="userPage <= 1" @click="userPage--; loadUsers()">上一页</button>
            <span>{{ userPage }} / {{ userTotalPages }}</span>
            <button :disabled="userPage >= userTotalPages" @click="userPage++; loadUsers()">下一页</button>
          </div>
        </template>
      </section>

      <!-- ========== 审计日志 ========== -->
      <section v-if="activeTab === 'audit'" class="audit-panel">
        <div class="toolbar">
          <input v-model="auditSearch" class="search-input" placeholder="搜索操作类型..." @input="onAuditSearch" />
          <select v-model="auditOperationFilter" class="filter-select" @change="loadAuditLogs">
            <option value="">全部操作</option>
            <option value="document.create">创建文档</option>
            <option value="document.delete">删除文档</option>
            <option value="node.insert">创建节点</option>
            <option value="node.update">更新节点</option>
            <option value="node.delete">删除节点</option>
            <option value="user.login">登录</option>
            <option value="user.register">注册</option>
            <option value="user.update">用户更新</option>
          </select>
        </div>

        <div v-if="loadingAudit" class="loading">加载中...</div>
        <template v-else>
          <table v-if="auditLogs.length > 0" class="data-table">
            <thead>
              <tr>
                <th style="width:160px">时间</th>
                <th>用户</th>
                <th>操作</th>
                <th>结果</th>
                <th style="width:120px">IP</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in auditLogs" :key="log.id">
                <td class="text-muted">{{ formatTime(log.createdAt) }}</td>
                <td>{{ log.username || log.userId }}</td>
                <td>
                  <code>{{ log.operationType }}</code>
                  <div v-if="log.operationData" class="log-detail">{{ truncateJson(log.operationData) }}</div>
                </td>
                <td>
                  <span :class="['status-badge', log.result === 'success' ? 'active' : 'error']">
                    {{ log.result === 'success' ? '成功' : '失败' }}
                  </span>
                </td>
                <td class="text-muted">{{ log.ipAddress || '-' }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-state">无审计日志</div>

          <div v-if="auditTotalPages > 1" class="pagination">
            <button :disabled="auditPage <= 1" @click="auditPage--; loadAuditLogs()">上一页</button>
            <span>{{ auditPage }} / {{ auditTotalPages }}</span>
            <button :disabled="auditPage >= auditTotalPages" @click="auditPage++; loadAuditLogs()">下一页</button>
          </div>
        </template>
      </section>

      <!-- ========== 系统配置 ========== -->
      <section v-if="activeTab === 'config'" class="config-panel">
        <div v-if="loadingConfig" class="loading">加载中...</div>
        <template v-else>
          <div class="config-grid">
            <div v-for="item in configItems" :key="item.key" class="config-card">
              <div class="config-label">{{ item.label }}</div>
              <div class="config-desc">{{ item.desc }}</div>
              <div class="config-control">
                <template v-if="item.type === 'boolean'">
                  <label class="toggle">
                    <input
                      type="checkbox"
                      :checked="systemConfig[item.key] === 'true' || systemConfig[item.key] === true"
                      @change="updateConfig(item.key, ($event.target as HTMLInputElement).checked ? 'true' : 'false')"
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </template>
                <template v-else-if="item.type === 'number'">
                  <input
                    type="number"
                    class="config-input"
                    :value="systemConfig[item.key] || item.default"
                    @change="updateConfig(item.key, ($event.target as HTMLInputElement).value)"
                  />
                </template>
                <template v-else>
                  <input
                    type="text"
                    class="config-input"
                    :value="systemConfig[item.key] || item.default"
                    @change="updateConfig(item.key, ($event.target as HTMLInputElement).value)"
                  />
                </template>
              </div>
            </div>
          </div>
        </template>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/api/client';

const router = useRouter();
const auth = useAuthStore();

// ==================== Tab ====================

const activeTab = ref('dashboard');
const tabs = [
  { key: 'dashboard', label: '仪表盘' },
  { key: 'users', label: '用户管理' },
  { key: 'audit', label: '审计日志' },
  { key: 'config', label: '系统配置' },
];

// ==================== 角色标签 ====================

const roleLabels: Record<string, string> = {
  admin: '管理员',
  editor: '编辑者',
  viewer: '查看者',
  'secure-operator': '安全操作员',
  guest: '访客',
};

// ==================== 仪表盘 ====================

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  totalDocuments: number;
  totalNodes: number;
  totalConnections: number;
  recentLogins: number;
  usersByRole: Record<string, number>;
}

const loadingStats = ref(true);
const stats = ref<AdminStats>({
  totalUsers: 0, activeUsers: 0, lockedUsers: 0,
  totalDocuments: 0, totalNodes: 0, totalConnections: 0,
  recentLogins: 0, usersByRole: {},
});

const statCards = computed(() => [
  { key: 'users', value: stats.value.totalUsers, label: '用户总数', color: '#1677ff' },
  { key: 'active', value: stats.value.activeUsers, label: '活跃用户', color: '#52c41a' },
  { key: 'locked', value: stats.value.lockedUsers, label: '已锁定', color: '#ff4d4f' },
  { key: 'docs', value: stats.value.totalDocuments, label: '文档总数', color: '#722ed1' },
]);

const maxRoleCount = computed(() => Math.max(1, ...Object.values(stats.value.usersByRole)));

async function loadStats() {
  loadingStats.value = true;
  try {
    const res = await api.get<AdminStats>('/admin/stats');
    if (res.code === 200 && res.data) stats.value = res.data;
  } catch { /* ignore */ }
  loadingStats.value = false;
}

// ==================== 用户管理 ====================

interface AdminUser {
  id: string; username: string; email: string; role: string;
  isActive: boolean; isLocked: boolean; nickname?: string;
  department?: string; lastLoginAt?: string; loginFailCount: number;
  documentCount: number;
}

const loadingUsers = ref(true);
const users = ref<AdminUser[]>([]);
const userSearch = ref('');
const userRoleFilter = ref('');
const userActiveFilter = ref('');
const userPage = ref(1);
const userTotalPages = ref(1);
let userSearchTimer: ReturnType<typeof setTimeout>;

async function loadUsers() {
  loadingUsers.value = true;
  try {
    const params = new URLSearchParams();
    params.set('page', String(userPage.value));
    params.set('pageSize', '20');
    if (userSearch.value) params.set('search', userSearch.value);
    if (userRoleFilter.value) params.set('role', userRoleFilter.value);
    if (userActiveFilter.value) params.set('isActive', userActiveFilter.value);

    const res = await api.get<any>(`/admin/users?${params.toString()}`);
    if (res.code === 200 && res.data) {
      users.value = res.data.items || [];
      userTotalPages.value = res.data.totalPages || 1;
    }
  } catch { /* ignore */ }
  loadingUsers.value = false;
}

function onUserSearch() {
  clearTimeout(userSearchTimer);
  userSearchTimer = setTimeout(() => { userPage.value = 1; loadUsers(); }, 300);
}

async function handleRoleChange(user: AdminUser, newRole: string) {
  try {
    const res = await api.put(`/admin/users/${user.id}`, { role: newRole });
    if (res.code === 200) { user.role = newRole; }
    else alert(res.message || '操作失败');
  } catch { alert('操作失败'); }
}

async function toggleUserStatus(user: AdminUser) {
  const action = user.isActive ? '禁用' : '启用';
  if (!confirm(`确定${action}用户 "${user.username}"？`)) return;
  try {
    const res = await api.put(`/admin/users/${user.id}`, { isActive: !user.isActive });
    if (res.code === 200) loadUsers();
    else alert(res.message);
  } catch { alert('操作失败'); }
}

async function unlockUser(user: AdminUser) {
  if (!confirm(`确定解锁用户 "${user.username}"？`)) return;
  try {
    await api.put(`/admin/users/${user.id}`, { isLocked: false });
    loadUsers();
  } catch { alert('操作失败'); }
}

// ==================== 审计日志 ====================

interface AuditLogEntry {
  id: number; userId: string; username?: string; operationType: string;
  operationData: any; ipAddress?: string; result: string; createdAt: string;
}

const loadingAudit = ref(true);
const auditLogs = ref<AuditLogEntry[]>([]);
const auditSearch = ref('');
const auditOperationFilter = ref('');
const auditPage = ref(1);
const auditTotalPages = ref(1);
let auditSearchTimer: ReturnType<typeof setTimeout>;

async function loadAuditLogs() {
  loadingAudit.value = true;
  try {
    const params = new URLSearchParams();
    params.set('page', String(auditPage.value));
    params.set('pageSize', '50');
    if (auditSearch.value) params.set('search', auditSearch.value);
    if (auditOperationFilter.value) params.set('operationType', auditOperationFilter.value);

    const res = await api.get<any>(`/admin/audit-logs?${params.toString()}`);
    if (res.code === 200 && res.data) {
      auditLogs.value = res.data.items || [];
      auditTotalPages.value = res.data.totalPages || 1;
    }
  } catch { /* ignore */ }
  loadingAudit.value = false;
}

function onAuditSearch() {
  clearTimeout(auditSearchTimer);
  auditSearchTimer = setTimeout(() => { auditPage.value = 1; loadAuditLogs(); }, 300);
}

// ==================== 系统配置 ====================

const loadingConfig = ref(true);
const systemConfig = ref<Record<string, any>>({});

const configItems = [
  { key: 'registration.allow_public', label: '允许公开注册', desc: '是否允许新用户自行注册', type: 'boolean', default: 'true' },
  { key: 'security.max_login_attempts', label: '最大登录失败次数', desc: '超过此次数将锁定账户', type: 'number', default: '5' },
  { key: 'security.session_timeout_minutes', label: '会话超时（分钟）', desc: '用户无操作后的自动登出时间', type: 'number', default: '480' },
  { key: 'security.require_device_verify', label: '要求设备验证', desc: '登录时是否需要验证设备', type: 'boolean', default: 'false' },
  { key: 'watermark.enforce_for_roles', label: '强制水印角色', desc: 'JSON 数组格式，如 ["editor","viewer"]', type: 'text', default: '["editor","viewer","guest"]' },
  { key: 'audit.retention_days', label: '审计日志保留天数', desc: '超过保留期的日志将被清理', type: 'number', default: '90' },
  { key: 'document.max_nodes_per_file', label: '单文档最大节点数', desc: '超出后需要拆分文档', type: 'number', default: '10000' },
];

async function loadConfig() {
  loadingConfig.value = true;
  try {
    const res = await api.get<Record<string, any>>('/admin/config');
    if (res.code === 200 && res.data) systemConfig.value = res.data;
  } catch { /* ignore */ }
  loadingConfig.value = false;
}

async function updateConfig(key: string, value: string) {
  try {
    const parsed = typeof value === 'string' && (key === 'watermark.enforce_for_roles')
      ? JSON.parse(value) : value;
    await api.put(`/admin/config/${key}`, { value: parsed });
  } catch { alert('保存失败，请检查输入格式'); }
}

// ==================== 工具函数 ====================

function formatDate(d: string | undefined): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function formatTime(d: string | undefined): string {
  if (!d) return '-';
  return new Date(d).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function truncateJson(data: any): string {
  try {
    const s = typeof data === 'string' ? data : JSON.stringify(data);
    return s.length > 80 ? s.slice(0, 80) + '...' : s;
  } catch { return ''; }
}

// ==================== 初始化 ====================

onMounted(() => {
  loadStats();
  loadUsers();
  loadAuditLogs();
  loadConfig();
});
</script>

<style scoped>
.admin-container { min-height: 100vh; background: #f5f6fa; color: #1d1d1f; }
.admin-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 24px; height: 56px; background: #fff; border-bottom: 1px solid #e8e8ec;
}
.header-left { display: flex; align-items: center; gap: 16px; }
.header-left h1 { font-size: 18px; font-weight: 600; margin: 0; }
.header-right { display: flex; align-items: center; gap: 12px; }
.user-role { font-size: 13px; color: #888; background: #f0f0f5; padding: 2px 10px; border-radius: 4px; }

.btn-back { background: none; border: 1px solid #d9d9de; border-radius: 6px; padding: 4px 12px; cursor: pointer; font-size: 13px; }
.btn-back:hover { background: #f0f0f5; }
.btn-text { background: none; border: none; cursor: pointer; font-size: 13px; color: #555; }
.btn-text:hover { color: #1677ff; }

/* Tabs */
.admin-tabs {
  display: flex; gap: 0; background: #fff; border-bottom: 1px solid #e8e8ec; padding: 0 24px;
  position: sticky; top: 0; z-index: 10;
}
.tab-btn {
  background: none; border: none; padding: 12px 24px; font-size: 14px;
  cursor: pointer; color: #888; border-bottom: 2px solid transparent; transition: all .2s;
}
.tab-btn.active { color: #1677ff; border-bottom-color: #1677ff; font-weight: 600; }
.tab-btn:hover:not(.active) { color: #444; }

.admin-main { padding: 24px; max-width: 1280px; margin: 0 auto; }

/* Cards */
.stat-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.stat-card { background: #fff; border-radius: 10px; padding: 20px; border: 1px solid #e8e8ec; }
.stat-value { font-size: 28px; font-weight: 700; }
.stat-label { font-size: 13px; color: #888; margin-top: 4px; }

.panel { background: #fff; border-radius: 10px; padding: 20px; border: 1px solid #e8e8ec; margin-bottom: 16px; }
.panel h3 { font-size: 15px; font-weight: 600; margin: 0 0 16px 0; }

/* Role bars */
.role-bars { display: flex; flex-direction: column; gap: 10px; }
.role-bar { display: flex; align-items: center; gap: 10px; }
.role-name { width: 80px; font-size: 13px; color: #555; }
.bar-track { flex: 1; height: 8px; background: #f0f0f5; border-radius: 4px; overflow: hidden; }
.bar-fill { height: 100%; background: #1677ff; border-radius: 4px; min-width: 4px; transition: width .4s ease; }
.role-count { font-size: 13px; color: #888; width: 30px; text-align: right; }

.overview-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.overview-item { display: flex; flex-direction: column; align-items: center; padding: 12px; background: #fafafc; border-radius: 8px; }
.ov-label { font-size: 12px; color: #888; }
.ov-value { font-size: 22px; font-weight: 700; color: #1677ff; margin-top: 4px; }

/* Toolbar */
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; }
.search-input {
  flex: 1; max-width: 280px; padding: 7px 12px; border: 1px solid #d9d9de;
  border-radius: 6px; font-size: 13px; outline: none;
}
.search-input:focus { border-color: #1677ff; }
.filter-select {
  padding: 7px 10px; border: 1px solid #d9d9de; border-radius: 6px; font-size: 13px; outline: none; background: #fff;
}

/* Table */
.data-table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; border: 1px solid #e8e8ec; }
.data-table th { background: #fafafc; padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; }
.data-table td { padding: 10px 12px; font-size: 13px; border-top: 1px solid #f0f0f5; }
.data-table tr:hover { background: #fafafe; }
.data-table tr.locked { background: #fff2f0; }
.text-muted { color: #999; font-size: 12px; }

/* Status badges */
.status-badge { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 10px; margin-right: 4px; }
.status-badge.active { background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
.status-badge.disabled { background: #fff2f0; color: #ff4d4f; border: 1px solid #ffa39e; }
.status-badge.locked { background: #fff7e6; color: #fa8c16; border: 1px solid #ffd591; }
.status-badge.error { background: #fff2f0; color: #ff4d4f; border: 1px solid #ffa39e; }

/* Mini buttons */
.btn-mini { font-size: 11px; padding: 3px 10px; border-radius: 4px; border: 1px solid #d9d9de; background: #fff; cursor: pointer; }
.btn-mini.btn-warn { border-color: #ffa39e; color: #ff4d4f; }
.btn-mini.btn-warn:hover { background: #fff2f0; }
.btn-mini.btn-ok { border-color: #b7eb8f; color: #52c41a; }
.btn-mini.btn-ok:hover { background: #f6ffed; }

/* Role Select */
.role-select { font-size: 12px; padding: 2px 6px; border: 1px solid #d9d9de; border-radius: 4px; background: #fff; cursor: pointer; }

/* Audit */
.log-detail { font-size: 11px; color: #aaa; margin-top: 2px; font-family: monospace; }

/* Pagination */
.pagination { display: flex; justify-content: center; align-items: center; gap: 12px; margin-top: 16px; }
.pagination button { padding: 6px 16px; border: 1px solid #d9d9de; border-radius: 6px; background: #fff; cursor: pointer; font-size: 13px; }
.pagination button:disabled { opacity: .4; cursor: not-allowed; }
.pagination span { font-size: 13px; color: #888; }

/* Config */
.config-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.config-card { background: #fff; border: 1px solid #e8e8ec; border-radius: 10px; padding: 16px; }
.config-label { font-size: 14px; font-weight: 600; }
.config-desc { font-size: 12px; color: #888; margin: 4px 0 10px; }
.config-input { width: 100%; padding: 6px 10px; border: 1px solid #d9d9de; border-radius: 6px; font-size: 13px; box-sizing: border-box; }

/* Toggle */
.toggle { position: relative; display: inline-block; width: 40px; height: 22px; cursor: pointer; }
.toggle input { opacity: 0; width: 0; height: 0; }
.toggle-slider { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: #d9d9de; border-radius: 11px; transition: .3s; }
.toggle-slider::before { content: ''; position: absolute; width: 16px; height: 16px; left: 3px; bottom: 3px; background: #fff; border-radius: 50%; transition: .3s; }
.toggle input:checked + .toggle-slider { background: #1677ff; }
.toggle input:checked + .toggle-slider::before { transform: translateX(18px); }

/* Shared */
.loading { text-align: center; padding: 40px; color: #999; font-size: 14px; }
.empty-state { text-align: center; padding: 40px; color: #999; font-size: 14px; }

@media (max-width: 768px) {
  .stat-cards { grid-template-columns: repeat(2, 1fr); }
  .overview-grid { grid-template-columns: repeat(2, 1fr); }
  .config-grid { grid-template-columns: 1fr; }
  .data-table { font-size: 11px; }
}
</style>
