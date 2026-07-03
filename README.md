# MindFlow - 思维导图与流程图编辑平台

企业级思维导图与流程图编辑协同平台。域名：**zjhdml.online**

## 技术栈

| 层 | 技术选型 |
|---|---------|
| 前端 | Vue 3 + TypeScript + Pinia |
| 编辑器核心 | 自研 `InnerTreeEngine` |
| 协同算法 | Yjs (CRDT) |
| 后端 | NestJS (Node.js) |
| 数据库 | PostgreSQL + Redis |
| 搜索 | Elasticsearch |
| 文件存储 | 对象存储 (兼容 S3) + 加密代理层 |

## 项目结构

```
mindflow/
├── packages/
│   ├── editor-core/       # 内联层级树引擎（核心）
│   ├── editor-ui/         # Vue 3 前端UI渲染层
│   ├── api-server/        # NestJS 后端服务
│   ├── shared/            # 共享类型与常量
│   ├── security-module/   # 安全加密/审计/风控
│   ├── ai-module/         # AI智能导图生成
│   ├── data-link/         # 外部数据绑定联动
│   ├── permission-module/ # 细粒度权限管控
│   ├── offline-module/    # 离线同步
│   ├── plugin-module/     # 插件扩展
│   ├── auto-rule-module/  # 自动化规则引擎
│   ├── recycle-bin/       # 回收站软删除
│   └── mobile/            # 移动端适配层
├── docker/                # 容器化部署
├── scripts/               # 性能测试&灰度脚本
└── docs/                  # 项目文档
```

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8
- PostgreSQL >= 16 (可选，开发可用内存存储)

### 安装

```bash
# 安装依赖
pnpm install

# 复制环境变量
cp .env.example .env
```

### 开发

```bash
# 启动前端 (端口 5173)
pnpm dev:ui

# 启动后端 (端口 3000)
pnpm dev:server

# 构建所有包
pnpm build:all
```

### Docker 部署

```bash
pnpm docker:up    # 启动全部服务
pnpm docker:down  # 停止全部服务
```

### 核心引擎功能

- 内联层级树渲染（10万行级优化）
- 折叠/展开算法（精准层级判定）
- 多视图支持（树图/大纲/甘特图/日历/看板）
- CRDT 协同编辑 + 视口按需同步
- 撤销/重做事务管理（50步）
- AI 文本/图片/语音转导图
- 企业级安全合规（四重加密/审计/水印/跨境阻断）
- 回收站软删除 + 快照版本回溯

## 文档

- [完整工程开发文档 + 视觉设计规范](./docs/DEVELOPMENT_SPEC.md)
- [API 接口文档](./docs/API.md)
