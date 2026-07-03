/**
 * 规则执行器 - 文档第1.2节
 * 支持通知、更新节点、锁定、归档、Webhook调用
 */
import { OperationType, InnerLine } from '@mindflow/shared';

export interface ActionContext {
  engine?: any; // InnerTreeEngine 实例引用
  nodeData?: Partial<InnerLine>;
  fileData?: Record<string, any>;
  userId?: string;
}

export interface ActionResult {
  success: boolean;
  actionType: string;
  message?: string;
  data?: any;
}

export class RuleAction {
  /**
   * 执行指定动作类型
   * @param actionType 动作类型: notify | update | lock | archive | webhook | tag | move
   * @param config 动作配置
   * @param ctx 执行上下文
   */
  async execute(
    actionType: string,
    config: Record<string, any>,
    ctx: ActionContext = {}
  ): Promise<ActionResult> {
    try {
      switch (actionType) {
        case 'notify':
          return await this.handleNotify(config, ctx);
        case 'update':
          return await this.handleUpdate(config, ctx);
        case 'lock':
          return await this.handleLock(config, ctx);
        case 'archive':
          return await this.handleArchive(config, ctx);
        case 'webhook':
          return await this.handleWebhook(config, ctx);
        case 'tag':
          return await this.handleTag(config, ctx);
        case 'move':
          return await this.handleMove(config, ctx);
        case 'delete':
          return await this.handleDelete(config, ctx);
        default:
          return { success: false, actionType, message: `未知动作类型: ${actionType}` };
      }
    } catch (err) {
      return {
        success: false,
        actionType,
        message: `执行异常: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  // ==================== 内置动作处理器 ====================

  private async handleNotify(config: Record<string, any>, ctx: ActionContext): Promise<ActionResult> {
    const { channel = 'console', title = '自动化通知', message = '', recipients = [] } = config;

    switch (channel) {
      case 'console':
        console.log(`[AutoRule 通知] ${title}:`, message);
        break;
      case 'alert':
        console.log(`[AutoRule 弹窗] ${title}:`, message);
        break;
      case 'email':
        console.log(`[AutoRule 邮件] 发送至 ${recipients.join(', ')}: ${title} - ${message}`);
        break;
      case 'internal':
        // 内部消息通知渠道
        console.log(`[AutoRule 内部通知] ${title}:`, message, '接收人:', recipients);
        break;
      default:
        console.log(`[AutoRule ${channel}] ${title}:`, message);
    }

    return {
      success: true,
      actionType: 'notify',
      message: `通知已通过 ${channel} 渠道发送`,
      data: { channel, title, message, recipients, timestamp: Date.now() },
    };
  }

  private async handleUpdate(config: Record<string, any>, ctx: ActionContext): Promise<ActionResult> {
    const { field, value, nodeIds } = config;
    const engine = ctx.engine;

    if (!engine) {
      return { success: false, actionType: 'update', message: '无引擎引用' };
    }

    const lines = engine.getLines() as InnerLine[];
    const targets = nodeIds
      ? lines.filter((l: InnerLine) => nodeIds.includes(l.lineId))
      : lines;

    let updatedCount = 0;
    for (const line of targets) {
      if (field === 'text') {
        engine.updateLine(line.lineId, String(value));
        updatedCount++;
      } else if (field === 'priority' && line.metadata) {
        line.metadata.priority = Number(value);
        line.metadata.updatedAt = Date.now();
        updatedCount++;
      } else if (field === 'tag' && line.metadata) {
        const tags = line.metadata.tags ?? [];
        const tagVal = String(value);
        if (!tags.includes(tagVal)) {
          line.metadata.tags = [...tags, tagVal];
          line.metadata.updatedAt = Date.now();
          updatedCount++;
        }
      }
    }

    return {
      success: true,
      actionType: 'update',
      message: `已更新 ${updatedCount} 个节点`,
      data: { field, value, updatedCount },
    };
  }

  private async handleLock(config: Record<string, any>, ctx: ActionContext): Promise<ActionResult> {
    const { scope = 'node', ids = [], reason = '' } = config;
    const engine = ctx.engine;

    if (!engine) {
      return { success: false, actionType: 'lock', message: '无引擎引用' };
    }

    const lines = engine.getLines() as InnerLine[];
    const now = Date.now();

    let lockedCount = 0;
    for (const line of lines) {
      if (ids.length === 0 || ids.includes(line.lineId)) {
        if (line.metadata) {
          line.metadata.tags = [...(line.metadata.tags ?? []), 'locked'];
          line.metadata.updatedAt = now;
          lockedCount++;
        }
      }
    }

    return {
      success: true,
      actionType: 'lock',
      message: `已锁定 ${lockedCount} 个节点`,
      data: { scope, ids, reason, lockedCount, lockedAt: now },
    };
  }

  private async handleArchive(config: Record<string, any>, ctx: ActionContext): Promise<ActionResult> {
    const { archiveName = `archived_${Date.now()}`, nodeIds = [] } = config;
    const engine = ctx.engine;

    if (!engine) {
      return { success: false, actionType: 'archive', message: '无引擎引用' };
    }

    const lines = engine.getLines() as InnerLine[];
    const archivedNodes: InnerLine[] = [];

    for (const line of [...lines]) {
      if (nodeIds.length === 0 || nodeIds.includes(line.lineId)) {
        archivedNodes.push({ ...line });
        engine.deleteLine(line.lineId);
      }
    }

    return {
      success: true,
      actionType: 'archive',
      message: `已归档 ${archivedNodes.length} 个节点到 ${archiveName}`,
      data: {
        archiveName,
        archivedCount: archivedNodes.length,
        archivedNodes: archivedNodes.map((n) => ({ lineId: n.lineId, text: n.text })),
        archivedAt: Date.now(),
      },
    };
  }

  private async handleWebhook(config: Record<string, any>, ctx: ActionContext): Promise<ActionResult> {
    const { url, method = 'POST', headers = {}, body = {} } = config;

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: method !== 'GET' ? JSON.stringify({ ...body, triggeredAt: Date.now() }) : undefined,
      });

      if (!response.ok) {
        return {
          success: false,
          actionType: 'webhook',
          message: `Webhook 请求失败: HTTP ${response.status}`,
        };
      }

      const responseData = await response.json().catch(() => null);

      return {
        success: true,
        actionType: 'webhook',
        message: `Webhook 调用成功`,
        data: { url, status: response.status, response: responseData },
      };
    } catch (err) {
      return {
        success: false,
        actionType: 'webhook',
        message: `Webhook 请求异常: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  private async handleTag(config: Record<string, any>, ctx: ActionContext): Promise<ActionResult> {
    const { tags = [], nodeIds, mode = 'add' } = config;
    const engine = ctx.engine;

    if (!engine) {
      return { success: false, actionType: 'tag', message: '无引擎引用' };
    }

    const lines = engine.getLines() as InnerLine[];
    let taggedCount = 0;

    for (const line of lines) {
      if (nodeIds && !nodeIds.includes(line.lineId)) continue;
      if (!line.metadata) continue;

      const existing = line.metadata.tags ?? [];
      if (mode === 'add') {
        const newTags = tags.filter((t: string) => !existing.includes(t));
        if (newTags.length > 0) {
          line.metadata.tags = [...existing, ...newTags];
          line.metadata.updatedAt = Date.now();
          taggedCount++;
        }
      } else if (mode === 'remove') {
        const filtered = existing.filter((t) => !tags.includes(t));
        if (filtered.length !== existing.length) {
          line.metadata.tags = filtered;
          line.metadata.updatedAt = Date.now();
          taggedCount++;
        }
      } else if (mode === 'set') {
        line.metadata.tags = [...tags];
        line.metadata.updatedAt = Date.now();
        taggedCount++;
      }
    }

    return {
      success: true,
      actionType: 'tag',
      message: `已标签 ${taggedCount} 个节点`,
      data: { tags, mode, taggedCount },
    };
  }

  private async handleMove(config: Record<string, any>, ctx: ActionContext): Promise<ActionResult> {
    const { nodeId, newIndex } = config;
    const engine = ctx.engine;

    if (!engine || !nodeId) {
      return { success: false, actionType: 'move', message: '缺少参数' };
    }

    engine.moveLine(nodeId, newIndex);

    return {
      success: true,
      actionType: 'move',
      message: `节点 ${nodeId} 已移动到位置 ${newIndex}`,
      data: { nodeId, newIndex },
    };
  }

  private async handleDelete(config: Record<string, any>, ctx: ActionContext): Promise<ActionResult> {
    const { nodeIds = [], condition } = config;
    const engine = ctx.engine;

    if (!engine) {
      return { success: false, actionType: 'delete', message: '无引擎引用' };
    }

    const lines = engine.getLines() as InnerLine[];
    let deletedCount = 0;

    for (const line of [...lines]) {
      if (nodeIds.includes(line.lineId)) {
        engine.deleteLine(line.lineId);
        deletedCount++;
      } else if (condition) {
        // 按条件删除（如删除超过指定天数的节点、无文本的空节点等）
        if (condition.emptyText && !line.text.trim()) {
          engine.deleteLine(line.lineId);
          deletedCount++;
        }
      }
    }

    return {
      success: true,
      actionType: 'delete',
      message: `已删除 ${deletedCount} 个节点`,
      data: { deletedCount },
    };
  }
}
