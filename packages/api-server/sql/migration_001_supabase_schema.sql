-- ============================================================
-- MindFlow Supabase 数据库迁移 001
-- 在 Supabase SQL Editor 中执行此文件
-- ============================================================

-- 1. 修改 users 表：添加 auth 相关字段
ALTER TABLE IF EXISTS users 
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'editor';

-- 为已有的 admin 用户设置默认角色（如果存在）
UPDATE users SET role = 'admin' WHERE email = 'admin' AND role IS NULL;

-- 创建 username 唯一索引（允许为 NULL 的旧数据不受影响）
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL;

-- 2. 创建 refresh_tokens 表
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);

-- 3. 修改 documents 表：添加描述和布局类型字段
ALTER TABLE IF EXISTS documents
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS layout_type TEXT DEFAULT 'logic-right',
  ADD COLUMN IF NOT EXISTS total_nodes INTEGER DEFAULT 0;

-- 4. 修改 nodes 表：添加元数据字段
ALTER TABLE IF EXISTS nodes
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 5. 创建 recycle_items 表（回收站）
CREATE TABLE IF NOT EXISTS recycle_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_id TEXT NOT NULL,
  file_name TEXT,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  node_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_recycle_items_user_id ON recycle_items(user_id);

-- 6. 创建 snapshots 表（历史快照）
CREATE TABLE IF NOT EXISTS snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_id TEXT NOT NULL,
  snapshot_data JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_user_id ON snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_file_id ON snapshots(file_id);

-- 7. 创建 operation_logs 表（操作日志）
CREATE TABLE IF NOT EXISTS operation_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  file_id TEXT,
  operation_type TEXT NOT NULL,
  operation_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operation_logs_user_id ON operation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at);

-- 8. 创建 connections 表（节点间独立连线，不受树形父子结构限制）
CREATE TABLE IF NOT EXISTS connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  from_line_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  to_line_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  connector_type TEXT DEFAULT 'curved',
  label TEXT,
  arrow_direction TEXT DEFAULT 'none',
  from_anchor TEXT,
  to_anchor TEXT,
  style JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT uq_connection UNIQUE (document_id, from_line_id, to_line_id),
  CONSTRAINT chk_self_connection CHECK (from_line_id <> to_line_id)
);

CREATE INDEX IF NOT EXISTS idx_connections_document_id ON connections(document_id);
CREATE INDEX IF NOT EXISTS idx_connections_from_line_id ON connections(from_line_id);
CREATE INDEX IF NOT EXISTS idx_connections_to_line_id ON connections(to_line_id);
