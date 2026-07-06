-- ============================================================
-- MindFlow 迁移 002：企业/管理员功能增强
-- 在 Supabase SQL Editor 中执行
-- ============================================================

-- 1. 增强 users 表：添加企业字段
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS nickname TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS login_fail_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS department TEXT;

CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- 2. 增强 operation_logs 表：添加安全审计字段
ALTER TABLE IF EXISTS operation_logs
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS result TEXT DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

CREATE INDEX IF NOT EXISTS idx_operation_logs_ip ON operation_logs(ip_address);

-- 3. 创建 organizations 表（多租户/企业）
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id),
  logo_url TEXT,
  max_users INTEGER DEFAULT 50,
  max_storage_mb INTEGER DEFAULT 1024,
  plan TEXT DEFAULT 'free',       -- 'free', 'pro', 'enterprise'
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,  -- { enforceWatermark, enforce2FA, passwordPolicy, allowedDomains }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);

-- 4. 创建 organization_members 表（组织成员）
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',  -- 'owner', 'admin', 'member', 'guest'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT uq_org_member UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);

-- 5. 创建 system_config 表（系统级配置）
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入默认系统配置
INSERT INTO system_config (key, value, description) VALUES
  ('watermark.default_opacity', '0.08', '默认水印透明度'),
  ('watermark.enforce_for_roles', '["editor","viewer","guest"]', '强制水印角色列表'),
  ('security.max_login_attempts', '5', '最大登录失败次数'),
  ('security.session_timeout_minutes', '480', '会话超时（分钟）'),
  ('security.require_device_verify', 'false', '是否要求设备验证'),
  ('registration.allow_public', 'true', '是否允许公开注册'),
  ('audit.retention_days', '90', '审计日志保留天数'),
  ('document.max_nodes_per_file', '10000', '单文档最大节点数')
ON CONFLICT (key) DO NOTHING;
