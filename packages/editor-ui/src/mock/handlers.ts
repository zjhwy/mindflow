/**
 * Mock API 路由处理器 — 本地测试用
 * 拦截 /api/v1/* 请求并返回模拟 JSON 数据
 */
import type { IncomingMessage, ServerResponse } from 'http';
import {
  mockUser,
  mockTokens,
  mockDocuments,
  mockLinesMap,
} from './data';

// ========================= 响应工具 =========================

function ok(data: unknown) {
  return {
    code: 0,
    message: 'ok',
    data,
    requestId: 'mock_' + Math.random().toString(36).slice(2, 10),
    timestamp: Date.now(),
  };
}

function fail(code: number, message: string) {
  return {
    code,
    message,
    data: null,
    requestId: 'mock_' + Math.random().toString(36).slice(2, 10),
    timestamp: Date.now(),
  };
}

async function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try { resolve(JSON.parse(raw)); } catch { resolve({}); }
    });
  });
}

// ========================= 路由表 =========================

type Handler = (
  req: IncomingMessage,
  res: ServerResponse,
  body: any,
  params: Record<string, string>,
) => Promise<Record<string, unknown>>;

interface Route {
  method: string;
  pattern: RegExp;
  handler: Handler;
}

const routes: Route[] = [];

function add(method: string, path: string, handler: Handler) {
  const regex = '^/api/v1' + path.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$';
  routes.push({ method, pattern: new RegExp(regex), handler });
}

// ---- Auth ----
add('POST', '/auth/login', async (_req, _res, body) => {
  if (!body.username || !body.password) return fail(400, '用户名和密码不能为空');
  return ok({ accessToken: mockTokens.accessToken, refreshToken: mockTokens.refreshToken, user: mockUser });
});

add('POST', '/auth/register', async (_req, _res, body) => {
  if (!body.username || !body.password) return fail(400, '用户名和密码不能为空');
  return ok({ message: '注册成功，请登录' });
});

add('POST', '/auth/me', async () => ok(mockUser));
add('POST', '/auth/refresh', async () => ok({
  accessToken: mockTokens.accessToken,
  refreshToken: mockTokens.refreshToken,
  user: mockUser,
}));

// ---- Documents ----
add('GET', '/documents', async () => ok({ items: mockDocuments, total: mockDocuments.length }));

add('GET', '/documents/:fileId', async (_req, _res, _body, params) => {
  const doc = mockDocuments.find((d) => d.fileId === params.fileId);
  if (!doc) return fail(404, '文档不存在');
  return ok({
    fileId: doc.fileId,
    name: doc.name,
    linesData: mockLinesMap[doc.fileId] ?? [],
    totalNodes: doc.totalNodes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
});

add('PUT', '/documents/:fileId', async (_req, _res, body, params) => {
  return ok({
    fileId: params.fileId,
    name: body?.name ?? '未命名导图',
    totalNodes: (body?.linesData ?? []).length,
    updatedAt: Date.now(),
  });
});

// ========================= 路由匹配 =========================

/**
 * 匹配并处理一个请求，返回 ApiResponse JSON
 * 无匹配返回 null
 */
export async function dispatch(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<Record<string, unknown> | null> {
  const method = req.method ?? 'GET';
  const url = new URL(req.url ?? '/', 'http://localhost');

  for (const route of routes) {
    if (method !== route.method) continue;
    const match = url.pathname.match(route.pattern);
    if (!match) continue;

    const body = method !== 'GET' ? await readBody(req) : {};
    const params = match.groups ?? {};
    return route.handler(req, res, body, params);
  }

  return null;
}
