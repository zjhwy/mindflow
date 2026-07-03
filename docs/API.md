# API 接口文档

## 节点与内联层级 (文档第3.1节)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/nodes/:nodeId/inner-lines | 批量创建内联层级节点 |
| GET | /api/v1/nodes/:nodeId/inner-lines | 获取节点下所有内联行 |
| PUT | /api/v1/nodes/:nodeId/inner-lines/:lineId | 更新指定节点内容 |
| DELETE | /api/v1/nodes/:nodeId/inner-lines/:lineId | 删除指定内联节点(软删除) |
| PATCH | /api/v1/nodes/:nodeId/inner-lines/reorder | 批量拖拽排序 |

## AI功能 (文档第3.4节)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/ai/mind/generate | 文本一键生成思维导图 |
| POST | /api/v1/ai/mind/ocr | 图片转结构化导图 |
| POST | /api/v1/ai/mind/enhance | 节点AI润色/扩写/精简 |
| GET | /api/v1/ai/mind/layout-recommend | 智能推荐最优布局 |

## 安全 (文档第3.2节)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/security/files/:fid/decrypt/init | 初始化解密流程 |
| GET | /api/v1/security/audit-log | 分页查询审计日志 |
| GET | /api/v1/security/score | 获取安全评分 |

## 回收站与快照 (文档第3.7节)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/file/:fid/recycle/delete | 软删除 |
| POST | /api/v1/file/:fid/recycle/restore | 回收站恢复 |
| POST | /api/v1/file/:fid/snapshot/create | 手动创建快照 |
| POST | /api/v1/file/:fid/snapshot/restore | 基于快照回溯 |

## 统一响应格式

```json
{
  "code": 0,
  "message": "操作成功",
  "data": {},
  "requestId": "uuid",
  "timestamp": 1700000000000
}
```
